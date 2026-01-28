# Analytics Agent Initialization Guide

This guide explains how to initialize the BlueprintData analytics agent in your dbt project.

## Overview

The `analytics init` command transforms your dbt project into an intelligent analytics environment by:

1. **Connecting to your data warehouse** using existing dbt profiles
2. **Selecting LLM models** for chat interactions and context profiling
3. **Collecting company context** to help the agent understand your business
4. **Scanning your dbt project** to understand model structure and lineage
5. **Profiling warehouse tables** to document schemas and statistics
6. **Generating agent context** as markdown files for the LLM to reference

## Prerequisites

Before running `analytics init`, ensure you have:

- A working dbt project with `dbt_project.yml`
- Configured dbt profiles in `~/.dbt/profiles.yml`
- Valid warehouse credentials (BigQuery or Postgres)
- An API key for either Anthropic Claude or OpenAI GPT

## Command Usage

```bash
cd your-dbt-project
blueprintdata analytics init
```

### Options

- `--force`: Overwrite existing configuration (if analytics already initialized)

## Initialization Steps

### Step 1: dbt Project Validation

The command first validates that you're in a valid dbt project directory by checking for `dbt_project.yml`.

**Example output:**

```
✓ Valid dbt project detected
```

### Step 2: Warehouse Connection

The command reads your dbt profile configuration and tests the warehouse connection.

**Supported warehouses:**

- **BigQuery**: Reads project_id, dataset, and credentials from `~/.dbt/profiles.yml`
- **Postgres**: Reads host, port, database, user, and password from `~/.dbt/profiles.yml`

**Example output:**

```
✓ Found bigquery warehouse configuration
✓ Warehouse connection successful
```

### Step 3: LLM Provider Selection

Choose between Anthropic Claude and OpenAI GPT. The command detects API keys in your environment:

- `ANTHROPIC_API_KEY` environment variable
- `OPENAI_API_KEY` environment variable

If both are present, you can choose. If neither, you'll be prompted to enter an API key.

**Example prompt:**

```
? Select LLM provider:
  ○ Anthropic Claude (detected in environment)
  ● OpenAI GPT (detected in environment)
```

### Step 4: LLM Model Selection

Select two models for different purposes:

#### Chat Model

Used for interactive conversations with the analytics agent. Recommended: More capable models.

**Anthropic options:**

- `claude-3-5-sonnet-20241022` (Recommended) - Balanced performance, best for analysis
- `claude-3-5-haiku-20241022` - Fast and cost-effective
- `claude-3-opus-20240229` - Highest quality, slower

**OpenAI options:**

- `gpt-4o` (Recommended) - Latest, multimodal capabilities
- `gpt-4o-mini` - Fast and cost-effective
- `gpt-4-turbo` - Previous generation

#### Profiling Model

Used for generating warehouse table documentation. Recommended: Cost-effective models since this runs on many tables.

**Example prompts:**

```
? Select model for chat interactions:
  ● Claude 3.5 Sonnet (Recommended)

? Select model for context profiling (recommend cost-effective):
  ● Claude 3.5 Haiku (Fast, $1/$5 per 1M tokens)
```

### Step 5: Company Context Collection

Provide information about your company to help the agent understand your business domain.

#### Company Name (Optional)

```
? Company name (optional):
  Acme Corp
```

#### Industry (Optional)

```
? Industry (optional):
  E-commerce
```

#### Website Scraping (Optional)

Provide URLs to company websites that the agent can scrape for context:

```
? Provide website URLs to scrape for company context? (Y/n)
  Yes

? Enter website URLs (comma-separated):
  https://acme.com/about, https://acme.com/products

✓ Scraped 2 URLs
```

The scraper extracts text content from these pages to learn about:

- Company mission and values
- Product offerings
- Business model
- Industry terminology

#### Additional Context (Optional)

Provide free-form text about your business:

```
? Additional company context (optional):
  We track key metrics like CAC, LTV, churn rate, and monthly recurring revenue.
  Our data model focuses on subscription analytics and cohort analysis.
```

