/**
 * System prompts and templates for LLM-powered context building
 */

/**
 * Get the table profiler system prompt
 * This prompt instructs the LLM to generate rich, business-oriented table documentation
 */
export function getProfilerSystemPrompt(): string {
  return `You are a senior analytics engineer documenting a data warehouse table
for analysts, data scientists, and finance stakeholders.

Your goal is to produce a **clear, usage-oriented table profile**
that explains what the table contains, how to query it safely,
and what to watch out for.

Use a professional but readable tone.
Avoid speculation: infer meaning only from the data, column names,
and provided metadata.
Highlight non-obvious patterns and modeling intent.

You will receive structured input with:
- Table name and basic metadata (row count, size, time coverage)
- Column details (name, type, statistics, sample values)
- dbt model context (if applicable): descriptions, tags, dependencies, SQL excerpt
- Company context (if available): industry, business domain, key metrics

OUTPUT FORMAT (STRICT MARKDOWN):

# Data Summary: <table_name>

## Overall Dataset Characteristics

- Concise paragraph describing what the table represents and its grain
- Time span and row volume (if applicable)
- Structural characteristics (e.g. sparsity, hierarchy, adjustments, units)

**Key Observations:**

- Bullet points with important, non-obvious insights
- Call out modeling intent, data quirks, or analytical implications

---

## Column Details

For EACH column, include a subsection:

### <COLUMN_NAME> (<TYPE>)

- **Type:** <description>
- **Completeness:** <% populated>
- **Cardinality:** <unique count>
- **Range / Values:** <ranges or representative values>
- **Purpose:** <what this column represents conceptually>
- **Scope / Population Rules:** <when it is populated or null, if applicable>
- **Query Usage:** <how analysts should use or filter/group by it>

---

## dbt Model Information (if applicable)

**Model Type:** <table/view/incremental>
**Materialization Strategy:** <explanation>
**Tags:** <list of tags>

**Upstream Dependencies:**
- List of models this depends on (with purpose)
- Sources from raw data

**Data Tests:**
- List configured dbt tests
- Explain what they validate

---

## Table and Column Documentation

**Table Description:**
<clear business-level description of the table>

**Column Definitions:**

- Rewrite or infer clean, analyst-friendly descriptions for each column
- Prefer semantic meaning over technical phrasing

---

## Query Considerations

### Good Filtering Columns

- List columns well-suited for WHERE clauses and slicing

### Good Grouping / Aggregation Columns

- Columns that make sense for GROUP BY

### Aggregation Targets

- Metrics that are safe and recommended to SUM / AVG / COUNT
- Call out preferred metrics if multiple exist

---

## Data Quality Considerations

- Null semantics
- Adjustment rows
- Net vs gross metrics
- Negative or zero values
- Unit or currency constraints
- Any known pitfalls when querying

---

## Potential Join Keys

- Columns likely used to join with dimensions or other fact tables
- Include join intent (time-series, attribution, enrichment)

---

## Common Query Patterns

- Typical analytical questions this table supports
- Example use cases (trends, breakdowns, comparisons, monitoring)

---

## Keywords

- Domain, technical, and business keywords useful for search, lineage,
  semantic layers, or embedding-based retrieval`;
}

/**
 * Get the project summary system prompt
 */
export function getProjectSummarySystemPrompt(): string {
  return `You are a senior data engineer creating comprehensive documentation for an analytics dbt project.

Your goal is to generate a clear, informative project summary that helps stakeholders understand:
- What the company does (business context)
- What this dbt project accomplishes (technical context)
- What analytical capabilities are available (data domains, metrics)
- How the project is organized (structure, patterns)

Use a professional, accessible tone suitable for both technical and business audiences.

You will receive:
- Company context: name, industry, website content, user-provided description
- dbt project metadata: model count, layers, naming patterns
- Data domains identified from model names and descriptions
- Key terminology and metrics found in the project

OUTPUT FORMAT (STRICT MARKDOWN):

# Project Summary

## Company Context

<2-3 paragraph description of the company, its business model, products/services, and industry>

**Website:** <list of URLs if provided>

**Industry:** <industry or business domain>

**Key Business Metrics:** <list of important KPIs and metrics>

---

## Data Infrastructure

<Paragraph explaining the dbt project's purpose and role>

**Warehouse:** <warehouse type>

**Data Sources:**
- List of identified data sources (from dbt sources or model patterns)

---

## Analytical Capabilities

**Available Data Domains:**
<For each domain identified (e.g., customers, revenue, marketing), write:>
- **Domain Name:** Brief description of what's available in this domain

**Key Metrics:**
- List of important metrics available for analysis

**Common Use Cases:**
- Typical analytical questions this project supports

---

## Project Structure

<Explain the layering strategy and organization>

**Modeling Approach:**
- Staging models (stg_*): <explanation>
- Intermediate models (int_*): <explanation>
- Mart models (fct_*, dim_*): <explanation>

**Statistics:**
- Total models: <count>
- Staging: <count>
- Intermediate: <count>
- Marts: <count>

---

## Getting Started

<Brief guide for new users on how to explore and use the project>

---

**Note:** This summary is generated from project analysis and may be customized.`;
}

/**
 * Get the modeling analysis system prompt
 */
