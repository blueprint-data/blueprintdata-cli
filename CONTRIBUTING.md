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
   bun test --coverage  # With coverage report
   ```

4. Build & validate:
   ```bash
   bun run build        # Build the project
   bun run typecheck    # Type checking
   bun run lint         # Linting
   ```

## Project Structure

```
src/
├── commands/          # CLI commands (thin wrappers)
├── services/          # Business logic layer
├── analytics/         # Analytics agent components
│   ├── context/      # Context building
│   └── llm/          # LLM integration
├── warehouse/         # Database connectors
├── config/            # Configuration management
├── errors/            # Error types and handlers
└── __tests__/         # Test infrastructure
```

## Architecture Patterns

### Service Layer

Business logic lives in services, not commands. Commands should be thin wrappers.

```typescript
// ✅ Good: Thin command wrapper
export const initCommand = new Command('init')
  .action(async (options) => {
    const service = ServiceFactory.createInitService();
    await service.initialize(options);
  });
```

### Dependency Injection

Use constructor injection for testability:

```typescript
// ✅ Good: Injected dependencies
export class ContextBuilder {
  constructor(
    private scanner: DbtScanner,
    private profiler: WarehouseProfiler
  ) {}
}
```

### Error Handling

Use standardized error utilities:

```typescript
import { tryAsync, ValidationError } from './errors';

const result = await tryAsync(
  () => validateProject(path),
  'Project validation'
);
```

## Testing Guidelines

- Place tests in `__tests__` directories
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Use test helpers: `TestDbtProject`, `MockLLMClient`
- Target 70%+ coverage for new code

```typescript
describe('MyComponent', () => {
  it('should handle error when input is invalid', async () => {
    // Arrange
    const invalidInput = {};

    // Act
    const result = await component.process(invalidInput);

    // Assert
    expect(result.success).toBe(false);
  });
});
```

## Code Style

- **TypeScript**: Strict mode, no `any` types
- **Naming**: camelCase (functions), PascalCase (classes), UPPER_SNAKE_CASE (constants)
- **Comments**: Document "why" not "what", avoid obvious comments
- **Functions**: Keep under 200 lines, single responsibility

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with properly formatted commit messages
3. Add tests for new functionality
4. Ensure all checks pass:
   - `bun test` (all tests passing)
   - `bun run typecheck` (no type errors)
   - `bun run lint` (no lint errors)
5. Update documentation if needed
6. Push and create a Pull Request against `main`
7. Once merged, semantic-release will automatically version and publish

## Documentation

- `docs/ARCHITECTURE.md` - System architecture and patterns
- `docs/API.md` - API reference for services
- `docs/TESTING_GUIDE.md` - Testing conventions
- `docs/ANALYTICS_INIT.md` - User guide for analytics features

## Common Pitfalls to Avoid

- ❌ Business logic in commands
- ❌ Hard-coded dependencies
- ❌ Using `any` types
- ❌ Large functions (>200 lines)
- ❌ Circular dependencies
- ❌ Committing secrets or credentials
