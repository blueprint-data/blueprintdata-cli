import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigurationService } from '../ConfigurationService.js';
import type { LLMProvider } from '@blueprintdata/models';
import { TestDbtProject } from '../../../__tests__/helpers/test-project.js';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let testProject: TestDbtProject;

  const createWarehouseConnection = () => ({
    type: 'postgres' as const,
    host: 'localhost',
    port: 5432,
    user: 'test',
    password: 'test',
    database: 'test',
  });

  beforeEach(async () => {
    service = new ConfigurationService();
    testProject = await TestDbtProject.create();
  });

  afterEach(async () => {
    await testProject.cleanup();
  });

  describe('buildAndSave', () => {
    it('should build and save configuration', async () => {
      const options = {
        projectPath: testProject.path,
        dbtTarget: undefined,
        llmProvider: 'openrouter' as LLMProvider,
        llmApiKey: 'test-key',
        llmModel: 'openrouter/auto',
        llmProfilingModel: 'google/gemini-2.5-flash',
        warehouseConnection: createWarehouseConnection(),
        companyContext: undefined,
        modelSelection: undefined,
        slackBotToken: undefined,
        slackSigningSecret: undefined,
        uiPort: 3000,
        gatewayPort: 8080,
      };

      const config = await service.buildAndSave(options);

      expect(config.projectPath).toBe(testProject.path);
      expect(config.llmProvider).toBe('openrouter' as LLMProvider);
      expect(config.warehouseType).toBe('postgres');

      const exists = await testProject.fileExists('.blueprintdata/config.json');
      expect(exists).toBe(true);
    });

    it('should include company context when provided', async () => {
      const options = {
        projectPath: testProject.path,
        dbtTarget: undefined,
        llmProvider: 'openrouter' as LLMProvider,
        llmApiKey: 'test-key',
        llmModel: 'openrouter/auto',
        llmProfilingModel: 'google/gemini-2.5-flash',
        warehouseConnection: createWarehouseConnection(),
        companyContext: {
          name: 'Test Company',
          userContext: 'Test description',
          websites: ['https://test.com'],
        },
        modelSelection: 'staging',
        slackBotToken: undefined,
        slackSigningSecret: undefined,
        uiPort: 3000,
        gatewayPort: 8080,
      };

      const config = await service.buildAndSave(options);

      expect(config.companyContext?.name).toBe('Test Company');
      expect(config.companyContext?.userContext).toBe('Test description');
      expect(config.modelSelection).toBe('staging');
    });

    it('should include Slack configuration when provided', async () => {
      const options = {
        projectPath: testProject.path,
        dbtTarget: undefined,
        llmProvider: 'openrouter' as LLMProvider,
        llmApiKey: 'test-key',
        llmModel: 'openrouter/auto',
        llmProfilingModel: 'google/gemini-2.5-flash',
        warehouseConnection: createWarehouseConnection(),
        companyContext: undefined,
        modelSelection: undefined,
        slackBotToken: 'xoxb-test-token',
        slackSigningSecret: 'test-secret',
        uiPort: 3000,
        gatewayPort: 8080,
      };

      const config = await service.buildAndSave(options);

      expect(config.slackBotToken).toBe('xoxb-test-token');
      expect(config.slackSigningSecret).toBe('test-secret');
    });

    it('should use default ports when not specified', async () => {
      const options = {
        projectPath: testProject.path,
        dbtTarget: undefined,
        llmProvider: 'openrouter' as LLMProvider,
        llmApiKey: 'test-key',
        llmModel: 'openrouter/auto',
        llmProfilingModel: 'google/gemini-2.5-flash',
        warehouseConnection: createWarehouseConnection(),
        companyContext: undefined,
        modelSelection: undefined,
        slackBotToken: undefined,
        slackSigningSecret: undefined,
      };

      const config = await service.buildAndSave(options);

      expect(config.uiPort).toBe(3000);
      expect(config.gatewayPort).toBe(8080);
    });

    it('should handle OpenRouter provider', async () => {
      const options = {
        projectPath: testProject.path,
        dbtTarget: undefined,
        llmProvider: 'openrouter' as LLMProvider,
        llmApiKey: 'or-test-key',
        llmModel: 'openrouter/auto',
        llmProfilingModel: 'google/gemini-2.5-flash',
        warehouseConnection: createWarehouseConnection(),
        companyContext: undefined,
        modelSelection: undefined,
        slackBotToken: undefined,
        slackSigningSecret: undefined,
        uiPort: 3000,
        gatewayPort: 8080,
      };

      const config = await service.buildAndSave(options);

      expect(config.llmProvider).toBe('openrouter' as LLMProvider);
      expect(config.llmModel).toBe('openrouter/auto');
      expect(config.llmProfilingModel).toBe('google/gemini-2.5-flash');
    });

    it('should set dbt target when provided', async () => {
      const options = {
        projectPath: testProject.path,
        dbtTarget: 'production',
        llmProvider: 'openrouter' as LLMProvider,
        llmApiKey: 'test-key',
        llmModel: 'openrouter/auto',
        llmProfilingModel: 'google/gemini-2.5-flash',
        warehouseConnection: createWarehouseConnection(),
        companyContext: undefined,
        modelSelection: undefined,
        slackBotToken: undefined,
        slackSigningSecret: undefined,
        uiPort: 3000,
        gatewayPort: 8080,
      };

      const config = await service.buildAndSave(options);

      expect(config.dbtTarget).toBe('production');
    });
  });
});
