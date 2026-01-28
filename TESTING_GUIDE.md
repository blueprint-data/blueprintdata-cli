# Phase 2.2 Enhancement - Testing Guide

**Status:** Core Infrastructure Complete (Tasks 1-11 of 18)  
**Date:** January 27, 2026

## 🎯 What's Been Built

### Core Infrastructure (✅ Complete)

**1. LLM System**

- Model definitions for Anthropic (Claude) and OpenAI (GPT)
- Unified LLM client supporting both providers
- Cost calculation and model selection utilities
- Prompt templates following datawarehouse-profiler.md spec

**2. Company Context Collection**

- Website scraping from multiple URLs
- dbt project code scanning for business terminology
- Industry inference from model names
- Automatic metric extraction

**3. dbt Integration**

- Manifest.json parsing
- dbt compile execution
- Model metadata extraction
- Compiled SQL retrieval

**4. Model Selection**

- Full dbt syntax support: `--select`, `--exclude`
- Wildcards: `fct_*`, `marts.*`
- Upstream/downstream: `+model`, `model+`, `+model+`
- Tag selection: `tag:daily`
- Path selection: `path:finance/*`

**5. Smart Sync**

- 3-factor change detection:
  - Schema changes (column structure)
  - Documentation changes (schema.yml)
  - Logic changes (compiled SQL hash)
- Cache system in `agent-context/.cache/`

**6. Enhanced Statistics**

- Column-level statistics (distinct count, null %, min/max)
- Sample values collection
- Time range detection
- Data type-aware analysis

**7. LLM Enrichment**

- Table profile generation
- Project summary generation
- Modeling pattern analysis
- Fallback templates for errors

## 🧪 What Can Be Tested Now

### ✅ Works (Phase 2.1)

```bash
cd /path/to/your/dbt-project

# Basic init still works
export ANTHROPIC_API_KEY="your-key"
blueprintdata analytics init

# Generates:
# - .blueprintdata/config.json (now includes llmModel field)
# - agent-context/system_prompt.md
# - agent-context/summary.md
# - agent-context/modelling.md
# - agent-context/models/*.md
```

### ❌ Not Yet Wired Up (Phase 2.2 Integration)

The following **infrastructure exists** but isn't wired into the commands yet:

- Company context collection prompts (in init)
- Model selection prompts (in init)
- LLM-powered profiling (needs profiler update)
- Smart sync with change detection (needs sync command update)
- `--select`/`--exclude` flags (needs sync command update)

## 📁 Files Created

### New Infrastructure Files (11 files)

```
src/analytics/
├── llm/
│   ├── models.ts          # Model definitions & costs
│   ├── client.ts          # Unified LLM client
│   └── prompts.ts         # System prompts & formatters
└── context/
    ├── scraper.ts         # Website & project scanning
    ├── dbt-integration.ts # Manifest & compile
    ├── selector.ts        # Model selection
    ├── changes.ts         # Change detection
    ├── statistics.ts      # Enhanced stats
    ├── enricher.ts        # LLM enrichment
    └── fallback.ts        # Fallback templates
```

### Updated Files

```
src/
├── types.ts               # Extended with Phase 2.2 interfaces
├── commands/analytics/
│   └── init.ts            # Now includes llmModel in config
└── .gitignore             # Added agent-context/.cache/
```

## 🔍 How to Test Infrastructure

While the full integration isn't complete, you can test individual components:

### 1. Test LLM Client (Manual)

```typescript
import { createLLMClient } from './src/analytics/llm/client.js';

const client = createLLMClient(
  'anthropic',
  process.env.ANTHROPIC_API_KEY!,
  'claude-3-5-sonnet-20241022'
);
const result = await client.generate('Say hello', { maxTokens: 100 });
console.log(result.content);
```

### 2. Test Model Selection (Manual)

```typescript
import { DbtModelSelector } from './src/analytics/context/selector.js';
import { DbtScanner } from './src/analytics/context/scanner.js';

const scanner = new DbtScanner('/path/to/dbt-project');
const scanResult = await scanner.scanModels();

const selector = new DbtModelSelector(scanResult.models);
const selected = selector.select({ include: ['fct_*'] });
console.log(
  'Selected models:',
  selected.map((m) => m.name)
);
```

### 3. Test Change Detection (Manual)

```typescript
import { ChangeDetector } from './src/analytics/context/changes.js';

const detector = new ChangeDetector('/path/to/dbt-project');
const cache = await detector.loadCache();
console.log('Cached models:', Object.keys(cache.models));
```

## 🚀 Next Steps for Full Integration

To make this usable end-to-end, we need to:

1. **Update init command** (src/commands/analytics/init.ts)
   - Add company context prompts
   - Add model selection prompts
   - Add LLM model selection
   - Wire up LLM enrichment

2. **Update sync command** (src/commands/analytics/sync.ts)
   - Add `--select` and `--exclude` options
   - Implement smart sync with change detection
   - Add progress reporting

3. **Update profiler** (src/analytics/context/profiler.ts)
   - Use StatisticsGatherer for enhanced stats
   - Call LLMEnricher for documentation
   - Handle fallback on errors

4. **Update builder** (src/analytics/context/builder.ts)
   - Orchestrate company context collection
   - Coordinate LLM enrichment
   - Handle model selection
   - Track and report errors

5. **Create documentation** (docs/ANALYTICS_INIT.md)
   - Explain how it all works
   - Document LLM usage
   - Provide troubleshooting guide

## 📊 Code Statistics

- **Total new files:** 11
- **Lines of code:** ~3,500
- **Functions implemented:** 60+
- **Type definitions:** 15+

## ✅ Verification Checklist

Before proceeding to integration:

- [x] TypeScript compiles without errors
- [x] Build succeeds
- [x] All new files created
- [x] Types extended properly
- [x] .gitignore updated
- [x] plan.md updated
- [x] CLI linked for testing
- [ ] End-to-end integration (next phase)
- [ ] Documentation created (next phase)

## 🐛 Known Issues

None at this time. All infrastructure compiles and builds successfully.

## 💡 Testing Recommendations

1. **Test basic init** to ensure nothing broke
2. **Verify config.json** now includes `llmModel` field
3. **Check that warehouse connection** still works (especially BigQuery with gcloud)
4. **Review generated profiles** to see baseline quality

The infrastructure is solid and ready for integration!

---

**Ready to continue when you are.** The remaining work is primarily wiring up the existing components into the command-line interface and testing the complete flow.
