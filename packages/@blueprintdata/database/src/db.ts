import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';

export interface DatabaseConfig {
  dbPath: string;
  debug?: boolean;
}

export const createDatabase = (config: DatabaseConfig) => {
  const client = createClient({
    url: `file:${config.dbPath}`,
  });

  if (config.debug) {
    // LibSQL doesn't have trace event like better-sqlite3
    // We'll log queries at the drizzle level
    console.log('[DB] Debug mode enabled');
  }

  return drizzle(client, { schema, logger: config.debug });
};

export type Database = ReturnType<typeof createDatabase>;

// Helper to check if database exists
import { existsSync } from 'fs';

export const databaseExists = (dbPath: string): boolean => {
  return existsSync(dbPath);
};

// Helper to ensure directory exists
import { dirname } from 'path';
import { mkdirSync as fsMkdirSync } from 'fs';

export const ensureDatabaseDirectory = (dbPath: string): void => {
  const dir = dirname(dbPath);
  try {
    fsMkdirSync(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
};
