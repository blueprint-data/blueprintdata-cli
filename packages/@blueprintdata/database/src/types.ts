import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { users, sessions, messages, queryExecutions } from './schema.js';

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Session types
export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

// Message types
export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

// Query execution types
export type QueryExecution = InferSelectModel<typeof queryExecutions>;
export type NewQueryExecution = InferInsertModel<typeof queryExecutions>;

// Extended types with relations
export interface SessionWithMessages extends Session {
  messages: Message[];
}

export interface UserWithSessions extends User {
  sessions: Session[];
}

// Metadata types for messages
export interface ToolCallMetadata {
  type: 'tool_call';
  tool: string;
  arguments: Record<string, unknown>;
  callId: string;
}

export interface ToolResultMetadata {
  type: 'tool_result';
  callId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface ChartMetadata {
  type: 'chart';
  chartType: 'line' | 'bar' | 'pie' | 'scatter';
  config: Record<string, unknown>;
}

export type MessageMetadata = ToolCallMetadata | ToolResultMetadata | ChartMetadata;
