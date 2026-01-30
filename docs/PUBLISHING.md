# Publishing Guide

Complete guide to publishing BlueprintData CLI packages to NPM.

---

## Table of Contents

1. [Overview](#overview)
2. [Release Strategy](#release-strategy)
3. [Changesets Workflow](#changesets-workflow)
4. [Automated Publishing](#automated-publishing)
5. [Manual Publishing](#manual-publishing)
6. [Versioning Strategy](#versioning-strategy)
7. [Pre-Release Testing](#pre-release-testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

BlueprintData CLI uses a **monorepo publishing strategy** with Changesets for version management and automated releases via GitHub Actions.

### Key Concepts

- **Monorepo**: Multiple packages in a single repository
- **Changesets**: Tool for managing versions and changelogs
- **Independent Versioning**: Only the CLI package is published to NPM
- **Internal Packages**: Shared packages are bundled with the CLI, not published separately
- **Automated Releases**: GitHub Actions automatically publishes on push to `main` or `staging`

### Published Package

**Only the CLI package is published to NPM:**

- `blueprintdata-cli` - Main CLI executable

All internal packages (`@blueprintdata/*`) are bundled dependencies and not published separately.

---

## Release Strategy

### Branches

- **`main`**: Stable releases (e.g., 1.0.0, 1.1.0)
- **`staging`**: Pre-releases for testing (e.g., 1.1.0-beta.1)
- **Feature branches**: Development work

### Release Flow

```
Feature Branch → staging → main
                   ↓        ↓
               Beta Release  Stable Release
                (1.1.0-beta.1)  (1.1.0)
```

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/) (semver):

- **Major (X.0.0)**: Breaking changes
- **Minor (1.X.0)**: New features (backwards compatible)
- **Patch (1.0.X)**: Bug fixes (backwards compatible)

### Pre-Release Tags

- **Beta**: `1.1.0-beta.1` - Staging branch releases for testing
- **No pre-release tag**: `1.1.0` - Main branch stable releases

---

## Changesets Workflow

### 1. Creating a Changeset

When you make changes that should trigger a release, create a changeset:

```bash
bun run changeset
```

This launches an interactive prompt:

```
? Which packages would you like to include?
  ✔ blueprintdata-cli

? Which packages should have a major bump?
  ◯ blueprintdata-cli

? Which packages should have a minor bump?
  ✔ blueprintdata-cli

? Which packages should have a patch bump?
  ◯ blueprintdata-cli

? Please enter a summary for this change
  Add analytics chat command with WebSocket support
```

### 2. What Changesets Do

A changeset is created as a markdown file in `.changeset/`:

```markdown
---
"blueprintdata-cli": minor
---

Add analytics chat command with WebSocket support
```

**This file should be committed with your PR.**

### 3. Changeset Guidelines

**When to create a changeset:**

- Adding a new feature
- Fixing a bug
- Making a breaking change
- Any change that affects end users

**When NOT to create a changeset:**

- Internal refactoring that doesn't change behavior
- Documentation updates
- Test additions
- CI/CD changes
- Code formatting

**Changeset summary guidelines:**

- Write in imperative mood ("Add", not "Added" or "Adds")
- Be specific and concise
- Focus on user impact, not implementation details

**Examples:**

```
✅ Good:
- "Add analytics chat command with WebSocket support"
- "Fix authentication token validation error"
- "Improve warehouse profiling performance"

❌ Bad:
- "Refactor code"
- "Update tests"
- "Fix bug"
```

### 4. Multiple Changesets

You can create multiple changesets in a single PR if you have multiple independent changes:

```bash
# Add first changeset
bun run changeset
# Summary: Add analytics chat command

# Add second changeset
bun run changeset
# Summary: Fix authentication token expiration
```

---

## Automated Publishing

### How It Works

Publishing is **fully automated** via GitHub Actions:

1. **Push to `staging` or `main`** triggers the release workflow
2. **Changesets Action** checks for changeset files
3. **If changesets exist**:
   - Creates a "Version Packages" PR
   - PR updates package versions and CHANGELOG.md
4. **When PR is merged**:
   - Publishes packages to NPM
   - Creates GitHub release
   - Tags the commit

### Release Workflow File

Location: `.github/workflows/release.yml`

**Triggered by**: Push to `main` or `staging` branches

**Steps**:

1. Checkout code
2. Setup Bun and Node.js
3. Install dependencies
4. Build packages
5. Build CLI
6. Run Changesets Action (creates PR or publishes)

### Environment Setup

**Required GitHub Secrets:**

- `NPM_TOKEN` - NPM automation token for publishing

**Required Permissions** (configured in workflow):

- `contents: write` - Update files and create releases
- `issues: write` - Comment on issues
- `pull-requests: write` - Create version PRs
- `id-token: write` - NPM provenance

### Publishing to Staging (Beta Releases)

```bash
# 1. Create feature branch
git checkout -b feat/new-feature

# 2. Make changes and create changeset
bun run changeset
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR to staging
git push origin feat/new-feature
# Create PR targeting 'staging' branch

# 4. Merge PR to staging
# GitHub Action automatically:
#  - Creates "Version Packages" PR with beta version (e.g., 1.1.0-beta.1)
#  - When merged, publishes to NPM with 'beta' tag
```

**Installing beta releases:**

```bash
npm install -g blueprintdata-cli@beta
```

### Publishing to Production (Stable Releases)

```bash
# 1. Ensure staging is tested and stable

# 2. Create PR from staging to main
git checkout staging
git pull origin staging
git checkout -b release/staging-to-main
git push origin release/staging-to-main
# Create PR targeting 'main' branch

# 3. Review and merge PR to main
# GitHub Action automatically:
#  - Creates "Version Packages" PR with stable version (e.g., 1.1.0)
#  - When merged, publishes to NPM as 'latest'
#  - Creates GitHub release with changelog
```

**Installing stable releases:**

```bash
npm install -g blueprintdata-cli
# or
npm install -g blueprintdata-cli@latest
```

---

## Manual Publishing

In rare cases, you may need to publish manually (e.g., GitHub Actions outage, testing locally).

### Prerequisites

1. **NPM Account**: Member of the BlueprintData NPM organization
2. **NPM Token**: Create automation token at https://www.npmjs.com/settings/tokens
3. **NPM Login**: `npm login` or set `NPM_TOKEN` environment variable

### Manual Publish Steps

#### 1. Ensure Clean Working Directory

```bash
git status
# Should show no uncommitted changes
```

#### 2. Ensure Main Branch is Up to Date

```bash
git checkout main
git pull origin main
```

#### 3. Build Everything

```bash
bun run build
```

#### 4. Version Packages (Using Changesets)

```bash
bun run changeset version
```

This updates `package.json` versions and `CHANGELOG.md`.

#### 5. Commit Version Changes

```bash
git add .
git commit -m "chore: version packages"
```

#### 6. Publish to NPM

```bash
bun run release
```

This runs `build` and `changeset publish` which:
- Publishes the CLI package to NPM
- Creates git tags for the release
- Updates the NPM registry

#### 7. Push Changes and Tags

```bash
git push origin main --follow-tags
```

#### 8. Create GitHub Release

Go to https://github.com/your-org/blueprintdata-cli/releases and create a new release from the tag.

### Manual Pre-Release (Beta)

To manually publish a beta version:

```bash
# 1. Checkout staging
git checkout staging
git pull origin staging

# 2. Build
bun run build

# 3. Version with pre-release tag
bun run changeset version

# 4. Edit package.json version to add beta tag if needed
# e.g., "1.1.0" → "1.1.0-beta.1"

# 5. Publish with beta tag
cd apps/cli
npm publish --tag beta --provenance

# 6. Commit and push
git add .
git commit -m "chore: publish beta version"
git push origin staging
```

### Manual Release Checklist

- [ ] All tests passing (`bun test`)
- [ ] Type checking passes (`bun run typecheck`)
- [ ] Linting passes (`bun run lint`)
- [ ] CLI builds successfully (`bun run build:cli`)
- [ ] CLI runs without errors (`node apps/cli/dist/index.js --help`)
- [ ] Changesets exist for all changes
- [ ] Version numbers are correct
- [ ] CHANGELOG.md is updated
- [ ] Git tags are created
- [ ] GitHub release is created

---

## Versioning Strategy

### Package Configuration

**Changesets Config** (`.changeset/config.json`):

```json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [
    "@blueprintdata/models",
    "@blueprintdata/errors",
    "@blueprintdata/config",
    "@blueprintdata/warehouse",
    "@blueprintdata/analytics",
    "@blueprintdata/gateway"
  ]
}
```

**Key settings:**

- `ignore`: Internal packages not published to NPM
- `updateInternalDependencies: "patch"`: Bump CLI version when internal deps change
- `access: "public"`: Publish as public package

### Version Bump Decision Tree

```
Breaking change?
├─ Yes → Major bump (2.0.0)
└─ No → New feature?
         ├─ Yes → Minor bump (1.1.0)
         └─ No → Bug fix?
                  └─ Yes → Patch bump (1.0.1)
```

### Examples

**Patch (1.0.1):**

- Fix authentication token validation
- Fix table profiling error handling
- Correct typo in help text

**Minor (1.1.0):**

- Add analytics chat command
- Add new warehouse connector
- Add new LLM provider support

**Major (2.0.0):**

- Remove deprecated commands
- Change configuration file format
- Require Node.js 20+ (breaking)

### Pre-Release Versioning

**Beta versions** increment automatically:

- `1.1.0-beta.1` - First beta
- `1.1.0-beta.2` - Second beta (after more changes)
- `1.1.0` - Stable release

### Internal Package Versions

Internal packages (`@blueprintdata/*`) are **not published** but still have versions for tracking:

- Versions are updated by Changesets
- Used to track internal API changes
- Trigger CLI version bumps when changed

---

## Pre-Release Testing

### Before Publishing

1. **Run Full Test Suite**

   ```bash
   bun test
   ```

2. **Type Check All Packages**

   ```bash
   bun run typecheck
   ```

3. **Lint Code**

   ```bash
   bun run lint
   ```

4. **Build Everything**

   ```bash
   bun run build
   ```

5. **Test CLI Locally**

   ```bash
   # Link CLI globally
   cd apps/cli
   bun link

   # Test commands
   blueprintdata --help
   blueprintdata new --help
   blueprintdata analytics --help
   ```

6. **Test in Real dbt Project**

   ```bash
   cd /path/to/test-dbt-project
   blueprintdata analytics init
   blueprintdata analytics sync
   ```

### Beta Testing Workflow

1. **Publish beta** to staging
2. **Notify team** to test beta version
3. **Collect feedback** and fix issues
4. **Publish new beta** if fixes are needed
5. **Promote to stable** when ready

### Smoke Testing Checklist

After publishing (beta or stable), verify:

- [ ] `npm install -g blueprintdata-cli` works
- [ ] `blueprintdata --version` shows correct version
- [ ] `blueprintdata new` creates a project
- [ ] `blueprintdata analytics init` works in a dbt project
- [ ] Documentation is up to date

---

## Troubleshooting

### Common Issues

#### "Version already exists on NPM"

**Problem**: Trying to publish a version that's already on NPM

**Solution**:

```bash
# Check current NPM version
npm view blueprintdata-cli version

# Update version in package.json to be higher
# Or run changeset version again
bun run changeset version
```

#### "NPM_TOKEN not set"

**Problem**: GitHub Action can't authenticate with NPM

**Solution**:

1. Create NPM automation token at https://www.npmjs.com/settings/tokens
2. Add token to GitHub Secrets as `NPM_TOKEN`
3. Re-run workflow

#### "Changesets found but no version bump"

**Problem**: Changesets exist but don't specify which packages to bump

**Solution**:

1. Delete incorrect changesets: `rm .changeset/*.md`
2. Create new changeset: `bun run changeset`
3. Ensure you select the CLI package

#### "Build fails in CI"

**Problem**: Build works locally but fails in GitHub Actions

**Common causes:**

- Missing dependencies in lockfile
- Type errors
- Test failures
- Lint errors

**Solution**:

```bash
# Ensure lockfile is up to date
bun install

# Run full CI checks locally
bun run build
bun run typecheck
bun run lint
bun test

# Commit lockfile if updated
git add bun.lockb
git commit -m "chore: update lockfile"
```

#### "Published version not installing"

**Problem**: Published successfully but `npm install` fails or gets old version

**Solutions**:

1. **Check NPM registry propagation** (can take a few minutes):

   ```bash
   npm view blueprintdata-cli version
   ```

2. **Clear NPM cache**:

   ```bash
   npm cache clean --force
   npm install -g blueprintdata-cli@latest
   ```

3. **Check you're installing the right tag**:

   ```bash
   # For stable
   npm install -g blueprintdata-cli@latest

   # For beta
   npm install -g blueprintdata-cli@beta
   ```

### Rollback a Release

If a bad version was published:

1. **Deprecate the bad version**:

   ```bash
   npm deprecate blueprintdata-cli@1.1.0 "This version has critical bugs, use 1.0.5 instead"
   ```

2. **Publish a fix immediately**:

   ```bash
   # Fix the bug
   # Create changeset
   bun run changeset
   # Publish manually if urgent
   bun run release
   ```

3. **Don't use `npm unpublish`** (violates NPM policy for published packages)

### Failed Publish Recovery

If publish fails midway:

1. **Check what was published**:

   ```bash
   npm view blueprintdata-cli
   ```

2. **If version was NOT published**:

   ```bash
   # Git tags may have been created, delete them
   git tag -d v1.1.0
   git push origin :refs/tags/v1.1.0

   # Try publish again
   bun run release
   ```

3. **If version WAS published but incomplete**:

   ```bash
   # Bump to next patch version
   # Edit apps/cli/package.json: 1.1.0 → 1.1.1
   bun run release
   ```

---

## Release Checklist

Use this checklist for every release:

### Pre-Release

- [ ] All PRs merged to staging/main
- [ ] All tests passing
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Changesets created for all changes
- [ ] CHANGELOG reviewed

### Release

- [ ] GitHub Action triggered
- [ ] "Version Packages" PR created
- [ ] PR reviewed and approved
- [ ] PR merged
- [ ] Package published to NPM
- [ ] Git tags created
- [ ] GitHub release created

### Post-Release

- [ ] Verify installation: `npm install -g blueprintdata-cli@latest`
- [ ] Test CLI: `blueprintdata --version`
- [ ] Smoke test key commands
- [ ] Announce release (if major/minor)
- [ ] Update documentation site (if applicable)

---

## Advanced Topics

### Publishing from a Fork

If you're contributing from a fork, you cannot trigger releases directly. The maintainer will:

1. Review and merge your PR to `staging`
2. Test the beta release
3. Merge to `main` for stable release

### Canary Releases

For testing unreleased changes:

```bash
# Build and link locally (no NPM publish)
bun run build
cd apps/cli && bun link
```

### NPM Provenance

Our releases include NPM provenance (supply chain security):

- Enabled via `--provenance` flag
- Requires `id-token: write` permission in GitHub Actions
- Provides verifiable link between GitHub and NPM

---

## Useful Commands

```bash
# Create changeset
bun run changeset

# Version packages (update versions from changesets)
bun run changeset version

# Publish to NPM
bun run release

# View changesets status
bun run changeset status

# Check NPM package info
npm view blueprintdata-cli

# Check NPM dist-tags
npm view blueprintdata-cli dist-tags

# Test CLI installation
npm install -g blueprintdata-cli@beta
npm install -g blueprintdata-cli@latest
```

---

## References

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions: Publishing Node.js Packages](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
- [Architecture Guide](ARCHITECTURE.md) - Understanding the monorepo structure
- [Development Guide](DEVELOPMENT.md) - Local development workflow

---

**Last Updated**: 2026-01-29
