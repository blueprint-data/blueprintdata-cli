export type StackType = 'lite' | 'lite-bigquery' | 'lite-postgres' | 'aws';

export type StorageType = 'postgres' | 'bigquery';

export interface ProjectConfig {
  stackType: StackType;
  projectName: string;
  storageType: StorageType;
  targetDir: string;
}

export interface TemplateConfig {
  name: string;
  repoUrl: string;
  branch?: string;
  path: string;
}

export interface TemplateOptions {
  force?: boolean;
  offline?: boolean;
}

export interface FetchedTemplate {
  path: string;
  isTemporary: boolean;
}

// Analytics types for Phase 1+

export type AgentRole = 'analytics-engineer' | 'data-analyst';

export type InterfaceType = 'ui' | 'slack';

export type LLMProvider = 'anthropic' | 'openai';

export interface AnalyticsConfig {
  projectPath: string;
  dbtProfilesPath: string;
  llmProvider: LLMProvider;
  llmApiKey: string;
  warehouseType: StorageType;
  warehouseConnection: WarehouseConnection;
  slackBotToken?: string;
  slackSigningSecret?: string;
  uiPort?: number;
  gatewayPort?: number;
}

export interface WarehouseConnection {
  type: StorageType;
  host?: string;
  port?: number;
  database: string;
  schema?: string;
  user?: string;
  password?: string;
  // BigQuery specific
  projectId?: string;
  location?: string;
  keyFilePath?: string;
}

export interface SessionState {
  sessionId: string;
  role: AgentRole;
  userId: string;
  interfaceType: InterfaceType;
  conversationHistory: Message[];
  createdAt: Date;
  lastActivityAt: Date;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  systemPrompt: string;
  summary: string;
  modelling: string;
  models: Record<string, string>; // table name -> markdown content
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  allowedRoles: AgentRole[];
  category: 'warehouse' | 'dbt' | 'git' | 'filesystem' | 'visualization';
}

export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
}
