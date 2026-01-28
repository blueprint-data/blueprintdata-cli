import {
  LLMProvider,
  CompanyContext,
  StorageType,
  WarehouseConnection,
} from '@blueprintdata/models';

/**
 * Project configuration
 */
export interface ProjectConfig {
  projectPath: string;
  dbtProfilesPath: string;
  dbtTarget?: string;
}

/**
 * LLM provider configuration
 */
export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  chatModel: string;
  profilingModel: string;
}

/**
 * Warehouse configuration
 */
export interface WarehouseConfig {
  type: StorageType;
  connection: WarehouseConnection;
}

/**
 * Company context configuration
 */
export interface CompanyConfig {
  context: CompanyContext;
  modelSelection?: string;
}

/**
 * Interface configuration (UI/Gateway ports)
 */
export interface InterfaceConfig {
  uiPort: number;
  gatewayPort: number;
}

/**
 * Slack bot configuration
 */
export interface SlackConfig {
  botToken: string;
  signingSecret: string;
}

/**
 * New hierarchical analytics configuration
 */
export interface AnalyticsConfigV2 {
  version: 2;
  project: ProjectConfig;
  llm: LLMConfig;
  warehouse: WarehouseConfig;
  company?: CompanyConfig;
  interface: InterfaceConfig;
  slack?: SlackConfig;
}

/**
 * Legacy flat configuration (for migration)
 */
export interface AnalyticsConfigV1 {
  projectPath: string;
  dbtProfilesPath: string;
  dbtTarget?: string;
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmModel: string;
  llmProfilingModel?: string;
  warehouseType: StorageType;
  warehouseConnection: WarehouseConnection;
  companyContext?: CompanyContext;
  modelSelection?: string;
  slackBotToken?: string;
  slackSigningSecret?: string;
  uiPort?: number;
  gatewayPort?: number;
}

/**
 * Union type for both config versions
 */
export type AnalyticsConfigAny = AnalyticsConfigV1 | AnalyticsConfigV2;
