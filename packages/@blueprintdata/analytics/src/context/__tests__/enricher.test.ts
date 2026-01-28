import { describe, it, expect, beforeEach } from 'bun:test';
import { LLMEnricher } from '../enricher.js';
import { MockLLMClient } from '../../__mocks__/llm/MockLLMClient.js';
import type { EnhancedTableStats, DbtModelMetadata, CompanyContext } from '@blueprintdata/models';
import type { DbtScanResult } from '../scanner.js';

describe('LLMEnricher', () => {
  let mockClient: MockLLMClient;
  let enricher: LLMEnricher;

  beforeEach(() => {
    mockClient = new MockLLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');
    enricher = new LLMEnricher(mockClient);
  });

  describe('enrichTableProfile', () => {
    it('should use dbt metadata model name when provided', async () => {
      const stats: EnhancedTableStats = {
        tableName: 'users',
        schemaName: 'public',
        rowCount: 1000,
        columns: [],
      };

      const dbtMetadata: DbtModelMetadata = {
        uniqueId: 'model.project.dim_users',
        name: 'dim_users',
        description: 'User dimension table',
        materializedAs: 'table',
        database: 'analytics',
        schema: 'public',
        alias: 'dim_users',
        tags: [],
        columns: [],
        dependsOn: { models: [], sources: [] },
        compiledSql: '',
      };

      mockClient.setShouldFail(new Error('Test error'));
      const result = await enricher.enrichTableProfile(stats, dbtMetadata);

      expect(result.modelName).toBe('dim_users');
    });

    it('should handle LLM errors gracefully', async () => {
      const stats: EnhancedTableStats = {
        tableName: 'users',
        schemaName: 'public',
        rowCount: 1000,
        columns: [],
      };

      mockClient.setShouldFail(new Error('API rate limit'));

      const result = await enricher.enrichTableProfile(stats);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.fallbackUsed).toBe(true);
      expect(result.error?.error).toContain('API rate limit');
    });

    it('should track duration on error', async () => {
      const stats: EnhancedTableStats = {
        tableName: 'users',
        schemaName: 'public',
        rowCount: 1000,
        columns: [],
      };

      mockClient.setShouldFail(new Error('Error'));

      const result = await enricher.enrichTableProfile(stats);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('enrichProjectSummary', () => {
    it('should handle LLM errors with fallback summary', async () => {
      const companyContext: CompanyContext = {
        name: 'Acme Corp',
        industry: 'E-commerce',
      };

      const projectMetadata = {
        name: 'acme_analytics',
        warehouseType: 'postgres',
        modelCount: 20,
        layers: { staging: 10, intermediate: 5, marts: 5 },
        domains: [],
      };

      mockClient.setShouldFail(new Error('LLM API error'));

      const summary = await enricher.enrichProjectSummary(companyContext, projectMetadata);

      expect(summary).toBeDefined();
      expect(summary).toContain('Project Summary');
      expect(summary).toContain('Acme Corp');
      expect(summary).toContain('postgres');
    });

    it('should include company name in fallback summary', async () => {
      const companyContext: CompanyContext = {
        name: 'Test Company',
        industry: 'Finance',
      };

      const projectMetadata = {
        name: 'test_project',
        warehouseType: 'bigquery',
        modelCount: 10,
        layers: { staging: 5, intermediate: 3, marts: 2 },
        domains: [],
      };

      mockClient.setShouldFail(new Error('Force fallback'));

      const summary = await enricher.enrichProjectSummary(companyContext, projectMetadata);

      expect(summary).toContain('Test Company');
      expect(summary).toContain('Finance');
    });

    it('should include user context in fallback summary', async () => {
      const companyContext: CompanyContext = {
        name: 'Custom Corp',
        userContext: 'We focus on B2B sales',
      };

      const projectMetadata = {
        name: 'custom_project',
        warehouseType: 'postgres',
        modelCount: 15,
        layers: { staging: 7, intermediate: 4, marts: 4 },
        domains: [],
      };

      mockClient.setShouldFail(new Error('Force fallback'));

      const summary = await enricher.enrichProjectSummary(companyContext, projectMetadata);

      expect(summary).toContain('We focus on B2B sales');
    });
  });

  describe('enrichModelingAnalysis', () => {
    it('should handle empty scan result with fallback', async () => {
      const scanResult: DbtScanResult = {
        modelCount: 0,
        refCount: 0,
        sourceCount: 0,
        models: [],
      };

      mockClient.setShouldFail(new Error('LLM error'));

      const analysis = await enricher.enrichModelingAnalysis(scanResult);

      expect(analysis).toBeDefined();
      expect(typeof analysis).toBe('string');
    });
  });
});
