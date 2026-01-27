import { createWarehouseConnector } from '../../warehouse/factory.js';
import { ContextBuilder } from '../../analytics/context/builder.js';
import { AnalyticsConfig, WarehouseConnection, LLMProvider, CompanyContext } from '../../types.js';
import { validateDbtProject } from '../../utils/validation.js';
import { getWarehouseConnectionFromDbt } from '../../utils/env.js';
import { isAnalyticsInitialized } from '../../utils/config.js';
import { ConfigurationService, ConfigurationOptions } from './ConfigurationService.js';
import {
  ValidationError,
  WarehouseConnectionError,
  ContextBuildError,
  ConfigurationError,
} from '../../errors/types.js';
import { tryAsync } from '../../errors/handlers.js';

export interface InitOptions {
  projectPath: string;
  force?: boolean;
  dbtTarget?: string;
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmModel: string;
  llmProfilingModel: string;
  companyContext?: CompanyContext;
  modelSelection?: string;
  slackBotToken?: string;
  slackSigningSecret?: string;
  uiPort?: number;
  gatewayPort?: number;
}

export interface InitResult {
  success: boolean;
  config: AnalyticsConfig;
  message: string;
}

/**
 * Service for initializing analytics agent in a dbt project
 */
export class InitService {
  constructor(
    private configService: ConfigurationService = new ConfigurationService()
  ) {}

  /**
   * Initialize analytics agent
   */
  async initialize(options: InitOptions): Promise<InitResult> {
    // Step 1: Validate dbt project
    await this.validateProject(options.projectPath);

    // Step 2: Check if already initialized
    await this.checkExistingInitialization(options.projectPath, options.force);

    // Step 3: Get and test warehouse connection
    const warehouseConnection = await this.setupWarehouse(options.projectPath);

    // Step 4: Build configuration
    const configOptions: ConfigurationOptions = {
      projectPath: options.projectPath,
      dbtTarget: options.dbtTarget,
      llmProvider: options.llmProvider,
      llmApiKey: options.llmApiKey,
      llmModel: options.llmModel,
      llmProfilingModel: options.llmProfilingModel,
      warehouseConnection,
      companyContext: options.companyContext,
      modelSelection: options.modelSelection,
      slackBotToken: options.slackBotToken,
      slackSigningSecret: options.slackSigningSecret,
      uiPort: options.uiPort,
      gatewayPort: options.gatewayPort,
    };

    const config = await this.configService.buildAndSave(configOptions);

    // Step 5: Build agent context
    await this.buildContext(options.projectPath, config, warehouseConnection, options.force);

    return {
      success: true,
      config,
      message: 'Analytics agent initialized successfully!',
    };
  }

  /**
   * Validate dbt project
   */
  private async validateProject(projectPath: string): Promise<void> {
    const validation = await validateDbtProject(projectPath);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid dbt project');
    }
  }

  /**
   * Check if analytics is already initialized
   */
  private async checkExistingInitialization(projectPath: string, force?: boolean): Promise<void> {
    const initialized = await isAnalyticsInitialized(projectPath);
    if (initialized && !force) {
      throw new ConfigurationError('Analytics already initialized. Use --force to reinitialize.');
    }
  }

  /**
   * Setup and test warehouse connection
   */
  private async setupWarehouse(projectPath: string): Promise<WarehouseConnection> {
    // Get warehouse connection from dbt profiles
    const warehouseConnection = await tryAsync(
      () => getWarehouseConnectionFromDbt(projectPath),
      'Failed to load dbt profile',
      ConfigurationError
    );

    // Test warehouse connection
    const connector = await createWarehouseConnector(warehouseConnection);
    const connectionOk = await tryAsync(
      () => connector.testConnection(),
      'Failed to test warehouse connection',
      WarehouseConnectionError
    );

    await connector.close();

    if (!connectionOk) {
      throw new WarehouseConnectionError(
        'Failed to connect to warehouse. Please check your dbt profiles.yml credentials.'
      );
    }

    return warehouseConnection;
  }

  /**
   * Build agent context
   */
  private async buildContext(
    projectPath: string,
    config: AnalyticsConfig,
    warehouseConnection: WarehouseConnection,
    force?: boolean
  ): Promise<void> {
    const connector = await createWarehouseConnector(warehouseConnection);

    try {
      const builder = new ContextBuilder({
        projectPath,
        config,
        connector,
        force,
      });

      await tryAsync(() => builder.build(), 'Failed to build agent context', ContextBuildError);
    } finally {
      await connector.close();
    }
  }
}
