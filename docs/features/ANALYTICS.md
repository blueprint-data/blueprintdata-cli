# Analytics Feature

Complete guide to the BlueprintData Analytics Agent for intelligent dbt project assistance.

---

## Table of Contents

1. [Overview](#overview)
2. [Initialization](#initialization)
3. [Agent Context](#agent-context)
4. [Syncing Context](#syncing-context)
5. [Chat Interface](#chat-interface)
6. [Agent Tools](#agent-tools)
7. [LLM Integration](#llm-integration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Analytics feature transforms your dbt project into an intelligent analytics environment with an AI-powered agent that understands your data warehouse, dbt models, and business context.

### Key Capabilities

- **Warehouse Profiling**: Automatically documents schemas, statistics, and relationships
- **dbt Integration**: Understands your models, lineage, and transformations
- **Business Context**: Learns your company's domain and terminology
- **Intelligent Chat**: Natural language queries with SQL generation
- **Tool Execution**: Query warehouse, search context, generate charts
- **LLM-Powered**: Supports Claude (Anthropic) and GPT (OpenAI)

### Commands

```bash
# Initialize analytics agent
blueprintdata analytics init

# Sync agent context with latest changes
blueprintdata analytics sync [options]

# Start interactive chat interface (coming soon)
blueprintdata analytics chat
```

---

## Initialization

### Prerequisites

Before running `analytics init`, ensure you have:

- A working dbt project with `dbt_project.yml`
- Configured dbt profiles in `~/.dbt/profiles.yml`
- Valid warehouse credentials (BigQuery or Postgres)
- An API key for Anthropic Claude or OpenAI GPT

### Quick Start

```bash
cd your-dbt-project
blueprintdata analytics init
```

### Initialization Process

The `init` command walks you through 8 steps:

#### 1. dbt Project Validation

Validates that you're in a valid dbt project directory.

```
✓ Valid dbt project detected
```

#### 2. Warehouse Connection

Reads your dbt profile configuration and tests the warehouse connection.

**Supported warehouses:**
- **BigQuery**: Google Cloud BigQuery
- **Postgres**: PostgreSQL

```
✓ Found bigquery warehouse configuration
✓ Warehouse connection successful
```

#### 3. LLM Provider Selection

Choose between Anthropic Claude and OpenAI GPT.

The CLI detects API keys in your environment:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

**Example prompt:**
```
? Select LLM provider:
  ● Anthropic Claude (detected in environment)
  ○ OpenAI GPT
```

If no keys detected, you'll be prompted to enter one.

#### 4. LLM Model Selection

Select two models for different purposes:

**Chat Model** (for interactive conversations):
- **Claude Options**:
  - `claude-3-5-sonnet-20241022` (Recommended) - Best for analysis
  - `claude-3-5-haiku-20241022` - Fast and cost-effective
  - `claude-3-opus-20240229` - Highest quality

- **GPT Options**:
  - `gpt-4o` (Recommended) - Latest, multimodal
  - `gpt-4o-mini` - Fast and cost-effective
  - `gpt-4-turbo` - Previous generation

**Profiling Model** (for generating documentation):
- Recommended: Cost-effective models (Haiku, GPT-4o-mini)
- Used for profiling many tables, so cost matters

#### 5. Company Context Collection

Provide information about your company to help the agent understand your business domain.

**Company Name** (optional):
```
? Company name (optional):
  Acme Corp
```

**Industry** (optional):
```
? Industry (optional):
  E-commerce
```

**Website Scraping** (optional):
```
? Provide website URLs to scrape for company context? (Y/n)
  Yes

? Enter website URLs (comma-separated):
  https://acme.com/about, https://acme.com/products

✓ Scraped 2 URLs
```

The scraper extracts text to learn about:
- Company mission and values
- Product offerings
- Business model
- Industry terminology

**Additional Context** (optional):
```
? Additional company context (optional):
  We track key metrics like CAC, LTV, churn rate, and MRR.
  Our data model focuses on subscription analytics.
```

**dbt Terminology Extraction**:

The CLI automatically scans your dbt project to extract:
- Business terms from model names
- Domain areas (finance, marketing, product, etc.)
- Common metrics referenced in models

```
✓ Found 45 terms, 8 domains
```

#### 6. Model Selection for Profiling

Choose which dbt models to profile during initialization.

**Options:**
- **All models** - Comprehensive but slower
- **Select specific models** - Use dbt selection syntax
- **Only marts layer** (Recommended) - Business-facing models only
- **Only staging layer** - Raw data transformations

**dbt Selection Syntax Examples:**
```
marts.finance.*              # All models in marts/finance
tag:core                     # All models with "core" tag
+dim_customers               # dim_customers and its upstream dependencies
fct_orders+                  # fct_orders and its downstream dependents
marts.*,tag:core             # Multiple selections
```

#### 7. Slack Integration (Optional)

Configure a Slack bot for team collaboration (future feature).

```
? Configure Slack bot integration? (y/N)
  No
```

#### 8. Configuration Save & Context Generation

**Configuration saved to** `.blueprintdata/config.json`:

```json
{
  "version": 2,
  "project": {
    "projectPath": "/path/to/your-dbt-project",
    "dbtProfilesPath": "/Users/you/.dbt/profiles.yml"
  },
  "llm": {
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "chatModel": "claude-3-5-sonnet-20241022",
    "profilingModel": "claude-3-5-haiku-20241022"
  },
  "warehouse": {
    "type": "bigquery",
    "connection": {
      "type": "bigquery",
      "projectId": "your-project",
      "database": "your-dataset"
    }
  },
  "company": {
    "name": "Acme Corp",
    "industry": "E-commerce",
    "websites": ["https://acme.com/about"],
    "scrapedContent": ["..."],
    "userContext": "We track CAC, LTV, churn...",
    "keyMetrics": ["revenue", "churn_rate", "ltv"],
    "domains": ["finance", "marketing", "product"]
  },
  "interface": {
    "uiPort": 3000,
    "gatewayPort": 8080
  }
}
```

**Agent context generated in** `agent-context/`:

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

### Re-initialization

To re-initialize (e.g., after changing LLM provider):

```bash
blueprintdata analytics init --force
```

This will:
- Prompt for new configuration
- Overwrite `.blueprintdata/config.json`
- Regenerate `agent-context/` directory

---

## Agent Context

The agent context is a collection of markdown files that provide the LLM with rich information about your data project.

### Directory Structure

```
agent-context/
├── system_prompt.md       # Agent instructions and capabilities
├── summary.md             # Project overview and business context
├── modelling.md           # dbt model catalog and lineage
└── models/                # Detailed table profiles
    ├── staging_users.md
    ├── dim_customers.md
    └── fct_orders.md
```

### system_prompt.md

Defines the agent's role, capabilities, and behavior:

- Agent persona (analytics assistant)
- Available tools and their usage
- Response formatting guidelines
- Safety and ethical guidelines

### summary.md

Project overview with business context:

**Without LLM enrichment** (basic template):
- Project name and description
- Warehouse type
- dbt project structure
- Key metrics

**With LLM enrichment**:
- Business-specific project description
- Alignment with company goals
- Key insights about data model
- Recommended use cases

### modelling.md

dbt model catalog with lineage information:

**Without LLM enrichment**:
- List of models grouped by layer
- Model dependencies (refs, sources)
- Materialization strategies
- Tags and meta information

**With LLM enrichment**:
- Analysis of dbt layering strategy
- Identification of key business entities
- Documentation of data flow patterns
- Recommendations for improvements

### models/*.md

Individual table/model profiles with:

**Basic Profile**:
- Table name and schema
- Column names and types
- Row count
- Null counts per column
- Sample values

**LLM-Enriched Profile** (future):
- Business-oriented column descriptions
- Data quality insights
- Common query patterns
- Relationship explanations

### LLM Enrichment

When LLM profiling model is configured and company context is provided, the agent uses AI to generate richer, more business-focused documentation.

**Benefits**:
- Context-aware descriptions
- Business terminology instead of technical jargon
- Insights and recommendations
- Better understanding for non-technical users

**Cost Considerations**:
- **Project summary**: ~500-1,000 tokens (~$0.01 with Haiku)
- **Modeling analysis**: ~1,000-3,000 tokens (~$0.02 with Haiku)
- **Table profiling** (future): ~500 tokens per table

For a typical project with 50 models:
- **Claude Haiku**: ~$0.10-0.50
- **GPT-4o Mini**: ~$0.02-0.10

---

## Syncing Context

After making changes to your dbt models, use `analytics sync` to update the agent context.

### Basic Usage

```bash
blueprintdata analytics sync
```

This will:
1. Load configuration
2. Scan dbt models for changes
3. Profile modified tables
4. Update `agent-context/` files

### Options

```bash
blueprintdata analytics sync [options]

Options:
  --force            Force full re-sync (re-profile all tables)
  --profiles-only    Only re-profile tables (skip dbt scan)
  --select <models>  Sync specific models (dbt selection syntax)
  --target <env>     Specify dbt target environment
```

### Examples

**Sync specific models:**
```bash
blueprintdata analytics sync --select marts.finance.*
```

**Full re-sync:**
```bash
blueprintdata analytics sync --force
```

**Profile tables only:**
```bash
blueprintdata analytics sync --profiles-only
```

**Use specific dbt target:**
```bash
blueprintdata analytics sync --target prod
```

### What Gets Synced

1. **dbt Model Scan** (unless `--profiles-only`):
   - Discovers new models
   - Updates model metadata
   - Refreshes lineage
   - Updates `modelling.md`

2. **Warehouse Profiling**:
   - Profiles selected tables
   - Gathers statistics
   - Generates/updates markdown files
   - Updates `models/*.md`

3. **Incremental Updates**:
   - Only profiles changed models (unless `--force`)
   - Fast for small changes
   - Full re-sync available when needed

### When to Sync

- After adding new dbt models
- After modifying model logic
- After warehouse schema changes
- Before starting a chat session
- Periodically (weekly/monthly)

---

## Chat Interface

The chat interface provides an interactive experience for querying your data and dbt project using natural language.

### Status

**Current**: In development (Phase 6)
**Available**: Coming soon

### Planned Features

When released, the chat interface will include:

#### Web UI

- Modern React-based interface
- Real-time WebSocket communication
- Message history and sessions
- Tool execution visualization
- Chart rendering
- Markdown support for responses

#### Authentication

- User registration and login
- JWT-based authentication
- Secure token storage
- Multi-user support

#### Core Capabilities

- **Natural language queries**: Ask questions in plain English
- **SQL generation**: Agent writes SQL based on your question
- **Query execution**: Runs queries against your warehouse
- **Context search**: Searches agent-context files
- **Chart generation**: Creates visualizations from data
- **Session management**: Save and resume conversations

#### Example Interactions

```
You: What are our top 5 customers by revenue this month?

Agent: I'll query the warehouse to find the top 5 customers by revenue.

[Tool: query_warehouse]
SELECT customer_name, SUM(revenue) as total_revenue
FROM fct_orders
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY customer_name
ORDER BY total_revenue DESC
LIMIT 5

Results:
1. Acme Corp - $125,430
2. Global Industries - $98,230
3. Tech Solutions - $87,560
4. ...

Would you like me to create a chart showing this data?
```

### Starting Chat (Future)

```bash
cd your-dbt-project
blueprintdata analytics chat
```

This will:
1. Load configuration
2. Check authentication
3. Initialize database
4. Start gateway server
5. Start web UI
6. Open browser to chat interface

---

## Agent Tools

The agent has access to specialized tools for interacting with your data and context.

### Available Tools

#### 1. query_warehouse

Execute read-only SQL queries against your data warehouse.

**Capabilities**:
- Run SELECT queries
- 30-second timeout
- 1000 row limit
- SQL injection protection

**Example:**
```sql
SELECT date, SUM(revenue) as revenue
FROM fct_orders
WHERE date >= '2024-01-01'
GROUP BY date
ORDER BY date
```

**Safety Features**:
- Blocks INSERT, UPDATE, DELETE, DROP, CREATE
- Read-only queries only
- Parameter validation
- Error handling

#### 2. search_context

Search agent-context files for relevant information.

**Capabilities**:
- Fuzzy search across all markdown files
- Searches system_prompt, summary, modelling, model profiles
- Returns relevant excerpts

**Example:**
```
Query: "customer lifetime value"
Results: Excerpts from dim_customers.md and fct_orders.md mentioning LTV
```

**Use Cases**:
- Find model definitions
- Look up business terminology
- Discover relevant tables
- Understand relationships

#### 3. generate_chart

Generate Chart.js configurations for data visualizations.

**Capabilities**:
- Line charts (time series)
- Bar charts (comparisons)
- Pie charts (proportions)
- Customizable colors and labels

**Example:**
```json
{
  "type": "line",
  "data": {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [{
      "label": "Revenue",
      "data": [100, 150, 200]
    }]
  }
}
```

**Use Cases**:
- Visualize query results
- Show trends over time
- Compare categories
- Display distributions

### Tool Execution Flow

```
User Question
    │
    ▼
Agent (LLM) decides which tool to use
    │
    ├─→ query_warehouse
    │   ├─→ Validate SQL
    │   ├─→ Execute query
    │   └─→ Return results
    │
    ├─→ search_context
    │   ├─→ Search markdown files
    │   └─→ Return excerpts
    │
    └─→ generate_chart
        ├─→ Create Chart.js config
        └─→ Return configuration
```

### Future Tools

Planned tools for future releases:

- **write_documentation**: Update dbt model docs
- **generate_test**: Create dbt tests
- **explain_lineage**: Visualize model dependencies
- **suggest_optimization**: Query performance tips
- **data_quality_check**: Validate data integrity

---

## LLM Integration

The agent uses Large Language Models (LLMs) to understand natural language and generate intelligent responses.

### Supported Providers

#### Anthropic Claude

**Models**:
- **claude-3-5-sonnet-20241022** (Recommended for chat)
  - Context: 200K tokens
  - Best balance of speed, cost, and quality
  - Strong at analysis and reasoning

- **claude-3-5-haiku-20241022** (Recommended for profiling)
  - Context: 200K tokens
  - Fast and cost-effective
  - Great for documentation generation

- **claude-3-opus-20240229**
  - Context: 200K tokens
  - Highest quality
  - Slower and more expensive

**Pricing** (as of 2024):
- Sonnet: $3/$15 per 1M tokens (input/output)
- Haiku: $1/$5 per 1M tokens
- Opus: $15/$75 per 1M tokens

#### OpenAI GPT

**Models**:
- **gpt-4o** (Recommended for chat)
  - Context: 128K tokens
  - Latest model
  - Multimodal capabilities

- **gpt-4o-mini** (Recommended for profiling)
  - Context: 128K tokens
  - Fast and cost-effective
  - Good quality

- **gpt-4-turbo**
  - Context: 128K tokens
  - Previous generation
  - Still very capable

**Pricing** (as of 2024):
- GPT-4o: $2.50/$10 per 1M tokens
- GPT-4o-mini: $0.15/$0.60 per 1M tokens
- GPT-4-turbo: $10/$30 per 1M tokens

### Model Selection Strategy

**For Chat** (interactive conversations):
- Choose more capable models (Sonnet, GPT-4o)
- Quality and reasoning matter most
- Cost per query is reasonable

**For Profiling** (batch documentation):
- Choose cost-effective models (Haiku, GPT-4o-mini)
- Running on many tables
- Good quality at lower cost

### API Keys

Set API keys via environment variables:

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...
```

Or store in `.blueprintdata/config.json` (added to `.gitignore`).

### Context Window Management

The agent automatically manages context to stay within model limits:

- **System prompt**: ~1-2K tokens
- **Agent context** (summary, modelling): ~5-10K tokens
- **Conversation history**: Variable
- **Tool results**: Variable

If context exceeds limits, older messages are summarized or removed.

---

## Best Practices

### Initialization

1. **Provide company context**: Better understanding = better responses
2. **Profile marts layer**: Focus on business-facing models
3. **Use cost-effective profiling models**: Save money on batch operations
4. **Scrape key pages**: About, product pages help agent understand domain

### Syncing

1. **Sync after model changes**: Keep context up to date
2. **Use `--select` for targeted syncs**: Faster for small changes
3. **Full re-sync periodically**: Ensure consistency (monthly)
4. **Profile before chat sessions**: Fresh data is best

### LLM Usage

1. **Use appropriate models**: Don't overpay for simple tasks
2. **Monitor API costs**: Track usage via provider dashboards
3. **Set API rate limits**: Avoid unexpected bills
4. **Cache when possible**: Future feature will reduce redundant calls

### Security

1. **Protect API keys**: Never commit to git
2. **Use environment variables**: Better than hardcoding
3. **Limit warehouse permissions**: Read-only for agent
4. **Review SQL before execution**: Future feature for approval workflow

### Documentation

1. **Keep dbt models documented**: Agent leverages descriptions
2. **Use descriptive names**: Better for LLM understanding
3. **Add meta fields**: Rich metadata helps agent
4. **Tag models appropriately**: Helps with filtering

---

## Troubleshooting

### Initialization Issues

#### "Invalid dbt project" error

**Symptoms**: CLI says dbt project not found

**Solutions**:
- Ensure you're in a directory with `dbt_project.yml`
- Check that `dbt_project.yml` is valid YAML
- Run `dbt debug` to verify project

#### "Failed to connect to warehouse" error

**Symptoms**: Warehouse connection test fails

**Solutions**:
- Verify `~/.dbt/profiles.yml` exists and is valid
- Test connection with `dbt debug`
- **For BigQuery**: Ensure `gcloud auth` is authenticated
- **For Postgres**: Check host, port, credentials

#### "Failed to load dbt profile" error

**Symptoms**: Can't read dbt profiles

**Solutions**:
- Check that profile name in `dbt_project.yml` matches `profiles.yml`
- Ensure target environment is configured
- Verify file permissions on `profiles.yml`

#### LLM API errors

**Symptoms**: API calls failing during init

**Solutions**:
- Verify API key is valid and has credits/quota
- Check network connectivity
- The command will fall back to basic templates if LLM fails

#### "Permission denied" during profiling

**Symptoms**: Can't query warehouse tables

**Solutions**:
- Ensure warehouse credentials have read access
- Check that dataset/schema exists
- Verify table permissions

### Sync Issues

#### "No changes detected" but models changed

**Symptoms**: Sync doesn't profile updated models

**Solutions**:
- Use `--force` to re-profile all tables
- Check that model selection is correct
- Verify dbt project hasn't moved

#### Sync is very slow

**Symptoms**: Takes a long time to complete

**Solutions**:
- Use `--select` to target specific models
- Profile only marts layer (not staging)
- Disable LLM enrichment temporarily (edit config)

#### "Context files not found"

**Symptoms**: Can't find `agent-context/` directory

**Solutions**:
- Run `analytics init` first
- Check you're in the right directory
- Verify `.blueprintdata/config.json` exists

### Configuration Issues

#### "Configuration not found"

**Symptoms**: CLI says no analytics config

**Solutions**:
- Run `analytics init` first
- Check `.blueprintdata/config.json` exists
- Verify you're in the dbt project root

#### "Invalid configuration version"

**Symptoms**: Config version mismatch

**Solutions**:
- CLI automatically migrates V1 → V2
- If migration fails, backup and re-run `init --force`

---

## Examples

### Example 1: Complete Setup

```bash
# Navigate to dbt project
cd my-dbt-project

# Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# Initialize
blueprintdata analytics init

# Prompts:
# - Provider: Anthropic
# - Chat model: Claude Sonnet
# - Profiling model: Claude Haiku
# - Company: Acme Corp
# - Industry: E-commerce
# - Websites: https://acme.com/about
# - Profile: Only marts layer

# Result: agent-context/ created with 23 model profiles
```

### Example 2: Incremental Sync

```bash
# Make changes to some models
# ...edit dbt models...

# Sync only changed models
blueprintdata analytics sync --select marts.finance.*

# Result: Only finance marts re-profiled
```

### Example 3: Full Re-Sync

```bash
# After warehouse schema changes
blueprintdata analytics sync --force

# Result: All tables re-profiled from scratch
```

---

## Cost Estimation

### Initialization Costs

**Typical dbt project (50 models, marts only)**:

Using Claude Haiku for profiling:
- Project summary: ~$0.01
- Modeling documentation: ~$0.02
- Table profiling (25 marts): ~$0.10
- **Total**: ~$0.13

Using GPT-4o-mini for profiling:
- **Total**: ~$0.03

### Sync Costs

**Incremental sync (5 modified models)**:
- Claude Haiku: ~$0.02
- GPT-4o-mini: ~$0.005

**Full re-sync**:
- Same as initialization

### Chat Costs (Future)

**Per conversation (10-20 messages)**:
- Claude Sonnet: ~$0.10-0.30
- GPT-4o: ~$0.05-0.15

---

## References

- [Architecture Guide](../ARCHITECTURE.md) - System architecture
- [Templates Feature](TEMPLATES.md) - Project scaffolding
- [Development Guide](../DEVELOPMENT.md) - Local development
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [OpenAI GPT Documentation](https://platform.openai.com/docs/)
- [dbt Documentation](https://docs.getdbt.com/)

---

**Last Updated**: 2026-01-29
