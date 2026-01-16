# BlueprintData CLI

A CLI tool to scaffold data stack projects with pre-configured templates. Built with Bun for maximum performance, runs on Node.js for compatibility.

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

## Usage

### Create a New Project

```bash
blueprintdata new [project-name]
```

The CLI will prompt you for:

- Stack type (Lite Data Stack, Lite Data Stack (Postgres), AWS Data Stack)
- Project name
- Storage type (PostgreSQL, BigQuery) when applicable

### Options

```bash
blueprintdata new my-project --stack lite --storage postgres
```

- `--stack <type>`: Stack type (lite, lite-postgres, aws)
- `--storage <type>`: Storage type (postgres, bigquery)

## Available Stacks

### Lite Data Stack

The Lite Data Stack includes:

- **Extraction**: Meltano with tap-csv
- **Transformation**: dbt with {{STORAGE_TYPE}}
- **CI/CD**: GitHub Actions workflows
- **Storage**: PostgreSQL or BigQuery

### Lite Data Stack (Postgres)

The Lite Data Stack (Postgres) includes:

- **Extraction**: Meltano with tap-csv
- **Transformation**: dbt with Postgres
- **CI/CD**: GitHub Actions workflows
- **Storage**: PostgreSQL only (no storage prompt)

## Project Structure

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

1. Fork repository
2. Create your feature branch
3. Commit your changes
4. Push to branch
5. Create a Pull Request

## License

MIT
