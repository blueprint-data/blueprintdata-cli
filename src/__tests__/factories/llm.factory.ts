import { GenerateResult } from '../../analytics/llm/client.js';

/**
 * Create a mock LLM response with typical table profile content
 */
export function createMockTableProfileResponse(tableName: string = 'test_table'): string {
  return `# ${tableName}

## Overview
This table contains test data for automated testing purposes.

## Schema
- **id** (integer): Primary key identifier
- **name** (varchar): Name field
- **created_at** (timestamp): Record creation timestamp

## Data Quality
- Total rows: 1,000
- Data completeness: 95%
- Last updated: Recently

## Usage Notes
This is a test table used for development and testing.`;
}

/**
 * Create a mock LLM response for project summary
 */
export function createMockProjectSummaryResponse(projectName: string = 'test_project'): string {
  return `# ${projectName} Project Summary

## Overview
This is a test dbt project for automated testing.

## Key Metrics
- Models: 10
- Sources: 5
- Tests: 15

## Business Context
This project contains test data and models for development purposes.`;
}

/**
 * Create a mock generate result with token counts
 */
export function createMockGenerateResult(
  content: string,
  inputTokens: number = 1000,
  outputTokens: number = 500
): GenerateResult {
  return {
    content,
    tokensUsed: {
      input: inputTokens,
      output: outputTokens,
    },
  };
}

/**
 * Create a mock enrichment response for a column
 */
export function createMockColumnEnrichmentResponse(columnName: string = 'test_column'): string {
  return `**${columnName}**: This column contains test data with typical characteristics for testing purposes.`;
}

/**
 * Mock responses for common LLM prompts
 */
export const MOCK_LLM_RESPONSES = {
  TABLE_PROFILE: createMockTableProfileResponse(),
  PROJECT_SUMMARY: createMockProjectSummaryResponse(),
  ERROR: 'Error: Unable to generate response',
  EMPTY: '',
  GENERIC: 'This is a generic mock response for testing purposes.',
};

/**
 * Create sample token usage statistics
 */
export function createMockTokenUsage(options?: {
  input?: number;
  output?: number;
}): { input: number; output: number } {
  return {
    input: options?.input || 1500,
    output: options?.output || 800,
  };
}
