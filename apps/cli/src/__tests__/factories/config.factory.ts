import { AnalyticsConfig, AnalyticsConfigV2, LLMProvider, CompanyContext } from '@blueprintdata/models';

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
      provider: 'anthropic',
      apiKey: 'test-api-key',
      chatModel: 'claude-3-5-sonnet-20241022',
      profilingModel: 'claude-3-5-haiku-20241022',
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
    llmProvider: 'anthropic' as LLMProvider,
    llmApiKey: 'test-api-key',
    llmModel: 'claude-3-5-sonnet-20241022',
    llmProfilingModel: 'claude-3-5-haiku-20241022',
    warehouseType: 'postgres',
    warehouseConnection: {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      user: 'test_user',
      password: 'test_password',
      database: 'test_db',
    },
    companyName: undefined,
    companyDescription: undefined,
    companyWebsite: undefined,
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
        project: 'test-project',
        dataset: 'test_dataset',
        keyfilePath: '/path/to/keyfile.json',
      },
    },
  });
}

/**
 * Create a mock configuration with OpenAI LLM
 */
export function createMockConfigWithOpenAI(
  overrides?: Partial<AnalyticsConfigV2>
): AnalyticsConfigV2 {
  return createMockConfigV2({
    ...overrides,
    llm: {
      provider: 'openai',
      apiKey: 'test-openai-key',
      chatModel: 'gpt-4o',
      profilingModel: 'gpt-4o-mini',
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
        companyName: 'Test Company',
        companyDescription: 'A test company for testing',
        companyWebsite: 'https://test.com',
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
export function createMockCompanyContext(
  overrides?: Partial<CompanyContext>
): CompanyContext {
  return {
    companyName: 'Test Company',
    companyDescription: 'A test company for testing',
    companyWebsite: 'https://test.com',
    ...overrides,
  };
}
