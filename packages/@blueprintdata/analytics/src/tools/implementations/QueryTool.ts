import type { Tool, ToolContext } from '../types.js';

export const queryWarehouseTool: Tool = {
  definition: {
    name: 'query_warehouse',
    description:
      'Execute a read-only SQL query against the data warehouse. Use this to retrieve data for analysis.',
    parameters: [
      {
        name: 'sql',
        type: 'string',
        description: 'The SQL query to execute (SELECT statements only)',
        required: true,
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum number of rows to return (default: 1000)',
        required: false,
      },
    ],
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<unknown> {
    const sql = args.sql as string;
    const limit = (args.limit as number) || 1000;

    // Validate that it's a read-only query
    const upperSql = sql.trim().toUpperCase();
    const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE'];

    for (const keyword of forbiddenKeywords) {
      if (upperSql.includes(keyword)) {
        throw new Error(
          `Query contains forbidden keyword: ${keyword}. Only SELECT statements are allowed.`
        );
      }
    }

    if (!upperSql.startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed');
    }

    // Add limit if not present
    let finalSql = sql;
    if (!upperSql.includes('LIMIT')) {
      finalSql = `${sql} LIMIT ${limit}`;
    }

    try {
      const startTime = Date.now();
      const result = await context.warehouse.query(finalSql);
      const executionTime = Date.now() - startTime;

      return {
        rows: result.rows,
        columns: result.columns,
        rowCount: result.rows.length,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};
