import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { loadConfig, saveConfig, loadConfigV2, saveConfigV2, isAnalyticsInitialized } from '../config.js';
import { TestDbtProject } from '../../__tests__/helpers/test-project.js';
import { createMockConfigV1, createMockConfigV2 } from '../../__tests__/factories/config.factory.js';

describe('Configuration Utils', () => {
  let testProject: TestDbtProject;

  beforeEach(async () => {
    testProject = await TestDbtProject.create();
  });

  afterEach(async () => {
    await testProject.cleanup();
  });

  describe('loadConfig (V1)', () => {
    it('should load V1 config successfully', async () => {
      const mockConfig = createMockConfigV1({ projectPath: testProject.path });
      await testProject.writeConfigV1(mockConfig);

      const loaded = await loadConfig(testProject.path);

      expect(loaded.projectPath).toBe(testProject.path);
      expect(loaded.llmProvider).toBe('anthropic');
      expect(loaded.warehouseType).toBe('postgres');
    });

    it('should throw error when config does not exist', async () => {
      await expect(loadConfig(testProject.path)).rejects.toThrow();
    });

    it('should throw error for invalid JSON', async () => {
      await testProject.writeFile('.blueprintdata/config.json', 'invalid json{');

      await expect(loadConfig(testProject.path)).rejects.toThrow();
    });
  });

  describe('saveConfig (V1)', () => {
    it('should save V1 config successfully', async () => {
      const mockConfig = createMockConfigV1({ projectPath: testProject.path });

      await saveConfig(mockConfig, testProject.path);

      const exists = await testProject.fileExists('.blueprintdata/config.json');
      expect(exists).toBe(true);

      const content = await testProject.readFile('.blueprintdata/config.json');
      const parsed = JSON.parse(content);
      expect(parsed.llmProvider).toBe('anthropic');
    });

    it('should create .blueprintdata directory if it does not exist', async () => {
      const mockConfig = createMockConfigV1({ projectPath: testProject.path });

      await saveConfig(mockConfig, testProject.path);

      const dirExists = await testProject.fileExists('.blueprintdata');
      expect(dirExists).toBe(true);
    });
  });

  describe('loadConfigV2', () => {
    it('should load V2 config successfully', async () => {
      const mockConfig = createMockConfigV2({
        project: { projectPath: testProject.path, dbtProfilesPath: '~/.dbt/profiles.yml' },
      });
      await testProject.writeConfigV2(mockConfig);

      const loaded = await loadConfigV2(testProject.path);

      expect(loaded.version).toBe(2);
      expect(loaded.project.projectPath).toBe(testProject.path);
      expect(loaded.llm.provider).toBe('anthropic');
      expect(loaded.warehouse.type).toBe('postgres');
    });

    it('should auto-migrate V1 config to V2', async () => {
      const v1Config = createMockConfigV1({ projectPath: testProject.path });
      await testProject.writeConfigV1(v1Config);

      const loaded = await loadConfigV2(testProject.path);

      expect(loaded.version).toBe(2);
      expect(loaded.project.projectPath).toBe(testProject.path);
      expect(loaded.llm.provider).toBe('anthropic');
      expect(loaded.llm.chatModel).toBe(v1Config.llmModel);
      expect(loaded.warehouse.type).toBe('postgres');
    });

    it('should save migrated V2 config back to disk', async () => {
      const v1Config = createMockConfigV1({ projectPath: testProject.path });
      await testProject.writeConfigV1(v1Config);

      await loadConfigV2(testProject.path);

      const savedConfig = await testProject.readConfig();
      expect((savedConfig as any).version).toBe(2);
    });
  });

  describe('saveConfigV2', () => {
    it('should save V2 config successfully', async () => {
      const mockConfig = createMockConfigV2({
        project: { projectPath: testProject.path, dbtProfilesPath: '~/.dbt/profiles.yml' },
      });

      await saveConfigV2(mockConfig, testProject.path);

      const exists = await testProject.fileExists('.blueprintdata/config.json');
      expect(exists).toBe(true);

      const content = await testProject.readFile('.blueprintdata/config.json');
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe(2);
      expect(parsed.llm.provider).toBe('anthropic');
    });

    it('should preserve optional fields', async () => {
      const mockConfig = createMockConfigV2({
        project: { projectPath: testProject.path, dbtProfilesPath: '~/.dbt/profiles.yml' },
        company: {
          context: {
            companyName: 'Test Company',
            companyDescription: 'Test description',
          },
          modelSelection: 'staging',
        },
        slack: {
          botToken: 'xoxb-test',
          signingSecret: 'secret',
        },
      });

      await saveConfigV2(mockConfig, testProject.path);

      const loaded = await loadConfigV2(testProject.path);
      expect(loaded.company?.context.companyName).toBe('Test Company');
      expect(loaded.slack?.botToken).toBe('xoxb-test');
    });
  });

  describe('isAnalyticsInitialized', () => {
    it('should return false when config does not exist', async () => {
      const initialized = await isAnalyticsInitialized(testProject.path);
      expect(initialized).toBe(false);
    });

    it('should return true when V1 config exists', async () => {
      const mockConfig = createMockConfigV1({ projectPath: testProject.path });
      await testProject.writeConfigV1(mockConfig);

      const initialized = await isAnalyticsInitialized(testProject.path);
      expect(initialized).toBe(true);
    });

    it('should return true when V2 config exists', async () => {
      const mockConfig = createMockConfigV2({
        project: { projectPath: testProject.path, dbtProfilesPath: '~/.dbt/profiles.yml' },
      });
      await testProject.writeConfigV2(mockConfig);

      const initialized = await isAnalyticsInitialized(testProject.path);
      expect(initialized).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle config with all optional fields undefined', async () => {
      const mockConfig = createMockConfigV2({
        project: { projectPath: testProject.path, dbtProfilesPath: '~/.dbt/profiles.yml' },
        company: undefined,
        slack: undefined,
      });

      await saveConfigV2(mockConfig, testProject.path);
      const loaded = await loadConfigV2(testProject.path);

      expect(loaded.company).toBeUndefined();
      expect(loaded.slack).toBeUndefined();
    });

    it('should handle empty dbtTarget field', async () => {
      const mockConfig = createMockConfigV2({
        project: {
          projectPath: testProject.path,
          dbtProfilesPath: '~/.dbt/profiles.yml',
          dbtTarget: undefined,
        },
      });

      await saveConfigV2(mockConfig, testProject.path);
      const loaded = await loadConfigV2(testProject.path);

      expect(loaded.project.dbtTarget).toBeUndefined();
    });
  });
});