#### dbt Project Scanning

The command automatically scans your dbt project to extract:

- Business terminology from model names
- Domain areas (e.g., finance, marketing, product)
- Common metrics referenced in models

```
✓ Found 45 terms, 8 domains
```

### Step 6: Model Selection for Profiling

Choose which dbt models should be profiled during initialization.

**Options:**

- **All models** - Profile every model (comprehensive but slower)
- **Select specific models** - Use dbt selection syntax
- **Only marts layer** (Recommended) - Profile business-facing models only
- **Only staging layer** - Profile raw data transformations

**Examples:**

```
? Which dbt models should be profiled?
  ○ All models (comprehensive, slower)
  ○ Select specific models using dbt syntax
  ● Only marts layer (common choice)
  ○ Only staging layer
```

If you select "Select specific models", you can use dbt selection syntax:

```
? Enter dbt selection syntax:
  marts.finance.*,tag:core,+dim_customers
```

**Supported selection patterns:**

- `model_name` - Exact model name
- `marts.*` - All models in marts directory
- `tag:core` - All models with "core" tag
- `+model_name` - Model and its upstream dependencies
- `model_name+` - Model and its downstream dependents

### Step 7: Slack Integration (Optional)

Configure a Slack bot for team collaboration:

```
? Configure Slack bot integration? (y/N)
  No
```

If yes:

```
? Enter Slack Bot Token:
  xoxb-your-token-here

? Enter Slack Signing Secret:
  your-secret-here
```

See [Slack Bot Setup Guide](SLACK_SETUP.md) for instructions on creating a Slack app.

### Step 8: Configuration Save

The command saves all configuration to `.blueprintdata/config.json`:

```json
{
  "projectPath": "/path/to/your-dbt-project",
  "dbtProfilesPath": "/Users/you/.dbt/profiles.yml",
  "llmProvider": "anthropic",
  "llmApiKey": "sk-ant-...",
  "llmModel": "claude-3-5-sonnet-20241022",
  "llmProfilingModel": "claude-3-5-haiku-20241022",
  "warehouseType": "bigquery",
  "warehouseConnection": {
    "type": "bigquery",
    "projectId": "your-project",
    "database": "your-dataset"
  },
  "companyContext": {
    "name": "Acme Corp",
    "industry": "E-commerce",
    "websites": ["https://acme.com/about"],
    "scrapedContent": ["..."],
    "userContext": "We track CAC, LTV, churn...",
    "keyMetrics": ["revenue", "churn_rate", "ltv"]
  },
  "modelSelection": "marts.*",
  "uiPort": 3000,
  "gatewayPort": 8080
}
```

### Step 9: Agent Context Generation

The command generates the `agent-context/` directory:

```
agent-context/
├── system_prompt.md       # Agent instructions and capabilities
├── summary.md             # Project overview and company context
├── modelling.md           # dbt model catalog and lineage
└── models/                # Warehouse table profiles
    ├── staging_users.md
    ├── dim_customers.md
    └── fct_orders.md
```

**Process:**

1. **System Prompt** - Defines agent roles and capabilities
2. **Project Summary** - Uses LLM to generate business-oriented overview (if company context provided)
3. **Modeling Documentation** - Uses LLM to analyze dbt structure and patterns
4. **Table Profiling** - Queries warehouse for schemas, row counts, and statistics

**Example output:**

```
✓ Configuration saved to .blueprintdata/config.json
Building agent context (this may take a few minutes)
  Generating system prompt...
  Scanning dbt models...
  LLM enrichment enabled
  Generating LLM-enriched project summary...
  Generating LLM-enriched modeling documentation...
  Profiling warehouse tables...
  Found 23 tables to profile...
  Profiled 10/23 tables...
  Profiled 20/23 tables...
  Successfully profiled 23/23 tables
✓ Agent context created in agent-context/
```

## LLM Enrichment

When LLM profiling model is configured and company context is provided, the agent uses AI to generate:

### Enhanced Project Summary

Instead of a generic template, the LLM generates:

