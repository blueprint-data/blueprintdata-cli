import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import yaml from 'yaml';
import { DbtModelMetadata } from '@blueprintdata/models';

/**
 * dbt manifest structure (simplified)
 */
export interface DbtManifest {
  nodes: Record<string, DbtManifestNode>;
  sources: Record<string, DbtManifestSource>;
  metadata: {
    generated_at: string;
    dbt_version: string;
  };
}

export interface DbtManifestNode {
  unique_id: string;
  name: string;
  resource_type: string;
  database: string;
  schema: string;
  alias: string;
  description?: string;
  tags: string[];
  config: {
    materialized: string;
  };
  columns: Record<string, { name: string; description?: string; tags?: string[] }>;
  depends_on: {
    nodes: string[];
  };
  compiled_code?: string;
}

export interface DbtManifestSource {
  unique_id: string;
  name: string;
  source_name: string;
  database: string;
  schema: string;
}

/**
 * dbt integration - parse manifest, run compile, extract metadata
 */
export class DbtIntegration {
  private projectPath: string;
  private target?: string;

  constructor(projectPath: string, target?: string) {
    this.projectPath = projectPath;
    this.target = target;
  }

  /**
   * Ensure dbt manifest exists, run dbt parse if needed
   */
  async ensureManifest(): Promise<boolean> {
    const manifestPath = path.join(this.projectPath, 'target', 'manifest.json');

    if (await fs.pathExists(manifestPath)) {
      return true;
    }

    console.log('  Running dbt parse to generate manifest...');

    try {
      await this.runDbtCommand(['parse']);
      return await fs.pathExists(manifestPath);
    } catch (error) {
      console.error('  Failed to run dbt parse:', error);
      return false;
    }
  }

