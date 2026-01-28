import pg from 'pg';
import { BaseWarehouseConnector, TableSchema, ColumnInfo, QueryResult } from './connection.js';
import { WarehouseConnection } from '@blueprintdata/models';
import { DEFAULT_CONFIG } from '@blueprintdata/config';

const { Pool } = pg;

export class PostgresConnector extends BaseWarehouseConnector {
  private pool: pg.Pool;

  constructor(connection: WarehouseConnection) {
    super(connection);

    if (connection.type !== 'postgres') {
      throw new Error('Invalid connection type for Postgres connector');
    }

    // Initialize Postgres pool
    this.pool = new Pool({
      host: connection.host,
      port: connection.port,
      user: connection.user,
      password: connection.password,
      database: connection.database,
      max: DEFAULT_CONFIG.warehouse.poolSize,
      idleTimeoutMillis: DEFAULT_CONFIG.warehouse.connectionTimeout,
      connectionTimeoutMillis: DEFAULT_CONFIG.warehouse.connectionTimeout,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Postgres connection test failed:', error);
      return false;
    }
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    try {
      const result = await this.pool.query(sql, params);

      const columns = result.fields.map((field) => field.name);
      const rows = result.rows as Record<string, unknown>[];

      return {
        columns,
        rows,
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      throw new Error(
        `Postgres query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getTableSchema(schemaName: string, tableName: string): Promise<TableSchema> {
    try {
      // Query information_schema for column information
      const columnQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `;

      const columnResult = await this.query(columnQuery, [schemaName, tableName]);

      const columns: ColumnInfo[] = columnResult.rows.map((row) => ({
        name: row.column_name as string,
        type: this.formatPostgresType(row),
        nullable: row.is_nullable === 'YES',
      }));

      // Get row count
      let rowCount: number | undefined;
      try {
        const countQuery = `SELECT COUNT(*) as count FROM "${schemaName}"."${tableName}"`;
        const result = await this.query(countQuery);
        rowCount = parseInt(result.rows[0]?.count as string);
      } catch {
        // Row count is optional, ignore errors
      }

      // Get table size
      let sizeInBytes: number | undefined;
      try {
        const sizeQuery = `
          SELECT pg_total_relation_size($1::regclass) as size
        `;
        const result = await this.query(sizeQuery, [`${schemaName}.${tableName}`]);
        sizeInBytes = parseInt(result.rows[0]?.size as string);
      } catch {
        // Size is optional, ignore errors
      }

      return {
        tableName,
        schemaName,
        columns,
        rowCount,
        sizeInBytes,
      };
    } catch (error) {
      throw new Error(
        `Failed to get Postgres table schema: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async listTables(schemaName?: string): Promise<Array<{ schemaName: string; tableName: string }>> {
    try {
      const query = `
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
          ${schemaName ? `AND table_schema = $1` : ''}
        ORDER BY table_schema, table_name
      `;

      const params = schemaName ? [schemaName] : undefined;
      const result = await this.query(query, params);

      return result.rows.map((row) => ({
        schemaName: row.table_schema as string,
        tableName: row.table_name as string,
      }));
    } catch (error) {
      throw new Error(
        `Failed to list Postgres tables: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async listSchemas(): Promise<string[]> {
    try {
      const query = `
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        ORDER BY schema_name
      `;

      const result = await this.query(query);
      return result.rows.map((row) => row.schema_name as string);
    } catch (error) {
      throw new Error(
        `Failed to list Postgres schemas: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Format Postgres data type with length/precision/scale
   */
  private formatPostgresType(row: Record<string, unknown>): string {
    const type = row.data_type as string;

    if (row.character_maximum_length) {
      return `${type}(${row.character_maximum_length})`;
    }

    if (row.numeric_precision && row.numeric_scale) {
      return `${type}(${row.numeric_precision},${row.numeric_scale})`;
    }

    if (row.numeric_precision) {
      return `${type}(${row.numeric_precision})`;
    }

    return type;
  }
}
