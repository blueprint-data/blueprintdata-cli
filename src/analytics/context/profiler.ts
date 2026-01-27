import fs from 'fs-extra';
import path from 'path';
import { BaseWarehouseConnector, TableSchema } from '../../warehouse/connection.js';
import {
  EnhancedTableStats,
  CompanyContext,
  DbtModelMetadata,
  ProfileSummary,
} from '../../types.js';
import { StatisticsGatherer } from './statistics.js';
import { LLMEnricher } from './enricher.js';
import { generateFallbackProfile } from './fallback.js';

export interface ProfileOptions {
  schemas?: string[];
  tables?: string[];
  outputDir: string;
  includeRowCounts?: boolean;
  enricher?: LLMEnricher; // Optional LLM enrichment
  companyContext?: CompanyContext; // Optional company context
  dbtMetadata?: Record<string, DbtModelMetadata>; // Optional dbt metadata by table name
}

/**
 * Warehouse profiler - generates rich markdown documentation for tables
 * Uses LLM enrichment when available, falls back to basic templates
 */
export class WarehouseProfiler {
  private connector: BaseWarehouseConnector;

  constructor(connector: BaseWarehouseConnector) {
    this.connector = connector;
  }

  /**
   * Profile all tables in the warehouse
   */
  async profileAll(options: ProfileOptions): Promise<ProfileSummary> {
    const {
      schemas,
      tables,
      outputDir,
      includeRowCounts = true,
      enricher,
      companyContext,
      dbtMetadata,
    } = options;

    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    // Get tables to profile
    const tablesToProfile = await this.getTablesToProfile(schemas, tables);

    console.log(`Found ${tablesToProfile.length} tables to profile...`);

    // Track results
    const summary: ProfileSummary = {
      total: tablesToProfile.length,
      successful: 0,
      fallback: 0,
      failed: 0,
      skipped: 0,
      totalCost: 0,
      totalTime: 0,
      errors: [],
    };

    // Profile each table
    for (const { schemaName, tableName } of tablesToProfile) {
      try {
        const result = await this.profileTable(
          schemaName,
          tableName,
          outputDir,
          includeRowCounts,
          enricher,
          companyContext,
          dbtMetadata?.[tableName]
        );

        if (result.success) {
          summary.successful++;
          if (result.tokensUsed) {
            // Rough cost estimate (will be more accurate with actual model pricing)
            const inputCost = (result.tokensUsed.input / 1_000_000) * 1.0; // $1 per 1M input tokens (Haiku)
            const outputCost = (result.tokensUsed.output / 1_000_000) * 5.0; // $5 per 1M output tokens (Haiku)
            summary.totalCost += inputCost + outputCost;
          }
        } else {
          summary.fallback++;
          if (result.error) {
            summary.errors.push(result.error);
          }
        }

        summary.totalTime += result.duration;

        if ((summary.successful + summary.fallback) % 10 === 0) {
          console.log(
            `Profiled ${summary.successful + summary.fallback}/${tablesToProfile.length} tables...`
          );
        }
      } catch (error) {
        summary.failed++;
        summary.errors.push({
          modelName: `${schemaName}.${tableName}`,
          errorType: 'warehouse',
          error: error instanceof Error ? error.message : 'Unknown error',
          fallbackUsed: false,
        });
        console.error(`Failed to profile ${schemaName}.${tableName}:`, error);
      }
    }

    console.log(
      `Successfully profiled ${summary.successful + summary.fallback}/${tablesToProfile.length} tables`
    );
    if (enricher) {
      console.log(
        `  LLM-enriched: ${summary.successful}, Fallback: ${summary.fallback}, Failed: ${summary.failed}`
      );
      console.log(
        `  Total cost: $${summary.totalCost.toFixed(4)}, Total time: ${(summary.totalTime / 1000).toFixed(1)}s`
      );
    }

    return summary;
  }