  /**
   * Load dbt manifest.json
   */
  async loadManifest(): Promise<DbtManifest | null> {
    const manifestPath = path.join(this.projectPath, 'target', 'manifest.json');

    if (!(await fs.pathExists(manifestPath))) {
      return null;
    }

    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(content) as DbtManifest;
    } catch (error) {
      console.error('  Failed to load manifest:', error);
      return null;
    }
  }

  /**
   * Get metadata for a specific model from manifest
   */
  async getModelMetadata(modelName: string): Promise<DbtModelMetadata | null> {
    const manifest = await this.loadManifest();
    if (!manifest) return null;

    // Find the model node
    const modelNode = Object.values(manifest.nodes).find(
      (node) =>
        node.resource_type === 'model' && (node.name === modelName || node.alias === modelName)
    );

    if (!modelNode) return null;

    // Extract column information
    const columns = Object.values(modelNode.columns || {}).map((col) => ({
      name: col.name,
      description: col.description,
      tests: col.tags || [],
    }));

    // Extract upstream models
    const upstreamModels = modelNode.depends_on.nodes
      .filter((id) => id.startsWith('model.'))
      .map((id) => {
        const node = manifest.nodes[id];
        return node ? node.name : id;
      });

    // Extract sources
    const sources = modelNode.depends_on.nodes
      .filter((id) => id.startsWith('source.'))
      .map((id) => {
        const source = manifest.sources[id];
        return source
          ? { source: source.source_name, table: source.name }
          : { source: 'unknown', table: 'unknown' };
      });

    // Get compiled SQL
    let compiledSql: string | undefined;
    try {
      const sql = await this.getCompiledSql(modelName);
      compiledSql = sql || undefined;
      // Limit to first 500 chars for LLM context
      if (compiledSql && compiledSql.length > 500) {
        compiledSql = compiledSql.substring(0, 500) + '\n-- ... (truncated)';
      }
    } catch {
      // If compile fails, use compiled_code from manifest
      if (modelNode.compiled_code) {
        compiledSql = modelNode.compiled_code.substring(0, 500);
      }
    }

    return {
      uniqueId: modelNode.unique_id,
      name: modelNode.name,
      description: modelNode.description,
      materializedAs: modelNode.config.materialized,
      database: modelNode.database,
      schema: modelNode.schema,
      alias: modelNode.alias,
      tags: modelNode.tags,
      columns,
      dependsOn: {
        models: upstreamModels,
        sources,
      },
      compiledSql: compiledSql || undefined,
    };
  }

  /**
   * Get fully qualified table name for a model
   */
  async getModelTableName(modelName: string): Promise<string | null> {
    const manifest = await this.loadManifest();
    if (!manifest) {
      console.log(`  Debug: No manifest found`);
      return null;
    }

    const modelNode = Object.values(manifest.nodes).find(
      (node) =>
        node.resource_type === 'model' && (node.name === modelName || node.alias === modelName)
    );

    if (!modelNode) {
      console.log(`  Debug: Model '${modelName}' not found in manifest`);
      console.log(
        `  Debug: Available models: ${Object.values(manifest.nodes)
          .filter((n) => n.resource_type === 'model')
          .map((n) => n.name)
          .join(', ')}`
      );
      return null;
    }

    const tableName = `${modelNode.database}.${modelNode.schema}.${modelNode.alias}`;
    console.log(`  Debug: Resolved '${modelName}' to '${tableName}'`);
    console.log(
      `  Debug: Model details - database: ${modelNode.database}, schema: ${modelNode.schema}, alias: ${modelNode.alias}`
    );

    return tableName;
  }

  /**
   * List all model names from manifest
   */
  async listModels(): Promise<string[]> {
    const manifest = await this.loadManifest();
    if (!manifest) return [];

    return Object.values(manifest.nodes)
      .filter((node) => node.resource_type === 'model')
      .map((node) => node.name);
  }

  /**
   * Compile a specific model
   */
  async compileModel(modelName: string): Promise<void> {
    await this.runDbtCommand(['compile', '--select', modelName]);
  }

  /**
   * Get compiled SQL for a model
   */
  async getCompiledSql(modelName: string): Promise<string | null> {
    // Try to find the compiled SQL file
    const compiledPath = await this.findCompiledFile(modelName);

    if (!compiledPath) {
      // Try to compile the model
      try {
        await this.compileModel(modelName);
        const retryPath = await this.findCompiledFile(modelName);
        if (!retryPath) return null;
        return await fs.readFile(retryPath, 'utf-8');
      } catch {
        return null;
      }
    }

    return await fs.readFile(compiledPath, 'utf-8');
  }

  /**
   * Find compiled SQL file for a model
   */
  private async findCompiledFile(modelName: string): Promise<string | null> {
    const compiledDir = path.join(this.projectPath, 'target', 'compiled');

    if (!(await fs.pathExists(compiledDir))) {
      return null;
    }

    // Search recursively for model file
    const files = await this.findFiles(compiledDir, `${modelName}.sql`);
    return files.length > 0 ? files[0] : null;
  }

  /**
   * Recursively find files with a specific name
   */
  private async findFiles(dir: string, filename: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subResults = await this.findFiles(fullPath, filename);
          results.push(...subResults);
        } else if (entry.name === filename) {
          results.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }

    return results;
  }

  /**
   * Read schema.yml files to get documentation
   */
  async getModelDocumentation(modelName: string): Promise<{
    description?: string;
    columns: Array<{ name: string; description?: string }>;
  } | null> {
    const modelsPath = path.join(this.projectPath, 'models');
    const yamlFiles = await this.findFiles(modelsPath, 'schema.yml');

    // Also check for _schema.yml and other variants
    const yamlFiles2 = await this.findFiles(modelsPath, '_schema.yml');
    yamlFiles.push(...yamlFiles2);

    for (const yamlFile of yamlFiles) {
      try {
        const content = await fs.readFile(yamlFile, 'utf-8');
        const data = yaml.parse(content);

        if (data?.models) {
          for (const model of data.models) {
            if (model.name === modelName) {
              return {
                description: model.description,
                columns: (model.columns || []).map(
                  (col: { name: string; description?: string }) => ({
                    name: col.name,
                    description: col.description,
                  })
                ),
              };
            }
          }
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Run a dbt command
   */
  private async runDbtCommand(args: string[]): Promise<void> {
    try {
      // Add --target flag if specified
      const dbtArgs = this.target ? [...args, '--target', this.target] : args;

      console.log(`  Running: dbt ${dbtArgs.join(' ')}`);

      const result = await execa('dbt', dbtArgs, {
        cwd: this.projectPath,
        stdio: 'pipe',
      });

      if (result.stdout) {
        console.log(`  dbt output: ${result.stdout.substring(0, 200)}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`dbt command failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if dbt is installed
   */
  async checkDbtInstalled(): Promise<boolean> {
    try {
      await execa('dbt', ['--version'], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}
