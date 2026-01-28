# Architecture Guide

**BlueprintData CLI Architecture Documentation**

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Layer Breakdown](#layer-breakdown)
4. [Core Components](#core-components)
5. [Design Patterns](#design-patterns)
6. [Data Flow](#data-flow)
7. [Configuration Management](#configuration-management)
8. [Error Handling](#error-handling)
9. [Extension Points](#extension-points)

---

## Overview

BlueprintData CLI is built with a layered architecture that separates concerns and enables testability. The system follows clean architecture principles with clear dependencies flowing inward.

### Key Architectural Principles

1. **Separation of Concerns**: Each layer has a single, well-defined responsibility
2. **Dependency Inversion**: High-level modules don't depend on low-level modules
3. **Testability**: All business logic can be tested in isolation
4. **Extensibility**: New features can be added without modifying existing code

### Technology Stack

- **Runtime**: Bun (development) / Node.js 18+ (production)
- **Language**: TypeScript with strict mode
- **CLI Framework**: Commander.js
- **UI**: @clack/prompts for interactive CLI
- **LLM SDKs**: Anthropic SDK, OpenAI SDK
- **Data Warehouses**: Google BigQuery, PostgreSQL

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Interface Layer                      │
│  (Commander.js commands, @clack/prompts UI)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Service Layer                           │
│  (Business logic orchestration)                              │
│  - InitService, ConfigurationService                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Domain Layer                            │
│  (Core business logic)                                       │
│  - ContextBuilder, WarehouseProfiler                         │
│  - DbtScanner, LLMEnricher                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Infrastructure Layer                        │
│  (External integrations)                                     │
│  - Warehouse Connectors, LLM Clients                         │
│  - File System, Configuration                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer Breakdown

### 1. CLI Interface Layer

**Location**: `src/commands/`

**Responsibility**: Handle user interaction, collect inputs, display results

**Components**:
- Command definitions (init, sync, template)
- Input prompts and validation
- Output formatting

**Example**:
```typescript
// src/commands/analytics/init.ts
export const initCommand = new Command('init')
  .action(async (options) => {
    // Collect inputs from user
    const inputs = await collectInputs();

    // Delegate to service layer
    const service = ServiceFactory.createInitService();
    await service.initialize(inputs);

    // Display results
    p.outro('Analytics agent initialized!');
  });
```

**Key Characteristics**:
- No business logic
- Thin wrappers around service layer
- Handles only UI concerns

---

### 2. Service Layer

**Location**: `src/services/`

**Responsibility**: Orchestrate business logic, coordinate multiple domain objects

**Components**:
- `InitService`: Orchestrates initialization workflow
- `ConfigurationService`: Manages configuration
- Future: `SyncService`, `ChatService`

**Example**:
```typescript
// src/services/analytics/InitService.ts
export class InitService {
  async initialize(options: InitOptions): Promise<InitResult> {
    // Orchestrate multiple operations
    await this.validateProject(options.projectPath);
    await this.checkExistingInitialization(options.projectPath);
    const warehouse = await this.setupWarehouse(options.projectPath);
    const config = await this.configService.buildAndSave(options);
    await this.buildContext(options.projectPath, config, warehouse);

    return { success: true, config };
  }
}
```

**Key Characteristics**:
- Coordinates domain objects
- No UI concerns
- Fully testable with mocks

---

### 3. Domain Layer

**Location**: `src/analytics/`, `src/warehouse/`

**Responsibility**: Core business logic, domain models

**Components**:
- `ContextBuilder`: Builds agent context
- `WarehouseProfiler`: Profiles warehouse tables
- `DbtScanner`: Scans dbt models
- `LLMEnricher`: Enriches content with LLM
- `WarehouseConnector`: Warehouse abstraction

**Example**:
```typescript
// src/analytics/context/builder.ts
export class ContextBuilder {
  async build(): Promise<void> {
    await this.ensureDirectories();
    const scanResult = await this.scanner.scanModels();
    await this.generateSystemPrompt();
    await this.generateSummary(scanResult);
    await this.profiler.profileAll();
  }
}
```

**Key Characteristics**:
- Pure business logic
- No dependencies on infrastructure details
- Testable with mocked dependencies

---

### 4. Infrastructure Layer

**Location**: `src/warehouse/`, `src/analytics/llm/`, `src/utils/`

**Responsibility**: External integrations, I/O operations

**Components**:
- Warehouse connectors (BigQuery, Postgres)
- LLM clients (Anthropic, OpenAI)
- File system operations
- Configuration persistence

**Example**:
```typescript
// src/warehouse/postgres.ts
export class PostgresConnector extends BaseWarehouseConnector {
  async query(sql: string): Promise<QueryResult> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql);
      return this.formatResult(result);
    } finally {
      client.release();
    }
  }
}
```

**Key Characteristics**:
- Implements interfaces defined by domain layer
- Handles external system details
- Can be mocked for testing

---

## Core Components

### ContextBuilder

**Purpose**: Orchestrates the creation of agent context documentation

**Key Methods**:
- `build()`: Full context generation
- `update()`: Incremental updates
- `generateSystemPrompt()`: Creates system prompt
- `generateSummary()`: Project overview
- `generateModelling()`: Model catalog

**Dependencies**:
- `DbtScanner`: Scans dbt models
- `WarehouseProfiler`: Profiles tables
- `LLMEnricher` (optional): AI-powered enrichment

---

### WarehouseProfiler

**Purpose**: Generates rich documentation for warehouse tables

**Key Methods**:
- `profileAll()`: Profile multiple tables
- `profileTable()`: Profile single table
- `generateBasicMarkdown()`: Fallback documentation

**Features**:
- Optional LLM enrichment
- Statistics gathering
- Cost tracking

---

### DbtScanner

**Purpose**: Analyzes dbt models to extract metadata and lineage

**Key Methods**:
- `scanModels()`: Discover and parse all models
- `parseModel()`: Extract refs, sources, config
- `generateModelingMarkdown()`: Create model catalog

---

### LLM Integration

**Components**:
- `LLMClient`: Unified interface for LLM providers
- `LLMEnricher`: Enhances content with AI
- Model configuration

**Supported Providers**:
- Anthropic Claude (3.5 Sonnet, 3.5 Haiku, 3 Opus)
- OpenAI GPT (GPT-4o, GPT-4o Mini, GPT-4 Turbo)

---

## Design Patterns

### 1. Service Layer Pattern

**Problem**: Commands were too large and mixed concerns

**Solution**: Extract business logic into service classes

**Benefits**:
- Testable business logic
- Reusable across different interfaces
- Clear separation of concerns

---

### 2. Factory Pattern

**Problem**: Circular dependencies, tight coupling

**Solution**: Centralized object creation in factory classes

**Example**:
```typescript
// src/factories/ServiceFactory.ts
export class ServiceFactory {
  static createInitService(): InitService {
    const configService = new ConfigurationService();
    return new InitService(configService);
  }
}

// src/warehouse/factory.ts
export async function createWarehouseConnector(
  connection: WarehouseConnection
): Promise<BaseWarehouseConnector> {
  if (connection.type === 'bigquery') {
    return new BigQueryConnector(connection);
  }
  return new PostgresConnector(connection);
}
```

**Benefits**:
- No circular dependencies
- Centralized dependency wiring
- Easy to swap implementations

---

### 3. Strategy Pattern

**Use Case**: Multiple warehouse types, multiple LLM providers

**Implementation**:
```typescript
// Abstract base class
export abstract class BaseWarehouseConnector {
  abstract query(sql: string): Promise<QueryResult>;
  abstract getTableSchema(schema: string, table: string): Promise<TableSchema>;
}

// Concrete strategies
export class PostgresConnector extends BaseWarehouseConnector { ... }
export class BigQueryConnector extends BaseWarehouseConnector { ... }
```

**Benefits**:
- Easy to add new warehouses
- Common interface for all connectors
- Type-safe polymorphism

---

### 4. Template Method Pattern

**Use Case**: WarehouseProfiler with optional LLM enrichment

**Implementation**:
```typescript
async profileTable(...): Promise<ProfileResult> {
  const schema = await this.connector.getTableSchema(...);

  if (this.enricher) {
    // Try LLM enrichment
    const result = await this.enricher.enrich(...);
    if (result.success) {
      return result;
    }
    // Fall through to basic
  }

  // Fallback to basic markdown
  return this.generateBasicMarkdown(schema);
}
```

---

## Data Flow

### Initialization Flow

```
User Input (CLI)
    │
    ▼
InitCommand (collects inputs)
    │
    ▼
InitService (orchestrates)
    │
    ├──▶ validateProject()
    │
    ├──▶ setupWarehouse()
    │   └──▶ WarehouseConnector.testConnection()
    │
    ├──▶ ConfigurationService.buildAndSave()
    │   └──▶ File System
    │
    └──▶ buildContext()
        └──▶ ContextBuilder.build()
            ├──▶ DbtScanner.scanModels()
            ├──▶ LLMEnricher.enrich() (optional)
            └──▶ WarehouseProfiler.profileAll()
                └──▶ WarehouseConnector.query()
```

### Sync Flow

```
User Input (sync command)
    │
    ▼
SyncCommand
    │
    ▼
Load Config
    │
    ▼
ContextBuilder.update()
    │
    ├──▶ DbtScanner.scanModels() (if not profiles-only)
    │
    └──▶ WarehouseProfiler.profileAll()
        ├──▶ Resolve model selection
        ├──▶ Profile each table
        └──▶ Generate markdown files
```

---

## Configuration Management

### Hierarchical Configuration (V2)

```typescript
interface AnalyticsConfigV2 {
  version: 2;
  project: ProjectConfig;
  llm: LLMConfig;
  warehouse: WarehouseConfig;
  company?: CompanyConfig;
  interface: InterfaceConfig;
  slack?: SlackConfig;
}
```

### Configuration Loading

```
1. Read config.json from .blueprintdata/
2. Detect version (V1 or V2)
3. Auto-migrate V1 → V2 if needed
4. Save migrated config
5. Return normalized V2 config
```

### Default Values

**Location**: `src/config/defaults.ts`

**Priority**:
1. Environment variables
2. Config file
3. Default values

---

## Error Handling

### Error Hierarchy

```
BlueprintError (base)
├── ValidationError
├── WarehouseConnectionError
├── WarehouseQueryError
├── LLMAPIError
├── ConfigurationError
├── DbtProjectError
├── FileSystemError
└── ContextBuildError
```

### Standardized Patterns

**Option 1: Throw on error**
```typescript
const config = await tryAsync(
  () => fs.readFile(path, 'utf-8'),
  'Failed to load config',
  ConfigurationError
);
```

**Option 2: Return Result type**
```typescript
const result = await tryAsyncResult(
  () => connector.testConnection(),
  'Failed to test connection',
  WarehouseConnectionError
);

if (result.success) {
  console.log('Connected');
} else {
  console.error(result.error.message);
}
```

---

## Extension Points

### Adding a New Warehouse

1. Create connector class extending `BaseWarehouseConnector`
2. Implement required methods:
   - `testConnection()`
   - `query()`
   - `getTableSchema()`
   - `listTables()`
   - `listSchemas()`
3. Update `createWarehouseConnector()` factory
4. Add connection type to `StorageType` union

### Adding a New LLM Provider

1. Create provider client extending `LLMClient`
2. Implement `chat()` method
3. Add models to `src/analytics/llm/models.ts`
4. Update provider selection in init command

### Adding a New Service

1. Create service class in `src/services/`
2. Define public interface
3. Add to `ServiceFactory`
4. Create command in `src/commands/`

---

## Performance Considerations

### Warehouse Profiling

- Tables profiled sequentially (avoid overwhelming warehouse)
- Statistics queries optimized for performance
- Optional sampling for large tables
- Progress reporting every 10 tables

### LLM API Calls

- Cost tracking for transparency
- Fallback to templates on failure
- Token usage reporting
- Future: Rate limiting and retry logic

### File Operations

- Streaming for large files
- Atomic writes for config
- Directory structure ensured once

---

## Security Considerations

### API Keys

- Never committed to git
- Stored in config.json (in .gitignore)
- Can be provided via environment variables
- Not logged or displayed

### Warehouse Credentials

- Loaded from dbt profiles.yml
- Not stored in CLI config
- Connections closed after use

### User Input Validation

- All inputs validated before use
- URLs validated before scraping
- Model selection patterns sanitized
- SQL injection prevented by parameterized queries

---

## Future Enhancements

### Planned Improvements

1. **Dependency Injection Container**
   - Full DI implementation
   - Easier testing
   - Better lifecycle management

2. **Comprehensive Testing**
   - 70%+ code coverage
   - Integration test suite
   - Mock implementations

3. **Agent Chat System**
   - WebSocket gateway
   - Tool registry with RBAC
   - Session management
   - UI interface

4. **Enhanced Profiling**
   - Data quality checks
   - Anomaly detection
   - Trend analysis
   - Performance insights

---

## References

- [API Reference](API.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Code Review Report](CODE_REVIEW_REPORT.md)
- [Refactoring Priorities](REFACTORING_PRIORITIES.md)

---

**Last Updated**: 2026-01-27
