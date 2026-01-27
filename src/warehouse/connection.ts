import { WarehouseConnection } from '../types.js';

export interface TableSchema {
  tableName: string;
  schemaName: string;
  columns: ColumnInfo[];
  rowCount?: number;
  sizeInBytes?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

/**
 * Base class for warehouse connections
 */
export abstract class BaseWarehouseConnector {
  protected connection: WarehouseConnection;

  constructor(connection: WarehouseConnection) {
    this.connection = connection;
  }

  /**
   * Test the connection to the warehouse
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Execute a SQL query and return results
   */
  abstract query(sql: string, params?: unknown[]): Promise<QueryResult>;

  /**
   * Get schema information for a specific table
   */
  abstract getTableSchema(schemaName: string, tableName: string): Promise<TableSchema>;

  /**
   * List all tables in a schema
   */
  abstract listTables(
    schemaName?: string
  ): Promise<Array<{ schemaName: string; tableName: string }>>;

  /**
   * Get all schemas in the warehouse
   */
  abstract listSchemas(): Promise<string[]>;

  /**
   * Close the connection
   */
  abstract close(): Promise<void>;

  /**
   * Get connection info (for logging)
   */
  getConnectionInfo(): string {
    if (this.connection.type === 'bigquery') {
      return `BigQuery: ${this.connection.projectId}`;
    } else {
      return `Postgres: ${this.connection.host}:${this.connection.port}/${this.connection.database}`;
    }
  }
}

/**
 * Factory function to create warehouse connector
 */
export const createWarehouseConnector = async (
  connection: WarehouseConnection
): Promise<BaseWarehouseConnector> => {
  if (connection.type === 'bigquery') {
    const { BigQueryConnector } = await import('./bigquery.js');
    return new BigQueryConnector(connection);
  } else if (connection.type === 'postgres') {
    const { PostgresConnector } = await import('./postgres.js');
    return new PostgresConnector(connection);
  } else {
    throw new Error(`Unsupported warehouse type: ${connection.type}`);
  }
};
