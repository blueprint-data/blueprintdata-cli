import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { InitService } from '../InitService.js';
import { ConfigurationService } from '../ConfigurationService.js';
import { TestDbtProject } from '../../../__tests__/helpers/test-project.js';
import { ValidationError } from '../../../errors/types.js';

describe('InitService', () => {
  let service: InitService;
  let configService: ConfigurationService;
  let testProject: TestDbtProject;

  beforeEach(async () => {
    configService = new ConfigurationService();
    service = new InitService(configService);
    testProject = await TestDbtProject.create();
  });

  afterEach(async () => {
    await testProject.cleanup();
  });

  describe('service instantiation', () => {
    it('should create service with config service', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(InitService);
    });

    it('should have configService dependency', () => {
      expect((service as any).configService).toBeDefined();
    });
  });
});
