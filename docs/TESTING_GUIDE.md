# Testing Guide

Testing conventions and examples for BlueprintData CLI.

---

## Test Framework

**Framework**: Bun Test (fast, simple, TypeScript-native)

**Run Tests**:
```bash
bun test                # Run all tests
bun test --watch        # Watch mode
bun test <pattern>      # Run specific tests
```

---

## Test Organization

```
src/
├── __tests__/
│   ├── helpers/        # Test utilities
│   └── factories/      # Mock data generators
├── __mocks__/          # Mock implementations
└── <module>/
    └── __tests__/      # Module-specific tests
        └── file.test.ts
```

---

## Writing Tests

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { InitService } from './InitService';

describe('InitService', () => {
  let service: InitService;

  beforeEach(() => {
    service = new InitService();
  });

  it('should validate dbt project', async () => {
    // Arrange
    const projectPath = '/path/to/project';

    // Act
    const result = await service.validateProject(projectPath);

    // Assert
    expect(result.valid).toBe(true);
  });
});
```

---

## Test Infrastructure (Future)

### Test Helpers

```typescript
// src/__tests__/helpers/test-project.ts
export class TestDbtProject {
  static async create(): Promise<TestDbtProject> {
    const tempDir = await fs.mkdtemp('/tmp/test-dbt-');
    // Create dbt_project.yml, models/, etc.
    return new TestDbtProject(tempDir);
  }

  async cleanup(): Promise<void> {
    await fs.remove(this.path);
  }
}
```

### Mock Implementations

```typescript
// src/__mocks__/llm/MockLLMClient.ts
export class MockLLMClient implements LLMClient {
  private responses = new Map<string, string>();

  setMockResponse(prompt: string, response: string): void {
    this.responses.set(prompt, response);
  }

  async chat(messages: Message[]): Promise<string> {
    return this.responses.get(messages[0].content) || 'Mock response';
  }
}
```

---

## Best Practices

### 1. Test Behavior, Not Implementation

**Good**:
```typescript
it('should save configuration', async () => {
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

### 2. AAA Pattern (Arrange, Act, Assert)

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

### 3. Use Descriptive Names

```typescript
// Good
it('should throw ValidationError when project path is invalid', ...)
it('should return empty array when no models found', ...)

// Bad
it('should work', ...)
it('test 1', ...)
```

---

## Coverage Goals

| Module | Target |
|--------|--------|
| Services | 80%+ |
| Utilities | 90%+ |
| Domain Logic | 75%+ |
| Commands | 60%+ |
| **Overall** | **70%+** |

---

**Note**: Comprehensive test suite is planned for Phase 3 implementation.

**Last Updated**: 2026-01-27