  /**
   * Profile a single table and write markdown file
   */
  async profileTable(
    schemaName: string,
    tableName: string,
    outputDir: string,
    includeRowCounts: boolean = true,
    enricher?: LLMEnricher,
    companyContext?: CompanyContext,
    dbtMetadata?: DbtModelMetadata
  ): Promise<{
    success: boolean;
    duration: number;
    tokensUsed?: { input: number; output: number };
    error?: any;
  }> {
    const startTime = Date.now();
    console.log(`\n  Profiling ${schemaName}.${tableName}...`);

    try {
      // Get basic schema
      console.log(`    [1/4] Fetching table schema...`);
      const schemaStart = Date.now();
      const schema = await this.connector.getTableSchema(schemaName, tableName);
      console.log(
        `    ✓ Schema fetched (${Date.now() - schemaStart}ms) - ${schema.columns.length} columns`
      );

      // Gather enhanced statistics if LLM enrichment is enabled
      let enhancedStats: EnhancedTableStats | undefined;
      let markdown: string;

      if (enricher) {
        // Gather enhanced statistics
        console.log(`    [2/4] Gathering enhanced statistics (cardinality, samples, etc.)...`);
        const statsStart = Date.now();
        const statsGatherer = new StatisticsGatherer(this.connector);
        enhancedStats = await statsGatherer.gatherTableStats(schemaName, tableName);
        console.log(`    ✓ Statistics gathered (${Date.now() - statsStart}ms)`);

        // Try LLM enrichment
        console.log(`    [3/4] Calling LLM for rich documentation...`);
        const llmStart = Date.now();
        const result = await enricher.enrichTableProfile(
          enhancedStats,
          dbtMetadata,
          companyContext
        );
        console.log(`    ✓ LLM response received (${Date.now() - llmStart}ms)`);

        if (result.tokensUsed) {
          const inputCost = (result.tokensUsed.input / 1_000_000) * 1.0;
          const outputCost = (result.tokensUsed.output / 1_000_000) * 5.0;
          const totalCost = inputCost + outputCost;
          console.log(
            `    ✓ Tokens: ${result.tokensUsed.input} input + ${result.tokensUsed.output} output (~$${totalCost.toFixed(4)})`
          );
        }

        if (result.success) {
          // LLM succeeded - get the enriched content
          console.log(`    [4/4] Generating markdown file...`);
          markdown = await enricher.getEnrichedContent(enhancedStats, dbtMetadata, companyContext);

          // Save to file
          const filename = `${schemaName}_${tableName}.md`;
          const filepath = path.join(outputDir, filename);
          await fs.writeFile(filepath, markdown, 'utf-8');
          console.log(`    ✓ Saved to ${filename}`);

          const duration = Date.now() - startTime;
          console.log(`  ✓ Complete (${(duration / 1000).toFixed(1)}s total)\n`);
          return {
            success: true,
            duration,
            tokensUsed: result.tokensUsed,
          };
        } else {
          // LLM failed - use fallback
          console.log(`    ⚠ LLM failed, using fallback template`);
          markdown = generateFallbackProfile(enhancedStats, dbtMetadata);

          const filename = `${schemaName}_${tableName}.md`;
          const filepath = path.join(outputDir, filename);
          await fs.writeFile(filepath, markdown, 'utf-8');
          console.log(`    ✓ Saved to ${filename} (fallback)`);

          const duration = Date.now() - startTime;
          console.log(`  ✓ Complete (${(duration / 1000).toFixed(1)}s total)\n`);
          return {
            success: false,
            duration,
            error: result.error,
          };
        }
      } else {
        // No enricher - use basic markdown
        console.log(`    [2/2] Generating basic markdown (no LLM)...`);
        markdown = this.generateBasicMarkdown(schema, includeRowCounts);

        const filename = `${schemaName}_${tableName}.md`;
        const filepath = path.join(outputDir, filename);
        await fs.writeFile(filepath, markdown, 'utf-8');
        console.log(`    ✓ Saved to ${filename}`);

        const duration = Date.now() - startTime;
        console.log(`  ✓ Complete (${(duration / 1000).toFixed(1)}s total)\n`);
        return { success: true, duration };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get list of tables to profile based on options
   */
  private async getTablesToProfile(
    schemas?: string[],
    tables?: string[]
  ): Promise<Array<{ schemaName: string; tableName: string }>> {
    if (tables && tables.length > 0) {
      // If specific tables are provided, use those
      return tables.map((fullTableName) => {
        const parts = fullTableName.split('.');

        console.log(`  Debug: Parsing table name '${fullTableName}' with ${parts.length} parts`);

        // Handle BigQuery format: project.dataset.table (3 parts)
        if (parts.length === 3) {
          console.log(
            `  Debug: BigQuery format detected - schema: ${parts[1]}, table: ${parts[2]}`
          );
          return {
            schemaName: parts[1], // dataset is the "schema" in BigQuery
            tableName: parts[2],
          };
        }

        // Handle standard format: schema.table (2 parts)
        if (parts.length === 2) {
          console.log(
            `  Debug: Standard format detected - schema: ${parts[0]}, table: ${parts[1]}`
          );
          return {
            schemaName: parts[0],
            tableName: parts[1],
          };
        }

        // Handle single name (no dots)
        console.log(
          `  Debug: Single name detected - using default schema 'public', table: ${parts[0]}`
        );
        return {
          schemaName: 'public',
          tableName: parts[0],
        };
      });
    }

    // List tables from specified schemas or all schemas
    const allTables: Array<{ schemaName: string; tableName: string }> = [];

    if (schemas && schemas.length > 0) {
      // List tables from specified schemas
      for (const schema of schemas) {
        const schemaTables = await this.connector.listTables(schema);
        allTables.push(...schemaTables);
      }
    } else {
      // List all tables from all schemas
      const allSchemaTables = await this.connector.listTables();
      allTables.push(...allSchemaTables);
    }

    return allTables;
  }

  /**
   * Generate basic markdown documentation for a table (no LLM)
   */
  private generateBasicMarkdown(schema: TableSchema, includeRowCounts: boolean): string {
    const { schemaName, tableName, columns, rowCount, sizeInBytes } = schema;

    let markdown = `# ${schemaName}.${tableName}\n\n`;

    // Add metadata section
    markdown += `## Metadata\n\n`;
    markdown += `- **Schema**: ${schemaName}\n`;
    markdown += `- **Table**: ${tableName}\n`;

    if (includeRowCounts && rowCount !== undefined) {
      markdown += `- **Row Count**: ${rowCount.toLocaleString()}\n`;
    }

    if (sizeInBytes !== undefined) {
      markdown += `- **Size**: ${this.formatBytes(sizeInBytes)}\n`;
    }

    markdown += `\n`;

    // Add columns section
    markdown += `## Columns\n\n`;
    markdown += `| Column Name | Data Type | Nullable | Description |\n`;
    markdown += `|-------------|-----------|----------|-------------|\n`;

    for (const column of columns) {
      const nullable = column.nullable ? 'Yes' : 'No';
      const description = column.description || '';
      markdown += `| ${column.name} | ${column.type} | ${nullable} | ${description} |\n`;
    }

    markdown += `\n`;

    // Add example query
    markdown += `## Example Query\n\n`;
    markdown += `\`\`\`sql\n`;
    markdown += `SELECT *\n`;
    markdown += `FROM ${schemaName}.${tableName}\n`;
    markdown += `LIMIT 10;\n`;
    markdown += `\`\`\`\n`;

    return markdown;
  }

  /**
   * Format bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
