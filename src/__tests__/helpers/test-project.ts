import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { AnalyticsConfig, AnalyticsConfigV2 } from '../../types.js';

/**
 * Helper class for creating test dbt projects in temporary directories
 */
export class TestDbtProject {
  constructor(public readonly path: string) {}

  /**
   * Create a new test dbt project with default structure
   */
  static async create(options: {
    projectName?: string;
    includeProfiles?: boolean;
    includeManifest?: boolean;
  } = {}): Promise<TestDbtProject> {
    const {
      projectName = 'test_project',
      includeProfiles = true,
      includeManifest = false,
    } = options;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-dbt-'));
    const project = new TestDbtProject(tempDir);

    await project.createDbtProjectFile(projectName);
    await project.createModelsDirectory();

    if (includeProfiles) {
      await project.createProfilesFile(projectName);
    }

    if (includeManifest) {
      await project.createManifestFile();
    }

    return project;
  }

  /**
   * Create dbt_project.yml file
   */
  async createDbtProjectFile(projectName: string): Promise<void> {
    const dbtProjectContent = {
      name: projectName,
      version: '1.0.0',
      config_version: 2,
      profile: projectName,
      'model-paths': ['models'],
      'analysis-paths': ['analyses'],
      'test-paths': ['tests'],
      'seed-paths': ['seeds'],
      'macro-paths': ['macros'],
      'snapshot-paths': ['snapshots'],
      'target-path': 'target',
      'clean-targets': ['target', 'dbt_packages'],
      models: {
        [projectName]: {
          '+materialized': 'view',
        },
      },
    };

    await fs.writeFile(
      path.join(this.path, 'dbt_project.yml'),
      yaml.stringify(dbtProjectContent),
      'utf-8'
    );
  }

  /**
   * Create profiles.yml file
   */
  async createProfilesFile(
    projectName: string,
    warehouseType: 'postgres' | 'bigquery' = 'postgres'
  ): Promise<void> {
    const profilesPath = path.join(this.path, 'profiles.yml');

    let outputs;
    if (warehouseType === 'postgres') {
      outputs = {
        dev: {
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          user: 'test_user',
          password: 'test_password',
          dbname: 'test_db',
          schema: 'public',
          threads: 4,
        },
      };
    } else {
      outputs = {
        dev: {
          type: 'bigquery',
          method: 'service-account',
          project: 'test-project',
          dataset: 'test_dataset',
          threads: 4,
          keyfile: '/path/to/keyfile.json',
        },
      };
    }

    const profilesContent = {
      [projectName]: {
        target: 'dev',
        outputs,
      },
    };

    await fs.writeFile(profilesPath, yaml.stringify(profilesContent), 'utf-8');
  }

  /**
   * Create models directory
   */
  async createModelsDirectory(): Promise<void> {
    await fs.ensureDir(path.join(this.path, 'models'));
  }

