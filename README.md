# BlueprintData CLI

A comprehensive CLI tool for data teams that provides:
1. **Project Scaffolding**: Quickly scaffold data stack projects with pre-configured templates
2. **Analytics Agent**: LLM-powered analytics assistant for dbt projects

Built with Bun for maximum performance, runs on Node.js for compatibility.

## Installation

```bash
npm install -g blueprintdata-cli
```

Or use directly with npx:

```bash
npx blueprintdata-cli new
```

## Prerequisites

- Node.js >= 18.0.0 (for running the CLI)
- Bun >= 1.0.0 (for development only)

## Features

### 1. Project Scaffolding

Quickly scaffold complete data stack projects with:
- Pre-configured Meltano for data extraction
- dbt for data transformation
- GitHub Actions for CI/CD
- Support for BigQuery and Postgres

### 2. Analytics Agent (NEW)

An LLM-powered assistant that:
- Automatically profiles your dbt models and warehouse tables
- Generates rich documentation with business context
- Provides intelligent insights about your data
- Supports Anthropic Claude and OpenAI GPT models

## Usage

### Project Scaffolding

#### Create a New Project

```bash
blueprintdata new [project-name]
```

The CLI will prompt you for:

- Stack type (Lite Data Stack - BigQuery, Lite Data Stack - Postgres, AWS Data Stack)
- Project name
- Storage type (only if the stack supports multiple storages)

### Options

```bash
blueprintdata new my-project --stack lite-bigquery
# or
blueprintdata new my-project --stack lite-postgres
```

- `--stack <type>`: Stack type (lite-bigquery, lite-postgres, aws; `lite` remains an alias for lite-bigquery)
- `--storage <type>`: Storage type (postgres, bigquery) — only for stacks that allow a manual storage choice

## Available Stacks

### Lite Data Stack (BigQuery)

The Lite Data Stack (BigQuery) includes:

- **Extraction**: Meltano with tap-github + target-bigquery
- **Transformation**: dbt with BigQuery
- **CI/CD**: GitHub Actions workflows
- **Storage**: BigQuery

### Lite Data Stack (Postgres)

The Lite Data Stack (Postgres) includes:

- **Extraction**: Meltano with tap-csv
- **Transformation**: dbt with Postgres
- **CI/CD**: GitHub Actions workflows
- **Storage**: PostgreSQL only (no storage prompt)

#### Project Structure

After creating a project, you'll get:

```
my-project/
├── extraction/          # Meltano project
│   ├── meltano.yml     # Configuration
│   └── .venv/          # Virtual environment
├── transform/          # dbt project
│   ├── dbt_project.yml # Configuration
│   ├── profiles.yml    # Database profiles
│   └── models/         # dbt models
└── .github/
    └── workflows/      # CI/CD
```

### Analytics Agent

The analytics agent helps you understand and work with your dbt project using AI-powered analysis.

#### Initialize Analytics Agent

Navigate to your dbt project directory and run:

```bash
cd your-dbt-project
blueprintdata analytics init
```

The initialization process will:
1. Validate your dbt project structure
2. Connect to your data warehouse (BigQuery or Postgres)
3. Select your LLM provider (Anthropic or OpenAI)
4. Collect company context (optional)
5. Profile your warehouse tables
6. Generate agent context documentation

#### Sync Agent Context

After making changes to your dbt models:

```bash
blueprintdata analytics sync
```

Options:
- `--force`: Force full re-sync
- `--profiles-only`: Only re-profile tables without updating docs
- `--select <models>`: Sync specific models (comma-separated)
- `--target <environment>`: Specify dbt target environment

#### Generated Context

The agent creates an `agent-context/` directory containing:

```
agent-context/
├── system_prompt.md    # Agent instructions and capabilities
├── summary.md          # Project overview and business context
├── modelling.md        # dbt model catalog with lineage
└── models/             # Detailed table profiles
    ├── schema_table1.md
    └── schema_table2.md
```

#### Configuration

Analytics configuration is stored in `.blueprintdata/config.json`:

```json
{
  "version": 2,
  "project": {
    "projectPath": "/path/to/project",
    "dbtProfilesPath": "~/.dbt/profiles.yml"
  },
  "llm": {
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "chatModel": "claude-3-5-sonnet-20241022",
    "profilingModel": "claude-3-5-haiku-20241022"
  },
  "warehouse": {
    "type": "postgres",
    "connection": { ... }
  },
  "interface": {
    "uiPort": 3000,
    "gatewayPort": 8080
  }
}
```

#### Environment Variables

Set LLM API keys in your environment:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or
export OPENAI_API_KEY=sk-...
```

Optional configuration:

```bash
export UI_PORT=3000
export GATEWAY_PORT=8080
```

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - System architecture and design patterns
- [API Reference](docs/API.md) - Complete API documentation for services
- [Testing Guide](docs/TESTING_GUIDE.md) - Testing conventions and examples
- [Analytics Init Guide](docs/ANALYTICS_INIT.md) - Using the analytics agent features
- [Contributing Guide](CONTRIBUTING.md) - Development guidelines and contribution workflow

## Development

### Setup

```bash
bun install
bun run build
npm link
```

### Testing

```bash
bun test
bun run test:ui
```

### Linting

```bash
bun run lint
bun run format
```

### Type Checking

```bash
bun run typecheck
```

## Contributing

We use a staging/pre-release workflow for this project:

### Branch Structure

- **main**: Stable releases (e.g., 1.0.0, 1.1.0)
- **staging**: Pre-releases for testing (e.g., 1.1.0-beta.1)
- **feature branches**: Development work

### Contribution Flow

1. Fork the repository
2. Create your feature branch from `staging`:

   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feat/your-feature-name
   ```

3. Make your changes and commit using conventional commits:

   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   git commit -m "chore: update dependencies"
   ```

4. Push to your fork and create a Pull Request targeting `staging`:

   ```bash
   git push origin feat/your-feature-name
   ```

5. Once your PR is merged to `staging`, a beta version will be automatically published to npm (e.g., `1.1.0-beta.1`)

6. When ready for a stable release, a maintainer will create a PR from `staging` to `main`

7. Merging to `main` triggers a stable release to npm

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features (triggers minor version bump)
- `fix:` - Bug fixes (triggers patch version bump)
- `chore:` - Maintenance tasks
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test updates
- `ci:` - CI/CD changes

### Release Process

Releases are automated using semantic-release:

- Push to `staging` → Publishes pre-release version (e.g., `1.1.0-beta.1`)
- Push to `main` → Publishes stable version (e.g., `1.1.0`)

## License

MIT
