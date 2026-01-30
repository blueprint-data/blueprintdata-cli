# Architecture

Complete architectural overview of the BlueprintData CLI monorepo.

---

## Table of Contents

1. [Monorepo Structure](#monorepo-structure)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Package Overview](#package-overview)
5. [Application Architecture](#application-architecture)
6. [Data Flow](#data-flow)
7. [Design Patterns](#design-patterns)
8. [Build System](#build-system)
9. [Extension Points](#extension-points)

---

## Monorepo Structure

BlueprintData CLI is organized as a **Bun workspace monorepo** with multiple packages and applications.

### Directory Layout

```
blueprintdata-cli/
├── apps/
│   ├── cli/                      # CLI application (main executable)
│   └── web/                      # React web UI for analytics chat
├── packages/@blueprintdata/
│   ├── analytics/                # Context building, LLM integration, agent tools
│   ├── auth/                     # Authentication & JWT management
│   ├── config/                   # Configuration management
│   ├── database/                 # Drizzle ORM + SQLite schema
│   ├── errors/                   # Error handling utilities
│   ├── gateway/                  # WebSocket gateway server
│   ├── models/                   # Shared TypeScript types
│   └── warehouse/                # Data warehouse connectors
├── templates/
│   ├── lite-data-stack/          # Postgres template
│   └── lite-data-stack-bigquery/ # BigQuery template
├── docs/                         # Documentation
└── scripts/                      # Build and deployment scripts
```

### Workspace Configuration

**Package Manager**: Bun
**Build System**: TypeScript project references
**Versioning**: Changesets for independent package versioning

### Key Files

- `package.json` - Root workspace configuration
- `tsconfig.json` - TypeScript project references
- `tsconfig.base.json` - Shared TypeScript configuration
- `.changeset/` - Changesets configuration for releases

---

## Technology Stack

### Runtime & Language

- **Runtime**: Bun (development) / Node.js 18+ (production)
- **Language**: TypeScript 5+ with strict mode
- **Module System**: ES Modules

### CLI & UI Frameworks

- **CLI**: Commander.js for command structure
- **Prompts**: @clack/prompts for interactive CLI
- **Web UI**: React 18 + TanStack Router + Vite
- **Components**: shadcn/ui (Radix UI + Tailwind CSS)

### Backend & Data

- **Database**: SQLite (via @libsql/client) + Drizzle ORM
- **Authentication**: bcrypt + JWT (jsonwebtoken)
- **WebSocket**: ws library for real-time communication
- **Warehouses**: Google BigQuery + PostgreSQL

### LLM Integration

- **Providers**: Anthropic Claude + OpenAI GPT
- **SDKs**: @anthropic-ai/sdk, openai

### Development Tools

- **Type Checking**: TypeScript compiler (tsc)
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier
- **Testing**: Bun test
- **Versioning**: Changesets

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   CLI Application (apps/cli)                 │
│  - Commander.js commands                                     │
│  - Interactive prompts                                       │
│  - Process orchestration                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌──────────────┐  ┌──────────────────┐
│ Templates     │  │ Analytics    │  │ Gateway +        │
│ (Project      │  │ (Context     │  │ Web UI           │
│  scaffolding) │  │  building)   │  │ (Chat interface) │
└───────────────┘  └──────┬───────┘  └────────┬─────────┘
                          │                   │
                ┌─────────┴──────┬────────────┘
                ▼                ▼
        ┌───────────────┐  ┌──────────────┐
        │ Warehouse     │  │ Database     │
        │ Connectors    │  │ (SQLite)     │
        │ (BigQuery/PG) │  │ (Drizzle)    │
        └───────────────┘  └──────────────┘
```

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  - CLI Commands (Commander.js)                               │
│  - Web UI (React + TanStack Router)                          │
│  - User prompts (@clack/prompts)                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Service Layer                           │
│  - InitService (Analytics initialization)                    │
│  - ConfigurationService (Config management)                  │
│  - AuthService (User authentication)                         │
│  - AgentService (Agent orchestration)                        │
│  - GatewayServer (WebSocket communication)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Domain Layer                            │
│  - ContextBuilder (Agent context generation)                 │
│  - WarehouseProfiler (Table profiling)                       │
│  - DbtScanner (dbt model analysis)                           │
│  - LLMEnricher (AI-powered enrichment)                       │
│  - ToolRegistry (Tool management)                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Infrastructure Layer                        │
│  - Warehouse Connectors (BigQuery, Postgres)                 │
│  - LLM Clients (Anthropic, OpenAI)                           │
│  - Database (Drizzle ORM)                                    │
│  - File System Operations                                    │
│  - Configuration Persistence                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Package Overview

### Core Packages

#### @blueprintdata/models

**Purpose**: Shared TypeScript types and interfaces

**Key Exports**:
- `StorageType`, `LLMProvider`, `WarehouseConnection`
- Configuration interfaces (`AnalyticsConfig`, `ProjectConfig`, etc.)
- Message types for WebSocket communication

**Dependencies**: None (zero dependencies)

#### @blueprintdata/errors

**Purpose**: Error handling utilities and custom error types

**Key Exports**:
- Base error classes (`BlueprintError`, `ValidationError`, etc.)
- Error utilities (`tryAsync`, `tryAsyncResult`)

**Dependencies**: None

#### @blueprintdata/config

**Purpose**: Configuration loading, validation, and migration

**Key Features**:
- V1 → V2 config migration
- Environment variable support
- Default value management
- Type-safe configuration

**Dependencies**: `@blueprintdata/models`, `@blueprintdata/errors`

---

### Infrastructure Packages

#### @blueprintdata/database

**Purpose**: SQLite database with Drizzle ORM

**Schema**:
- `users` - User accounts
- `sessions` - Chat sessions
- `messages` - Chat messages
- `query_executions` - Query history

**Key Features**:
- Type-safe queries
- Automatic migrations
- Relation loading
- Query logging

**Dependencies**: `drizzle-orm`, `@libsql/client`

#### @blueprintdata/warehouse

**Purpose**: Data warehouse connectors

**Supported Warehouses**:
- **BigQuery**: Google Cloud BigQuery connector
- **Postgres**: PostgreSQL connector

**Base Interface**:
```typescript
abstract class BaseWarehouseConnector {
  abstract testConnection(): Promise<void>
  abstract query(sql: string): Promise<QueryResult>
  abstract getTableSchema(schema: string, table: string): Promise<TableSchema>
  abstract listTables(schema: string): Promise<string[]>
  abstract listSchemas(): Promise<string[]>
}
```

**Dependencies**: `@google-cloud/bigquery`, `pg`, `@blueprintdata/models`, `@blueprintdata/errors`

#### @blueprintdata/auth

**Purpose**: Authentication and authorization

**Components**:
- `PasswordHasher` - bcrypt password hashing (10 rounds)
- `TokenManager` - JWT generation and validation (30-day expiry)
- `AuthService` - User registration, login, logout

**Key Features**:
- Secure token storage (`~/.blueprintdata/auth.json`)
- Password validation
- Username validation

**Dependencies**: `bcrypt`, `jsonwebtoken`, `@blueprintdata/database`

#### @blueprintdata/gateway

**Purpose**: WebSocket gateway server

**Key Features**:
- WebSocket protocol with typed messages
- JWT authentication on connection
- Client session management
- Heartbeat/ping-pong for health checks
- Message routing

**Message Types**:
- `chat` - User/assistant messages
- `tool_call` - Tool execution requests
- `tool_result` - Tool execution results
- `error` - Error messages
- `system` - System notifications
- `pong` - Heartbeat response

**Dependencies**: `ws`, `jsonwebtoken`, `@blueprintdata/database`, `@blueprintdata/models`

---

### Feature Packages

#### @blueprintdata/analytics

**Purpose**: Analytics agent core functionality

**Modules**:

1. **Context Building** (`context/`)
   - `ContextBuilder` - Orchestrates context generation
   - `DbtScanner` - Scans dbt models for metadata and lineage
   - Generates `agent-context/` documentation

2. **LLM Integration** (`llm/`)
   - `LLMClient` - Unified interface for LLM providers
   - `LLMEnricher` - Enriches content with AI
   - Support for Claude (Sonnet, Haiku, Opus) and GPT (4o, 4o-mini, 4-turbo)

3. **Warehouse Profiling** (`context/`)
   - `WarehouseProfiler` - Generates rich table documentation
   - Statistics gathering (row counts, column stats)
   - Optional LLM enrichment
   - Cost tracking

4. **Agent Tools** (`tools/`)
   - `ToolRegistry` - Tool registration and discovery
   - `QueryTool` - Execute read-only SQL queries
   - `ContextSearchTool` - Search agent-context files
   - `ChartTool` - Generate Chart.js configurations

5. **Agent Service** (`agent/`)
   - `AgentService` - Main agent orchestration
   - Message processing and LLM interaction
   - Tool execution coordination

**Dependencies**: Multiple (@blueprintdata/config, @blueprintdata/warehouse, @blueprintdata/models, @anthropic-ai/sdk, openai)

---

### Applications

#### apps/cli

**Purpose**: Main CLI executable

**Commands**:
- `blueprintdata new` - Create new project from template
- `blueprintdata analytics init` - Initialize analytics agent
- `blueprintdata analytics sync` - Sync agent context
- `blueprintdata analytics chat` - Start chat interface (planned)
- `blueprintdata auth register/login/logout/status` - Auth commands

**Structure**:
```
apps/cli/
├── src/
│   ├── cli.ts                    # Main CLI entry
│   ├── commands/                 # Command implementations
│   │   ├── new.ts
│   │   ├── analytics/
│   │   │   ├── init.ts
│   │   │   ├── sync.ts
│   │   │   └── chat.ts
│   │   └── auth/
│   │       └── index.ts
│   ├── services/                 # Business logic
│   │   └── analytics/
│   │       ├── InitService.ts
│   │       └── ChatService.ts
│   └── utils/                    # Utilities
│       └── tokenStorage.ts
└── package.json
```

**Build Output**: Single executable binary via `bun build`

#### apps/web

**Purpose**: React-based chat UI for analytics agent

**Technology**:
- React 18
- TanStack Router for routing
- Vite for build tooling
- shadcn/ui components (Radix UI + Tailwind CSS)

**Features**:
- Authentication (login/register)
- Chat interface with message history
- WebSocket connection to gateway
- Tool execution visualization
- Chart rendering (Chart.js)
- Session management

**Structure**:
```
apps/web/
├── src/
│   ├── app/
│   │   ├── client.tsx            # React entry point
│   │   ├── router.tsx            # TanStack Router config
│   │   └── routes/               # Route components
│   ├── components/
│   │   └── ui/                   # shadcn/ui components
│   ├── features/
│   │   ├── auth/                 # Auth components & hooks
│   │   └── chat/                 # Chat components & hooks
│   ├── lib/
│   │   └── utils.ts              # Utilities
│   └── styles/
│       └── globals.css           # Tailwind + theme
├── index.html                    # HTML entry point
├── vite.config.ts                # Vite configuration
└── package.json
```

**Build Output**: Static assets served by gateway server

---

## Application Architecture

### CLI Application Flow

```
User Command
    │
    ▼
CLI Parser (Commander.js)
    │
    ├─→ new command
    │   └─→ Template scaffolding
    │
    ├─→ analytics init
    │   ├─→ Validate dbt project
    │   ├─→ Setup warehouse connection
    │   ├─→ Configure LLM
    │   ├─→ Collect company context
    │   ├─→ Build agent context
    │   └─→ Save configuration
    │
    ├─→ analytics sync
    │   ├─→ Load configuration
    │   ├─→ Scan dbt models
    │   ├─→ Profile warehouse tables
    │   └─→ Update agent-context/
    │
    ├─→ analytics chat
    │   ├─→ Load configuration
    │   ├─→ Initialize database
    │   ├─→ Start gateway server
    │   ├─→ Start web UI
    │   └─→ Open browser
    │
    └─→ auth register/login/logout
        └─→ AuthService operations
```

### Analytics Chat Architecture

```
┌──────────────────┐         ┌──────────────────┐
│   Web Browser    │◄───────►│  Gateway Server  │
│  (React + WS)    │         │  (WebSocket)     │
└──────────────────┘         └────────┬─────────┘
                                      │
                        ┌─────────────┼─────────────┐
                        │             │             │
                        ▼             ▼             ▼
                ┌──────────────┐  ┌──────────┐  ┌──────────┐
                │ AgentService │  │ Database │  │ Tool     │
                │ (LLM + Tools)│  │ (SQLite) │  │ Registry │
                └──────┬───────┘  └──────────┘  └────┬─────┘
                       │                             │
                       │         ┌───────────────────┘
                       │         │
                       ▼         ▼
                ┌──────────────────────┐
                │ Tool Implementations │
                │ - QueryTool          │
                │ - ContextSearchTool  │
                │ - ChartTool          │
                └──────────────────────┘
```

### Message Flow (Chat)

```
1. User sends message
   Web UI → WebSocket → Gateway

2. Gateway authenticates & stores
   Gateway → Database (insert message)

3. Gateway invokes agent
   Gateway → AgentService.processMessage()

4. Agent processes with LLM
   AgentService → LLM Client → Anthropic/OpenAI API

5. LLM requests tool call
   LLM Response → AgentService → ToolRegistry

6. Tool execution
   ToolRegistry → QueryTool → Warehouse Connector → BigQuery/Postgres

7. Tool result back to LLM
   QueryTool → AgentService → LLM Client

8. Final response
   LLM Response → AgentService → Gateway → WebSocket → Web UI
```

---

## Data Flow

### Initialization Flow

```
blueprintdata analytics init
    │
    ├─→ Validate dbt project
    │   └─→ Check for dbt_project.yml
    │
    ├─→ Load dbt profile
    │   └─→ Read ~/.dbt/profiles.yml
    │
    ├─→ Test warehouse connection
    │   └─→ WarehouseConnector.testConnection()
    │
    ├─→ Collect LLM configuration
    │   ├─→ Select provider (Anthropic/OpenAI)
    │   ├─→ Select chat model
    │   └─→ Select profiling model
    │
    ├─→ Collect company context (optional)
    │   ├─→ Company name & industry
    │   ├─→ Scrape websites
    │   └─→ Extract dbt terminology
    │
    ├─→ Save configuration
    │   └─→ Write .blueprintdata/config.json
    │
    └─→ Build agent context
        ├─→ Generate system_prompt.md
        ├─→ Scan dbt models → modelling.md
        ├─→ Generate summary.md (LLM-enriched)
        └─→ Profile tables → models/*.md
```

### Sync Flow

```
blueprintdata analytics sync [options]
    │
    ├─→ Load configuration
    │   └─→ Read .blueprintdata/config.json
    │
    ├─→ Determine sync scope
    │   ├─→ --force: Full re-sync
    │   ├─→ --profiles-only: Skip dbt scan
    │   └─→ --select: Specific models
    │
    ├─→ Scan dbt models (if not --profiles-only)
    │   └─→ DbtScanner.scanModels()
    │
    └─→ Profile warehouse tables
        ├─→ Resolve model selection
        ├─→ For each table:
        │   ├─→ Query schema
        │   ├─→ Gather statistics
        │   ├─→ Generate markdown
        │   └─→ LLM enrichment (optional)
        └─→ Write to agent-context/models/
```

### Chat Flow

```
blueprintdata analytics chat
    │
    ├─→ Load configuration
    │   └─→ Verify .blueprintdata/config.json
    │
    ├─→ Check authentication
    │   ├─→ Load token from ~/.blueprintdata/auth.json
    │   └─→ If not authenticated → prompt register/login
    │
    ├─→ Initialize database
    │   ├─→ Check .blueprintdata/analytics.db
    │   └─→ Run migrations if needed
    │
    ├─→ Start gateway server
    │   ├─→ Initialize GatewayServer
    │   ├─→ Load AgentService with tools
    │   └─→ Listen on configured port (default 8080)
    │
    ├─→ Start web UI
    │   ├─→ Build web app (if not built)
    │   └─→ Serve static files via gateway
    │
    └─→ Open browser
        └─→ Navigate to http://localhost:8080
```

---

## Design Patterns

### 1. Monorepo with Workspaces

**Pattern**: Bun workspaces with independent packages

**Benefits**:
- Shared code via packages
- Independent versioning with Changesets
- Type-safe cross-package imports
- Faster local development with linking

**Implementation**:
```json
// package.json
{
  "workspaces": ["apps/*", "packages/@blueprintdata/*"]
}
```

### 2. Service Layer Pattern

**Pattern**: Thin command wrappers delegate to service classes

**Benefits**:
- Testable business logic
- Reusable across CLI and API
- Clear separation of concerns

**Example**:
```typescript
// apps/cli/src/commands/analytics/init.ts
export const initCommand = new Command('init')
  .action(async (options) => {
    const service = ServiceFactory.createInitService();
    await service.initialize(options);
  });
```

### 3. Strategy Pattern (Connectors)

**Pattern**: Abstract base class with concrete implementations

**Use Cases**:
- Warehouse connectors (BigQuery, Postgres)
- LLM clients (Anthropic, OpenAI)

**Implementation**:
```typescript
abstract class BaseWarehouseConnector {
  abstract query(sql: string): Promise<QueryResult>;
}

class BigQueryConnector extends BaseWarehouseConnector { ... }
class PostgresConnector extends BaseWarehouseConnector { ... }
```

### 4. Factory Pattern

**Pattern**: Centralized object creation

**Benefits**:
- No circular dependencies
- Easy to swap implementations
- Testable with mocks

**Example**:
```typescript
export class ServiceFactory {
  static createInitService(): InitService {
    const configService = new ConfigurationService();
    return new InitService(configService);
  }
}
```

### 5. Repository Pattern (Database)

**Pattern**: Drizzle ORM provides type-safe data access

**Benefits**:
- Type-safe queries
- Automatic migrations
- Easy to test with in-memory database

**Example**:
```typescript
const user = await db.query.users.findFirst({
  where: eq(users.username, username),
});
```

### 6. Tool Registry Pattern

**Pattern**: Dynamic tool registration and discovery

**Benefits**:
- Extensible tool system
- RBAC support (future)
- Type-safe tool definitions

**Example**:
```typescript
const registry = new ToolRegistry();
registry.register('query_warehouse', new QueryTool(connector));

const tool = registry.getTool('query_warehouse');
const result = await tool.execute(parameters);
```

---

## Build System

### TypeScript Project References

The monorepo uses TypeScript project references for incremental builds.

**Root Configuration** (`tsconfig.json`):
```json
{
  "files": [],
  "references": [
    { "path": "./packages/@blueprintdata/models" },
    { "path": "./packages/@blueprintdata/errors" },
    { "path": "./packages/@blueprintdata/config" },
    { "path": "./packages/@blueprintdata/database" },
    { "path": "./packages/@blueprintdata/warehouse" },
    { "path": "./packages/@blueprintdata/auth" },
    { "path": "./packages/@blueprintdata/gateway" },
    { "path": "./packages/@blueprintdata/analytics" },
    { "path": "./apps/cli" },
    { "path": "./apps/web" }
  ]
}
```

### Build Commands

```bash
# Build all packages and apps
bun run build

# Build only packages
bun run build:packages

# Build only apps
bun run build:apps

# Build specific app
bun run build:cli
bun run build:web

# Type check all
bun run typecheck

# Type check specific
bun run typecheck:packages
bun run typecheck:apps
```

### Build Order

Dependencies determine build order:

1. `@blueprintdata/models` (no dependencies)
2. `@blueprintdata/errors` (no dependencies)
3. `@blueprintdata/config` (depends on models, errors)
4. `@blueprintdata/database` (depends on models)
5. `@blueprintdata/warehouse` (depends on models, errors)
6. `@blueprintdata/auth` (depends on database, models)
7. `@blueprintdata/gateway` (depends on database, models)
8. `@blueprintdata/analytics` (depends on config, warehouse, models)
9. `apps/cli` (depends on all packages)
10. `apps/web` (depends on gateway, models)

### Development Workflow

```bash
# Install dependencies
bun install

# Link packages for local development
bun run local-install

# Watch mode (specific package)
cd packages/@blueprintdata/analytics
bun run dev

# Run CLI locally
blueprintdata --help

# Verify local linking
bun run verify-local
```

---

## Extension Points

### Adding a New Warehouse Connector

1. Create connector class extending `BaseWarehouseConnector`
2. Implement required methods:
   - `testConnection()`
   - `query()`
   - `getTableSchema()`
   - `listTables()`
   - `listSchemas()`
3. Update factory in `packages/@blueprintdata/warehouse/src/factory.ts`
4. Add connection type to `StorageType` union in models package
5. Update init command to support new warehouse

### Adding a New LLM Provider

1. Create provider client implementing `LLMClient` interface
2. Add models to `packages/@blueprintdata/analytics/src/llm/models.ts`
3. Update `createLLMClient()` factory
4. Add provider to `LLMProvider` type in models package
5. Update init command prompts

### Adding a New Agent Tool

1. Implement `Tool` interface in `packages/@blueprintdata/analytics/src/tools/implementations/`
2. Define tool schema with name, description, parameters
3. Implement `execute()` method
4. Register tool in `AgentService` initialization
5. Add to tool registry in CLI chat command

### Adding a New Template

1. Create directory in `templates/`
2. Include:
   - `README.md` with setup instructions
   - `dbt_project.yml` and models
   - `meltano.yml` (if extraction needed)
   - `.github/workflows/` for CI/CD
3. Add template to CLI prompts in `apps/cli/src/commands/new.ts`
4. Update documentation

---

## Performance Considerations

### Monorepo Build Performance

- **TypeScript Project References**: Incremental builds, only rebuild changed packages
- **Bun Workspace**: Fast package linking, no npm/yarn overhead
- **Parallel Builds**: Independent packages build in parallel

### Runtime Performance

- **Warehouse Profiling**: Sequential table profiling to avoid overwhelming warehouse
- **LLM API Calls**: Cost tracking, fallback to templates on failure
- **WebSocket**: Efficient real-time communication, heartbeat for health checks
- **Database**: SQLite for zero-config local storage, fast queries

### Optimization Strategies

- **Lazy Loading**: Import packages only when needed
- **Caching**: LLM responses cached where applicable (future)
- **Streaming**: Large file operations use streaming
- **Connection Pooling**: Warehouse connectors reuse connections

---

## Security Considerations

### Secrets Management

- **API Keys**: Stored in `.blueprintdata/config.json` (added to `.gitignore`)
- **Tokens**: JWT tokens in `~/.blueprintdata/auth.json` (mode 600)
- **Warehouse Credentials**: Loaded from dbt profiles, not stored in CLI config

### Input Validation

- **SQL Injection**: Read-only query validation, parameterized queries where possible
- **Path Traversal**: All file paths validated and sanitized
- **User Input**: Username, email, and password validation

### Authentication & Authorization

- **JWT**: 30-day expiration, secure token storage
- **Password Hashing**: bcrypt with 10 rounds
- **WebSocket Auth**: JWT validation on connection

### Tool Execution

- **Read-Only SQL**: Query validation blocks INSERT, UPDATE, DELETE, DDL
- **Timeout**: 30-second query timeout
- **Row Limit**: 1000 row limit per query
- **RBAC**: Tool registry supports future role-based access control

---

## Future Enhancements

### Planned Improvements

1. **Distributed Architecture**
   - Move to PostgreSQL for multi-user support
   - Redis for caching and session management
   - Deploy gateway as standalone service

2. **Enhanced Tool System**
   - Role-based access control (RBAC)
   - Custom tool plugins
   - Tool chaining and workflows

3. **Advanced Analytics**
   - Data quality checks
   - Anomaly detection
   - Automated insights generation

4. **Multi-Tenancy**
   - Organization support
   - Team collaboration
   - Shared agent contexts

5. **Extended Integrations**
   - More warehouses (Snowflake, Redshift, Databricks)
   - Slack bot integration
   - Jupyter notebook export

---

## References

- [Publishing Guide](PUBLISHING.md) - Release process and versioning
- [Development Guide](DEVELOPMENT.md) - Local development and testing
- [Features: Templates](features/TEMPLATES.md) - Project scaffolding
- [Features: Analytics](features/ANALYTICS.md) - Analytics agent
- [Roadmap](../ROADMAP.md) - Future plans

---

**Last Updated**: 2026-01-29
