import { BigQuery } from '@google-cloud/bigquery';
import { BaseWarehouseConnector, TableSchema, ColumnInfo, QueryResult } from './connection.js';
import { WarehouseConnection } from '../types.js';

export class BigQueryConnector extends BaseWarehouseConnector {
  private client: BigQuery;

  constructor(connection: WarehouseConnection) {
    super(connection);

    if (connection.type !== 'bigquery') {
      throw new Error('Invalid connection type for BigQuery connector');
    }

    // Initialize BigQuery client with proper authentication handling
    const options: {
      projectId?: string;
      keyFilename?: string;
      location?: string;
    } = {};

    if (connection.projectId) {
      options.projectId = connection.projectId;
    }

    if (connection.location) {
      options.location = connection.location;
    }

    // Handle different authentication methods
    const authMethod = connection.schema; // Auth method is passed via schema field

    if (authMethod === 'service-account' && connection.keyFilePath) {
      // Service account with key file
      options.keyFilename = connection.keyFilePath;
    } else if (authMethod === 'application-default' || authMethod === 'oauth' || !authMethod) {
      // Use application default credentials (gcloud auth)
      // Don't pass keyFilename - BigQuery SDK will use ADC automatically
      // This includes:
      // - gcloud auth application-default login
      // - GOOGLE_APPLICATION_CREDENTIALS env var
      // - GCE/Cloud Run/Cloud Functions metadata server
    }
    // For other methods (oauth-secrets, service-account-json), ADC will handle them

    this.client = new BigQuery(options);
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to list datasets to test connection
      const [datasets] = await this.client.getDatasets();
      return datasets.length >= 0; // Even 0 datasets is a successful connection
    } catch (error) {
      console.error('BigQuery connection test failed:', error);
      return false;
    }
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    try {
      const options = {
        query: sql,
        location: this.connection.location,
        params: params,
      };

      const [job] = await this.client.createQueryJob(options);
      const [rows] = await job.getQueryResults();

      // Get column names from the first row
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        columns,
        rows: rows as Record<string, unknown>[],
        rowCount: rows.length,
      };
    } catch (error) {
      throw new Error(
        `BigQuery query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getTableSchema(schemaName: string, tableName: string): Promise<TableSchema> {
    try {
      const projectId = this.connection.projectId || (await this.client.getProjectId());
      const dataset = this.client.dataset(schemaName);
      const table = dataset.table(tableName);

      const [metadata] = await table.getMetadata();
      const schema = metadata.schema;

      const columns: ColumnInfo[] = schema.fields.map(
        (field: { name: string; type: string; mode: string; description?: string }) => ({
          name: field.name,
          type: field.type,
          nullable: field.mode !== 'REQUIRED',
          description: field.description,
        })
      );

      // Get row count
      let rowCount: number | undefined;
      try {
        const countQuery = `SELECT COUNT(*) as count FROM \`${projectId}.${schemaName}.${tableName}\``;
        const result = await this.query(countQuery);
        rowCount = result.rows[0]?.count as number;
      } catch {
        // Row count is optional, ignore errors
      }

      return {
        tableName,
        schemaName,
        columns,
        rowCount,
        sizeInBytes: metadata.numBytes ? parseInt(metadata.numBytes) : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to get BigQuery table schema: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async listTables(schemaName?: string): Promise<Array<{ schemaName: string; tableName: string }>> {
    try {
      const results: Array<{ schemaName: string; tableName: string }> = [];

      if (schemaName) {
        // List tables in specific dataset
        const dataset = this.client.dataset(schemaName);
        const [tables] = await dataset.getTables();

        for (const table of tables) {
          results.push({
            schemaName,
            tableName: table.id || '',
          });
        }
      } else {
        // List tables in all datasets
        const [datasets] = await this.client.getDatasets();

        for (const dataset of datasets) {
          const datasetId = dataset.id || '';
          const [tables] = await dataset.getTables();

          for (const table of tables) {
            results.push({
              schemaName: datasetId,
              tableName: table.id || '',
            });
          }
        }
      }

      return results;
    } catch (error) {
      throw new Error(
        `Failed to list BigQuery tables: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async listSchemas(): Promise<string[]> {
    try {
      const [datasets] = await this.client.getDatasets();
      return datasets.map((dataset) => dataset.id || '').filter((id) => id !== '');
    } catch (error) {
      throw new Error(
        `Failed to list BigQuery datasets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async close(): Promise<void> {
    // BigQuery client doesn't need explicit closing
    return Promise.resolve();
  }
}