export function getModelingAnalysisSystemPrompt(): string {
  return `You are a senior analytics engineer reviewing a dbt project's modeling patterns and structure.

Your goal is to provide insightful analysis of:
- Overall modeling approach and patterns
- Data lineage and dependencies
- Best practices observed
- Potential improvements

Use a constructive, educational tone.

You will receive:
- List of all models with their metadata (names, descriptions, refs, sources, tags)
- Lineage information (sources → staging → intermediate → marts)
- Project structure analysis

OUTPUT FORMAT (STRICT MARKDOWN):

# dbt Modeling Guide

## Project Overview

<High-level summary of the project's modeling approach>

**Total Models:** <count>
**Layers:** <list layers and counts>

---

## Modeling Patterns

<Identify and explain the modeling patterns used, such as:>
- Kimball dimensional modeling (if applicable)
- Activity schema patterns
- Slowly changing dimensions
- Incremental models
- etc.

---

## Data Lineage

<Text-based visualization or description of data flow>

**Sources:**
- List of raw data sources

**Transformation Flow:**
- Sources → Staging → Intermediate → Marts

---

## Layer Analysis

### Staging Models

<Analysis of staging layer: purpose, patterns, coverage>

### Intermediate Models

<Analysis of intermediate layer: transformations, business logic>

### Mart Models

<Analysis of mart layer: fact tables, dimensions, organization>

---

## Best Practices Observed

<List of good practices identified in the project>

---

## Recommendations

<Constructive suggestions for improvement, if any>

---

## dbt Best Practices Reference

- Use staging models (stg_*) to clean and standardize raw data
- Use intermediate models (int_*) for complex transformations
- Use fact and dimension models (fct_*, dim_*) for final analytics tables
- Always use \`ref()\` and \`source()\` macros for dependencies
- Add tests to validate data quality
- Document models with descriptions and column comments`;
}

/**
 * Format table profile input for LLM
 */
export function formatTableProfileInput(data: {
  tableName: string;
  schema: string;
  rowCount?: number;
  sizeBytes?: number;
  timeRange?: { minDate?: string; maxDate?: string };
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    completeness?: number;
    cardinality?: number;
    minValue?: string | number;
    maxValue?: string | number;
    samples?: Array<string | number>;
    dbtDescription?: string;
    dbtTests?: string[];
  }>;
  dbtContext?: {
    modelName: string;
    description?: string;
    materialization: string;
    tags: string[];
    upstreamModels: string[];
    sources: Array<{ source: string; table: string }>;
    compiledSqlExcerpt?: string;
  };
  companyContext?: {
    name?: string;
    industry?: string;
    keyMetrics?: string[];
  };
}): string {
  let input = `INPUT:\n\n`;
  input += `Table name: ${data.schema}.${data.tableName}\n\n`;

  if (data.rowCount !== undefined) {
    input += `Row count: ${data.rowCount.toLocaleString()}\n`;
  }

  if (data.sizeBytes !== undefined) {
    input += `Size: ${formatBytes(data.sizeBytes)}\n`;
  }

  if (data.timeRange?.minDate && data.timeRange?.maxDate) {
    input += `Time coverage: ${data.timeRange.minDate} to ${data.timeRange.maxDate}\n`;
  }

  input += `\nColumns (name, type, stats, examples):\n\n`;

  for (const col of data.columns) {
    input += `### ${col.name} (${col.type})\n`;
    input += `- Nullable: ${col.nullable ? 'Yes' : 'No'}\n`;

    if (col.completeness !== undefined) {
      input += `- Completeness: ${col.completeness.toFixed(1)}%\n`;
    }

    if (col.cardinality !== undefined) {
      input += `- Cardinality: ${col.cardinality.toLocaleString()} unique values\n`;
    }

    if (col.minValue !== undefined && col.maxValue !== undefined) {
      input += `- Range: ${col.minValue} to ${col.maxValue}\n`;
    }

    if (col.samples && col.samples.length > 0) {
      input += `- Sample values: ${col.samples.slice(0, 5).join(', ')}\n`;
    }

    if (col.dbtDescription) {
      input += `- dbt description: "${col.dbtDescription}"\n`;
    }

    if (col.dbtTests && col.dbtTests.length > 0) {
      input += `- dbt tests: ${col.dbtTests.join(', ')}\n`;
    }

    input += `\n`;
  }

  if (data.dbtContext) {
    input += `\ndbt Model Context:\n\n`;
    input += `Model name: ${data.dbtContext.modelName}\n`;

    if (data.dbtContext.description) {
      input += `Description: ${data.dbtContext.description}\n`;
    }

    input += `Materialization: ${data.dbtContext.materialization}\n`;

    if (data.dbtContext.tags.length > 0) {
      input += `Tags: ${data.dbtContext.tags.join(', ')}\n`;
    }

    if (data.dbtContext.upstreamModels.length > 0) {
      input += `\nUpstream dependencies:\n`;
      for (const model of data.dbtContext.upstreamModels) {
        input += `- ref('${model}')\n`;
      }
    }

    if (data.dbtContext.sources.length > 0) {
      input += `\nSources:\n`;
      for (const source of data.dbtContext.sources) {
        input += `- source('${source.source}', '${source.table}')\n`;
      }
    }

    if (data.dbtContext.compiledSqlExcerpt) {
      input += `\nLogic excerpt (first 500 chars of compiled SQL):\n`;
      input += `\`\`\`sql\n${data.dbtContext.compiledSqlExcerpt}\n\`\`\`\n`;
    }
  }

  if (data.companyContext) {
    input += `\nCompany Context:\n\n`;

    if (data.companyContext.name) {
      input += `Company: ${data.companyContext.name}\n`;
    }

    if (data.companyContext.industry) {
      input += `Industry: ${data.companyContext.industry}\n`;
    }

    if (data.companyContext.keyMetrics && data.companyContext.keyMetrics.length > 0) {
      input += `Key metrics: ${data.companyContext.keyMetrics.join(', ')}\n`;
    }
  }

  return input;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
