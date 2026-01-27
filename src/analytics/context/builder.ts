import fs from 'fs-extra';
import path from 'path';
import { AnalyticsConfig } from '../../types.js';
import { BaseWarehouseConnector } from '../../warehouse/connection.js';
import { WarehouseProfiler } from './profiler.js';
import { DbtScanner } from './scanner.js';
import { LLMClient } from '../llm/client.js';
import { LLMEnricher } from './enricher.js';
import { DbtIntegration } from './dbt-integration.js';

const CONTEXT_DIR = 'agent-context';
const MODELS_DIR = 'models';

export interface BuildContextOptions {
  projectPath: string;
  config: AnalyticsConfig;
  connector: BaseWarehouseConnector;
  force?: boolean;
}

/**
 * Context builder - creates agent-context directory with all necessary files
 */
export class ContextBuilder {
  private options: BuildContextOptions;

  constructor(options: BuildContextOptions) {
    this.options = options;
  }

  /**
   * Build the complete agent context
   */
  async build(): Promise<void> {
    const { projectPath, config, force } = this.options;
    const contextDir = path.join(projectPath, CONTEXT_DIR);

    // Check if context already exists
    if ((await fs.pathExists(contextDir)) && !force) {
      throw new Error(`agent-context/ directory already exists. Use --force to overwrite.`);
    }

    console.log('Building agent context...');

    // Ensure context directory exists
    await fs.ensureDir(contextDir);

    // Create models directory
    const modelsDir = path.join(contextDir, MODELS_DIR);
    await fs.ensureDir(modelsDir);

    // Generate system prompt
    console.log('Generating system prompt...');
    await this.generateSystemPrompt(contextDir);

    // Scan dbt models
    console.log('Scanning dbt models...');
    const scanner = new DbtScanner(projectPath);
    const scanResult = await scanner.scanModels();

    // Initialize LLM client if configured (optional for Phase 2.2)
    let llmClient: LLMClient | undefined;
    let enricher: LLMEnricher | undefined;

    if (config.llmProfilingModel) {
      try {
        llmClient = new LLMClient(config.llmProvider, config.llmApiKey, config.llmProfilingModel);
        enricher = new LLMEnricher(llmClient);
        console.log('LLM enrichment enabled');
      } catch (error) {
        console.warn('Failed to initialize LLM client, using basic profiling:', error);
      }
    }

    // Generate summary (with optional LLM enrichment)
    console.log('Generating project summary...');
    await this.generateSummary(contextDir, scanResult, enricher);

    // Generate modelling.md (with optional LLM enrichment)
    console.log('Generating modelling documentation...');
    await this.generateModelling(contextDir, scanResult, enricher);

    // Profile warehouse tables
    console.log('Profiling warehouse tables...');
    const profiler = new WarehouseProfiler(this.options.connector);
    await profiler.profileAll({
      outputDir: modelsDir,
      includeRowCounts: true,
      enricher,
      companyContext: config.companyContext,
    });

    console.log('Agent context built successfully!');
  }

  /**
   * Generate system_prompt.md
   */
  private async generateSystemPrompt(contextDir: string): Promise<void> {
    const systemPrompt = `# System Prompt

You are an expert analytics agent working with a dbt (data build tool) project.

## Your Capabilities

### Analytics Engineer Role
As an Analytics Engineer, you have full access to:
- Query the data warehouse
- Create, modify, and delete dbt models
- Run dbt commands (compile, run, test)
- Read and write files in the project
- Commit changes to git
- Generate visualizations and reports

### Data Analyst Role
As a Data Analyst, you can:
- Query the data warehouse
- Generate visualizations and reports
- Ask questions about data and models
- View existing dbt models and documentation

## Project Context

All relevant project information is available in the \`agent-context/\` directory:

- \`summary.md\`: Project overview, company info, and goals
- \`modelling.md\`: dbt model catalog with lineage and best practices
- \`models/\`: Warehouse table schemas and metadata

## Guidelines

1. **Be Precise**: Always reference specific models, tables, and columns by name
2. **Use dbt Patterns**: Follow dbt best practices (staging, intermediate, marts)
3. **Validate Changes**: Run dbt compile and test before committing changes
4. **Document Work**: Add clear descriptions to new models and tests
5. **Ask Clarifying Questions**: If requirements are unclear, ask the user
6. **Show Your Work**: Explain your reasoning and approach

## Communication Style

- Be concise and direct
- Use markdown formatting for code and queries
- Present options when multiple approaches are valid
- Highlight potential issues or risks

Remember: You are a helpful assistant that empowers users to work with their data effectively.
`;

    await fs.writeFile(path.join(contextDir, 'system_prompt.md'), systemPrompt, 'utf-8');
  }

