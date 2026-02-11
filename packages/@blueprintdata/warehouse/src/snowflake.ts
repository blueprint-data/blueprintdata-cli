import snowflake from 'snowflake-sdk';
import { BaseWarehouseConnector, TableSchema, ColumnInfo, QueryResult } from './connection.js';
import { WarehouseConnection } from '@blueprintdata/models';

export class SnowflakeConnector extends BaseWarehouseConnector {
  private client: snowflake.Connection;
  private connected = false;
  private static configured = false;

  constructor(connection: WarehouseConnection) {
    super(connection);

    if (!SnowflakeConnector.configured) {
      const logLevel: snowflake.LogLevel =
        process.env.BLUEPRINTDATA_VERBOSE === '1' ? 'INFO' : 'OFF';
      snowflake.configure({ logLevel });
      SnowflakeConnector.configured = true;
    }

    if (connection.type !== 'snowflake') {
      throw new Error('Invalid connection type for Snowflake connector');
    }

    if (!connection.account) {
      throw new Error('Snowflake account is required');
    }

    const account = connection.account;
    if (!account) {
      throw new Error('Snowflake account is required');
    }

    const options: snowflake.ConnectionOptions = {
      account,
      username: connection.user,
      warehouse: connection.warehouse,
      database: connection.database,
      schema: connection.schema,
      role: connection.role,
      authenticator: this.normalizeAuthenticator(
        connection.authenticator,
        connection.privateKeyPath,
        connection.privateKey
      ),
      privateKey: connection.privateKey,
      privateKeyPath: connection.privateKeyPath,
      privateKeyPass: connection.privateKeyPassphrase,
    };

    if (connection.password) {
      options.password = connection.password;
    }

    this.client = snowflake.createConnection(options);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.executeQuery('SELECT 1');
      return true;
    } catch (error) {
      console.error('Snowflake connection test failed:', error);
      return false;
    }
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    try {
      const result = await this.executeQuery(sql, params);

      return {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rows.length,
      };
    } catch (error) {
      throw new Error(
        `Snowflake query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getTableSchema(schemaName: string, tableName: string): Promise<TableSchema> {
    try {
      const database = this.quoteIdentifier(this.connection.database);
      const columnQuery = `
        SELECT
          column_name,
          data_type,
          is_nullable
        FROM ${database}.INFORMATION_SCHEMA.COLUMNS
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position
      `;

      const columnResult = await this.query(columnQuery, [schemaName, tableName]);

      const columns: ColumnInfo[] = columnResult.rows.map((row) => ({
        name: String(this.getRowValue(row, 'column_name', 'COLUMN_NAME') ?? ''),
        type: String(this.getRowValue(row, 'data_type', 'DATA_TYPE') ?? ''),
        nullable:
          String(this.getRowValue(row, 'is_nullable', 'IS_NULLABLE') ?? '').toUpperCase() === 'YES',
      }));

      let rowCount: number | undefined;
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${database}.${this.quoteIdentifier(
          schemaName
        )}.${this.quoteIdentifier(tableName)}`;
        const result = await this.query(countQuery);
        const countValue = this.getRowValue(result.rows[0] ?? {}, 'count', 'COUNT');
        if (countValue !== undefined) {
          rowCount = Number(countValue);
        }
      } catch {
        // Row count is optional, ignore errors
      }

      let sizeInBytes: number | undefined;
      try {
        const sizeQuery = `
          SELECT bytes
          FROM ${database}.INFORMATION_SCHEMA.TABLES
          WHERE table_schema = ? AND table_name = ?
        `;
        const result = await this.query(sizeQuery, [schemaName, tableName]);
        const sizeValue = this.getRowValue(result.rows[0] ?? {}, 'bytes', 'BYTES');
        if (sizeValue !== undefined) {
          sizeInBytes = Number(sizeValue);
        }
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
        `Failed to get Snowflake table schema: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async listTables(schemaName?: string): Promise<Array<{ schemaName: string; tableName: string }>> {
    try {
      const database = this.quoteIdentifier(this.connection.database);
      const query = `
        SELECT table_schema, table_name
        FROM ${database}.INFORMATION_SCHEMA.TABLES
        WHERE table_type = 'BASE TABLE'
          AND table_schema != 'INFORMATION_SCHEMA'
          ${schemaName ? 'AND table_schema = ?' : ''}
        ORDER BY table_schema, table_name
      `;

      const params = schemaName ? [schemaName] : undefined;
      const result = await this.query(query, params);

      return result.rows
        .map((row) => ({
          schemaName: String(this.getRowValue(row, 'table_schema', 'TABLE_SCHEMA') ?? ''),
          tableName: String(this.getRowValue(row, 'table_name', 'TABLE_NAME') ?? ''),
        }))
        .filter((row) => row.schemaName && row.tableName);
    } catch (error) {
      throw new Error(
        `Failed to list Snowflake tables: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async listSchemas(): Promise<string[]> {
    try {
      const database = this.quoteIdentifier(this.connection.database);
      const query = `
        SELECT schema_name
        FROM ${database}.INFORMATION_SCHEMA.SCHEMATA
        WHERE schema_name != 'INFORMATION_SCHEMA'
        ORDER BY schema_name
      `;

      const result = await this.query(query);
      return result.rows
        .map((row) => String(this.getRowValue(row, 'schema_name', 'SCHEMA_NAME') ?? ''))
        .filter((schema) => schema);
    } catch (error) {
      throw new Error(
        `Failed to list Snowflake schemas: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.client.destroy((error: Error | undefined | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async connectIfNeeded(): Promise<void> {
    if (this.connected) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.client.connect((error: Error | undefined | null) => {
        if (error) {
          reject(error);
        } else {
          this.connected = true;
          resolve();
        }
      });
    });
  }

  private async executeQuery(
    sql: string,
    params?: unknown[]
  ): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
    await this.connectIfNeeded();

    return await new Promise((resolve, reject) => {
      const binds = params
        ? (params.map((value) => (value === undefined ? null : value)) as snowflake.Binds)
        : undefined;

      this.client.execute({
        sqlText: sql,
        binds,
        complete: (
          error: snowflake.SnowflakeError | undefined,
          statement: snowflake.RowStatement | snowflake.FileAndStageBindStatement,
          rows?: Array<Record<string, unknown>>
        ) => {
          if (error) {
            reject(error);
            return;
          }

          const resolvedRows = (rows || []) as Record<string, unknown>[];
          const columns =
            statement?.getColumns?.()?.map((column) => column.getName()) ||
            (resolvedRows[0] ? Object.keys(resolvedRows[0]) : []);

          resolve({ columns, rows: resolvedRows });
        },
      });
    });
  }

  private quoteIdentifier(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private getRowValue(row: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
      if (key in row) {
        return row[key];
      }

      const lowerKey = key.toLowerCase();
      const upperKey = key.toUpperCase();
      if (lowerKey in row) {
        return row[lowerKey];
      }
      if (upperKey in row) {
        return row[upperKey];
      }

      const match = Object.keys(row).find((rowKey) => rowKey.toLowerCase() === lowerKey);
      if (match) {
        return row[match];
      }
    }

    return undefined;
  }

  private normalizeAuthenticator(
    authenticator?: string,
    privateKeyPath?: string,
    privateKey?: string
  ): string | undefined {
    if (!authenticator && (privateKeyPath || privateKey)) {
      return 'SNOWFLAKE_JWT';
    }

    if (authenticator && authenticator.toLowerCase() === 'snowflake_jwt') {
      return 'SNOWFLAKE_JWT';
    }

    return authenticator;
  }
}
