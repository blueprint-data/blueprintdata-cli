import fs from 'fs-extra';
import path from 'path';

export interface DbtModel {
  name: string;
  path: string;
  relativePath: string;
  sql: string;
  refs: string[];
  sources: Array<{ sourceName: string; tableName: string }>;
  config: Record<string, unknown>;
}

export interface DbtScanResult {
  models: DbtModel[];
  modelCount: number;
  refCount: number;
  sourceCount: number;
}

/**
 * dbt model scanner - parses SQL files to extract lineage and configuration
 */
export class DbtScanner {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Scan all dbt models in the project
   */
  async scanModels(): Promise<DbtScanResult> {
    const modelsPath = path.join(this.projectPath, 'models');

    if (!(await fs.pathExists(modelsPath))) {
      throw new Error('models/ directory not found in dbt project');
    }

    // Find all .sql files in models directory
    const sqlFiles = await this.findSqlFiles(modelsPath);

    const models: DbtModel[] = [];

    for (const absolutePath of sqlFiles) {
      const relativePath = path.relative(modelsPath, absolutePath);

      try {
        const model = await this.parseModel(absolutePath, relativePath);
        models.push(model);
      } catch (error) {
        console.error(`Failed to parse model ${relativePath}:`, error);
      }
    }

    // Calculate statistics
    const refCount = models.reduce((sum, model) => sum + model.refs.length, 0);
    const sourceCount = models.reduce((sum, model) => sum + model.sources.length, 0);

    return {
      models,
      modelCount: models.length,
      refCount,
      sourceCount,
    };
  }

  /**
   * Recursively find all .sql files in a directory
   */
  private async findSqlFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await this.findSqlFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.sql')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Parse a single dbt model file
   */
  private async parseModel(absolutePath: string, relativePath: string): Promise<DbtModel> {
    const sql = await fs.readFile(absolutePath, 'utf-8');
    const name = path.basename(relativePath, '.sql');

    // Extract refs
    const refs = this.extractRefs(sql);

    // Extract sources
    const sources = this.extractSources(sql);

    // Extract config
    const config = this.extractConfig(sql);

    return {
      name,
      path: absolutePath,
      relativePath,
      sql,
      refs,
      sources,
      config,
    };
  }

  /**
   * Extract ref() calls from SQL
   */
  private extractRefs(sql: string): string[] {
    const refRegex = /\{\{\s*ref\(['"]([^'"]+)['"]\)\s*\}\}/g;
    const refs: string[] = [];
    let match;

    while ((match = refRegex.exec(sql)) !== null) {
      refs.push(match[1]);
    }

    return refs;
  }

  /**
   * Extract source() calls from SQL
   */
  private extractSources(sql: string): Array<{ sourceName: string; tableName: string }> {
    const sourceRegex = /\{\{\s*source\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)\s*\}\}/g;
    const sources: Array<{ sourceName: string; tableName: string }> = [];
    let match;

    while ((match = sourceRegex.exec(sql)) !== null) {
      sources.push({
        sourceName: match[1],
        tableName: match[2],
      });
    }

    return sources;
  }

  /**
   * Extract config block from SQL
   */
  private extractConfig(sql: string): Record<string, unknown> {
    const configRegex = /\{\{\s*config\(([\s\S]*?)\)\s*\}\}/;
    const match = configRegex.exec(sql);

    if (!match) {
      return {};
    }

    const configStr = match[1];
    const config: Record<string, unknown> = {};

    // Parse key-value pairs (simplified parser)
    const keyValueRegex = /(\w+)\s*=\s*([^,]+)/g;
    let kvMatch;

    while ((kvMatch = keyValueRegex.exec(configStr)) !== null) {
      const key = kvMatch[1].trim();
      let value: string | boolean | number = kvMatch[2].trim();

      // Remove quotes
      if (value.startsWith('"') || value.startsWith("'")) {
        value = value.slice(1, -1);
      }

      // Parse booleans
      if (value === 'true') value = true;
      if (value === 'false') value = false;

      // Parse numbers
      if (!isNaN(Number(value)) && value !== '') {
        value = Number(value);
      }

      config[key] = value;
    }

    return config;
  }

  /**
   * Generate markdown catalog of models
   */
  generateModelingMarkdown(scanResult: DbtScanResult): string {
    let markdown = `# dbt Models\n\n`;

    markdown += `## Summary\n\n`;
    markdown += `- **Total Models**: ${scanResult.modelCount}\n`;
    markdown += `- **Total References**: ${scanResult.refCount}\n`;
    markdown += `- **Total Sources**: ${scanResult.sourceCount}\n`;
    markdown += `\n`;

    // Group models by directory
    const modelsByDir = new Map<string, DbtModel[]>();

    for (const model of scanResult.models) {
      const dir = path.dirname(model.relativePath);
      if (!modelsByDir.has(dir)) {
        modelsByDir.set(dir, []);
      }
      modelsByDir.get(dir)!.push(model);
    }

    markdown += `## Models by Directory\n\n`;

    for (const [dir, models] of modelsByDir.entries()) {
      markdown += `### ${dir}\n\n`;

      for (const model of models) {
        markdown += `#### ${model.name}\n\n`;
        markdown += `- **Path**: \`${model.relativePath}\`\n`;

        if (model.refs.length > 0) {
          markdown += `- **References**: ${model.refs.map((ref) => `\`${ref}\``).join(', ')}\n`;
        }

        if (model.sources.length > 0) {
          markdown += `- **Sources**: ${model.sources.map((s) => `\`${s.sourceName}.${s.tableName}\``).join(', ')}\n`;
        }

        if (Object.keys(model.config).length > 0) {
          markdown += `- **Config**: ${JSON.stringify(model.config, null, 2)}\n`;
        }

        markdown += `\n`;
      }
    }

    // Add best practices section
    markdown += `## dbt Best Practices\n\n`;
    markdown += `- Use staging models (stg_*) to clean and standardize raw data\n`;
    markdown += `- Use intermediate models (int_*) for complex transformations\n`;
    markdown += `- Use fact and dimension models (fct_*, dim_*) for final analytics tables\n`;
    markdown += `- Always use \`ref()\` and \`source()\` macros for dependencies\n`;
    markdown += `- Add tests to validate data quality\n`;
    markdown += `- Document models with descriptions and column comments\n`;
    markdown += `\n`;

    return markdown;
  }
}
