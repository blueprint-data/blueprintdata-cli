# BlueprintData CLI

A CLI tool to scaffold data stack projects with pre-configured templates.

## Installation

```bash
npm install -g blueprintdata-cli
```

Or use directly with npx:

```bash
npx blueprintdata-cli new
```

## Usage

### Create a New Project

```bash
blueprintdata new [project-name]
```

The CLI will prompt you for:

- Stack type (Lite Data Stack, AWS Data Stack)
- Project name
- Storage type (PostgreSQL, BigQuery)

### Options

```bash
blueprintdata new my-project --stack lite --storage postgres
```

- `--stack <type>`: Stack type (lite, aws)
- `--storage <type>`: Storage type (postgres, bigquery)

## Available Stacks

### Lite Data Stack

The Lite Data Stack includes:

- **Extraction**: Meltano with tap-csv
- **Transformation**: dbt with {{STORAGE_TYPE}}
- **CI/CD**: GitHub Actions workflows
- **Storage**: PostgreSQL or BigQuery

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
npm install
npm run build
npm link
```

### Testing

```bash
npm test
npm run test:ui
```

### Linting

```bash
npm run lint
npm run format
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
