import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { validateDbtProject, validateProjectName } from '../validation.js';
import { TestDbtProject } from '../../__tests__/helpers/test-project.js';

describe('Validation Utils', () => {
  let testProject: TestDbtProject;

  beforeEach(async () => {
    testProject = await TestDbtProject.create();
  });

  afterEach(async () => {
    await testProject.cleanup();
  });

  describe('validateDbtProject', () => {
    it('should validate a valid dbt project', async () => {
      const result = await validateDbtProject(testProject.path);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail when dbt_project.yml is missing', async () => {
      const emptyProject = await TestDbtProject.create({ includeProfiles: false });
      await emptyProject.writeFile('dbt_project.yml', '');
      await emptyProject.writeFile('dbt_project.yml', '');

      await emptyProject.cleanup();

      const result = await validateDbtProject(emptyProject.path);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('dbt_project.yml');
    });

    it('should fail when directory does not exist', async () => {
      const result = await validateDbtProject('/nonexistent/path');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when dbt_project.yml is invalid YAML', async () => {
      await testProject.writeFile('dbt_project.yml', 'invalid: yaml: content:');

      const result = await validateDbtProject(testProject.path);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept minimal valid dbt_project.yml', async () => {
      await testProject.writeFile('dbt_project.yml', 'name: test\nversion: "1.0.0"\n');

      const result = await validateDbtProject(testProject.path);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateProjectName', () => {
    it('should validate valid project names', () => {
      const validNames = [
        'my-project',
        'my_project',
        'myproject',
        'my-project-123',
        'project123',
      ];

      validNames.forEach((name) => {
        const result = validateProjectName(name);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid project names', () => {
      const invalidNames = ['', 'My Project', 'my project', 'my@project'];

      invalidNames.forEach((name) => {
        const result = validateProjectName(name);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject npm reserved names', () => {
      const reservedNames = ['node_modules', 'favicon.ico'];

      reservedNames.forEach((name) => {
        const result = validateProjectName(name);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('blacklisted');
      });
    });

    it('should provide specific error messages', () => {
      const result1 = validateProjectName('');
      expect(result1.error).toContain('length must be greater than zero');

      const result2 = validateProjectName('My Project');
      expect(result2.error).toBeDefined();

      const result3 = validateProjectName('a'.repeat(215));
      expect(result3.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle projects with non-standard directory structures', async () => {
      await testProject.writeFile('models/subdir/model.sql', 'SELECT 1');

      const result = await validateDbtProject(testProject.path);

      expect(result.valid).toBe(true);
    });

    it('should handle project names at boundary lengths', () => {
      const shortName = 'ab';
      const resultShort = validateProjectName(shortName);
      expect(resultShort.valid).toBe(true);

      const longName = 'a'.repeat(215);
      const resultLong = validateProjectName(longName);
      expect(resultLong.valid).toBe(false);
    });

    it('should handle project names with hyphens and underscores', () => {
      const result = validateProjectName('my-test_project-123');
      expect(result.valid).toBe(true);
    });
  });
});
