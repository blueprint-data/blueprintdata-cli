import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema.ts',
  out: '.blueprintdata/migrations',
  driver: 'turso', // Turso uses libsql
  dbCredentials: {
    url: 'file:.blueprintdata/analytics.db',
  },
  verbose: process.env.BLUEPRINTDATA_DEBUG === 'true',
} satisfies Config;
