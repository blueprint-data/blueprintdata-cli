import { WarehouseConnection } from '../../types.js';
import { TableSchema, ColumnInfo, QueryResult } from '../../warehouse/connection.js';

/**
 * Create a mock Postgres warehouse connection
 */
export function createMockPostgresConnection(
  overrides?: Partial<WarehouseConnection>
): WarehouseConnection {
  return {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    user: 'test_user',
    password: 'test_password',
    database: 'test_db',
    ...overrides,
  };
}

/**
 * Create a mock BigQuery warehouse connection
 */
export function createMockBigQueryConnection(
  overrides?: Partial<WarehouseConnection>
): WarehouseConnection {
  return {
    type: 'bigquery',
    project: 'test-project',
    dataset: 'test_dataset',
    keyfilePath: '/path/to/keyfile.json',
    ...overrides,
  };
}

/**
 * Create a mock table schema with customizable columns
 */
export function createMockTableSchema(
  schemaName: string = 'public',
  tableName: string = 'test_table',
  columnCount: number = 5
): TableSchema {
  const columns: ColumnInfo[] = [];

  columns.push({
    name: 'id',
    type: 'integer',
    nullable: false,
    isPrimaryKey: true,
  });

  for (let i = 1; i < columnCount; i++) {
    columns.push({
      name: `column_${i}`,
      type: i % 3 === 0 ? 'integer' : i % 3 === 1 ? 'varchar' : 'timestamp',
      nullable: i % 2 === 0,
      isPrimaryKey: false,
    });
  }

  return {
    schemaName,
    tableName,
    columns,
  };
}

/**
 * Create a mock query result with sample data
 */
export function createMockQueryResult(rows: any[] = [], rowCount?: number): QueryResult {
  return {
    rows,
    rowCount: rowCount !== undefined ? rowCount : rows.length,
  };
}

/**
 * Create a mock statistics query result
 */
export function createMockStatsQueryResult(options?: {
  rowCount?: number;
  distinctCount?: number;
  nonNullCount?: number;
  minValue?: any;
  maxValue?: any;
}): QueryResult {
  const {
    rowCount = 1000,
    distinctCount = 500,
    nonNullCount = 950,
    minValue = 1,
    maxValue = 1000,
  } = options || {};

  return {
    rows: [
      {
        row_count: rowCount,
        distinct_count: distinctCount,
        non_null_count: nonNullCount,
        min_value: minValue,
        max_value: maxValue,
      },
    ],
    rowCount: 1,
  };
}

/**
 * Create multiple mock table schemas for testing
 */
export function createMockTableSchemas(count: number = 3): TableSchema[] {
  const schemas: TableSchema[] = [];

  for (let i = 0; i < count; i++) {
    schemas.push(
      createMockTableSchema(
        i % 2 === 0 ? 'public' : 'staging',
        `table_${i}`,
        3 + (i % 3)
      )
    );
  }

  return schemas;
}

/**
 * Create a mock column info
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
