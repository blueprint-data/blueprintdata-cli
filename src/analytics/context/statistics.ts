import { BaseWarehouseConnector, ColumnInfo } from '../../warehouse/connection.js';
import { EnhancedTableStats, EnhancedColumnStats } from '../../types.js';

/**
 * Enhanced statistics gatherer - collects detailed stats for LLM profiling
 */
export class StatisticsGatherer {
  private connector: BaseWarehouseConnector;

  constructor(connector: BaseWarehouseConnector) {
    this.connector = connector;
  }

  /**
   * Gather enhanced statistics for a table
   */
  async gatherTableStats(schemaName: string, tableName: string): Promise<EnhancedTableStats> {
    // Get basic schema
    const tableSchema = await this.connector.getTableSchema(schemaName, tableName);

    console.log(`      Analyzing ${tableSchema.columns.length} columns...`);

    // Enhance each column with additional statistics
    const enhancedColumns: EnhancedColumnStats[] = [];

    for (let i = 0; i < tableSchema.columns.length; i++) {
      const column = tableSchema.columns[i];
      const colStart = Date.now();
      const enhanced = await this.gatherColumnStats(schemaName, tableName, column);
      const colTime = Date.now() - colStart;

      if (colTime > 1000) {
        console.log(`      • ${column.name} (${colTime}ms)`);
      }

      enhancedColumns.push(enhanced);

      // Progress indicator every 5 columns
      if ((i + 1) % 5 === 0) {
        console.log(`      Progress: ${i + 1}/${tableSchema.columns.length} columns`);
      }
    }

    // Detect time range if there's a date/timestamp column
    console.log(`      Detecting time range...`);
    const timeRange = await this.detectTimeRange(schemaName, tableName, tableSchema.columns);

    return {
      tableName,
      schemaName,
      rowCount: tableSchema.rowCount,
      sizeInBytes: tableSchema.sizeInBytes,
      columns: enhancedColumns,
      timeRange,
    };
  }

  /**
   * Gather enhanced statistics for a single column
   */
  private async gatherColumnStats(
    schemaName: string,
    tableName: string,
    column: ColumnInfo
  ): Promise<EnhancedColumnStats> {
    const stats: EnhancedColumnStats = {
      name: column.name,
      type: column.type,
      nullable: column.nullable,
    };

    try {
      // Get distinct count and null percentage
      const basicStats = await this.getBasicColumnStats(schemaName, tableName, column.name);
      stats.distinctCount = basicStats.distinctCount;
      stats.nullPercentage = basicStats.nullPercentage;

      // Get min/max for numeric and date columns
      if (this.isNumericColumn(column.type) || this.isDateColumn(column.type)) {
        const minMax = await this.getMinMax(schemaName, tableName, column.name);
        stats.minValue = minMax.min;
        stats.maxValue = minMax.max;
      }

      // Get sample values (top 5 most common)
      stats.sampleValues = await this.getSampleValues(schemaName, tableName, column.name);
    } catch (error) {
      // If we can't get stats, just return basic info
      console.error(`Failed to get stats for ${column.name}:`, error);
    }

    return stats;
  }

  /**
   * Get basic column statistics (distinct count, null percentage)
   */
  private async getBasicColumnStats(
    schemaName: string,
    tableName: string,
    columnName: string
  ): Promise<{ distinctCount: number; nullPercentage: number }> {
    const query = `
      SELECT 
        COUNT(DISTINCT "${columnName}") as distinct_count,
        COUNT(*) as total_count,
        SUM(CASE WHEN "${columnName}" IS NULL THEN 1 ELSE 0 END) as null_count
      FROM "${schemaName}"."${tableName}"
    `;

    try {
      const result = await this.connector.query(query);
      const row = result.rows[0];

      const totalCount = parseInt(row.total_count as string) || 0;
      const nullCount = parseInt(row.null_count as string) || 0;
      const distinctCount = parseInt(row.distinct_count as string) || 0;

      const nullPercentage = totalCount > 0 ? (nullCount / totalCount) * 100 : 0;

      return { distinctCount, nullPercentage };
    } catch (error) {
      return { distinctCount: 0, nullPercentage: 0 };
    }
  }

  /**
   * Get min and max values for a column
   */
  private async getMinMax(
    schemaName: string,
    tableName: string,
    columnName: string
  ): Promise<{ min?: string | number; max?: string | number }> {
    const query = `
      SELECT 
        MIN("${columnName}") as min_value,
        MAX("${columnName}") as max_value
      FROM "${schemaName}"."${tableName}"
    `;

    try {
      const result = await this.connector.query(query);
      const row = result.rows[0];

      return {
        min: row.min_value as string | number,
        max: row.max_value as string | number,
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Get sample values (top 5 most common non-null values)
   */
  private async getSampleValues(
    schemaName: string,
    tableName: string,
    columnName: string
  ): Promise<Array<string | number>> {
    const query = `
      SELECT "${columnName}" as value, COUNT(*) as count
      FROM "${schemaName}"."${tableName}"
      WHERE "${columnName}" IS NOT NULL
      GROUP BY "${columnName}"
      ORDER BY count DESC
      LIMIT 5
    `;

    try {
      const result = await this.connector.query(query);
      return result.rows.map((row) => row.value as string | number);
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect time range from date/timestamp columns
   */
  private async detectTimeRange(
    schemaName: string,
    tableName: string,
    columns: ColumnInfo[]
  ): Promise<{ minDate?: string; maxDate?: string } | undefined> {
    // Find first date/timestamp column
    const dateColumn = columns.find((col) => this.isDateColumn(col.type));

    if (!dateColumn) {
      return undefined;
    }

    try {
      const minMax = await this.getMinMax(schemaName, tableName, dateColumn.name);

      if (minMax.min && minMax.max) {
        return {
          minDate: minMax.min.toString(),
          maxDate: minMax.max.toString(),
        };
      }
    } catch (error) {
      // Ignore errors
    }

    return undefined;
  }

  /**
   * Check if column type is numeric
   */
  private isNumericColumn(type: string): boolean {
    const numericTypes = [
      'int',
      'integer',
      'bigint',
      'smallint',
      'tinyint',
      'decimal',
      'numeric',
      'float',
      'double',
      'real',
      'int64',
      'int32',
      'float64',
    ];

    return numericTypes.some((t) => type.toLowerCase().includes(t));
  }

  /**
   * Check if column type is date/timestamp
   */
  private isDateColumn(type: string): boolean {
    const dateTypes = ['date', 'timestamp', 'datetime', 'time'];
    return dateTypes.some((t) => type.toLowerCase().includes(t));
  }
}
