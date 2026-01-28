import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigurationService } from '../ConfigurationService.js';
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
        llmProvider: 'anthropic' as const,
        llmApiKey: 'test-key',
        llmModel: 'claude-3-5-sonnet-20241022',
        llmProfilingModel: 'claude-3-5-haiku-20241022',
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
      expect(config.llmProvider).toBe('anthropic');
      expect(config.warehouseType).toBe('postgres');

      const exists = await testProject.fileExists('.blueprintdata/config.json');
      expect(exists).toBe(true);
    });

    it('should include company context when provided', async () => {
      const options = {
        projectPath: testProject.path,
        dbtTarget: undefined,
        llmProvider: 'anthropic' as const,
        llmApiKey: 'test-key',
        llmModel: 'claude-3-5-sonnet-20241022',
        llmProfilingModel: 'claude-3-5-haiku-20241022',
        warehouseConnection: createWarehouseConnection(),
        companyContext: {
          companyName: 'Test Company',
          companyDescription: 'Test description',
          companyWebsite: 'https://test.com',
        },
        modelSelection: 'staging',
        slackBotToken: undefined,
        slackSigningSecret: undefined,
        uiPort: 3000,
        gatewayPort: 8080,
      };

      const config = await service.buildAndSave(options);

      expect(config.companyContext?.companyName).toBe('Test Company');
      expect(config.companyContext?.companyDescription).toBe('Test description');
      expect(config.modelSelection).toBe('staging');
    });

    it('should include Slack configuration when provided', async () => {
      const options = {
        projectPath: testProject.path,
        dbtTarget: undefined,
        llmProvider: 'anthropic' as const,
        llmApiKey: 'test-key',
        llmModel: 'claude-3-5-sonnet-20241022',
        llmProfilingModel: 'claude-3-5-haiku-20241022',
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
        llmProvider: 'anthropic' as const,
        llmApiKey: 'test-key',
        llmModel: 'claude-3-5-sonnet-20241022',
        llmProfilingModel: 'claude-3-5-haiku-20241022',
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

    it('should handle OpenAI provider', async () => {
      const options = {
        projectPath: testProject.path,
        dbtTarget: undefined,
        llmProvider: 'openai' as const,
        llmApiKey: 'sk-test-key',
        llmModel: 'gpt-4o',
        llmProfilingModel: 'gpt-4o-mini',
        warehouseConnection: createWarehouseConnection(),
        companyContext: undefined,
        modelSelection: undefined,
        slackBotToken: undefined,
        slackSigningSecret: undefined,
        uiPort: 3000,
        gatewayPort: 8080,
      };

      const config = await service.buildAndSave(options);

      expect(config.llmProvider).toBe('openai');
      expect(config.llmModel).toBe('gpt-4o');
      expect(config.llmProfilingModel).toBe('gpt-4o-mini');
    });

    it('should set dbt target when provided', async () => {
      const options = {
        projectPath: testProject.path,
        dbtTarget: 'production',
        llmProvider: 'anthropic' as const,
        llmApiKey: 'test-key',
        llmModel: 'claude-3-5-sonnet-20241022',
        llmProfilingModel: 'claude-3-5-haiku-20241022',
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
