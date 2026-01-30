# Development Guide

Complete guide to developing and contributing to BlueprintData CLI.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Local Development](#local-development)
3. [Testing](#testing)
4. [Code Standards](#code-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Architecture Patterns](#architecture-patterns)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **Bun**: >= 1.0.0 (for development)
- **Node.js**: >= 18.0.0 (for production runtime)
- **Git**: Latest version

### Initial Setup

```bash
# Clone the repository
git checkout https://github.com/your-org/blueprintdata-cli.git
cd blueprintdata-cli

# Install dependencies
bun install

# Build all packages
bun run build

# Link CLI globally for local testing
bun run local-install

# Verify installation
blueprintdata --version
```

### Repository Structure

```
blueprintdata-cli/
├── apps/
│   ├── cli/                  # CLI application
│   └── web/                  # Web UI (React + Vite)
├── packages/@blueprintdata/
│   ├── analytics/            # Context building, LLM, agent
│   ├── auth/                 # Authentication
│   ├── config/               # Configuration
│   ├── database/             # Drizzle ORM
│   ├── errors/               # Error handling
│   ├── gateway/              # WebSocket server
│   ├── models/               # TypeScript types
│   └── warehouse/            # Warehouse connectors
├── templates/                # Project templates
├── docs/                     # Documentation
├── scripts/                  # Build scripts
└── .changeset/               # Changesets for releases
```

---

## Local Development

### Quick Start

```bash
# Install and link all packages
bun run local-install

# Verify everything is linked
bun run verify-local

# Test CLI
blueprintdata --help
```

### Development Workflow

#### 1. Making Changes

```bash
# Create feature branch
git checkout -b feat/your-feature-name

# Make changes in packages or apps
cd packages/@blueprintdata/analytics
# ...edit src files...

# Rebuild the package
bun run build

# Or use watch mode
bun run dev
```

#### 2. Rebuilding Packages

After making changes, rebuild before testing:

```bash
# Rebuild all packages
bun run build:packages

# Or rebuild specific package
cd packages/@blueprintdata/analytics
bun run build
```

#### 3. Testing Changes

```bash
# Test CLI with your changes
blueprintdata analytics init

# Test in a real dbt project
cd /path/to/test-dbt-project
blueprintdata analytics sync
```

### Package Linking

The monorepo uses Bun workspaces with global linking for local development.

#### Link All Packages

```bash
# Link all packages and CLI globally
bun run local-install
```

This script:
1. Installs dependencies
2. Builds all packages
3. Links packages globally

#### Link Individual Packages

```bash
# Link specific package
cd packages/@blueprintdata/analytics
bun link

# Use in another project
cd /path/to/other-project
bun link @blueprintdata/analytics
```

#### Unlink Packages

```bash
# Unlink all
bun run unlink

# Or unlink individual package
cd packages/@blueprintdata/analytics
bun unlink
```

### Watch Mode

For active development, use watch mode to rebuild automatically:

```bash
# Start watch mode in a package
cd packages/@blueprintdata/analytics
bun run dev
```

This watches for file changes and rebuilds automatically.

### Verify Local Setup

Check that you're using local (linked) versions:

```bash
# Shows which packages are linked vs. npm versions
bun run verify-local

# Expected output:
# ✅ @blueprintdata/models - Using LOCAL version
# ✅ @blueprintdata/analytics - Using LOCAL version
# ✅ blueprintdata-cli - Using LOCAL version
```

### Common Issues

#### "Cannot find module" errors

```bash
# Rebuild all packages
bun run build:packages

# Re-link
bun run unlink
bun run local-install
```

#### Changes not reflecting

Remember: **You must rebuild after changes!**

```bash
# Quick rebuild
bun run build:packages
```

#### "verify-local shows NPM version"

```bash
# Reinstall and relink
bun run unlink
bun install
bun run local-install
```

---

## Testing

### Test Framework

We use **Bun Test** - fast, simple, TypeScript-native testing.

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test packages/@blueprintdata/analytics/src/context/__tests__/builder.test.ts

# Run tests with pattern
bun test context

# Run tests for specific package
bun test packages/@blueprintdata/analytics

# Generate coverage
bun test --coverage
```

### Test Organization

```
src/
├── __tests__/              # Shared test utilities
│   ├── helpers/           # Test helpers
│   └── factories/         # Mock data generators
├── __mocks__/             # Mock implementations
└── <module>/
    ├── implementation.ts
    └── __tests__/
        └── implementation.test.ts
```

### Writing Tests

#### Basic Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something specific', async () => {
    // Arrange
    const input = createTestInput();

    // Act
    const result = await component.process(input);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(expectedData);
  });
});
```

#### Test Helpers

Located in `src/__tests__/helpers/`:

```typescript
// Example: TestDbtProject helper
import { TestDbtProject } from '@/__tests__/helpers/test-project';

it('should scan dbt project', async () => {
  const project = await TestDbtProject.create();

  const scanner = new DbtScanner(project.path);
  const result = await scanner.scanModels();

  expect(result.models.length).toBeGreaterThan(0);

  await project.cleanup();
});
```

#### Mock Implementations

Located in `src/__mocks__/`:

```typescript
// Example: MockLLMClient
import { MockLLMClient } from '@/__mocks__/llm/MockLLMClient';

it('should enrich with LLM', async () => {
  const mockClient = new MockLLMClient();
  mockClient.setMockResponse('Enrich this', 'Enriched content');

  const enricher = new LLMEnricher(mockClient);
  const result = await enricher.enrich('Enrich this');

  expect(result).toBe('Enriched content');
});
```

### Testing Best Practices

#### 1. Test Behavior, Not Implementation

**Good**:
```typescript
it('should save configuration to disk', async () => {
  await service.saveConfig(config);
  const loaded = await service.loadConfig();
  expect(loaded).toEqual(config);
});
```

**Bad**:
```typescript
it('should call fs.writeFile', async () => {
  await service.saveConfig(config);
  expect(fs.writeFile).toHaveBeenCalled(); // Testing implementation
});
```

#### 2. Use AAA Pattern

Always structure tests as **Arrange, Act, Assert**:

```typescript
it('should enrich table profile', async () => {
  // Arrange
  const stats = createMockStats();
  const enricher = new LLMEnricher(mockClient);

  // Act
  const result = await enricher.enrichTableProfile(stats);

  // Assert
  expect(result.success).toBe(true);
  expect(result.content).toContain('Table Profile');
});
```

#### 3. Use Descriptive Names

```typescript
// Good
it('should throw ValidationError when project path is invalid')
it('should return empty array when no models found')
it('should handle warehouse connection timeout gracefully')

// Bad
it('should work')
it('test 1')
it('checks validation')
```

#### 4. Test Edge Cases

```typescript
describe('DbtScanner', () => {
  it('should scan models successfully', ...);
  it('should handle missing dbt_project.yml', ...);
  it('should handle empty models directory', ...);
  it('should handle malformed YAML', ...);
  it('should handle circular dependencies', ...);
});
```

### Coverage Goals

| Module | Target Coverage |
|--------|----------------|
| Services | 80%+ |
| Utilities | 90%+ |
| Domain Logic | 75%+ |
| Commands | 60%+ |
| **Overall** | **70%+** |

### Current Test Status

```bash
# Check current coverage
bun test --coverage

# Expected output:
# 157 tests passed
# Coverage: ~XX% (target: 70%)
```

---

## Code Standards

### TypeScript

- **Strict mode enabled**: No `any` types
- **ES2020 target**: Modern JavaScript features
- **Module system**: ES Modules (ESM)

### Code Style

We use ESLint and Prettier for consistent formatting.

```bash
# Check linting
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format
```

### Naming Conventions

- **Variables & Functions**: `camelCase`
- **Classes & Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private members**: `_leadingUnderscore`
- **Files**: Match the export (`MyClass.ts`, `myFunction.ts`)

### File Organization

```typescript
// 1. Imports (grouped and sorted)
import { type A, type B } from './types';
import { helperFunction } from './utils';
import { externalLibrary } from 'external-library';

// 2. Types and interfaces
interface MyOptions {
  // ...
}

// 3. Constants
const DEFAULT_TIMEOUT = 30000;

// 4. Main implementation
export class MyClass {
  // ...
}

// 5. Helper functions (if any)
function internalHelper() {
  // ...
}
```

### Comments

- **Document "why", not "what"**
- **Avoid obvious comments**
- **Use JSDoc for public APIs**

```typescript
// Good
// Retry connection because BigQuery can be flaky on first attempt
await retryConnection();

// Use exponential backoff to avoid overwhelming the API
const delay = Math.pow(2, attempt) * 1000;

// Bad
// Set x to 5
const x = 5;

// Call the function
myFunction();
```

### Function Size

- **Keep under 200 lines** (ideally under 100)
- **Single responsibility** - one function, one task
- **Extract complex logic** into helper functions

---

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning.

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Important**: Space after colon is required!

### Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | Minor |
| `fix` | Bug fix | Patch |
| `docs` | Documentation only | None |
| `style` | Code style (formatting) | None |
| `refactor` | Code refactoring | None |
| `perf` | Performance improvement | Patch |
| `test` | Add/update tests | None |
| `build` | Build system changes | None |
| `ci` | CI configuration | None |
| `chore` | Other changes | None |

### Examples

```bash
# Feature
feat: add analytics chat command with WebSocket support
feat(gateway): implement JWT authentication

# Bug fix
fix: resolve authentication token validation error
fix(warehouse): handle BigQuery connection timeout

# Breaking change
feat!: remove deprecated analytics sync --full flag

BREAKING CHANGE: The --full flag has been removed.
Use --force instead.

# Documentation
docs: update local development setup instructions

# Chore
chore: update dependencies

# Skip CI
chore: update readme [skip ci]
```

### Commit Validation

Commits are validated automatically by commitlint. Invalid commits are rejected.

**Common mistakes**:

```bash
# ❌ Incorrect - no space after colon
feat:add new feature

# ❌ Incorrect - wrong capitalization
Feature: add new feature

# ❌ Incorrect - wrong bracket placement
fix[skip ci]: bump version

# ✅ Correct
feat: add new feature
fix: resolve bug [skip ci]
```

---

## Pull Request Process

### Creating a Pull Request

1. **Create feature branch from `main`**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   ```

2. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Create changeset** (for version bump):
   ```bash
   bun run changeset
   # Follow prompts to describe changes
   ```

4. **Push and create PR**:
   ```bash
   git push origin feat/your-feature-name
   # Create PR on GitHub targeting 'main'
   ```

### PR Checklist

Before submitting, ensure:

- [ ] All tests passing (`bun test`)
- [ ] Type checking passes (`bun run typecheck`)
- [ ] Linting passes (`bun run lint`)
- [ ] Code is formatted (`bun run format`)
- [ ] Changeset created (if version bump needed)
- [ ] Documentation updated (if needed)
- [ ] PR description explains changes

### PR Review Process

1. **Automated checks run** (CI workflow)
2. **Code review** by maintainer
3. **Changes requested** (if needed)
4. **Approval** and merge to main
5. **Changesets Action** creates "Version Packages" PR
6. **Maintainer merges** Version Packages PR
7. **Automated publish** to NPM

### PR Guidelines

**Good PR**:
- Focused on single feature/fix
- Clear description
- Tests included
- Documentation updated
- Changeset included

**Bad PR**:
- Multiple unrelated changes
- No description
- No tests
- Breaking changes without notice

---

## Architecture Patterns

### Service Layer Pattern

Business logic lives in services, not commands.

```typescript
// ✅ Good: Thin command wrapper
export const initCommand = new Command('init')
  .action(async (options) => {
    const service = ServiceFactory.createInitService();
    await service.initialize(options);
  });

// ❌ Bad: Business logic in command
export const initCommand = new Command('init')
  .action(async (options) => {
    // 100 lines of business logic...
  });
```

### Dependency Injection

Use constructor injection for testability.

```typescript
// ✅ Good: Injected dependencies
export class ContextBuilder {
  constructor(
    private scanner: DbtScanner,
    private profiler: WarehouseProfiler
  ) {}
}

// ❌ Bad: Hard-coded dependencies
export class ContextBuilder {
  private scanner = new DbtScanner();
  private profiler = new WarehouseProfiler();
}
```

### Factory Pattern

Centralize object creation.

```typescript
// ✅ Good: Factory creates instances
export class ServiceFactory {
  static createInitService(): InitService {
    const configService = new ConfigurationService();
    return new InitService(configService);
  }
}

// ❌ Bad: Direct instantiation everywhere
const service = new InitService(new ConfigurationService());
```

### Error Handling

Use standardized error utilities.

```typescript
import { tryAsync, ValidationError } from '@blueprintdata/errors';

// ✅ Good: Standardized error handling
const result = await tryAsync(
  () => validateProject(path),
  'Failed to validate project',
  ValidationError
);

// ❌ Bad: Manual try-catch everywhere
try {
  await validateProject(path);
} catch (error) {
  throw new Error('Failed to validate project');
}
```

---

## Troubleshooting

### Build Issues

#### "Module not found" after changes

```bash
# Rebuild packages
bun run build:packages

# Verify imports are correct
# Check tsconfig.json paths
```

#### TypeScript errors after pull

```bash
# Clean and rebuild
bun run clean
bun install
bun run build
```

### Test Issues

#### Tests failing locally but pass in CI

```bash
# Ensure same Node/Bun version as CI
bun --version

# Clean node_modules
rm -rf node_modules
bun install

# Rebuild and test
bun run build
bun test
```

#### Mock not working

```bash
# Check mock is in __mocks__ directory
# Ensure mock is imported before real module
# Verify mock implements correct interface
```

### Linking Issues

#### CLI not updating with changes

```bash
# Rebuild CLI
cd apps/cli
bun run build

# Or rebuild everything
bun run build

# Verify linking
bun run verify-local
```

#### Package version conflicts

```bash
# Unlink and reinstall
bun run unlink
rm -rf node_modules
rm -rf packages/@blueprintdata/*/node_modules
rm -rf apps/*/node_modules
bun install
bun run local-install
```

---

## Useful Commands

```bash
# Development
bun install                  # Install dependencies
bun run build                # Build everything
bun run build:packages       # Build packages only
bun run build:cli            # Build CLI only
bun run dev                  # Watch mode (in package dir)

# Testing
bun test                     # Run all tests
bun test --watch             # Watch mode
bun test --coverage          # With coverage
bun run lint                 # Run linter
bun run typecheck            # Type check

# Local Development
bun run local-install        # Link packages globally
bun run verify-local         # Verify linking
bun run unlink               # Unlink all

# Releases
bun run changeset            # Create changeset
bun run changeset version    # Update versions
bun run release              # Publish to NPM

# Cleanup
bun run clean                # Clean build artifacts
rm -rf node_modules          # Nuclear option
```

---

## Getting Help

- **Documentation**: Read docs/ folder
- **Issues**: Search [GitHub Issues](https://github.com/your-org/blueprintdata-cli/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/your-org/blueprintdata-cli/discussions)
- **Code Review**: Ask in PR comments

---

## References

- [Architecture Guide](ARCHITECTURE.md) - System architecture and design patterns
- [Publishing Guide](PUBLISHING.md) - Release process
- [Features: Templates](features/TEMPLATES.md) - Template feature
- [Features: Analytics](features/ANALYTICS.md) - Analytics feature

---

**Last Updated**: 2026-01-29
