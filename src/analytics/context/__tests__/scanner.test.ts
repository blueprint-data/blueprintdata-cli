import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { DbtScanner } from '../scanner.js';
import { TestDbtProject } from '../../../__tests__/helpers/test-project.js';

describe('DbtScanner', () => {
  let testProject: TestDbtProject;
  let scanner: DbtScanner;

  beforeEach(async () => {
    testProject = await TestDbtProject.create();
    scanner = new DbtScanner(testProject.path);
  });

  afterEach(async () => {
    await testProject.cleanup();
  });

  describe('scanModels', () => {
    it('should scan models in project', async () => {
      await testProject.addModel('model1.sql', 'SELECT * FROM {{ ref("base_model") }}');
      await testProject.addModel('model2.sql', 'SELECT * FROM {{ source("raw", "table1") }}');

      const result = await scanner.scanModels();

      expect(result.models.length).toBeGreaterThan(0);
      expect(result.modelCount).toBeGreaterThan(0);
    });

    it('should extract ref() dependencies', async () => {
      await testProject.addModel(
        'derived_model.sql',
        'SELECT * FROM {{ ref("base_model") }}'
      );

      const result = await scanner.scanModels();

      const model = result.models.find((m) => m.name === 'derived_model');
      expect(model?.refs).toContain('base_model');
    });

    it('should extract source() dependencies', async () => {
      await testProject.addModel(
        'staging_model.sql',
        'SELECT * FROM {{ source("raw", "users") }}'
      );

      const result = await scanner.scanModels();

      const model = result.models.find((m) => m.name === 'staging_model');
      expect(model?.sources.length).toBeGreaterThan(0);
    });

    it('should handle models with multiple refs', async () => {
      await testProject.addModel(
        'combined.sql',
        `SELECT * FROM {{ ref("model1") }}
         UNION ALL
         SELECT * FROM {{ ref("model2") }}`
      );

      const result = await scanner.scanModels();

      const model = result.models.find((m) => m.name === 'combined');
      expect(model?.refs).toContain('model1');
      expect(model?.refs).toContain('model2');
    });

    it('should handle models in subdirectories', async () => {
      await testProject.addModel('stg_users.sql', 'SELECT 1', 'staging');

      const result = await scanner.scanModels();

      const model = result.models.find((m) => m.name === 'stg_users');
      expect(model).toBeDefined();
    });

    it('should count refs and sources correctly', async () => {
      await testProject.addModel('model1.sql', 'SELECT * FROM {{ ref("base") }}');
      await testProject.addModel('model2.sql', 'SELECT * FROM {{ source("raw", "table") }}');

      const result = await scanner.scanModels();

      expect(result.refCount).toBeGreaterThan(0);
      expect(result.sourceCount).toBeGreaterThan(0);
    });

    it('should handle empty models directory', async () => {
      const emptyProject = await TestDbtProject.create();

      const emptyScanner = new DbtScanner(emptyProject.path);
      const result = await emptyScanner.scanModels();

      expect(result.models.length).toBe(0);
      expect(result.modelCount).toBe(0);

      await emptyProject.cleanup();
    });
  });

  describe('generateModelingMarkdown', () => {
    it('should generate markdown documentation', async () => {
      await testProject.addModel('test_model.sql', 'SELECT 1');

      const scanResult = await scanner.scanModels();
      const markdown = scanner.generateModelingMarkdown(scanResult);

      expect(markdown).toContain('# dbt Models');
      expect(markdown).toContain('test_model');
    });

    it('should include model statistics', async () => {
      await testProject.addModel('model1.sql', 'SELECT 1');
      await testProject.addModel('model2.sql', 'SELECT 2');

      const scanResult = await scanner.scanModels();
      const markdown = scanner.generateModelingMarkdown(scanResult);

      expect(markdown).toContain('Total Models');
    });

    it('should show dependencies when present', async () => {
      await testProject.addModel('derived.sql', 'SELECT * FROM {{ ref("base") }}');

      const scanResult = await scanner.scanModels();
      const markdown = scanner.generateModelingMarkdown(scanResult);

      expect(markdown).toContain('ref');
    });
  });
});
