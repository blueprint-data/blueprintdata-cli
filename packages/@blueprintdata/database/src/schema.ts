import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Sessions table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title'),
  status: text('status').default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Messages table
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id),
  role: text('role').notNull(), // 'user', 'assistant', 'system', 'tool'
  content: text('content').notNull(),
  metadata: text('metadata'), // JSON string for tool calls, charts, etc.
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Query executions table
export const queryExecutions = sqliteTable('query_executions', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id),
  query: text('query').notNull(),
  result: text('result'), // JSON string
  executionTimeMs: integer('execution_time_ms'),
  rowCount: integer('row_count'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  messages: many(messages),
  queryExecutions: many(queryExecutions),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
}));

export const queryExecutionsRelations = relations(queryExecutions, ({ one }) => ({
  session: one(sessions, {
    fields: [queryExecutions.sessionId],
    references: [sessions.id],
  }),
}));
