import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ContextBuilder } from '../builder.js';
import { TestDbtProject } from '../../__tests__/helpers/test-project.js';
import { MockWarehouseConnector } from '../../__mocks__/warehouse/MockWarehouseConnector.js';
import { createMockConfigV1 } from '../../__tests__/factories/config.factory.js';
import fs from 'fs-extra';
import path from 'path';

describe('ContextBuilder', () => {
  let testProject: TestDbtProject;
  let mockConnector: MockWarehouseConnector;

  beforeEach(async () => {
    testProject = await TestDbtProject.create({ includeManifest: false });
    mockConnector = new MockWarehouseConnector({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      user: 'test',
      password: 'test',
      database: 'test',
    });
  });

  afterEach(async () => {
    await testProject.cleanup();
  });

  describe('build', () => {
    it('should create agent-context directory', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const contextExists = await fs.pathExists(path.join(testProject.path, 'agent-context'));
      expect(contextExists).toBe(true);
    });

    it('should create models subdirectory', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const modelsExists = await fs.pathExists(
        path.join(testProject.path, 'agent-context', 'models')
      );
      expect(modelsExists).toBe(true);
    });

    it('should generate system_prompt.md', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const promptPath = path.join(testProject.path, 'agent-context', 'system_prompt.md');
      const promptExists = await fs.pathExists(promptPath);
      expect(promptExists).toBe(true);

      const content = await fs.readFile(promptPath, 'utf-8');
      expect(content).toContain('# System Prompt');
      expect(content).toContain('expert analytics agent');
      expect(content).toContain('dbt (data build tool)');
    });

    it('should generate summary.md', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const summaryPath = path.join(testProject.path, 'agent-context', 'summary.md');
      const summaryExists = await fs.pathExists(summaryPath);
      expect(summaryExists).toBe(true);

      const content = await fs.readFile(summaryPath, 'utf-8');
      expect(content).toContain('# Project Summary');
      expect(content).toContain('## Overview');
    });

    it('should generate modelling.md', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const modellingPath = path.join(testProject.path, 'agent-context', 'modelling.md');
      const modellingExists = await fs.pathExists(modellingPath);
      expect(modellingExists).toBe(true);
    });

    it('should include project name in summary', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const summaryPath = path.join(testProject.path, 'agent-context', 'summary.md');
      const content = await fs.readFile(summaryPath, 'utf-8');
      expect(content).toContain('test_project');
    });

    it('should include warehouse type in summary', async () => {
      const config = createMockConfigV1({
        projectPath: testProject.path,
        warehouseType: 'postgres',
      });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const summaryPath = path.join(testProject.path, 'agent-context', 'summary.md');
      const content = await fs.readFile(summaryPath, 'utf-8');
      expect(content).toContain('postgres');
    });

    it('should throw error if context already exists without force', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      await expect(builder.build()).rejects.toThrow('agent-context/ directory already exists');
    });

    it('should overwrite context if force is true', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builderFirst = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builderFirst.build();

      const builderSecond = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
        force: true,
      });

      await expect(builderSecond.build()).resolves.toBeUndefined();
    });

    it('should scan and include dbt models in modelling.md', async () => {
      await testProject.addModel(
        'stg_users.sql',
        'SELECT id, name FROM {{ source("raw", "users") }}'
      );

      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const modellingPath = path.join(testProject.path, 'agent-context', 'modelling.md');
      const content = await fs.readFile(modellingPath, 'utf-8');
      expect(content).toContain('stg_users');
    });

    it('should handle models with dependencies', async () => {
      await testProject.addModel(
        'stg_users.sql',
        'SELECT id, name FROM {{ source("raw", "users") }}'
      );
      await testProject.addModel('dim_users.sql', 'SELECT * FROM {{ ref("stg_users") }}');

      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const modellingPath = path.join(testProject.path, 'agent-context', 'modelling.md');
      const content = await fs.readFile(modellingPath, 'utf-8');
      expect(content).toContain('stg_users');
      expect(content).toContain('dim_users');
    });
  });

  describe('update', () => {
    it('should throw error if context does not exist', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await expect(builder.update()).rejects.toThrow('agent-context/ directory not found');
    });

    it('should update modelling.md', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      await testProject.addModel('new_model.sql', 'SELECT 1');

      await builder.update();

      const modellingPath = path.join(testProject.path, 'agent-context', 'modelling.md');
      const content = await fs.readFile(modellingPath, 'utf-8');
      expect(content).toContain('new_model');
    });

    it('should not update modelling.md when profilesOnly is true', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const modellingPath = path.join(testProject.path, 'agent-context', 'modelling.md');
      const contentBefore = await fs.readFile(modellingPath, 'utf-8');

      await testProject.addModel('new_model.sql', 'SELECT 1');

      await builder.update({ profilesOnly: true });

      const contentAfter = await fs.readFile(modellingPath, 'utf-8');
      expect(contentAfter).toEqual(contentBefore);
    });

    it('should handle model selection', async () => {
      const projectWithManifest = await TestDbtProject.create({ includeManifest: true });

      const config = createMockConfigV1({
        projectPath: projectWithManifest.path,
        dbtTarget: 'dev',
      });
      const builder = new ContextBuilder({
        projectPath: projectWithManifest.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      await expect(
        builder.update({
          modelSelection: 'dim_customers,fct_orders',
          dbtTarget: 'dev',
        })
      ).resolves.toBeUndefined();

      await projectWithManifest.cleanup();
    });
  });

  describe('system prompt generation', () => {
    it('should include Analytics Engineer capabilities', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const promptPath = path.join(testProject.path, 'agent-context', 'system_prompt.md');
      const content = await fs.readFile(promptPath, 'utf-8');
      expect(content).toContain('Analytics Engineer Role');
      expect(content).toContain('Query the data warehouse');
      expect(content).toContain('dbt models');
    });

    it('should include Data Analyst capabilities', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const promptPath = path.join(testProject.path, 'agent-context', 'system_prompt.md');
      const content = await fs.readFile(promptPath, 'utf-8');
      expect(content).toContain('Data Analyst Role');
      expect(content).toContain('Generate visualizations');
    });

    it('should include guidelines', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const promptPath = path.join(testProject.path, 'agent-context', 'system_prompt.md');
      const content = await fs.readFile(promptPath, 'utf-8');
      expect(content).toContain('## Guidelines');
      expect(content).toContain('Be Precise');
      expect(content).toContain('Use dbt Patterns');
    });
  });

  describe('summary generation', () => {
    it('should include project metadata', async () => {
      const config = createMockConfigV1({
        projectPath: testProject.path,
        llmProvider: 'anthropic',
        warehouseType: 'postgres',
      });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const summaryPath = path.join(testProject.path, 'agent-context', 'summary.md');
      const content = await fs.readFile(summaryPath, 'utf-8');
      expect(content).toContain('anthropic');
      expect(content).toContain('postgres');
    });

    it('should include project structure section', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const summaryPath = path.join(testProject.path, 'agent-context', 'summary.md');
      const content = await fs.readFile(summaryPath, 'utf-8');
      expect(content).toContain('## Project Structure');
      expect(content).toContain('models/');
      expect(content).toContain('tests/');
      expect(content).toContain('macros/');
    });

    it('should include getting started section', async () => {
      const config = createMockConfigV1({ projectPath: testProject.path });
      const builder = new ContextBuilder({
        projectPath: testProject.path,
        config,
        connector: mockConnector,
      });

      await builder.build();

      const summaryPath = path.join(testProject.path, 'agent-context', 'summary.md');
      const content = await fs.readFile(summaryPath, 'utf-8');
      expect(content).toContain('## Getting Started');
      expect(content).toContain('Review the modelling.md');
    });
  });
});
