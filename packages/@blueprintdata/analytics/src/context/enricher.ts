import { LLMClient } from '../llm/client.js';
import {
  getProfilerSystemPrompt,
  formatTableProfileInput,
  getProjectSummarySystemPrompt,
  getModelingAnalysisSystemPrompt,
} from '../llm/prompts.js';
import {
  EnhancedTableStats,
  DbtModelMetadata,
  CompanyContext,
  ProfileResult,
} from '@blueprintdata/models';
import { DbtScanResult } from './scanner.js';
import { generateFallbackProfile } from './fallback.js';

/**
 * LLM Enricher - uses LLM to generate rich documentation
 */
export class LLMEnricher {
  private client: LLMClient;

  constructor(client: LLMClient) {
    this.client = client;
  }

  /**
   * Enrich a table profile with LLM-generated documentation
   */
  async enrichTableProfile(
    stats: EnhancedTableStats,
    dbtMetadata?: DbtModelMetadata,
    companyContext?: CompanyContext
  ): Promise<ProfileResult> {
    const modelName = dbtMetadata?.name || stats.tableName;
    const startTime = Date.now();

    try {
      // Format input for LLM
      const input = formatTableProfileInput({
        tableName: stats.tableName,
        schema: stats.schemaName,
        rowCount: stats.rowCount,
        sizeBytes: stats.sizeInBytes,
        timeRange: stats.timeRange,
        columns: stats.columns.map((col) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          completeness: col.nullPercentage !== undefined ? 100 - col.nullPercentage : undefined,
          cardinality: col.distinctCount,
          minValue: col.minValue,
          maxValue: col.maxValue,
          samples: col.sampleValues,
          dbtDescription: dbtMetadata?.columns.find((c) => c.name === col.name)?.description,
          dbtTests: dbtMetadata?.columns.find((c) => c.name === col.name)?.tests,
        })),
        dbtContext: dbtMetadata
          ? {
              modelName: dbtMetadata.name,
              description: dbtMetadata.description,
              materialization: dbtMetadata.materializedAs,
              tags: dbtMetadata.tags,
              upstreamModels: dbtMetadata.dependsOn.models,
              sources: dbtMetadata.dependsOn.sources,
              compiledSqlExcerpt: dbtMetadata.compiledSql,
            }
          : undefined,
        companyContext: companyContext
          ? {
              name: companyContext.name,
              industry: companyContext.industry,
              keyMetrics: companyContext.keyMetrics,
            }
          : undefined,
      });

      // Call LLM
      const systemPrompt = getProfilerSystemPrompt();
      const result = await this.client.generate(input, {
        systemPrompt,
        maxTokens: 4096,
        temperature: 0.7,
      });

      const duration = Date.now() - startTime;

