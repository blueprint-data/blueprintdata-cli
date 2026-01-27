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
