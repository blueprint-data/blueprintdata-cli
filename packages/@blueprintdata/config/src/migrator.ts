import {
  AnalyticsConfigV1,
  AnalyticsConfigV2,
  AnalyticsConfigAny,
  ProjectConfig,
  LLMConfig,
  WarehouseConfig,
  CompanyConfig,
  InterfaceConfig,
  SlackConfig,
} from './types.js';
import { DEFAULT_CONFIG } from './defaults.js';

/**
 * Check if config is V1 (legacy flat format)
 */
export function isConfigV1(config: AnalyticsConfigAny): config is AnalyticsConfigV1 {
  return !('version' in config) || config.version === undefined;
}

/**
 * Check if config is V2 (new hierarchical format)
 */
export function isConfigV2(config: AnalyticsConfigAny): config is AnalyticsConfigV2 {
  return 'version' in config && (config as AnalyticsConfigV2).version === 2;
}

/**
 * Migrate V1 config to V2 format
 */
export function migrateV1ToV2(v1: AnalyticsConfigV1): AnalyticsConfigV2 {
  const project: ProjectConfig = {
    projectPath: v1.projectPath,
    dbtProfilesPath: v1.dbtProfilesPath,
    dbtTarget: v1.dbtTarget,
  };

  const llm: LLMConfig = {
    provider: v1.llmProvider,
    apiKey: v1.llmApiKey,
    chatModel: v1.llmModel,
    profilingModel: v1.llmProfilingModel || v1.llmModel,
  };

  const warehouse: WarehouseConfig = {
    type: v1.warehouseType,
    connection: v1.warehouseConnection,
  };

  const company: CompanyConfig | undefined =
    v1.companyContext || v1.modelSelection
      ? {
          context: v1.companyContext || {},
          modelSelection: v1.modelSelection,
        }
      : undefined;

  const interfaceConfig: InterfaceConfig = {
    uiPort: v1.uiPort || DEFAULT_CONFIG.interface.uiPort,
    gatewayPort: v1.gatewayPort || DEFAULT_CONFIG.interface.gatewayPort,
  };

  const slack: SlackConfig | undefined =
    v1.slackBotToken && v1.slackSigningSecret
      ? {
          botToken: v1.slackBotToken,
          signingSecret: v1.slackSigningSecret,
        }
      : undefined;

  return {
    version: 2,
    project,
    llm,
    warehouse,
    company,
    interface: interfaceConfig,
    slack,
  };
}

/**
 * Migrate V2 config to V1 format (for backward compatibility)
 */
export function migrateV2ToV1(v2: AnalyticsConfigV2): AnalyticsConfigV1 {
  return {
    projectPath: v2.project.projectPath,
    dbtProfilesPath: v2.project.dbtProfilesPath,
    dbtTarget: v2.project.dbtTarget,
    llmProvider: v2.llm.provider,
    llmApiKey: v2.llm.apiKey,
    llmModel: v2.llm.chatModel,
    llmProfilingModel: v2.llm.profilingModel,
    warehouseType: v2.warehouse.type,
    warehouseConnection: v2.warehouse.connection,
    companyContext: v2.company?.context,
    modelSelection: v2.company?.modelSelection,
    slackBotToken: v2.slack?.botToken,
    slackSigningSecret: v2.slack?.signingSecret,
    uiPort: v2.interface.uiPort,
    gatewayPort: v2.interface.gatewayPort,
  };
}

/**
 * Normalize config to V2 format (auto-migrate if needed)
 */
export function normalizeConfig(config: AnalyticsConfigAny): AnalyticsConfigV2 {
  if (isConfigV2(config)) {
    return config;
  }
  return migrateV1ToV2(config);
}
