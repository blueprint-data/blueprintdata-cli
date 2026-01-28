import { AnalyticsConfig, LLMProvider, CompanyContext, WarehouseConnection } from '@blueprintdata/models';
import { saveConfig } from '../../utils/config.js';
import { getDefaultProfilesPath } from '../../utils/env.js';

export interface ConfigurationOptions {
  projectPath: string;
  dbtTarget?: string;
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmModel: string;
  llmProfilingModel: string;
  warehouseConnection: WarehouseConnection;
  companyContext?: CompanyContext;
  modelSelection?: string;
  slackBotToken?: string;
  slackSigningSecret?: string;
  uiPort?: number;
  gatewayPort?: number;
}

/**
 * Service for managing analytics configuration
 */
export class ConfigurationService {
  /**
   * Build and save analytics configuration
   */
  async buildAndSave(options: ConfigurationOptions): Promise<AnalyticsConfig> {
    const config: AnalyticsConfig = {
      projectPath: options.projectPath,
      dbtProfilesPath: getDefaultProfilesPath(),
      dbtTarget: options.dbtTarget || undefined,
      llmProvider: options.llmProvider,
      llmApiKey: options.llmApiKey,
      llmModel: options.llmModel,
      llmProfilingModel: options.llmProfilingModel,
      warehouseType: options.warehouseConnection.type,
      warehouseConnection: options.warehouseConnection,
      companyContext:
        options.companyContext && Object.keys(options.companyContext).length > 0
          ? options.companyContext
          : undefined,
      modelSelection: options.modelSelection,
      slackBotToken: options.slackBotToken,
      slackSigningSecret: options.slackSigningSecret,
      uiPort: options.uiPort || 3000,
      gatewayPort: options.gatewayPort || 8080,
    };

    await saveConfig(config, options.projectPath);

    return config;
  }
}