      return {
        modelName,
        success: true,
        duration,
        content: result.content,
        tokensUsed: result.tokensUsed,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        modelName,
        success: false,
        duration,
        error: {
          modelName,
          errorType: 'llm',
          error: error instanceof Error ? error.message : 'Unknown error',
          fallbackUsed: true,
        },
      };
    }
  }

  /**
   * Generate project summary with LLM
   */
  async enrichProjectSummary(
    companyContext: CompanyContext,
    projectMetadata: {
      name: string;
      dbtVersion?: string;
      warehouseType: string;
      modelCount: number;
      layers: { staging: number; intermediate: number; marts: number };
      domains: string[];
    }
  ): Promise<string> {
    try {
      const input = `
Company Context:
- Name: ${companyContext.name || 'Unknown'}
- Industry: ${companyContext.industry || 'General'}
- Websites: ${companyContext.websites?.join(', ') || 'None provided'}

${
  companyContext.scrapedContent && companyContext.scrapedContent.length > 0
    ? `Website Content:\n${companyContext.scrapedContent.slice(0, 2).join('\n\n---\n\n')}\n\n`
    : ''
}

${companyContext.userContext ? `User-Provided Context:\n${companyContext.userContext}\n\n` : ''}

dbt Project Metadata:
- Project Name: ${projectMetadata.name}
- dbt Version: ${projectMetadata.dbtVersion || 'Unknown'}
- Warehouse: ${projectMetadata.warehouseType}
- Total Models: ${projectMetadata.modelCount}
  - Staging: ${projectMetadata.layers.staging}
  - Intermediate: ${projectMetadata.layers.intermediate}
  - Marts: ${projectMetadata.layers.marts}
- Identified Domains: ${projectMetadata.domains.join(', ')}
- Key Metrics: ${companyContext.keyMetrics?.join(', ') || 'None identified'}
      `;

      const systemPrompt = getProjectSummarySystemPrompt();
      const result = await this.client.generate(input, {
        systemPrompt,
        maxTokens: 2048,
        temperature: 0.7,
      });

      return result.content;
    } catch (error) {
      console.error('Failed to generate project summary with LLM:', error);

      // Return basic template as fallback
      return this.generateBasicProjectSummary(companyContext, projectMetadata);
    }
  }

  /**
   * Generate modeling analysis with LLM
   */
  async enrichModelingAnalysis(
    scanResult: DbtScanResult,
    companyContext?: CompanyContext
  ): Promise<string> {
    try {
      const input = `
Project Overview:
- Total Models: ${scanResult.modelCount}
- Total References: ${scanResult.refCount}
- Total Sources: ${scanResult.sourceCount}

${
  companyContext
    ? `Company Context:\n- Industry: ${companyContext.industry}\n- Key Metrics: ${companyContext.keyMetrics?.join(', ')}\n\n`
    : ''
}

Models:
${scanResult.models
  .slice(0, 50)
  .map(
    (model) => `
- ${model.name} (${model.relativePath})
  - Refs: ${model.refs.join(', ') || 'none'}
  - Sources: ${model.sources.map((s) => `${s.sourceName}.${s.tableName}`).join(', ') || 'none'}
  ${model.config && Object.keys(model.config).length > 0 ? `- Config: ${JSON.stringify(model.config)}` : ''}
`
  )
  .join('\n')}

${scanResult.models.length > 50 ? `... and ${scanResult.models.length - 50} more models` : ''}
      `;

      const systemPrompt = getModelingAnalysisSystemPrompt();
      const result = await this.client.generate(input, {
        systemPrompt,
        maxTokens: 3072,
        temperature: 0.7,
      });

      return result.content;
    } catch (error) {
      console.error('Failed to generate modeling analysis with LLM:', error);

      // Return basic template as fallback
      return this.generateBasicModelingAnalysis(scanResult);
    }
  }

  /**
   * Generate basic project summary (fallback)
   */
  private generateBasicProjectSummary(
    companyContext: CompanyContext,
    projectMetadata: { name: string; warehouseType: string; modelCount: number }
  ): string {
    return `# Project Summary

## Company Context

**${companyContext.name || 'Company Name'}**

Industry: ${companyContext.industry || 'General'}

${companyContext.userContext || 'No additional context provided.'}

## Data Infrastructure

This dbt project (${projectMetadata.name}) transforms data in a ${projectMetadata.warehouseType} warehouse.

**Statistics:**
- Total models: ${projectMetadata.modelCount}

## Getting Started

Review the \`modelling.md\` file to understand existing models and explore the \`models/\` directory for table schemas.
`;
  }

  /**
   * Generate basic modeling analysis (fallback)
   */
  private generateBasicModelingAnalysis(scanResult: DbtScanResult): string {
    return `# dbt Modeling Guide

## Project Overview

- **Total Models**: ${scanResult.modelCount}
- **Total References**: ${scanResult.refCount}
- **Total Sources**: ${scanResult.sourceCount}

## Models

${scanResult.models
  .slice(0, 20)
  .map(
    (model) => `
### ${model.name}

- **Path**: \`${model.relativePath}\`
- **References**: ${model.refs.map((r) => `\`${r}\``).join(', ') || 'None'}
- **Sources**: ${model.sources.map((s) => `\`${s.sourceName}.${s.tableName}\``).join(', ') || 'None'}
`
  )
  .join('\n')}

${scanResult.models.length > 20 ? `... and ${scanResult.models.length - 20} more models` : ''}
`;
  }

  /**
   * Get enriched content or fallback
   */
  async getEnrichedContent(
    stats: EnhancedTableStats,
    dbtMetadata?: DbtModelMetadata,
    companyContext?: CompanyContext
  ): Promise<string> {
    const result = await this.enrichTableProfile(stats, dbtMetadata, companyContext);

    if (result.success && result.content) {
      // LLM succeeded - return the generated content
      return result.content;
    } else {
      // LLM failed - use fallback
      return generateFallbackProfile(stats, dbtMetadata);
    }
  }
}