  /**
   * Create a minimal manifest.json file
   */
  async createManifestFile(): Promise<void> {
    const targetDir = path.join(this.path, 'target');
    await fs.ensureDir(targetDir);

    const manifest = {
      metadata: {
        dbt_schema_version: 'https://schemas.getdbt.com/dbt/manifest/v7.json',
        generated_at: new Date().toISOString(),
      },
      nodes: {},
      sources: {},
      macros: {},
      docs: {},
      exposures: {},
      metrics: {},
      selectors: {},
    };

    await fs.writeFile(
      path.join(targetDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }

  /**
   * Add a dbt model to the project
   */
  async addModel(
    name: string,
    sql: string,
    subdirectory?: string
  ): Promise<void> {
    const modelDir = subdirectory
      ? path.join(this.path, 'models', subdirectory)
      : path.join(this.path, 'models');

    await fs.ensureDir(modelDir);

    const fileName = name.endsWith('.sql') ? name : `${name}.sql`;
    await fs.writeFile(path.join(modelDir, fileName), sql, 'utf-8');
  }

  /**
   * Add a dbt source to the project
   */
  async addSource(name: string, yamlContent: string): Promise<void> {
    const sourcesDir = path.join(this.path, 'models');
    await fs.ensureDir(sourcesDir);

    const fileName = name.endsWith('.yml') ? name : `${name}.yml`;
    await fs.writeFile(path.join(sourcesDir, fileName), yamlContent, 'utf-8');
  }

  /**
   * Create analytics configuration (V1 legacy format)
   */
  async writeConfigV1(config: AnalyticsConfig): Promise<void> {
    const blueprintDir = path.join(this.path, '.blueprintdata');
    await fs.ensureDir(blueprintDir);

    await fs.writeFile(
      path.join(blueprintDir, 'config.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  /**
   * Create analytics configuration (V2 hierarchical format)
   */
  async writeConfigV2(config: AnalyticsConfigV2): Promise<void> {
    const blueprintDir = path.join(this.path, '.blueprintdata');
    await fs.ensureDir(blueprintDir);

    await fs.writeFile(
      path.join(blueprintDir, 'config.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  /**
   * Read analytics configuration
   */
  async readConfig(): Promise<AnalyticsConfig | AnalyticsConfigV2> {
    const configPath = path.join(this.path, '.blueprintdata', 'config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Create agent-context directory structure
   */
  async createAgentContext(): Promise<void> {
    const contextDir = path.join(this.path, 'agent-context');
    await fs.ensureDir(contextDir);
    await fs.ensureDir(path.join(contextDir, 'models'));
  }

  /**
   * Write agent context file
   */
  async writeAgentContextFile(fileName: string, content: string): Promise<void> {
    const contextDir = path.join(this.path, 'agent-context');
    await fs.ensureDir(contextDir);
    await fs.writeFile(path.join(contextDir, fileName), content, 'utf-8');
  }

  /**
   * Check if a file exists in the project
   */
  async fileExists(relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.path, relativePath);
    return fs.pathExists(fullPath);
  }

  /**
   * Read a file from the project
   */
  async readFile(relativePath: string): Promise<string> {
    const fullPath = path.join(this.path, relativePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Write a file to the project
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.path, relativePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  /**
   * List files in a directory
   */
  async listFiles(relativePath: string = ''): Promise<string[]> {
    const fullPath = path.join(this.path, relativePath);
    const exists = await fs.pathExists(fullPath);
    if (!exists) return [];
    return fs.readdir(fullPath);
  }

  /**
   * Clean up the temporary project directory
   */
  async cleanup(): Promise<void> {
    await fs.remove(this.path);
  }
}

/**
 * Create a test dbt project with a typical structure
 */
export async function createTestDbtProject(options?: {
  projectName?: string;
  modelCount?: number;
  includeProfiles?: boolean;
}): Promise<TestDbtProject> {
  const { projectName = 'test_project', modelCount = 3, includeProfiles = true } = options || {};

  const project = await TestDbtProject.create({
    projectName,
    includeProfiles,
    includeManifest: true,
  });

  for (let i = 1; i <= modelCount; i++) {
    await project.addModel(
      `model_${i}.sql`,
      `SELECT * FROM {{ ref('source_table_${i}') }}`
    );
  }

  await project.addSource(
    'sources.yml',
    yaml.stringify({
      version: 2,
      sources: [
        {
          name: 'raw',
          tables: Array.from({ length: modelCount }, (_, i) => ({
            name: `source_table_${i + 1}`,
          })),
        },
      ],
    })
  );

  return project;
}

/**
 * Create a test dbt project with analytics already initialized
 */
export async function createInitializedTestProject(
  config?: Partial<AnalyticsConfigV2>
): Promise<TestDbtProject> {
  const project = await createTestDbtProject();

  const defaultConfig: AnalyticsConfigV2 = {
    version: 2,
    project: {
      projectPath: project.path,
      dbtProfilesPath: path.join(project.path, 'profiles.yml'),
    },
    llm: {
      provider: 'anthropic',
      apiKey: 'test-key',
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
    interface: {
      uiPort: 3000,
      gatewayPort: 8080,
    },
    ...config,
  };

  await project.writeConfigV2(defaultConfig);
  await project.createAgentContext();
  await project.writeAgentContextFile('system_prompt.md', '# System Prompt\n\nTest prompt');
  await project.writeAgentContextFile('summary.md', '# Project Summary\n\nTest summary');
  await project.writeAgentContextFile('modelling.md', '# dbt Models\n\nTest models');

  return project;
}
