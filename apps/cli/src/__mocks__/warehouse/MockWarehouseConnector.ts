import {
  BaseWarehouseConnector,
  TableSchema,
  ColumnInfo,
  QueryResult,
} from '@blueprintdata/warehouse';
import { WarehouseConnection } from '@blueprintdata/models';

/**
 * Mock warehouse connector for testing
 */
export class MockWarehouseConnector extends BaseWarehouseConnector {
  private mockSchemas: Map<string, TableSchema> = new Map();
  private mockQueryResults: Map<string, QueryResult> = new Map();
  private mockTables: Array<{ schemaName: string; tableName: string }> = [];
  private mockSchemaList: string[] = [];
  private shouldFailConnection = false;
  private shouldFailQuery = false;
  private queryCallHistory: string[] = [];

  constructor(connection?: WarehouseConnection) {
    super(
      connection || {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        user: 'test_user',
        password: 'test_password',
        database: 'test_db',
      }
    );
  }

  /**
   * Set mock schema for a specific table
   */
  setMockTableSchema(
    schemaName: string,
    tableName: string,
    schema: TableSchema
  ): void {
    const key = `${schemaName}.${tableName}`;
    this.mockSchemas.set(key, schema);
  }

  /**
   * Set mock query result for a specific SQL pattern
   */
  setMockQueryResult(sqlPattern: string, result: QueryResult): void {
    this.mockQueryResults.set(sqlPattern, result);
  }

  /**
   * Set the list of tables to return from listTables()
   */
  setMockTables(tables: Array<{ schemaName: string; tableName: string }>): void {
    this.mockTables = tables;
  }

  /**
   * Set the list of schemas to return from listSchemas()
   */
  setMockSchemas(schemas: string[]): void {
    this.mockSchemaList = schemas;
  }

  /**
   * Configure connection to fail
   */
  setShouldFailConnection(shouldFail: boolean): void {
    this.shouldFailConnection = shouldFail;
  }

  /**
   * Configure queries to fail
   */
  setShouldFailQuery(shouldFail: boolean): void {
    this.shouldFailQuery = shouldFail;
  }

  /**
   * Get query call history for assertions
   */
  getQueryCallHistory(): string[] {
    return this.queryCallHistory;
  }

  /**
   * Clear query call history
   */
  clearQueryCallHistory(): void {
    this.queryCallHistory = [];
  }

  /**
   * Reset all mock state
   */
  reset(): void {
    this.mockSchemas.clear();
    this.mockQueryResults.clear();
    this.mockTables = [];
    this.mockSchemaList = [];
    this.shouldFailConnection = false;
    this.shouldFailQuery = false;
    this.queryCallHistory = [];
  }

  /**
   * Mock implementation of testConnection
   */
  async testConnection(): Promise<boolean> {
    if (this.shouldFailConnection) {
      return false;
    }
    return true;
  }

  /**
   * Mock implementation of query
   */
  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    this.queryCallHistory.push(sql);

    if (this.shouldFailQuery) {
      throw new Error('Mock query failed');
    }

    for (const [pattern, result] of this.mockQueryResults.entries()) {
      if (sql.includes(pattern)) {
        return result;
      }
    }

    return {
      rows: [],
      rowCount: 0,
    };
  }

  /**
   * Mock implementation of getTableSchema
   */
  async getTableSchema(schemaName: string, tableName: string): Promise<TableSchema> {
    const key = `${schemaName}.${tableName}`;
    const schema = this.mockSchemas.get(key);

    if (!schema) {
      throw new Error(`Mock schema not found for ${key}`);
    }

    return schema;
  }

  /**
   * Mock implementation of listTables
   */
  async listTables(schema?: string): Promise<Array<{ schemaName: string; tableName: string }>> {
    if (schema) {
      return this.mockTables.filter((t) => t.schemaName === schema);
    }
    return this.mockTables;
  }

  /**
   * Mock implementation of listSchemas
   */
  async listSchemas(): Promise<string[]> {
    return this.mockSchemaList;
  }

  /**
   * Mock implementation of close
   */
  async close(): Promise<void> {
    // No-op for mock
  }
}

/**
 * Create a mock warehouse connector with sample data
 */
export function createMockWarehouseConnector(options?: {
  schemaName?: string;
  tableName?: string;
  columns?: ColumnInfo[];
}): MockWarehouseConnector {
  const connector = new MockWarehouseConnector();

  const schemaName = options?.schemaName || 'public';
  const tableName = options?.tableName || 'test_table';
  const columns: ColumnInfo[] = options?.columns || [
    {
      name: 'id',
      type: 'integer',
      nullable: false,
      isPrimaryKey: true,
    },
    {
      name: 'name',
      type: 'varchar',
      nullable: true,
      isPrimaryKey: false,
    },
    {
      name: 'created_at',
      type: 'timestamp',
      nullable: false,
      isPrimaryKey: false,
    },
  ];

  const schema: TableSchema = {
    schemaName,
    tableName,
    columns,
  };

  connector.setMockTableSchema(schemaName, tableName, schema);
  connector.setMockTables([{ schemaName, tableName }]);
  connector.setMockSchemas([schemaName]);

  connector.setMockQueryResult('SELECT COUNT(*)', {
    rows: [{ count: 1000 }],
    rowCount: 1,
  });

  connector.setMockQueryResult('SELECT DISTINCT', {
    rows: [{ count: 100 }],
    rowCount: 1,
  });

  return connector;
}

/**
 * Create column info for testing
 */
export function createMockColumn(overrides?: Partial<ColumnInfo>): ColumnInfo {
  return {
    name: 'test_column',
    type: 'varchar',
    nullable: true,
    isPrimaryKey: false,
    ...overrides,
  };
}

/**
 * Create table schema for testing
 */
export function createMockTableSchema(overrides?: Partial<TableSchema>): TableSchema {
  return {
    schemaName: 'public',
    tableName: 'test_table',
    columns: [
      createMockColumn({ name: 'id', type: 'integer', nullable: false, isPrimaryKey: true }),
      createMockColumn({ name: 'name', type: 'varchar' }),
      createMockColumn({ name: 'created_at', type: 'timestamp', nullable: false }),
    ],
    ...overrides,
  };
}
