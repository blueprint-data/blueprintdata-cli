import { describe, it, expect } from 'bun:test';
import { isConfigV1, isConfigV2, migrateV1ToV2, normalizeConfig } from '../migrator.js';
import { createMockConfigV1, createMockConfigV2 } from '../../__tests__/factories/config.factory.js';

describe('Config Migrator', () => {
  describe('isConfigV1', () => {
    it('should identify V1 config (no version field)', () => {
      const v1Config = createMockConfigV1();

      expect(isConfigV1(v1Config)).toBe(true);
    });

    it('should identify V1 config (undefined version)', () => {
      const v1Config = { ...createMockConfigV1(), version: undefined };

      expect(isConfigV1(v1Config)).toBe(true);
    });

    it('should not identify V2 config as V1', () => {
      const v2Config = createMockConfigV2();

      expect(isConfigV1(v2Config)).toBe(false);
    });
  });

  describe('isConfigV2', () => {
    it('should identify V2 config', () => {
      const v2Config = createMockConfigV2();

      expect(isConfigV2(v2Config)).toBe(true);
    });

    it('should not identify V1 config as V2', () => {
      const v1Config = createMockConfigV1();

      expect(isConfigV2(v1Config)).toBe(false);
    });
  });

  describe('migrateV1ToV2', () => {
    it('should migrate V1 config to V2 structure', () => {
      const v1Config = createMockConfigV1({
        projectPath: '/test/path',
        llmProvider: 'anthropic',
        llmModel: 'claude-3-5-sonnet-20241022',
        warehouseType: 'postgres',
      });

      const v2Config = migrateV1ToV2(v1Config);

      expect(v2Config.version).toBe(2);
      expect(v2Config.project.projectPath).toBe('/test/path');
      expect(v2Config.llm.provider).toBe('anthropic');
      expect(v2Config.llm.chatModel).toBe('claude-3-5-sonnet-20241022');
      expect(v2Config.warehouse.type).toBe('postgres');
    });

    it('should migrate company context fields', () => {
      const v1Config = createMockConfigV1({
        companyContext: {
          companyName: 'Test Company',
          companyDescription: 'Test description',
          companyWebsite: 'https://test.com',
        },
        modelSelection: 'staging',
      });

      const v2Config = migrateV1ToV2(v1Config);

      expect(v2Config.company?.context.companyName).toBe('Test Company');
      expect(v2Config.company?.context.companyDescription).toBe('Test description');
      expect(v2Config.company?.context.companyWebsite).toBe('https://test.com');
      expect(v2Config.company?.modelSelection).toBe('staging');
    });

    it('should migrate Slack fields', () => {
      const v1Config = createMockConfigV1({
        slackBotToken: 'xoxb-test',
        slackSigningSecret: 'secret',
      });

      const v2Config = migrateV1ToV2(v1Config);

      expect(v2Config.slack?.botToken).toBe('xoxb-test');
      expect(v2Config.slack?.signingSecret).toBe('secret');
    });

    it('should handle undefined optional fields', () => {
      const v1Config = createMockConfigV1({
        companyContext: undefined,
        modelSelection: undefined,
        slackBotToken: undefined,
      });

      const v2Config = migrateV1ToV2(v1Config);

      expect(v2Config.company).toBeUndefined();
      expect(v2Config.slack).toBeUndefined();
    });

    it('should migrate interface ports', () => {
      const v1Config = createMockConfigV1({
        uiPort: 4000,
        gatewayPort: 9000,
      });

      const v2Config = migrateV1ToV2(v1Config);

      expect(v2Config.interface.uiPort).toBe(4000);
      expect(v2Config.interface.gatewayPort).toBe(9000);
    });
  });

  describe('normalizeConfig', () => {
    it('should return V2 config unchanged', () => {
      const v2Config = createMockConfigV2();

      const normalized = normalizeConfig(v2Config);

      expect(normalized).toEqual(v2Config);
    });

    it('should migrate V1 config to V2', () => {
      const v1Config = createMockConfigV1();

      const normalized = normalizeConfig(v1Config);

      expect(normalized.version).toBe(2);
      expect(normalized.project.projectPath).toBe(v1Config.projectPath);
    });

    it('should preserve all fields during migration', () => {
      const v1Config = createMockConfigV1({
        projectPath: '/custom/path',
        dbtTarget: 'production',
        llmProvider: 'openai',
        llmModel: 'gpt-4o',
        companyContext: {
          companyName: 'Custom Company',
        },
      });

      const normalized = normalizeConfig(v1Config);

      expect(normalized.project.projectPath).toBe('/custom/path');
      expect(normalized.project.dbtTarget).toBe('production');
      expect(normalized.llm.provider).toBe('openai');
      expect(normalized.llm.chatModel).toBe('gpt-4o');
      expect(normalized.company?.context.companyName).toBe('Custom Company');
    });
  });
});
