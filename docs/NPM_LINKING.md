# NPM Linking Guide

If Bun linking isn't working for you, use these NPM commands instead.

## Quick Setup (NPM)

```bash
cd /Users/manuel/Documents/projects/blueprintdata/blueprintdata-cli
npm run local-install:npm
```

This will:

1. Install dependencies with npm
2. Build all packages
3. Link everything globally

## Manual Steps

If the automatic script doesn't work:

### Step 1: Install & Build

```bash
npm install
npm run build:packages
```

### Step 2: Link Packages

```bash
# Link packages (must be done in dependency order)
cd packages/@blueprintdata/models && npm link && cd ../..
cd packages/@blueprintdata/errors && npm link && cd ../..
cd packages/@blueprintdata/config && npm link && cd ../..
cd packages/@blueprintdata/warehouse && npm link && cd ../..
cd packages/@blueprintdata/analytics && npm link && cd ../..
cd packages/@blueprintdata/gateway && npm link && cd ../..

# Link CLI
cd apps/cli && npm link
```

## Usage in Your dbt Project

```bash
cd /path/to/your/dbt-project
blueprintdata analytics init
```

## Verify It's Working

```bash
# Check version shows local development
blueprintdata version

# Output should show:
# ✅ LOCAL DEVELOPMENT VERSION

# Check which blueprintdata is being used
which blueprintdata
ls -la $(which blueprintdata)
```

## Troubleshooting

### "command not found: blueprintdata"

Make sure npm global bin is in your PATH:

```bash
# Add to your ~/.bashrc, ~/.zshrc, or ~/.bash_profile
export PATH="$PATH:$(npm bin -g)"
```

### "Cannot find module"

Rebuild the packages:

```bash
npm run build:packages
npm run build:cli
```

### "Already linked" errors

Clean up and start fresh:

```bash
npm run unlink:npm
rm -rf node_modules
rm -rf packages/@blueprintdata/*/node_modules
rm -rf apps/*/node_modules
npm run local-install:npm
```

### Using with npx

If linking doesn't work, you can use npx:

```bash
# In your dbt project
cd /path/to/your/dbt-project
npx blueprintdata analytics init
```

## Unlink

To remove the links:

```bash
npm run unlink:npm
```

Or manually:

```bash
npm unlink -g blueprintdata-cli
npm unlink -g @blueprintdata/analytics
# ... etc for each package
```

## After Code Changes

When you make changes to the code:

```bash
cd /Users/manuel/Documents/projects/blueprintdata/blueprintdata-cli
npm run build:packages  # Rebuild packages
npm run build:cli       # Rebuild CLI

# Changes are now live!
```

No need to relink - the links stay active.
