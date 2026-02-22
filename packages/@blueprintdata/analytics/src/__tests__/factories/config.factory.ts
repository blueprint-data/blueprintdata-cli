import { AnalyticsConfig, LLMProvider, CompanyContext } from '@blueprintdata/models';
import type { AnalyticsConfigV2 } from '@blueprintdata/config';

/**
 * Create a mock V2 configuration for testing
 */
export function createMockConfigV2(overrides?: Partial<AnalyticsConfigV2>): AnalyticsConfigV2 {
  const config: AnalyticsConfigV2 = {
    version: 2,
    project: {
      projectPath: '/test/project',
      dbtProfilesPath: '~/.dbt/profiles.yml',
      dbtTarget: undefined,
    },
    llm: {
      provider: 'openrouter' as LLMProvider,
      apiKey: 'test-api-key',
      chatModel: 'openrouter/auto',
      profilingModel: 'google/gemini-2.5-flash',
    },
    warehouse: {
      type: 'postgres',
      connection: {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        user: 'test_user',
        password: 'test_password',
        database: 'test_db',
      },
    },
    company: undefined,
    interface: {
      uiPort: 3000,
      gatewayPort: 8080,
    },
    slack: undefined,
  };

  return {
    ...config,
    ...overrides,
    project: { ...config.project, ...overrides?.project },
    llm: { ...config.llm, ...overrides?.llm },
    warehouse: { ...config.warehouse, ...overrides?.warehouse },
    interface: { ...config.interface, ...overrides?.interface },
  };
}

/**
 * Create a mock V1 (legacy) configuration for testing
 */
export function createMockConfigV1(overrides?: Partial<AnalyticsConfig>): AnalyticsConfig {
  const config: AnalyticsConfig = {
    projectPath: '/test/project',
    dbtProfilesPath: '~/.dbt/profiles.yml',
    dbtTarget: undefined,
    llmProvider: 'openrouter' as LLMProvider,
    llmApiKey: 'test-api-key',
    llmModel: 'openrouter/auto',
    llmProfilingModel: 'google/gemini-2.5-flash',
    warehouseType: 'postgres',
    warehouseConnection: {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      user: 'test_user',
      password: 'test_password',
      database: 'test_db',
    },
    companyContext: undefined,
    modelSelection: undefined,
    slackBotToken: undefined,
    slackSigningSecret: undefined,
    uiPort: 3000,
    gatewayPort: 8080,
  };

  return {
    ...config,
    ...overrides,
  };
}

/**
 * Create a mock configuration with BigQuery warehouse
 */
export function createMockConfigWithBigQuery(
  overrides?: Partial<AnalyticsConfigV2>
): AnalyticsConfigV2 {
  return createMockConfigV2({
    ...overrides,
    warehouse: {
      type: 'bigquery',
      connection: {
        type: 'bigquery',
        projectId: 'test-project',
        database: 'test_dataset',
        keyFilePath: '/path/to/keyfile.json',
      },
    },
  });
}

/**
 * Create a mock configuration with OpenRouter LLM
 */
export function createMockConfigWithOpenRouter(
  overrides?: Partial<AnalyticsConfigV2>
): AnalyticsConfigV2 {
  return createMockConfigV2({
    ...overrides,
    llm: {
      provider: 'openrouter' as LLMProvider,
      apiKey: 'test-openrouter-key',
      chatModel: 'openrouter/auto',
      profilingModel: 'google/gemini-2.5-flash',
    },
  });
}

/**
 * Create a mock configuration with company context
 */
export function createMockConfigWithCompany(
  overrides?: Partial<AnalyticsConfigV2>
): AnalyticsConfigV2 {
  return createMockConfigV2({
    ...overrides,
    company: {
      context: {
        name: 'Test Company',
        industry: 'Technology',
        websites: ['https://test.com'],
        userContext: 'A test company for testing',
      },
      modelSelection: 'all',
    },
  });
}

/**
 * Create a mock configuration with Slack integration
 */
export function createMockConfigWithSlack(
  overrides?: Partial<AnalyticsConfigV2>
): AnalyticsConfigV2 {
  return createMockConfigV2({
    ...overrides,
    slack: {
      botToken: 'xoxb-test-token',
      signingSecret: 'test-signing-secret',
    },
  });
}

/**
 * Create a mock company context for testing
 */
export function createMockCompanyContext(overrides?: Partial<CompanyContext>): CompanyContext {
  return {
    name: 'Test Company',
    industry: 'Technology',
    websites: ['https://test.com'],
    userContext: 'A test company for testing',
    ...overrides,
  };
}
