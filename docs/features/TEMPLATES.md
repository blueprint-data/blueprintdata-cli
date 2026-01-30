# Templates Feature

Complete guide to project scaffolding with BlueprintData CLI templates.

---

## Table of Contents

1. [Overview](#overview)
2. [Available Templates](#available-templates)
3. [Creating a New Project](#creating-a-new-project)
4. [Template Structure](#template-structure)
5. [Configuration](#configuration)
6. [CI/CD Setup](#cicd-setup)
7. [Customization](#customization)
8. [Best Practices](#best-practices)

---

## Overview

The `blueprintdata new` command scaffolds complete data stack projects with pre-configured tools and best practices built in.

### What You Get

- **Extraction Layer**: Meltano with sample extractors
- **Transformation Layer**: dbt with organized model structure
- **CI/CD**: GitHub Actions workflows for automated testing and deployment
- **Best Practices**: Sandbox datasets, slim CI, defer strategy, and more
- **Modern Tooling**: uv for Python package management, pyproject.toml configuration

### Key Features

- **Zero-config local development** with sandbox datasets
- **Slim CI/CD** that only builds modified models
- **PR-specific sandboxes** for isolated testing
- **Automatic cleanup** of unused sandbox datasets
- **Production-ready** workflows from day one

---

## Available Templates

### Lite Data Stack - PostgreSQL

**Template ID**: `lite-postgres` (alias: `lite`)

**Stack**:
- **Extraction**: Meltano with tap-csv
- **Transformation**: dbt with PostgreSQL adapter
- **Storage**: PostgreSQL
- **CI/CD**: GitHub Actions

**Best For**:
- Small to medium data teams
- PostgreSQL infrastructure
- Local or cloud-hosted Postgres
- Learning and experimentation

**Command**:
```bash
blueprintdata new my-project --stack lite-postgres
# or
blueprintdata new my-project --stack lite
```

### Lite Data Stack - BigQuery

**Template ID**: `lite-bigquery`

**Stack**:
- **Extraction**: Meltano with tap-github + target-bigquery
- **Transformation**: dbt with BigQuery adapter
- **Storage**: Google BigQuery
- **CI/CD**: GitHub Actions with GCP Workload Identity

**Best For**:
- Google Cloud Platform users
- BigQuery data warehouse
- Scalable cloud data stack
- Serverless architecture

**Command**:
```bash
blueprintdata new my-project --stack lite-bigquery
```

### Comparison

| Feature | PostgreSQL | BigQuery |
|---------|-----------|----------|
| **Cost** | Database hosting | Query-based pricing |
| **Scale** | TB range | PB range |
| **Setup** | Database required | Serverless |
| **Sample Extractor** | tap-csv | tap-github |
| **Authentication** | Username/password | Service account |
| **CI/CD Complexity** | Lower | Higher (GCP setup) |

---

## Creating a New Project

### Interactive Mode

```bash
blueprintdata new
```

You'll be prompted for:

1. **Stack type**: Choose from available templates
2. **Project name**: Name for your project directory
3. **Storage type** (if applicable): Some stacks support multiple storage options

### Non-Interactive Mode

Specify all options via flags:

```bash
blueprintdata new my-project \
  --stack lite-bigquery
```

### Command Options

```bash
blueprintdata new [project-name] [options]

Options:
  --stack <type>     Stack type (lite-postgres, lite-bigquery)
  -h, --help         Display help
```

### What Happens

1. **Project directory created**: `my-project/`
2. **Template files copied** with variable substitution
3. **Git repository initialized** (if git available)
4. **Success message** with next steps

### Example Output

```bash
$ blueprintdata new analytics-stack --stack lite-bigquery

✔ Stack type: Lite Data Stack (BigQuery)
✔ Project name: analytics-stack
✔ Creating project at: /Users/you/analytics-stack

📦 Copying template files...
✓ Created extraction/
✓ Created transform/
✓ Created .github/workflows/
✓ Created configuration files

🎉 Project created successfully!

Next steps:
  cd analytics-stack
  cat README.md
```

---

## Template Structure

All templates follow a consistent structure:

```
my-project/
├── extraction/                    # Meltano project
│   ├── meltano.yml               # Meltano configuration
│   ├── pyproject.toml            # Python dependencies (uv)
│   └── scripts/
│       └── setup-local.sh        # Local setup script
├── transform/                    # dbt project
│   ├── dbt_project.yml           # dbt configuration
│   ├── packages.yml              # dbt packages
│   ├── profiles.yml.example      # Database profiles template
│   ├── pyproject.toml            # Python dependencies (uv)
│   ├── scripts/
│   │   └── setup-local.sh        # Local setup script
│   ├── macros/
│   │   └── generate_schema_name.sql  # Sandbox support
│   └── models/
│       ├── staging/              # Staging layer (incremental)
│       └── production/
│           └── marts/            # Marts layer (tables)
├── .github/
│   └── workflows/                # CI/CD workflows
│       ├── data-pipeline.yml     # ETL pipeline (scheduled)
│       ├── transform-deploy.yml  # dbt deploy (main branch)
│       ├── transform-pr-ci.yml   # PR validation
│       └── cleanup-sandbox-datasets.yml  # Weekly cleanup
├── .gitignore                    # Git ignore rules
├── .env.example                  # Environment variables template
└── README.md                     # Project documentation
```

### Key Files

#### meltano.yml

Meltano configuration with:
- Extractors (taps) configuration
- Loaders (targets) configuration
- Schedules for automated runs
- Plugins and utilities

#### dbt_project.yml

dbt project configuration with:
- Project name and version
- Model paths and configurations
- Materialization strategies (incremental staging, table marts)
- Documentation settings (`persist_docs: true`)

#### generate_schema_name.sql

Custom macro for sandbox dataset strategy:
- **Production**: Uses configured schema names
- **Development**: Uses `SANDBOX_<USER>` datasets
- **CI**: Uses `SANDBOX_CI_PR_<NUMBER>` datasets

#### CI/CD Workflows

Pre-configured GitHub Actions workflows (see [CI/CD Setup](#cicd-setup))

---

## Configuration

### Extraction Setup

1. **Navigate to extraction directory**:
   ```bash
   cd my-project/extraction
   ```

2. **Run setup script**:
   ```bash
   ./scripts/setup-local.sh
   ```
   This installs Python dependencies via uv and initializes Meltano.

3. **Configure extractors** in `meltano.yml`:
   ```yaml
   plugins:
     extractors:
       - name: tap-your-source
         pip_url: tap-your-source
         config:
           api_key: ${YOUR_API_KEY}
   ```

4. **Test extraction**:
   ```bash
   meltano run tap-your-source target-your-destination
   ```

### Transformation Setup

1. **Navigate to transform directory**:
   ```bash
   cd my-project/transform
   ```

2. **Run setup script**:
   ```bash
   ./scripts/setup-local.sh
   ```
   This installs dbt via uv.

3. **Configure profiles**:
   ```bash
   cp profiles.yml.example profiles.yml
   # Edit profiles.yml with your credentials
   ```

   **PostgreSQL example**:
   ```yaml
   my_project:
     target: dev
     outputs:
       dev:
         type: postgres
         host: localhost
         port: 5432
         user: "{{ env_var('DB_USER') }}"
         password: "{{ env_var('DB_PASSWORD') }}"
         dbname: analytics
         schema: public
   ```

   **BigQuery example**:
   ```yaml
   my_project:
     target: dev
     outputs:
       dev:
         type: bigquery
         method: service-account
         project: my-gcp-project
         dataset: analytics
         keyfile: /path/to/keyfile.json
   ```

4. **Set environment variable** for sandbox support:
   ```bash
   export DBT_USER="yourname"
   ```

5. **Install dbt packages**:
   ```bash
   dbt deps
   ```

6. **Test transformation**:
   ```bash
   dbt run
   dbt test
   ```

### Environment Variables

Create `.env` file in project root:

**PostgreSQL**:
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=analytics
DB_USER=your_username
DB_PASSWORD=your_password

# dbt
DBT_USER=yourname
```

**BigQuery**:
```bash
# GCP
GCP_PROJECT=my-gcp-project
GCP_DATASET=analytics
GOOGLE_APPLICATION_CREDENTIALS=/path/to/keyfile.json

# dbt
DBT_USER=yourname
```

---

## CI/CD Setup

### Overview

All templates include 4 GitHub Actions workflows:

1. **Data Pipeline**: Scheduled ETL runs
2. **Transform Deploy**: Deploy to production on merge to main
3. **Transform PR CI**: Validate PRs with sandbox datasets
4. **Cleanup Sandbox Datasets**: Weekly cleanup of unused sandboxes

### Workflow: Data Pipeline

**File**: `.github/workflows/data-pipeline.yml`

**Triggers**:
- Scheduled (cron)
- Manual dispatch

**Steps**:
1. Extract data with Meltano
2. Transform with dbt
3. Test data quality

**Configuration**:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:     # Manual trigger
```

### Workflow: Transform Deploy

**File**: `.github/workflows/transform-deploy.yml`

**Triggers**:
- Push to `main` branch

**Steps**:
1. Download production manifest (for slim CI)
2. Build only modified models
3. Run tests
4. Upload new manifest

**Key Features**:
- **Slim CI**: Only builds changed models
- **State comparison**: Uses production manifest
- **Efficient**: Faster deployments

### Workflow: Transform PR CI

**File**: `.github/workflows/transform-pr-ci.yml`

**Triggers**:
- PR opened, synchronized, or reopened
- PR closed (for cleanup)

**Steps**:
1. Create PR-specific sandbox dataset (`SANDBOX_CI_PR_<NUMBER>`)
2. Build modified models with defer
3. Run tests
4. Post results as PR comment
5. Clean up sandbox on PR close

**Key Features**:
- **Isolated testing**: Each PR has its own sandbox
- **Defer strategy**: Uses production data for unchanged models
- **Auto cleanup**: Removes sandbox when PR closes

### Workflow: Cleanup Sandbox Datasets

**File**: `.github/workflows/cleanup-sandbox-datasets.yml`

**Triggers**:
- Weekly schedule
- Manual dispatch

**Steps**:
1. List all sandbox datasets
2. Check last modified date
3. Delete datasets older than threshold (default: 7 days)

**Configuration**:
```yaml
env:
  RETENTION_DAYS: 7  # Keep sandboxes for 7 days
  DRY_RUN: false     # Set to true to preview without deleting
```

### Setting Up CI/CD

#### Prerequisites

**For PostgreSQL**:
- Database credentials as GitHub Secrets
- Network access to database from GitHub Actions

**For BigQuery**:
- GCP Service Account with BigQuery permissions
- Workload Identity Federation (recommended)
- GCS bucket for manifest storage (optional)

#### Required Secrets

Add these secrets to your GitHub repository:

**PostgreSQL**:
```
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

**BigQuery**:
```
GCP_PROJECT_ID
GCP_SA_KEY          # Service account JSON (if not using Workload Identity)
GCP_WORKLOAD_IDENTITY_PROVIDER  # For Workload Identity
GCP_SERVICE_ACCOUNT             # For Workload Identity
```

#### Customization

Edit workflow files to match your infrastructure:

1. **Update dataset names** in dbt profiles
2. **Configure authentication** (service account, OIDC, etc.)
3. **Set schedule** for data pipeline
4. **Configure artifact storage** for manifests

---

## Customization

### Adding Extractors

1. **Add to meltano.yml**:
   ```bash
   cd extraction
   meltano add extractor tap-salesforce
   ```

2. **Configure**:
   ```bash
   meltano config tap-salesforce set api_key $SALESFORCE_API_KEY
   ```

3. **Test**:
   ```bash
   meltano run tap-salesforce target-your-destination
   ```

### Adding dbt Models

#### Staging Models

Create in `transform/models/staging/`:

```sql
-- models/staging/stg_customers.sql
{{
  config(
    materialized='incremental',
    unique_key='customer_id',
    on_schema_change='sync_all_columns'
  )
}}

select
  id as customer_id,
  email,
  created_at,
  updated_at
from {{ source('raw', 'customers') }}

{% if is_incremental() %}
  where updated_at > (select max(updated_at) from {{ this }})
{% endif %}
```

#### Mart Models

Create in `transform/models/production/marts/`:

```sql
-- models/production/marts/dim_customers.sql
{{
  config(
    materialized='table',
    persist_docs={"relation": true, "columns": true}
  )
}}

select
  customer_id,
  email,
  first_name,
  last_name,
  created_at
from {{ ref('stg_customers') }}
```

### Modifying CI/CD

#### Change Schedule

Edit `.github/workflows/data-pipeline.yml`:

```yaml
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
```

#### Add Tests to CI

Edit `.github/workflows/transform-pr-ci.yml`:

```yaml
- name: Run dbt tests
  run: |
    dbt test --select state:modified+
    dbt test --data  # Run data tests only
```

#### Customize Sandbox Cleanup

Edit `.github/workflows/cleanup-sandbox-datasets.yml`:

```yaml
env:
  RETENTION_DAYS: 14  # Keep for 2 weeks instead of 1
  DRY_RUN: true       # Preview mode
```

---

## Best Practices

### Local Development

1. **Always use sandboxes**: Set `DBT_USER` environment variable
2. **Use defer strategy**: Test against production data
   ```bash
   dbt build --defer --state prod-artifacts --select state:modified+
   ```
3. **Run tests before committing**:
   ```bash
   dbt build --select state:modified+
   ```
4. **Keep staging models incremental**: More efficient for large tables

### dbt Project Structure

**Recommended layering**:

```
models/
├── staging/           # Raw → Staging (incremental)
│   ├── _sources.yml  # Source definitions
│   └── stg_*.sql     # One staging model per source table
└── production/
    └── marts/         # Staging → Marts (tables)
        ├── dim_*.sql  # Dimension tables
        └── fct_*.sql  # Fact tables
```

**Naming conventions**:
- Staging: `stg_<source>_<entity>`
- Dimensions: `dim_<entity>`
- Facts: `fct_<entity>` or `fct_<entity>_<grain>`

### CI/CD Best Practices

1. **Use slim CI**: Only build modified models
2. **Enable persist_docs**: Document models in production
3. **Test in PRs**: Catch issues before merging
4. **Clean up sandboxes**: Avoid dataset sprawl
5. **Monitor costs**: Track BigQuery query costs in CI

### Extraction Best Practices

1. **Use incremental extraction**: Only extract new/changed data
2. **Enable state backend**: Track extraction state
3. **Schedule appropriately**: Balance freshness vs. API limits
4. **Monitor failures**: Set up alerting for failed runs

### Security Best Practices

1. **Never commit credentials**: Use environment variables
2. **Use secrets management**: GitHub Secrets, AWS Secrets Manager, etc.
3. **Limit service account permissions**: Least privilege principle
4. **Rotate credentials regularly**: Especially API keys
5. **Use Workload Identity**: For GCP (no long-lived keys)

---

## Troubleshooting

### "DBT_USER not set" in sandbox mode

**Problem**: Sandbox dataset not created

**Solution**:
```bash
export DBT_USER="yourname"
```

### "Relation not found" in defer mode

**Problem**: Production manifest missing or outdated

**Solution**:
1. Ensure production manifest is available
2. Check `--state` path is correct
3. Re-run production deployment to generate fresh manifest

### CI workflow fails with "Dataset not found"

**Problem**: Sandbox dataset not created or insufficient permissions

**Solutions**:
- **BigQuery**: Ensure service account has `bigquery.datasets.create` permission
- **PostgreSQL**: Ensure user can create schemas
- Check dataset naming in workflows

### Extraction fails with "API rate limit exceeded"

**Problem**: Too many API requests

**Solutions**:
1. Reduce extraction frequency
2. Enable incremental extraction
3. Use state backend to track progress
4. Contact API provider about limits

### Models not building in CI

**Problem**: Slim CI not detecting modified models

**Solutions**:
1. Verify production manifest exists
2. Check state comparison configuration
3. Ensure `--select state:modified+` is used
4. Try `--full-refresh` once to reset state

---

## Examples

### Example 1: Basic PostgreSQL Setup

```bash
# Create project
blueprintdata new analytics-pg --stack lite-postgres

# Navigate and setup
cd analytics-pg/extraction
./scripts/setup-local.sh

cd ../transform
./scripts/setup-local.sh
cp profiles.yml.example profiles.yml

# Configure database
export DB_USER="myuser"
export DB_PASSWORD="mypass"
export DBT_USER="myname"

# Run pipeline
cd ../extraction
meltano run tap-csv target-postgres

cd ../transform
dbt deps
dbt run
dbt test
```

### Example 2: BigQuery with Defer

```bash
# Create project
blueprintdata new analytics-bq --stack lite-bigquery

# Setup
cd analytics-bq/transform
./scripts/setup-local.sh
cp profiles.yml.example profiles.yml

# Configure GCP
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/keyfile.json"
export DBT_USER="myname"

# Download production manifest (simulate CI)
mkdir -p prod-artifacts
gsutil cp gs://my-bucket/manifest.json prod-artifacts/

# Run with defer
dbt build --defer --state prod-artifacts --select state:modified+
```

### Example 3: Scheduled Data Pipeline

Setup GitHub Actions to run daily:

1. **Configure secrets** in GitHub repository
2. **Update schedule** in `.github/workflows/data-pipeline.yml`:
   ```yaml
   schedule:
     - cron: '0 6 * * *'  # 6 AM UTC daily
   ```
3. **Commit and push** to enable workflow
4. **Monitor runs** in Actions tab

---

## Migration Guide

### From Existing dbt Project

1. **Create new project** with templates:
   ```bash
   blueprintdata new new-project --stack lite-postgres
   ```

2. **Copy models**:
   ```bash
   cp -r old-project/models/* new-project/transform/models/
   ```

3. **Copy configurations**:
   ```bash
   cp old-project/dbt_project.yml new-project/transform/
   cp old-project/packages.yml new-project/transform/
   ```

4. **Update macros** to use sandbox strategy:
   ```bash
   # Review new-project/transform/macros/generate_schema_name.sql
   # Adapt to your needs
   ```

5. **Test**:
   ```bash
   cd new-project/transform
   dbt deps
   dbt run
   dbt test
   ```

---

## References

- [Architecture Guide](../ARCHITECTURE.md) - System architecture
- [Analytics Feature](ANALYTICS.md) - Analytics agent
- [Development Guide](../DEVELOPMENT.md) - Local development
- [Meltano Documentation](https://docs.meltano.com/)
- [dbt Documentation](https://docs.getdbt.com/)

---

**Last Updated**: 2026-01-29
