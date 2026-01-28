import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  getDefaultProfilesPath,
  profilesExist,
  parseProfiles,
  getDbtProfileName,
  getDbtProfile,
  dbtOutputToWarehouseConnection,
  getWarehouseConnectionFromDbt,
  validateLLMApiKey,
  isDbtProject,
  type DbtOutput,
} from '../env.js';
import { TestDbtProject } from '../../__tests__/helpers/test-project.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Environment Utils', () => {
  let testProject: TestDbtProject;

  beforeEach(async () => {
    testProject = await TestDbtProject.create();
  });

  afterEach(async () => {
    await testProject.cleanup();
  });

  describe('getDefaultProfilesPath', () => {
    it('should return path to .dbt/profiles.yml in home directory', () => {
      const profilesPath = getDefaultProfilesPath();

      expect(profilesPath).toBe(path.join(os.homedir(), '.dbt', 'profiles.yml'));
    });
  });

  describe('profilesExist', () => {
    it('should return true when profiles.yml exists', async () => {
      const profilesPath = path.join(testProject.path, 'profiles.yml');
      await fs.writeFile(profilesPath, 'test_project:\n  target: dev', 'utf-8');

      const exists = await profilesExist(profilesPath);

      expect(exists).toBe(true);
    });

    it('should return false when profiles.yml does not exist', async () => {
      const profilesPath = path.join(testProject.path, 'nonexistent.yml');

      const exists = await profilesExist(profilesPath);

      expect(exists).toBe(false);
    });

    it('should check default path when no path provided', async () => {
      const exists = await profilesExist();

      expect(typeof exists).toBe('boolean');
    });
  });

  describe('parseProfiles', () => {
    it('should parse valid profiles.yml', async () => {
      const profilesPath = path.join(testProject.path, 'profiles.yml');
      await fs.writeFile(
        profilesPath,
        `
test_project:
  target: dev
  outputs:
    dev:
      type: postgres
      host: localhost
      port: 5432
      user: test_user
      password: test_password
      dbname: test_db
      schema: public
      threads: 4
`,
        'utf-8'
      );

      const profiles = await parseProfiles(profilesPath);

      expect(profiles.test_project).toBeDefined();
      expect(profiles.test_project.target).toBe('dev');
      expect(profiles.test_project.outputs.dev.type).toBe('postgres');
      expect(profiles.test_project.outputs.dev.host).toBe('localhost');
    });

    it('should throw error when profiles.yml does not exist', async () => {
      const profilesPath = path.join(testProject.path, 'nonexistent.yml');

      await expect(parseProfiles(profilesPath)).rejects.toThrow('dbt profiles.yml not found');
    });

    it('should throw error for invalid YAML', async () => {
      const profilesPath = path.join(testProject.path, 'profiles.yml');
      await fs.writeFile(profilesPath, 'invalid: yaml: content:', 'utf-8');

      await expect(parseProfiles(profilesPath)).rejects.toThrow('Failed to parse profiles.yml');
    });
  });

  describe('getDbtProfileName', () => {
    it('should return profile name from dbt_project.yml', async () => {
      const profileName = await getDbtProfileName(testProject.path);

      expect(profileName).toBe('test_project');
    });

    it('should return project name if profile not specified', async () => {
      const dbtProjectContent = `
name: my_project
version: 1.0.0
config_version: 2
`;
      await fs.writeFile(path.join(testProject.path, 'dbt_project.yml'), dbtProjectContent, 'utf-8');

      const profileName = await getDbtProfileName(testProject.path);

      expect(profileName).toBe('my_project');
    });

    it('should return "default" if neither profile nor name specified', async () => {
      const dbtProjectContent = `
version: 1.0.0
config_version: 2
`;
      await fs.writeFile(path.join(testProject.path, 'dbt_project.yml'), dbtProjectContent, 'utf-8');

      const profileName = await getDbtProfileName(testProject.path);

      expect(profileName).toBe('default');
    });

    it('should throw error when dbt_project.yml does not exist', async () => {
      await fs.remove(path.join(testProject.path, 'dbt_project.yml'));

      await expect(getDbtProfileName(testProject.path)).rejects.toThrow('dbt_project.yml not found');
    });

    it('should throw error for invalid YAML', async () => {
      await fs.writeFile(
        path.join(testProject.path, 'dbt_project.yml'),
        'invalid: yaml: content:',
        'utf-8'
      );

      await expect(getDbtProfileName(testProject.path)).rejects.toThrow(
        'Failed to parse dbt_project.yml'
      );
    });
  });

  describe('getDbtProfile', () => {
    it('should return profile from profiles.yml', async () => {
      const profilesPath = path.join(testProject.path, 'profiles.yml');
      await fs.writeFile(
        profilesPath,
        `
test_project:
  target: dev
  outputs:
    dev:
      type: postgres
      host: localhost
`,
        'utf-8'
      );

      const profile = await getDbtProfile(testProject.path, profilesPath);

      expect(profile.target).toBe('dev');
      expect(profile.outputs.dev.type).toBe('postgres');
    });

    it('should throw error when profile not found', async () => {
      const profilesPath = path.join(testProject.path, 'profiles.yml');
      await fs.writeFile(
        profilesPath,
        `
other_profile:
  target: dev
  outputs:
    dev:
      type: postgres
`,
        'utf-8'
      );

      await expect(getDbtProfile(testProject.path, profilesPath)).rejects.toThrow(
        "Profile 'test_project' not found"
      );
    });
  });

  describe('dbtOutputToWarehouseConnection', () => {
    it('should convert Postgres dbt output', () => {
      const output: DbtOutput = {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        user: 'test_user',
        password: 'test_password',
        dbname: 'test_db',
        schema: 'public',
      };

      const connection = dbtOutputToWarehouseConnection(output);

      expect(connection.type).toBe('postgres');
      expect(connection.host).toBe('localhost');
      expect(connection.port).toBe(5432);
      expect(connection.user).toBe('test_user');
      expect(connection.password).toBe('test_password');
      expect(connection.database).toBe('test_db');
      expect(connection.schema).toBe('public');
    });

    it('should use default port for Postgres', () => {
      const output: DbtOutput = {
        type: 'postgres',
        host: 'localhost',
        user: 'test_user',
        password: 'test_password',
        dbname: 'test_db',
      };

      const connection = dbtOutputToWarehouseConnection(output);

      expect(connection.port).toBe(5432);
    });

    it('should use default database for Postgres', () => {
      const output: DbtOutput = {
        type: 'postgres',
        host: 'localhost',
        user: 'test_user',
        password: 'test_password',
      };

      const connection = dbtOutputToWarehouseConnection(output);

      expect(connection.database).toBe('postgres');
    });

    it('should use default schema for Postgres', () => {
      const output: DbtOutput = {
        type: 'postgres',
        host: 'localhost',
        user: 'test_user',
        password: 'test_password',
        dbname: 'test_db',
      };

      const connection = dbtOutputToWarehouseConnection(output);

      expect(connection.schema).toBe('public');
    });

    it('should convert BigQuery dbt output', () => {
      const output: DbtOutput = {
        type: 'bigquery',
        project: 'my-project',
        dataset: 'my_dataset',
        location: 'US',
        keyfile: '/path/to/keyfile.json',
        method: 'service-account',
      };

      const connection = dbtOutputToWarehouseConnection(output);

      expect(connection.type).toBe('bigquery');
      expect(connection.projectId).toBe('my-project');
      expect(connection.database).toBe('my_dataset');
      expect(connection.location).toBe('US');
      expect(connection.keyFilePath).toBe('/path/to/keyfile.json');
      expect(connection.schema).toBe('service-account');
    });

    it('should use default dataset for BigQuery', () => {
      const output: DbtOutput = {
        type: 'bigquery',
        project: 'my-project',
      };

      const connection = dbtOutputToWarehouseConnection(output);

      expect(connection.database).toBe('default');
    });

    it('should convert Redshift as Postgres', () => {
      const output: DbtOutput = {
        type: 'redshift',
        host: 'redshift-cluster.amazonaws.com',
        port: 5439,
        user: 'test_user',
        password: 'test_password',
        dbname: 'test_db',
      };

      const connection = dbtOutputToWarehouseConnection(output);

      expect(connection.type).toBe('postgres');
      expect(connection.host).toBe('redshift-cluster.amazonaws.com');
      expect(connection.port).toBe(5439);
    });

    it('should throw error for unsupported warehouse type', () => {
      const output: DbtOutput = {
        type: 'snowflake',
      };

      expect(() => dbtOutputToWarehouseConnection(output)).toThrow('Unsupported warehouse type');
    });
  });

  describe('getWarehouseConnectionFromDbt', () => {
    it('should get warehouse connection from dbt profile', async () => {
      const profilesPath = path.join(testProject.path, 'profiles.yml');
      await fs.writeFile(
        profilesPath,
        `
test_project:
  target: dev
  outputs:
    dev:
      type: postgres
      host: localhost
      port: 5432
      user: test_user
      password: test_password
      dbname: test_db
      schema: public
`,
        'utf-8'
      );

      const connection = await getWarehouseConnectionFromDbt(testProject.path, profilesPath);

      expect(connection.type).toBe('postgres');
      expect(connection.host).toBe('localhost');
    });

    it('should use specified target', async () => {
      const profilesPath = path.join(testProject.path, 'profiles.yml');
      await fs.writeFile(
        profilesPath,
        `
test_project:
  target: dev
  outputs:
    dev:
      type: postgres
      host: dev-host
      user: dev_user
      password: dev_password
      dbname: dev_db
    prod:
      type: postgres
      host: prod-host
      user: prod_user
      password: prod_password
      dbname: prod_db
`,
        'utf-8'
      );

      const connection = await getWarehouseConnectionFromDbt(testProject.path, profilesPath, 'prod');

      expect(connection.host).toBe('prod-host');
      expect(connection.database).toBe('prod_db');
    });

    it('should throw error when target not found', async () => {
      const profilesPath = path.join(testProject.path, 'profiles.yml');
      await fs.writeFile(
        profilesPath,
        `
test_project:
  target: dev
  outputs:
    dev:
      type: postgres
      host: localhost
`,
        'utf-8'
      );

      await expect(
        getWarehouseConnectionFromDbt(testProject.path, profilesPath, 'nonexistent')
      ).rejects.toThrow("Target 'nonexistent' not found");
    });
  });

  describe('validateLLMApiKey', () => {
    it('should return Anthropic API key from environment', () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const key = validateLLMApiKey('anthropic');

      expect(key).toBe('test-anthropic-key');

      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    });

    it('should return OpenAI API key from environment', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const key = validateLLMApiKey('openai');

      expect(key).toBe('test-openai-key');

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    it('should return undefined when API key not set', () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const key = validateLLMApiKey('anthropic');

      expect(key).toBeUndefined();

      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    });
  });

  describe('isDbtProject', () => {
    it('should return true for valid dbt project', async () => {
      const result = await isDbtProject(testProject.path);

      expect(result).toBe(true);
    });

    it('should return false when dbt_project.yml does not exist', async () => {
      await fs.remove(path.join(testProject.path, 'dbt_project.yml'));

      const result = await isDbtProject(testProject.path);

      expect(result).toBe(false);
    });
  });
});
