import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { ModelHashCache, ChangeDetection } from '../../types.js';
import { BaseWarehouseConnector } from '../../warehouse/connection.js';
import { DbtIntegration } from './dbt-integration.js';

/**
 * Change detection system - tracks model changes via hashing
 */
export class ChangeDetector {
  private cachePath: string;

  constructor(projectPath: string) {
    this.cachePath = path.join(projectPath, 'agent-context', '.cache', 'model-hashes.json');
  }

  /**
   * Load the hash cache
   */
  async loadCache(): Promise<ModelHashCache> {
    if (!(await fs.pathExists(this.cachePath))) {
      return {
        version: '1.0',
        lastSync: new Date().toISOString(),
        models: {},
      };
    }

    try {
      const content = await fs.readFile(this.cachePath, 'utf-8');
      return JSON.parse(content) as ModelHashCache;
    } catch (error) {
      console.error('Failed to load cache:', error);
      return {
        version: '1.0',
        lastSync: new Date().toISOString(),
        models: {},
      };
    }
  }

  /**
   * Save the hash cache
   */
  async saveCache(cache: ModelHashCache): Promise<void> {
    await fs.ensureDir(path.dirname(this.cachePath));
    cache.lastSync = new Date().toISOString();
    await fs.writeFile(this.cachePath, JSON.stringify(cache, null, 2), 'utf-8');
  }

  /**
   * Detect changes for a specific model
   */
  async detectChanges(
    modelName: string,
    warehouseTable: string,
    connector: BaseWarehouseConnector,
    dbtIntegration: DbtIntegration
  ): Promise<ChangeDetection> {
    const cache = await this.loadCache();
    const cached = cache.models[modelName];

    // If no cache, it's a new model
    if (!cached) {
      return {
        modelName,
        schemaChanged: true,
        documentationChanged: true,
        logicChanged: true,
        isNew: true,
        shouldReprofile: true,
      };
    }

    // Check for changes
    const schemaChanged = await this.hasSchemaChanged(warehouseTable, cached.schemaHash, connector);
    const documentationChanged = await this.hasDocumentationChanged(
      modelName,
      cached.documentationHash,
      dbtIntegration
    );
    const logicChanged = await this.hasLogicChanged(modelName, cached.logicHash, dbtIntegration);

    return {
      modelName,
      schemaChanged,
      documentationChanged,
      logicChanged,
      isNew: false,
      shouldReprofile: schemaChanged || documentationChanged || logicChanged,
    };
  }

  /**
   * Check if warehouse schema has changed
   */
  private async hasSchemaChanged(
    warehouseTable: string,
    cachedHash: string,
    connector: BaseWarehouseConnector
  ): Promise<boolean> {
    try {
      const [schema, table] = this.parseTableName(warehouseTable);
      const tableSchema = await connector.getTableSchema(schema, table);

      // Hash the schema (column names, types, nullability)
      const schemaString = JSON.stringify(
        tableSchema.columns.map((col) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
        }))
      );

      const currentHash = this.hash(schemaString);
      return currentHash !== cachedHash;
    } catch (error) {
      console.error(`Failed to check schema for ${warehouseTable}:`, error);
      return true; // Assume changed if we can't check
    }
  }

  /**
   * Check if dbt documentation has changed
   */
  private async hasDocumentationChanged(
    modelName: string,
    cachedHash: string,
    dbtIntegration: DbtIntegration
  ): Promise<boolean> {
    try {
      const docs = await dbtIntegration.getModelDocumentation(modelName);

      if (!docs) {
        // No docs found, hash is empty
        return cachedHash !== this.hash('');
      }

      // Hash the documentation
      const docsString = JSON.stringify({
        description: docs.description || '',
        columns: docs.columns,
      });

      const currentHash = this.hash(docsString);
      return currentHash !== cachedHash;
    } catch (error) {
      console.error(`Failed to check documentation for ${modelName}:`, error);
      return false; // Assume unchanged if we can't check docs
    }
  }

  /**
   * Check if model logic (compiled SQL) has changed
   */
  private async hasLogicChanged(
    modelName: string,
    cachedHash: string,
    dbtIntegration: DbtIntegration
  ): Promise<boolean> {
    try {
      const compiledSql = await dbtIntegration.getCompiledSql(modelName);

      if (!compiledSql) {
        return false; // Can't check, assume unchanged
      }

      // Normalize SQL (remove comments and extra whitespace)
      const normalized = this.normalizeSql(compiledSql);
      const currentHash = this.hash(normalized);

      return currentHash !== cachedHash;
    } catch (error) {
      console.error(`Failed to check logic for ${modelName}:`, error);
      return false; // Assume unchanged if we can't check
    }
  }

  /**
   * Calculate hashes for a model and save to cache
   */
  async updateModelHashes(
    modelName: string,
    warehouseTable: string,
    profilePath: string,
    connector: BaseWarehouseConnector,
    dbtIntegration: DbtIntegration
  ): Promise<void> {
    const cache = await this.loadCache();

    try {
      // Calculate schema hash
      const [schema, table] = this.parseTableName(warehouseTable);
      const tableSchema = await connector.getTableSchema(schema, table);
      const schemaString = JSON.stringify(
        tableSchema.columns.map((col) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
        }))
      );
      const schemaHash = this.hash(schemaString);

      // Calculate documentation hash
      const docs = await dbtIntegration.getModelDocumentation(modelName);
      const docsString = JSON.stringify({
        description: docs?.description || '',
        columns: docs?.columns || [],
      });
      const documentationHash = this.hash(docsString);

      // Calculate logic hash
      const compiledSql = await dbtIntegration.getCompiledSql(modelName);
      const normalized = compiledSql ? this.normalizeSql(compiledSql) : '';
      const logicHash = this.hash(normalized);

      // Update cache
      cache.models[modelName] = {
        schemaHash,
        documentationHash,
        logicHash,
        lastProfiled: new Date().toISOString(),
        profilePath,
        warehouseTable,
      };

      await this.saveCache(cache);
    } catch (error) {
      console.error(`Failed to update hashes for ${modelName}:`, error);
    }
  }

  /**
   * Normalize SQL for comparison (remove comments, extra whitespace)
   */
  private normalizeSql(sql: string): string {
    return (
      sql
        // Remove single-line comments
        .replace(/--.*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
    );
  }

  /**
   * Parse table name into schema and table
   */
  private parseTableName(fullName: string): [string, string] {
    const parts = fullName.split('.');
    if (parts.length === 3) {
      // database.schema.table
      return [parts[1], parts[2]];
    } else if (parts.length === 2) {
      // schema.table
      return [parts[0], parts[1]];
    } else {
      // Just table name, assume default schema
      return ['public', fullName];
    }
  }

  /**
   * Hash a string using SHA256
   */
  private hash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Clear the cache
   */
  async clearCache(): Promise<void> {
    if (await fs.pathExists(this.cachePath)) {
      await fs.remove(this.cachePath);
    }
  }
}
