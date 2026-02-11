import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { loadConfigV2, saveConfig } from '../../utils/config.js';
import { TestDbtProject } from '../helpers/test-project.js';
import { createMockConfigV1 } from '../factories/config.factory.js';

describe('Config Migration Integration', () => {
  let testProject: TestDbtProject;

  beforeEach(async () => {
    testProject = await TestDbtProject.create();
  });

  afterEach(async () => {
    await testProject.cleanup();
  });

  it('should auto-migrate V1 config to V2 when loading', async () => {
    const v1Config = createMockConfigV1({
      projectPath: testProject.path,
      llmProvider: 'anthropic',
      llmModel: 'claude-sonnet-4-5',
      warehouseType: 'postgres',
      companyContext: {
        name: 'Test Company',
        userContext: 'Test description',
      },
    });

    await saveConfig(v1Config, testProject.path);

    const loadedConfig = await loadConfigV2(testProject.path);

    expect(loadedConfig.version).toBe(2);
    expect(loadedConfig.project.projectPath).toBe(testProject.path);
    expect(loadedConfig.llm.provider).toBe('anthropic');
    expect(loadedConfig.llm.chatModel).toBe('claude-sonnet-4-5');
    expect(loadedConfig.warehouse.type).toBe('postgres');
    expect(loadedConfig.company?.context.name).toBe('Test Company');
  });

  it('should persist migrated config back to disk', async () => {
    const v1Config = createMockConfigV1({
      projectPath: testProject.path,
    });

    await saveConfig(v1Config, testProject.path);
    await loadConfigV2(testProject.path);

    const savedConfig = await testProject.readConfig();

    expect((savedConfig as any).version).toBe(2);
  });

  it('should preserve all V1 fields during migration', async () => {
    const v1Config = createMockConfigV1({
      projectPath: testProject.path,
      dbtTarget: 'production',
      llmProvider: 'openai',
      llmModel: 'gpt-5.2',
      llmProfilingModel: 'gpt-5-mini',
      warehouseType: 'bigquery',
      companyContext: {
        name: 'Custom Company',
        userContext: 'Custom description',
        websites: ['https://custom.com'],
      },
      modelSelection: 'staging',
      slackBotToken: 'xoxb-test',
      slackSigningSecret: 'secret',
      uiPort: 4000,
      gatewayPort: 9000,
    });

    await saveConfig(v1Config, testProject.path);

    const loadedConfig = await loadConfigV2(testProject.path);

    expect(loadedConfig.project.dbtTarget).toBe('production');
    expect(loadedConfig.llm.provider).toBe('openai');
    expect(loadedConfig.llm.chatModel).toBe('gpt-5.2');
    expect(loadedConfig.llm.profilingModel).toBe('gpt-5-mini');
    expect(loadedConfig.warehouse.type).toBe('bigquery');
    expect(loadedConfig.company?.context.name).toBe('Custom Company');
    expect(loadedConfig.company?.context.userContext).toBe('Custom description');
    expect(loadedConfig.company?.context.websites?.[0]).toBe('https://custom.com');
    expect(loadedConfig.company?.modelSelection).toBe('staging');
    expect(loadedConfig.slack?.botToken).toBe('xoxb-test');
    expect(loadedConfig.slack?.signingSecret).toBe('secret');
    expect(loadedConfig.interface.uiPort).toBe(4000);
    expect(loadedConfig.interface.gatewayPort).toBe(9000);
  });

  it('should handle V1 config with minimal fields', async () => {
    const v1Config = createMockConfigV1({
      projectPath: testProject.path,
      companyContext: undefined,
      modelSelection: undefined,
      slackBotToken: undefined,
    });

    await saveConfig(v1Config, testProject.path);

    const loadedConfig = await loadConfigV2(testProject.path);

    expect(loadedConfig.version).toBe(2);
    expect(loadedConfig.company).toBeUndefined();
    expect(loadedConfig.slack).toBeUndefined();
  });

  it('should not re-migrate already migrated V2 config', async () => {
    const v1Config = createMockConfigV1({ projectPath: testProject.path });
    await saveConfig(v1Config, testProject.path);

    const firstLoad = await loadConfigV2(testProject.path);

    const secondLoad = await loadConfigV2(testProject.path);

    expect(firstLoad).toEqual(secondLoad);
    expect(secondLoad.version).toBe(2);
  });
});