- Business-specific project description
- Alignment with company goals
- Key insights about data model
- Recommended use cases

### Enhanced Modeling Documentation

Instead of basic model lists, the LLM generates:

- Analysis of dbt layering strategy
- Identification of key business entities
- Documentation of data flow patterns
- Recommendations for improvements

### Table Profiles (Coming Soon)

Future enhancement will use LLM to generate:

- Business-oriented column descriptions
- Data quality insights
- Common query patterns
- Relationship explanations

## Configuration File

The `.blueprintdata/config.json` file stores all settings:

```json
{
  "projectPath": "/absolute/path/to/project",
  "dbtProfilesPath": "/Users/you/.dbt/profiles.yml",
  "llmProvider": "anthropic" | "openai",
  "llmApiKey": "your-api-key",
  "llmModel": "model-for-chat",
  "llmProfilingModel": "model-for-profiling",
  "warehouseType": "bigquery" | "postgres",
  "warehouseConnection": { /* warehouse config */ },
  "companyContext": {
    "name": "string",
    "industry": "string",
    "websites": ["url1", "url2"],
    "scrapedContent": ["content1", "content2"],
    "userContext": "string",
    "keyMetrics": ["metric1", "metric2"]
  },
  "modelSelection": "dbt-selection-syntax",
  "slackBotToken": "xoxb-..." /* optional */,
  "slackSigningSecret": "..." /* optional */,
  "uiPort": 3000,
  "gatewayPort": 8080
}
```

## Next Steps

After initialization:

1. **Review generated context:**

   ```bash
   cat agent-context/summary.md
   cat agent-context/modelling.md
   ls agent-context/models/
   ```

2. **Start the analytics agent:**

   ```bash
   blueprintdata analytics chat
   ```

3. **Update context when models change:**
   ```bash
   blueprintdata analytics sync
   ```

## Troubleshooting

### "Invalid dbt project" error

- Ensure you're in a directory with `dbt_project.yml`
- Check that `dbt_project.yml` is valid YAML

### "Failed to connect to warehouse" error

- Verify `~/.dbt/profiles.yml` exists and is valid
- Test connection with `dbt debug`
- For BigQuery: Ensure `gcloud` is authenticated
- For Postgres: Check host, port, and credentials

### "Failed to load dbt profile" error

- Check that profile name in `dbt_project.yml` matches `profiles.yml`
- Ensure target environment is configured

### LLM API errors

- Verify API key is valid and has credits/quota
- Check network connectivity
- The command will fall back to basic templates if LLM fails

### "Permission denied" during profiling

- Ensure warehouse credentials have read access to tables
- Check that dataset/schema exists

## Cost Considerations

LLM enrichment incurs API costs based on:

- **Project summary**: ~500-1,000 tokens (~$0.01 with Haiku)
- **Modeling analysis**: ~1,000-3,000 tokens (~$0.02 with Haiku)
- **Table profiling** (future): ~500 tokens per table

For a typical project with 50 models:

- **Anthropic Claude Haiku**: ~$0.10-0.50
- **OpenAI GPT-4o Mini**: ~$0.02-0.10

Tip: Use cost-effective models (Haiku, GPT-4o Mini) for profiling.

## Privacy & Security

- API keys are stored locally in `.blueprintdata/config.json`
- Add `.blueprintdata/` to `.gitignore` (recommended)
- No data is sent to third parties besides your chosen LLM provider
- Warehouse credentials remain in dbt profiles (not copied)
- Website scraping respects robots.txt

## Re-initialization

To re-initialize (e.g., after changing LLM provider):

```bash
blueprintdata analytics init --force
```

This will:

- Prompt for new configuration
- Overwrite `.blueprintdata/config.json`
- Regenerate `agent-context/` directory

## See Also

- [Analytics Sync Guide](ANALYTICS_SYNC.md)
- [Analytics Chat Guide](ANALYTICS_CHAT.md)
- [Slack Bot Setup](SLACK_SETUP.md)
- [Architecture Overview](ARCHITECTURE.md)
