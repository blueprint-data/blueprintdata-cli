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
  dbtTarget?: string; // dbt target environment (prod, dev, etc.)
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmModel: string; // Model ID for chat (Phase 3+)
  llmProfilingModel?: string; // Optional: different model for profiling (Phase 2.2)
  warehouseType: StorageType;
  warehouseConnection: WarehouseConnection;
  // Company context (Phase 2.2)
  companyContext?: CompanyContext;
  // Model selection for profiling (Phase 2.2)
  modelSelection?: string; // dbt selection syntax (e.g., "marts.*", "tag:core")
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

// Phase 2.2: LLM-Powered Context Building Types

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  costPer1MInputTokens: number;
  costPer1MOutputTokens: number;
  speed: 'fast' | 'balanced' | 'slow';
  recommended?: 'chat' | 'profiling' | 'general';
}

export interface DbtModelMetadata {
  uniqueId: string;
  name: string;
  description?: string;
  materializedAs: string;
  database: string;
  schema: string;
  alias: string;
  tags: string[];
  columns: Array<{
    name: string;
    description?: string;
    tests?: string[];
  }>;
  dependsOn: {
    models: string[];
    sources: Array<{ source: string; table: string }>;
  };
  compiledSql?: string;
}

export interface ModelHashes {
  schemaHash: string;
  documentationHash: string;
  logicHash: string;
  lastProfiled: string; // ISO date string
  profilePath: string;
  warehouseTable: string;
}

export interface ModelHashCache {
  version: string;
  lastSync: string; // ISO date string
  models: Record<string, ModelHashes>;
}

export interface ProfileError {
  modelName: string;
  errorType: 'llm' | 'warehouse' | 'dbt';
  error: string;
  fallbackUsed: boolean;
}

export interface ProfileResult {
  modelName: string;
  success: boolean;
  duration: number;
  content?: string; // LLM-generated markdown content
  tokensUsed?: { input: number; output: number };
  error?: ProfileError;
}

export interface ProfileSummary {
  total: number;
  successful: number;
  fallback: number;
  failed: number;
  skipped: number;
  totalCost: number;
  totalTime: number;
  errors: ProfileError[];
}

export interface ModelSelector {
  include?: string[]; // --select patterns
  exclude?: string[]; // --exclude patterns
}

export interface ChangeDetection {
  modelName: string;
  schemaChanged: boolean;
  documentationChanged: boolean;
  logicChanged: boolean;
  isNew: boolean;
  shouldReprofile: boolean;
}

export interface EnhancedColumnStats {
  name: string;
  type: string;
  nullable: boolean;
  distinctCount?: number;
  nullPercentage?: number;
  minValue?: string | number;
  maxValue?: string | number;
  sampleValues?: Array<string | number>;
}

export interface EnhancedTableStats {
  tableName: string;
  schemaName: string;
  rowCount?: number;
  sizeInBytes?: number;
  columns: EnhancedColumnStats[];
  timeRange?: {
    minDate?: string;
    maxDate?: string;
  };
}

export interface CompanyContext {
  name?: string;
  websites?: string[];
  scrapedContent?: string[];
  userContext?: string;
  industry?: string;
  keyMetrics?: string[];
}
