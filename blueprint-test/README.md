# blueprint-test

A Lite Data Stack project powered by Meltano (extraction) and dbt (transformation) with PostgreSQL storage.

## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL database
- Git
- uv (Python package manager)

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Database Configuration (for PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
```

### Setup

1. **Set up Extraction (Meltano)**:

   ```bash
   cd extraction
   ./scripts/setup-local.sh
   ```

   This script will:
   - Check Python version (>=3.10)
   - Create a virtual environment
   - Install uv and dependencies via `pyproject.toml`
   - Initialize Meltano

2. **Set up Transform (dbt)**:

   ```bash
   cd transform
   ./scripts/setup-local.sh
   ```

   This script will:
   - Check Python version (>=3.10)
   - Create a virtual environment
   - Install uv and dependencies via `pyproject.toml`

3. **Configure dbt**:

   ```bash
   cd transform
   cp profiles.yml.example profiles.yml
   # Edit profiles.yml with your database credentials
   ```

4. **Set DBT_USER for development**:

   ```bash
   export DBT_USER="yourname"
   ```

### Running

1. **Configure your extractors** in `extraction/meltano.yml`:
   - Add your data sources (taps)
   - Configure destination (target)

2. **Run Extraction**:

   ```bash
   cd extraction
   meltano run <tap-name> <loader-name>
   ```

3. **Run Transformation**:

   ```bash
   cd transform
   dbt deps
   dbt run
   dbt test
   ```

## Project Structure

```
blueprint-test/
├── extraction/                # Meltano project for data extraction
│   ├── meltano.yml          # Meltano configuration
│   ├── scripts/
│   │   └── setup-local.sh   # Helper script for setup
│   └── .venv/              # Python virtual environment
├── transform/              # dbt project for data transformation
│   ├── dbt_project.yml     # dbt configuration
│   ├── packages.yml         # dbt packages
│   ├── profiles.yml.example # Database profiles template
│   ├── macros/
│   │   └── generate_schema_name.sql  # Schema naming with sandbox support
│   ├── models/
│   │   ├── staging/        # Staging models (incremental)
│   │   └── production/
│   │       └── marts/      # Production models (tables)
│   ├── scripts/
│   │   └── setup-local.sh  # Helper script for setup
│   ├── seeds/              # Seed data
│   ├── analyses/           # Analysis queries
│   ├── snapshots/          # Snapshots
│   └── tests/             # Tests
├── pyproject.toml         # Python dependencies with uv support
├── .github/
│   └── workflows/        # CI/CD workflows
│       ├── data-pipeline.yml          # ETL workflow (scheduled)
│       ├── transform-deploy.yml       # Slim CI deploy (main branch)
│       ├── transform-pr-ci.yml        # PR validation with sandbox
│       └── cleanup-sandbox-datasets.yml  # Weekly cleanup
└── README.md
```

## Configuration

### Extraction (Meltano)

Edit `extraction/meltano.yml` to:

- Add data sources (taps)
- Configure destination (target)
- Schedule extraction jobs
- Enable state backend (optional)

### Transform (dbt)

#### Environments

- **Production**: Uses configured schema names
- **Development**: Uses sandbox datasets (`SANDBOX_<USER>`)
- **CI**: Uses PR-specific sandbox datasets (`SANDBOX_CI_PR_<NUMBER>`)

#### Sandbox Strategy

The project uses sandbox datasets for development and CI:

- **Local development**: Each developer gets `SANDBOX_<USER>` dataset
- **PR CI**: Each PR gets `SANDBOX_CI_PR_<NUMBER>` dataset
- **Production**: Direct schema access with `persist_docs` enabled

#### Defer Support

When running with `--defer` flag, dbt will use production datasets for unmodified models:

```bash
dbt build --defer --state prod-artifacts --select state:modified+
```

## CI/CD

### Workflows

1. **Data Pipeline** (`.github/workflows/data-pipeline.yml`)
   - Scheduled runs (configurable cron)
   - Manual dispatch
   - Runs extraction followed by transformation

2. **dbt Deploy** (`.github/workflows/transform-deploy.yml`)
   - Triggered on push to `main`
   - Slim CI: builds only modified models
   - Downloads/uploads production manifest for state comparison

3. **dbt PR CI** (`.github/workflows/transform-pr-ci.yml`)
   - Runs on PR open/sync/reopen
   - Creates PR-specific sandbox dataset
   - Builds only modified models with defer
   - Posts results as PR comment
   - Auto-cleanup on PR close

4. **Cleanup Sandbox Datasets** (`.github/workflows/cleanup-sandbox-datasets.yml`)
   - Weekly scheduled cleanup
   - Removes unused sandbox datasets
   - Dry-run mode available

### Setting Up CI/CD

You'll need to configure:

1. **Cloud provider authentication** (GCP Workload Identity, AWS OIDC, etc.)
2. **Storage for artifacts** (manifest.json for state comparison)
3. **Dataset management** for sandbox creation/deletion
4. **Secrets** for database credentials

Update the workflow files with your specific cloud provider configuration.

## Development

### Local Development

1. Install dependencies via setup scripts
2. Set `DBT_USER` environment variable
3. Work in your sandbox dataset: `SANDBOX_<USER>`
4. Test changes before committing

### Using Defer

To test changes against production data:

```bash
# Download production manifest
# (automatically done in CI/CD)

# Run with defer
dbt build --defer --state prod-artifacts --select state:modified+
```

### Best Practices

- Always run in sandbox datasets for development
- Use `--defer` to test against production data
- Test in PR before merging to main
- Keep staging models incremental for efficiency
- Document models with `persist_docs` enabled

## Testing

### Test Extraction

```bash
cd extraction
meltano test
```

### Test Transform

```bash
cd transform
dbt test
dbt run
```

## Troubleshooting

### DBT_USER not set

For development mode, ensure `DBT_USER` is set:

```bash
export DBT_USER="yourname"
```

### Sandbox dataset issues

If sandbox dataset doesn't exist:

- Local: Check database permissions
- CI: Check cloud provider authentication

### Defer not working

Ensure:

- Production manifest is downloaded
- State directory is correctly specified
- `--defer` flag is used

## Resources

- [Meltano Documentation](https://docs.meltano.com/)
- [dbt Documentation](https://docs.getdbt.com/)
- [PostgreSQL Documentation](https://www.postgres.com/docs)
- [uv Documentation](https://github.com/astral-sh/uv)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test in your sandbox dataset
4. Submit a pull request
5. CI will run in PR-specific sandbox dataset

## License

MIT
