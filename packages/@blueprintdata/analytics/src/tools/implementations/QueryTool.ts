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
    const sql = String(args.sql || '').trim();
    const limit = (args.limit as number) || 1000;

    if (!sql) {
      throw new Error('SQL query is required');
    }

    // Validate that it's a read-only query (allow SELECT / WITH only)
    const normalized = sql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();

    const statementCount = normalized
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.length > 0).length;
    if (statementCount > 1) {
      throw new Error('Only single-statement SELECT queries are allowed');
    }

    const startsWithSelect = /^SELECT\b/i.test(normalized);
    const startsWithWith = /^WITH\b/i.test(normalized);

    if (!startsWithSelect && !startsWithWith) {
      throw new Error('Only SELECT queries are allowed');
    }

    if (startsWithWith && !/\bSELECT\b/i.test(normalized)) {
      throw new Error('Only SELECT queries are allowed');
    }

    // Add limit if not present
    const sqlWithoutTrailingSemicolon = sql.replace(/;\s*$/, '');
    let finalSql = sqlWithoutTrailingSemicolon;
    if (!/\bLIMIT\b/i.test(sqlWithoutTrailingSemicolon)) {
      finalSql = `${sqlWithoutTrailingSemicolon} LIMIT ${limit}`;
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
      const baseMessage = error instanceof Error ? error.message : 'Unknown error';
      const hints = await buildQueryErrorHints(baseMessage, sql, context);
      if (hints) {
        throw new Error(`Query failed: ${baseMessage}\nHINTS: ${JSON.stringify(hints)}`);
      }
      throw new Error(`Query failed: ${baseMessage}`);
    }
  },
};

type QueryErrorHint = {
  errorType: 'column_not_found' | 'table_not_found' | 'unknown';
  missingColumn?: string;
  table?: {
    schemaName?: string;
    tableName?: string;
  };
  availableColumns?: string[];
  availableTables?: Array<{ schemaName: string; tableName: string }>;
  truncated?: boolean;
};

const MAX_HINT_COLUMNS = 60;
const MAX_HINT_TABLES = 60;

async function buildQueryErrorHints(
  message: string,
  sql: string,
  context: ToolContext
): Promise<QueryErrorHint | null> {
  const missingColumn = parseMissingColumn(message);
  const tableFromError = parseMissingTableFromError(message);
  const tableFromSql = parseTableFromSql(sql);
  const table = tableFromError || tableFromSql;

  if (missingColumn) {
    if (!table?.schemaName || !table?.tableName) {
      return {
        errorType: 'column_not_found',
        missingColumn,
      };
    }

    try {
      const schema = await context.warehouse.getTableSchema(table.schemaName, table.tableName);
      const columns = schema.columns.map((column) => column.name);
      return {
        errorType: 'column_not_found',
        missingColumn,
        table,
        availableColumns: columns.slice(0, MAX_HINT_COLUMNS),
        truncated: columns.length > MAX_HINT_COLUMNS,
      };
    } catch {
      return {
        errorType: 'column_not_found',
        missingColumn,
        table,
      };
    }
  }

  if (isTableNotFound(message)) {
    if (!table?.schemaName) {
      return { errorType: 'table_not_found' };
    }

    try {
      const tables = await context.warehouse.listTables(table.schemaName);
      return {
        errorType: 'table_not_found',
        table,
        availableTables: tables.slice(0, MAX_HINT_TABLES),
        truncated: tables.length > MAX_HINT_TABLES,
      };
    } catch {
      return { errorType: 'table_not_found', table };
    }
  }

  return null;
}

function parseMissingColumn(message: string): string | undefined {
  const snowflakeMatch = message.match(/invalid identifier\s*'([^']+)'/i);
  if (snowflakeMatch?.[1]) {
    return snowflakeMatch[1];
  }

  const bigQueryMatch = message.match(/unrecognized name:\s*([\w.]+)/i);
  if (bigQueryMatch?.[1]) {
    return bigQueryMatch[1];
  }

  const bigQueryNameMatch = message.match(/name\s+([\w.]+)\s+not found/i);
  if (bigQueryNameMatch?.[1]) {
    return bigQueryNameMatch[1];
  }

  return undefined;
}

function isTableNotFound(message: string): boolean {
  return (
    /does not exist or not authorized/i.test(message) ||
    /not found: table/i.test(message) ||
    /not found: dataset/i.test(message)
  );
}

function parseMissingTableFromError(
  message: string
): { schemaName?: string; tableName?: string } | undefined {
  const snowflakeMatch = message.match(/object\s+'([^']+)'\s+does not exist/i);
  if (snowflakeMatch?.[1]) {
    return parseTableIdentifier(snowflakeMatch[1]);
  }

  const bigQueryMatch = message.match(/not found: table\s+([^\s]+)/i);
  if (bigQueryMatch?.[1]) {
    return parseTableIdentifier(bigQueryMatch[1]);
  }

  return undefined;
}

function parseTableFromSql(sql: string): { schemaName?: string; tableName?: string } | undefined {
  const normalized = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const match = normalized.match(/\bfrom\s+([^\s,;]+)/i);
  if (!match?.[1]) {
    return undefined;
  }

  return parseTableIdentifier(match[1]);
}

function parseTableIdentifier(
  identifier: string
): { schemaName?: string; tableName?: string } | undefined {
  const cleaned = identifier
    .replace(/[()]/g, '')
    .replace(/`/g, '')
    .replace(/"/g, '')
    .replace(/\s.*$/, '')
    .trim();

  if (!cleaned) {
    return undefined;
  }

  const parts = cleaned.split('.').filter(Boolean);
  if (parts.length >= 2) {
    return {
      schemaName: parts[parts.length - 2],
      tableName: parts[parts.length - 1],
    };
  }

  if (parts.length === 1) {
    return { tableName: parts[0] };
  }

  return undefined;
}