  /**
   * Generate summary.md (with optional LLM enrichment)
   */
  private async generateSummary(
    contextDir: string,
    scanResult: any,
    enricher?: LLMEnricher
  ): Promise<void> {
    const { projectPath, config } = this.options;

    // Read dbt_project.yml to get project info
    const dbtProjectPath = path.join(projectPath, 'dbt_project.yml');
    const yaml = await import('yaml');
    const dbtProjectContent = await fs.readFile(dbtProjectPath, 'utf-8');
    const dbtProject = yaml.parse(dbtProjectContent) as {
      name?: string;
      version?: string;
      profile?: string;
    };

    // Try LLM enrichment if available
    if (enricher && config.companyContext) {
      try {
        console.log('Generating LLM-enriched project summary...');

        // Analyze scan result for layers
        const stagingModels = scanResult.models.filter((m: any) =>
          m.relativePath.includes('staging')
        ).length;
        const intermediateModels = scanResult.models.filter((m: any) =>
          m.relativePath.includes('intermediate')
        ).length;
        const martsModels = scanResult.models.filter((m: any) =>
          m.relativePath.includes('marts')
        ).length;

        // Extract domains from model names
        const domains = Array.from(
          new Set(
            scanResult.models
              .map((m: any) => {
                const parts = m.name.split('_');
                return parts.length > 2 ? parts[1] : null;
              })
              .filter((d: any) => d !== null)
          )
        ) as string[];

        const enrichedSummary = await enricher.enrichProjectSummary(config.companyContext, {
          name: dbtProject.name || 'Unknown',
          dbtVersion: dbtProject.version,
          warehouseType: config.warehouseType,
          modelCount: scanResult.modelCount,
          layers: {
            staging: stagingModels,
            intermediate: intermediateModels,
            marts: martsModels,
          },
          domains,
        });

        await fs.writeFile(path.join(contextDir, 'summary.md'), enrichedSummary, 'utf-8');
        return;
      } catch (error) {
        console.warn('LLM enrichment failed, using basic summary:', error);
      }
    }

    // Fallback to basic summary
    const summary = `# Project Summary

## Overview

- **Project Name**: ${dbtProject.name || 'Unknown'}
- **dbt Version**: ${dbtProject.version || 'Unknown'}
- **Profile**: ${dbtProject.profile || dbtProject.name || 'default'}
- **Warehouse**: ${config.warehouseType}
- **LLM Provider**: ${config.llmProvider}

## Description

This is a dbt (data build tool) project for analytics and data transformation.

The project uses dbt to:
- Transform raw data into clean, analytics-ready models
- Document data lineage and dependencies
- Test data quality and integrity
- Generate documentation for the data warehouse

## Goals

1. **Data Quality**: Ensure all data transformations are tested and documented
2. **Maintainability**: Follow dbt best practices for model organization
3. **Collaboration**: Enable analytics team to work efficiently with data
4. **Insights**: Provide clean, reliable data for business intelligence

## Project Structure

- \`models/\`: dbt SQL models organized by layer (staging, intermediate, marts)
- \`tests/\`: Custom data quality tests
- \`macros/\`: Reusable SQL macros
- \`seeds/\`: Static reference data (CSV files)
- \`docs/\`: Project documentation

## Getting Started

To work with this project:
1. Review the modelling.md file to understand existing models
2. Check the models/ directory for table schemas
3. Ask questions about the data or request analysis
4. Request new models or modifications as needed

---

*Note: This summary is auto-generated. You can customize it to add company-specific context.*
`;

    await fs.writeFile(path.join(contextDir, 'summary.md'), summary, 'utf-8');
  }

