# API Reference

Complete API documentation for BlueprintData CLI.

---

## Table of Contents

1. [Services](#services)
2. [Configuration](#configuration)
3. [Warehouse Connectors](#warehouse-connectors)
4. [LLM Integration](#llm-integration)
5. [Context Building](#context-building)
6. [Error Types](#error-types)

---

## Services

### InitService

Orchestrates the analytics agent initialization process.

```typescript
class InitService {
  constructor(configService: ConfigurationService)

  async initialize(options: InitOptions): Promise<InitResult>
}
```

**InitOptions**:
```typescript
interface InitOptions {
  projectPath: string;
  force?: boolean;
  dbtTarget?: string;
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmModel: string;
  llmProfilingModel: string;
  companyContext?: CompanyContext;
  modelSelection?: string;
  slackBotToken?: string;
  slackSigningSecret?: string;
}
```

---

### ConfigurationService

Manages analytics configuration.

```typescript
class ConfigurationService {
  async buildAndSave(options: ConfigurationOptions): Promise<AnalyticsConfig>
}
```

---

## Configuration

### V2 Configuration (Hierarchical)

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

interface ProjectConfig {
  projectPath: string;
  dbtProfilesPath: string;
  dbtTarget?: string;
}

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  chatModel: string;
  profilingModel: string;
}

interface WarehouseConfig {
  type: StorageType;
  connection: WarehouseConnection;
}
```

---

## Warehouse Connectors

### BaseWarehouseConnector (Abstract)

```typescript
abstract class BaseWarehouseConnector {
  abstract testConnection(): Promise<boolean>
  abstract query(sql: string, params?: unknown[]): Promise<QueryResult>
  abstract getTableSchema(schema: string, table: string): Promise<TableSchema>
  abstract listTables(schema?: string): Promise<Array<{schemaName: string, tableName: string}>>
  abstract listSchemas(): Promise<string[]>
  abstract close(): Promise<void>
}
```

### PostgresConnector

```typescript
class PostgresConnector extends BaseWarehouseConnector {
  constructor(connection: WarehouseConnection)
  // Implements all abstract methods
}
```

### BigQueryConnector

```typescript
class BigQueryConnector extends BaseWarehouseConnector {
  constructor(connection: WarehouseConnection)
  // Implements all abstract methods
}
```

---

## LLM Integration

### LLMClient

```typescript
class LLMClient {
  constructor(provider: LLMProvider, apiKey: string, model: string)

  async chat(messages: Message[]): Promise<string>
  async chatWithTokens(messages: Message[]): Promise<{
    content: string;
    tokensUsed: { input: number; output: number };
  }>
}
```

### LLMEnricher

```typescript
class LLMEnricher {
  constructor(client: LLMClient)

  async enrichTableProfile(
    stats: EnhancedTableStats,
    dbtMetadata?: DbtModelMetadata,
    companyContext?: CompanyContext
  ): Promise<EnrichmentResult>

  async enrichProjectSummary(
    companyContext: CompanyContext,
    projectInfo: ProjectInfo
  ): Promise<string>
}
```

---

## Context Building

### ContextBuilder

```typescript
class ContextBuilder {
  constructor(options: BuildContextOptions)

  async build(): Promise<void>
  async update(options?: UpdateOptions): Promise<void>
}

interface BuildContextOptions {
  projectPath: string;
  config: AnalyticsConfig;
  connector: BaseWarehouseConnector;
  force?: boolean;
}
```

### WarehouseProfiler

```typescript
class WarehouseProfiler {
  constructor(connector: BaseWarehouseConnector)

  async profileAll(options: ProfileOptions): Promise<ProfileSummary>
}

interface ProfileOptions {
  schemas?: string[];
  tables?: string[];
  outputDir: string;
  includeRowCounts?: boolean;
  enricher?: LLMEnricher;
  companyContext?: CompanyContext;
}
```

### DbtScanner

```typescript
class DbtScanner {
  constructor(projectPath: string)

  async scanModels(): Promise<DbtScanResult>
  generateModelingMarkdown(scanResult: DbtScanResult): string
}

interface DbtScanResult {
  models: DbtModel[];
  modelCount: number;
  refCount: number;
  sourceCount: number;
}
```

---

## Error Types

### Error Hierarchy

```typescript
class BlueprintError extends Error {
  constructor(message: string, code: string, cause?: Error)
}

// Specific error types
class ValidationError extends BlueprintError
class WarehouseConnectionError extends BlueprintError
class WarehouseQueryError extends BlueprintError
class LLMAPIError extends BlueprintError
class ConfigurationError extends BlueprintError
class DbtProjectError extends BlueprintError
class FileSystemError extends BlueprintError
class ContextBuildError extends BlueprintError
```

### Error Handling Utilities

```typescript
// Throw on error
async function tryAsync<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  ErrorClass: new (message: string, cause?: Error) => BlueprintError
): Promise<T>

// Return Result type
async function tryAsyncResult<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  ErrorClass: new (message: string, cause?: Error) => BlueprintError
): Promise<Result<T>>

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: BlueprintError }
```

---

## Factories

### ServiceFactory

```typescript
class ServiceFactory {
  static createInitService(): InitService
  static createConfigurationService(): ConfigurationService
}
```

### Warehouse Factory

```typescript
async function createWarehouseConnector(
  connection: WarehouseConnection
): Promise<BaseWarehouseConnector>
```

---

## Utilities

### Configuration

```typescript
// V2 (new hierarchical format)
async function loadConfigV2(projectPath?: string): Promise<AnalyticsConfigV2>
async function saveConfigV2(config: AnalyticsConfigV2, projectPath?: string): Promise<void>

// V1 (legacy flat format, for backward compatibility)
async function loadConfig(projectPath?: string): Promise<AnalyticsConfig>
async function saveConfig(config: AnalyticsConfig, projectPath?: string): Promise<void>

async function isAnalyticsInitialized(projectPath?: string): Promise<boolean>
```

### Validation

```typescript
async function validateDbtProject(projectPath: string): Promise<{
  valid: boolean;
  error?: string;
}>

function validateProjectName(name: string): {
  valid: boolean;
  error?: string;
}
```

---

## Default Values

```typescript
const DEFAULT_CONFIG = {
  interface: {
    uiPort: 3000,
    gatewayPort: 8080,
  },
  profiling: {
    includeRowCounts: true,
    maxSampleSize: 1000,
    timeoutSeconds: 60,
  },
  warehouse: {
    connectionTimeout: 30000,
    queryTimeout: 60000,
    poolSize: 10,
  },
  llm: {
    maxRetries: 3,
    timeoutSeconds: 120,
  },
}
```

---

**Last Updated**: 2026-01-27
