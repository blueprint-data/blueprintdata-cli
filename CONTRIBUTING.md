# Contributing to blueprintdata-cli

## Commit Message Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to automate versioning and changelog generation via [semantic-release](https://semantic-release.gitbook.io/).

**Commit messages are validated automatically** using commitlint. Invalid commits will be rejected.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Important:** There must be a **space after the colon**.

### Examples

```bash
# Correct
feat: add BigQuery template support
fix: resolve project name validation issue
docs: update installation instructions
feat(templates): add Snowflake support

# Incorrect - will be rejected
feat:no space after colon        # Missing space
fix[skip-ci]: bump version       # Wrong bracket placement
Feature: add something           # Wrong capitalization
```

### Types

| Type       | Description                                      | Version Bump |
|------------|--------------------------------------------------|--------------|
| `feat`     | A new feature                                    | Minor        |
| `fix`      | A bug fix                                        | Patch        |
| `docs`     | Documentation only changes                       | None         |
| `style`    | Code style changes (formatting, semicolons)      | None         |
| `refactor` | Code changes that neither fix bugs nor add features | None      |
| `perf`     | Performance improvements                         | Patch        |
| `test`     | Adding or fixing tests                           | None         |
| `build`    | Changes to build system or dependencies          | None         |
| `ci`       | Changes to CI configuration                      | None         |
| `chore`    | Other changes that don't modify src or test files| None         |

### Breaking Changes

For breaking changes, add `!` after the type or include `BREAKING CHANGE:` in the footer:

```bash
feat!: remove deprecated API endpoints
# or
feat: update authentication flow

BREAKING CHANGE: OAuth tokens are now required for all API calls.
```

Breaking changes trigger a **major** version bump.

### Skipping CI

To skip CI pipelines, add `[skip ci]` at the **end** of the subject line:

```bash
chore: update readme [skip ci]
```

## Development Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Git hooks are automatically installed via Husky when you run `bun install`.

3. Run tests:
   ```bash
   bun test
   ```

4. Build:
   ```bash
   bun run build
   ```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with properly formatted commit messages
3. Ensure tests pass: `bun test`
4. Push and create a Pull Request against `main`
5. Once merged, semantic-release will automatically version and publish
