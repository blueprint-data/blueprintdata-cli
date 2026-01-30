# BlueprintData CLI

A comprehensive CLI tool for data teams that provides project scaffolding and an AI-powered analytics agent for dbt projects.

[![npm version](https://img.shields.io/npm/v/blueprintdata-cli.svg)](https://www.npmjs.com/package/blueprintdata-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

### 1. Project Scaffolding

Quickly scaffold complete data stack projects with pre-configured templates:

- **Meltano** for data extraction
- **dbt** for data transformation
- **GitHub Actions** for CI/CD
- **Support** for BigQuery and PostgreSQL

[→ Learn more about Templates](docs/features/TEMPLATES.md)

### 2. Analytics Agent

An AI-powered assistant for your dbt project:

- Automatically profiles your data warehouse tables
- Generates rich documentation with business context
- Provides intelligent insights about your data
- Supports Anthropic Claude and OpenAI GPT models
- Interactive chat interface (coming soon)

[→ Learn more about Analytics](docs/features/ANALYTICS.md)

---

## Installation

### Global Installation

```bash
npm install -g blueprintdata-cli
```

### Using npx

```bash
npx blueprintdata-cli new my-project
```

### Prerequisites

- **Node.js** >= 18.0.0
- **Python** >= 3.10 (for dbt projects)

---

## Quick Start

### For End Users

#### Create a New Data Project

```bash
# Interactive mode
blueprintdata new

# With options
blueprintdata new my-project --stack lite-bigquery
```

Available templates:
- `lite-postgres` - PostgreSQL data stack
- `lite-bigquery` - BigQuery data stack

#### Initialize Analytics Agent

```bash
# Navigate to your dbt project
cd my-dbt-project

# Initialize analytics
blueprintdata analytics init

# Sync after changes
blueprintdata analytics sync

# Start chat interface (coming soon)
blueprintdata analytics chat
```

[→ See full usage guide](#usage)

### For Contributors

#### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/blueprintdata-cli.git
cd blueprintdata-cli

# Install dependencies
bun install

# Build and link locally
bun run local-install

# Verify
blueprintdata --version
```

[→ See full development guide](docs/DEVELOPMENT.md)

---

## Usage

### Project Scaffolding

#### Create New Project

```bash
blueprintdata new [project-name] [options]

Options:
  --stack <type>  Stack type (lite-postgres, lite-bigquery)
  -h, --help      Display help
```

**Example**:
```bash
blueprintdata new analytics-stack --stack lite-bigquery
```

This creates a complete project with:
- Meltano configuration for extraction
- dbt project for transformation
- GitHub Actions workflows for CI/CD
- Sandbox dataset strategy
- Slim CI for efficient deployments

[→ Full template documentation](docs/features/TEMPLATES.md)

### Analytics Agent

#### Initialize

```bash
cd your-dbt-project
blueprintdata analytics init
```

The initialization process:
1. Validates your dbt project
2. Connects to your data warehouse
3. Selects LLM models
4. Collects company context (optional)
5. Profiles warehouse tables
6. Generates agent context documentation

#### Sync

```bash
blueprintdata analytics sync [options]

Options:
  --force            Force full re-sync
  --profiles-only    Only re-profile tables
  --select <models>  Sync specific models
  --target <env>     Specify dbt target
```

**Examples**:
```bash
# Sync all changed models
blueprintdata analytics sync

# Sync specific models
blueprintdata analytics sync --select marts.finance.*

# Full re-sync
blueprintdata analytics sync --force
```

#### Chat (Coming Soon)

```bash
blueprintdata analytics chat
```

Starts an interactive chat interface with:
- Natural language queries
- SQL generation and execution
- Chart generation
- Context search
- Session management

[→ Full analytics documentation](docs/features/ANALYTICS.md)

### Authentication (For Chat)

```bash
# Register new user
blueprintdata auth register

# Login
blueprintdata auth login

# Check status
blueprintdata auth status

# Logout
blueprintdata auth logout
```

---

## Project Structure

```
my-project/
├── extraction/          # Meltano project
│   ├── meltano.yml     # Configuration
│   └── scripts/        # Setup scripts
├── transform/          # dbt project
│   ├── dbt_project.yml # Configuration
│   ├── models/         # dbt models
│   │   ├── staging/    # Staging layer
│   │   └── production/ # Production layer
│   └── scripts/        # Setup scripts
└── .github/
    └── workflows/      # CI/CD workflows
```

---

## Configuration

### Analytics Configuration

After initialization, configuration is stored in `.blueprintdata/config.json`:

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
    "type": "bigquery",
    "connection": { ... }
  },
  "company": {
    "name": "Your Company",
    "industry": "E-commerce",
    ...
  }
}
```

### Environment Variables

```bash
# LLM API Keys
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...

# Analytics UI (optional)
export UI_PORT=3000
export GATEWAY_PORT=8080
```

---

## Documentation

### For End Users

- **[Templates Feature](docs/features/TEMPLATES.md)** - Project scaffolding guide
- **[Analytics Feature](docs/features/ANALYTICS.md)** - Analytics agent guide

### For Contributors

- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and design patterns
- **[Development](docs/DEVELOPMENT.md)** - Local development and testing
- **[Publishing](docs/PUBLISHING.md)** - Release process and versioning

### Roadmap

- **[ROADMAP.md](ROADMAP.md)** - High-level feature roadmap
- **[DETAILED_ROADMAP.md](DETAILED_ROADMAP.md)** - Detailed task breakdown

---

## Contributing

We welcome contributions! Here's how to get started:

### Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/your-username/blueprintdata-cli.git
cd blueprintdata-cli

# 2. Install dependencies
bun install

# 3. Build and link
bun run local-install

# 4. Create feature branch
git checkout -b feat/your-feature

# 5. Make changes and test
bun test
bun run typecheck
bun run lint

# 6. Create changeset
bun run changeset

# 7. Commit and push
git commit -m "feat: add new feature"
git push origin feat/your-feature

# 8. Create Pull Request
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new feature
fix: resolve bug
docs: update documentation
chore: update dependencies
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with tests
3. Create changeset for version bump
4. Submit PR with clear description
5. Pass CI checks
6. Get approval from maintainer
7. Merge to `main`

[→ Full contributing guide](docs/DEVELOPMENT.md)

---

## Development

### Prerequisites

- **Bun** >= 1.0.0 (for development)
- **Node.js** >= 18.0.0
- **Git**

### Setup

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Link globally for testing
bun run local-install

# Run tests
bun test

# Type check
bun run typecheck

# Lint
bun run lint
```

### Available Commands

```bash
# Build
bun run build              # Build all
bun run build:packages     # Build packages only
bun run build:cli          # Build CLI only
bun run build:web          # Build web UI only

# Development
bun run dev                # Watch mode (in package dir)
bun run local-install      # Link packages globally
bun run verify-local       # Verify local linking

# Testing
bun test                   # Run all tests
bun test --watch           # Watch mode
bun test --coverage        # With coverage

# Quality
bun run typecheck          # Type checking
bun run lint               # Linting
bun run lint:fix           # Fix linting issues
bun run format             # Format code

# Release
bun run changeset          # Create changeset
bun run release            # Publish to NPM
```

### Monorepo Structure

```
blueprintdata-cli/
├── apps/
│   ├── cli/            # CLI application
│   └── web/            # Web UI
└── packages/
    └── @blueprintdata/
        ├── analytics/  # Context building & agent
        ├── auth/       # Authentication
        ├── config/     # Configuration
        ├── database/   # Drizzle ORM
        ├── errors/     # Error handling
        ├── gateway/    # WebSocket server
        ├── models/     # TypeScript types
        └── warehouse/  # Warehouse connectors
```

[→ Full development guide](docs/DEVELOPMENT.md)

---

## Architecture

BlueprintData CLI is built as a **Bun workspace monorepo** with TypeScript project references.

### Key Technologies

- **Runtime**: Bun (dev) / Node.js (prod)
- **Language**: TypeScript 5+ with strict mode
- **CLI**: Commander.js + @clack/prompts
- **Web**: React 18 + TanStack Router + Vite
- **Database**: SQLite + Drizzle ORM
- **Auth**: JWT + bcrypt
- **LLM**: Anthropic SDK + OpenAI SDK
- **Warehouses**: BigQuery + PostgreSQL

### Design Patterns

- **Monorepo with Workspaces** - Shared code via packages
- **Service Layer Pattern** - Business logic separation
- **Strategy Pattern** - Pluggable connectors
- **Factory Pattern** - Centralized object creation
- **Repository Pattern** - Type-safe data access

[→ Full architecture guide](docs/ARCHITECTURE.md)

---

## Roadmap

### Current (MVP - In Progress)

- ✅ Project scaffolding templates
- ✅ Analytics agent initialization
- ✅ Warehouse profiling & documentation
- ✅ dbt integration
- ✅ LLM enrichment (Claude & GPT)
- ✅ Authentication system
- ✅ WebSocket gateway
- ✅ Web UI (React)
- 🚧 Chat interface (Phase 6)
- 🚧 CLI integration (Phase 6)
- 📋 Testing & polish (Phase 7)

### Near Term (Q1 2026)

- Interactive chat interface
- Tool execution (query, search, chart)
- Session management
- Enhanced documentation
- Comprehensive testing

### Future

- Additional warehouses (Snowflake, Redshift, Databricks)
- Slack bot integration
- Data quality checks
- Anomaly detection
- Multi-tenancy support
- Custom tool plugins

[→ Detailed roadmap](ROADMAP.md)

---

## License

MIT

---

## Support

- **Documentation**: See [docs/](docs/) directory
- **Issues**: [GitHub Issues](https://github.com/your-org/blueprintdata-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/blueprintdata-cli/discussions)

---

## Acknowledgments

Built with:
- [Bun](https://bun.sh/) - Fast all-in-one JavaScript runtime
- [dbt](https://www.getdbt.com/) - Data transformation tool
- [Meltano](https://meltano.com/) - DataOps platform
- [Anthropic Claude](https://www.anthropic.com/) - AI assistant
- [OpenAI GPT](https://openai.com/) - AI models
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [TanStack Router](https://tanstack.com/router) - Type-safe routing

---

**Built with ❤️ by Blueprint Data**
