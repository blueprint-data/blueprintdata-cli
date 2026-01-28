# Local Development Guide

This guide explains how to link the BlueprintData CLI and packages for local development and testing.

## Quick Start

### 1. Install and Link All Packages

```bash
# From the repository root
bun install
bun run local-install
```

This will:

1. Install all dependencies
2. Build all packages
3. Link all packages globally

### 2. Use the CLI

After linking, you can use the `blueprintdata` command anywhere:

```bash
# Check if it's working
blueprintdata --help

# Use in your dbt project
cd /path/to/your/dbt-project
blueprintdata analytics init
blueprintdata analytics sync
blueprintdata analytics chat
```

## Manual Package Linking

### Link Individual Packages

If you want to use specific packages in another project:

```bash
# In your project directory
bun link @blueprintdata/models
bun link @blueprintdata/analytics
```

### Available Packages

- `@blueprintdata/models` - TypeScript types and interfaces
- `@blueprintdata/errors` - Error handling utilities
- `@blueprintdata/config` - Configuration management
- `@blueprintdata/warehouse` - Warehouse connectors (BigQuery, Postgres)
- `@blueprintdata/analytics` - Context building and LLM enrichment
- `@blueprintdata/gateway` - WebSocket gateway (Phase 2+)

### Unlink Packages

```bash
# Unlink all packages
bun run unlink

# Or manually
bun unlink @blueprintdata/models
```

## Development Workflow

### Making Changes

1. **Edit code** in `packages/@blueprintdata/<package>/src/`
2. **Rebuild** the package: `cd packages/@blueprintdata/<package> && bun run build`
3. **Test** your changes immediately (linked packages reflect changes after rebuild)

### Testing Changes in Another Project

```bash
# In your test project
cd /path/to/test-project

# Link the specific package you modified
bun link @blueprintdata/analytics

# Test your changes
blueprintdata analytics init
```

### Watch Mode

For active development, use watch mode to rebuild automatically:

```bash
# In the package directory
cd packages/@blueprintdata/analytics
bun run dev
```

## Troubleshooting

### "Cannot find module" errors

If you see module resolution errors after linking:

```bash
# Rebuild all packages
bun run build:packages

# Re-link
bun run unlink
bun run link
```

### Changes not reflecting

Linked packages need to be rebuilt after changes:

```bash
# Quick rebuild of all packages
bun run build:packages
```

### Unlink and start fresh

```bash
# Clean everything
bun run unlink
rm -rf node_modules
rm -rf packages/@blueprintdata/*/node_modules
rm -rf apps/*/node_modules

# Reinstall and relink
bun install
bun run local-install
```

## Using in a dbt Project

### Setup

```bash
# Navigate to your dbt project
cd /path/to/your/dbt-project

# Initialize analytics
blueprintdata analytics init

# Start chat interface
blueprintdata analytics chat
```

### Development Mode

To test local changes in your dbt project:

```bash
# 1. Make changes to packages
# 2. Rebuild packages
bun run build:packages

# 3. Test in your project
blueprintdata analytics sync --profiles-only
blueprintdata analytics chat
```

## Package Structure

```
blueprintdata-cli/
├── apps/
│   └── cli/                    # CLI executable
├── packages/@blueprintdata/
│   ├── models/                 # Core types
│   ├── errors/                 # Error handling
│   ├── config/                 # Configuration
│   ├── warehouse/              # DB connectors
│   ├── analytics/              # Context building
│   └── gateway/                # WebSocket server
└── scripts/
    ├── link-packages.sh        # Link all packages
    └── unlink-packages.sh      # Unlink all packages
```

## npm/pnpm/yarn Compatibility

This monorepo uses Bun, but you can also use npm/pnpm/yarn:

### npm

```bash
npm install
npm run build:packages

# Link packages
cd packages/@blueprintdata/models && npm link
# ... repeat for each package
```

### pnpm

```bash
pnpm install
pnpm run build:packages
pnpm run link
```

### yarn

```bash
yarn install
yarn run build:packages

# Link packages manually
cd packages/@blueprintdata/models && yarn link
# ... repeat for each package
```

## Verification

After linking, verify everything works:

### Quick Verification

```bash
# Check CLI version (shows if local or npm version)
blueprintdata --version
blueprintdata version --verbose

# Check all linked packages
bun run verify-local
```

### Understanding the Output

When you run `bun run verify-local`, you'll see:

```
📦 @blueprintdata/models
   Version: 1.0.0
   Path: /Users/you/.bun/install/global/node_modules/@blueprintdata/models
   Real Path: /Users/you/projects/blueprintdata-cli/packages/@blueprintdata/models
   ✅ Using LOCAL version (linked)
   Last Modified: 1/28/2026, 10:30:45 AM
```

**Key indicators:**

- ✅ **LOCAL version** - You're using the linked development version
- ⚠️ **NPM version** - You're using the published npm version (not linked)
- **Last Modified** - Shows when the package was last built

### Manual Verification

```bash
# Check CLI location
which blueprintdata

# Check if it's a symlink
ls -la $(which blueprintdata)

# Check packages are linked
ls -la $(npm root -g)/@blueprintdata/

# Test build
bun run typecheck
bun run test
```

## Ensuring You're Using the Latest Version

### Method 1: Use verify-local command (Recommended)

```bash
# Shows which packages are linked and their last modified time
bun run verify-local
```

### Method 2: Check version with verbose flag

```bash
blueprintdata version --verbose
```

### Method 3: Check the actual file paths

```bash
# See where the CLI is installed
blueprintdata version

# Check if packages are symlinks
ls -la ~/.bun/install/global/node_modules/@blueprintdata/
```

### Method 4: Make a test change

1. Edit a file in `packages/@blueprintdata/analytics/src/`
2. Add a console.log or change a string
3. Rebuild: `bun run build:packages`
4. Run: `blueprintdata analytics init`
5. **Verify**: Your change should be visible

## Common Issues

### "Still seeing old version"

```bash
# 1. Rebuild packages
bun run build:packages

# 2. Verify linking
bun run verify-local

# 3. If still not working, relink
bun run unlink
bun run link
```

### "Changes not reflecting"

Remember: **You must rebuild after changes!**

```bash
# Quick rebuild
bun run build:packages

# Or rebuild specific package
cd packages/@blueprintdata/analytics && bun run build
```

### "verify-local shows NPM version"

```bash
# Reinstall and relink
bun run unlink
bun install
bun run local-install
```

## Need Help?

- Check [README.md](../README.md) for general usage
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
- Open an issue on GitHub