  /**
   * Generate modelling.md (with optional LLM enrichment)
   */
  private async generateModelling(
    contextDir: string,
    scanResult: any,
    enricher?: LLMEnricher
  ): Promise<void> {
    const { config } = this.options;

    // Try LLM enrichment if available
    if (enricher && config.companyContext) {
      try {
        console.log('Generating LLM-enriched modeling documentation...');
        const enrichedModelling = await enricher.enrichModelingAnalysis(
          scanResult,
          config.companyContext
        );
        await fs.writeFile(path.join(contextDir, 'modelling.md'), enrichedModelling, 'utf-8');
        return;
      } catch (error) {
        console.warn('LLM enrichment failed, using basic modeling doc:', error);
      }
    }

    // Fallback to basic modelling.md
    const scanner = new DbtScanner(this.options.projectPath);
    const modellingMarkdown = scanner.generateModelingMarkdown(scanResult);
    await fs.writeFile(path.join(contextDir, 'modelling.md'), modellingMarkdown, 'utf-8');
  }

  /**
   * Update context (for sync command)
   */
  async update(options?: {
    models?: string[]; // Specific model names to update
    force?: boolean; // Force full update
    profilesOnly?: boolean; // Only re-profile tables, don't regenerate summary/modelling
    modelSelection?: string; // Model selection pattern (e.g., "dim_customers,fct_orders")
    dbtTarget?: string; // dbt target environment override
  }): Promise<void> {
    const { projectPath, config, connector } = this.options;
    const contextDir = path.join(projectPath, CONTEXT_DIR);

    if (!(await fs.pathExists(contextDir))) {
      throw new Error(
        `agent-context/ directory not found. Run 'blueprintdata analytics init' first.`
      );
    }

    console.log('Updating agent context...');

    // Only update modelling.md if not profiles-only
    if (!options?.profilesOnly) {
      // Re-scan dbt models
      console.log('Re-scanning dbt models...');
      const scanner = new DbtScanner(projectPath);
      const scanResult = await scanner.scanModels();

      const modellingMarkdown = scanner.generateModelingMarkdown(scanResult);
      await fs.writeFile(path.join(contextDir, 'modelling.md'), modellingMarkdown, 'utf-8');
    }

    // Re-profile warehouse tables
    console.log('Re-profiling warehouse tables...');
    const modelsDir = path.join(contextDir, MODELS_DIR);
    const profiler = new WarehouseProfiler(connector);

    // Parse model selection if provided and resolve to table names
    let tablesToProfile: string[] | undefined;
    if (options?.modelSelection) {
      const modelNames = options.modelSelection.split(',').map((m) => m.trim());
      console.log(`Profiling ${modelNames.length} selected models...`);

      // Use dbt integration to resolve model names to table names
      const dbtTarget = options.dbtTarget || config.dbtTarget;
      const dbtIntegration = new DbtIntegration(projectPath, dbtTarget);

      if (dbtTarget) {
        console.log(`  Using dbt target: ${dbtTarget}`);
      }

      await dbtIntegration.ensureManifest();

      tablesToProfile = [];
      for (const modelName of modelNames) {
        const tableName = await dbtIntegration.getModelTableName(modelName);
        if (tableName) {
          tablesToProfile.push(tableName);
        } else {
          console.warn(`  Warning: Could not resolve model '${modelName}' to a table name`);
        }
      }

      if (tablesToProfile.length === 0) {
        console.warn('  No valid models found, profiling all tables');
        tablesToProfile = undefined;
      } else {
        console.log(`  Resolved to ${tablesToProfile.length} warehouse tables`);
      }
    }

    // Initialize LLM client if configured (optional for Phase 2.2)
    let llmClient: LLMClient | undefined;
    let enricher: LLMEnricher | undefined;

    if (config.llmProfilingModel) {
      try {
        llmClient = new LLMClient(config.llmProvider, config.llmApiKey, config.llmProfilingModel);
        enricher = new LLMEnricher(llmClient);
        console.log('LLM enrichment enabled');
      } catch (error) {
        console.warn('Failed to initialize LLM client, using basic profiling:', error);
      }
    }

    await profiler.profileAll({
      outputDir: modelsDir,
      includeRowCounts: true,
      tables: tablesToProfile,
      enricher,
      companyContext: config.companyContext,
    });

    console.log('Agent context updated successfully!');
  }
}
