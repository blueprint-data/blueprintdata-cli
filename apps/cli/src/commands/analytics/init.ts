import { Command } from 'commander';
import * as p from '@clack/prompts';
import {
  getDbtProfile,
  getWarehouseConnectionFromDbt,
  validateLLMApiKey,
} from '../../utils/env.js';
import { LLMProvider, CompanyContext } from '@blueprintdata/models';
import { getDefaultModel, ContextBuilder, OPENROUTER_MODELS } from '@blueprintdata/analytics';
import { WebsiteScraper, DbtProjectScanner } from '@blueprintdata/analytics';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import { InitOptions } from '../../services/analytics/InitService.js';
import { DEFAULT_CONFIG } from '@blueprintdata/config';
import { validateDbtProject } from '../../utils/validation.js';
import { isAnalyticsInitialized, loadConfig } from '../../utils/config.js';
import { createWarehouseConnector } from '@blueprintdata/warehouse';
import { OpenRouter } from '@openrouter/sdk';

export const initCommand = new Command('init')
  .description('Initialize analytics agent in a dbt project')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options: { force?: boolean }) => {
    try {
      p.intro('🚀 BlueprintData Analytics Agent');

      const projectPath = process.cwd();

      p.log.step('Checking dbt_project.yml');
      const dbtValidation = await validateDbtProject(projectPath);
      if (!dbtValidation.valid) {
        throw new Error(dbtValidation.error || 'Invalid dbt project');
      }
      p.log.success('dbt_project.yml ok');

      p.log.step('Loading dbt profiles.yml');
      await getDbtProfile(projectPath);
      p.log.success('dbt profiles.yml ok');

      const initialized = await isAnalyticsInitialized(projectPath);
      if (initialized && !options.force) {
        const action = await p.select({
          message: 'Existing BlueprintData config found. What do you want to do?',
          options: [
            {
              value: 'reuse',
              label: 'Use existing config and rebuild agent context (recommended)',
            },
            {
              value: 'recreate',
              label: 'Recreate config and agent context (re-enter prompts)',
            },
            { value: 'cancel', label: 'Cancel' },
          ],
        });

        if (p.isCancel(action) || action === 'cancel') {
          p.cancel('Operation cancelled');
          process.exit(0);
        }

        if (action === 'reuse') {
          const s1 = p.spinner();
          s1.start('Loading configuration');
          const config = await loadConfig(projectPath);
          s1.stop('✓ Configuration loaded');

          const s2 = p.spinner();
          s2.start('Connecting to warehouse');
          const connector = await createWarehouseConnector(config.warehouseConnection);
          let connectionOk = false;
          try {
            connectionOk = await connector.testConnection();
            if (!connectionOk) {
              s2.stop('❌ Connection failed');
              throw new Error('Failed to connect to warehouse');
            }
            s2.stop('✓ Warehouse connection successful');
          } catch (error) {
            await connector.close();
            throw error;
          }

          const s3 = p.spinner();
          s3.start('Rebuilding agent context (this may take a few minutes)');
          const builder = new ContextBuilder({
            projectPath,
            config,
            connector,
            force: true,
          });
          try {
            await builder.build();
            s3.stop('✓ Agent context rebuilt');
          } finally {
            await connector.close();
          }

          p.outro('🎉 Analytics agent initialized successfully!');

          console.log('\nNext steps:');
          console.log('  1. Review agent-context/ directory');
          console.log('  2. Run: blueprintdata analytics chat');
          console.log('  3. Start chatting with your analytics agent!\n');
          return;
        }

        options.force = true;
      }

      // Collect all inputs from user through prompts
      const inputs = await collectInputs(projectPath);

      // Create service and delegate to business logic
      const initService = ServiceFactory.createInitService();

      p.log.step('Building agent context (this may take a few minutes)...');

      await initService.initialize({
        projectPath,
        force: options.force,
        ...inputs,
      });

      p.log.success('Agent context created in agent-context/');

      // Success message
      p.outro('🎉 Analytics agent initialized successfully!');

      console.log('\nNext steps:');
      console.log('  1. Review agent-context/ directory');
      console.log('  2. Run: blueprintdata analytics chat');
      console.log('  3. Start chatting with your analytics agent!\n');
    } catch (error) {
      if (error instanceof Error) {
        p.log.error(error.message);
      } else {
        p.log.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

/**
 * Collect all required inputs from user through prompts
 */
async function collectInputs(
  projectPath: string
): Promise<Omit<InitOptions, 'projectPath' | 'force'>> {
  // dbt target environment
  const dbtTarget = await p.text({
    message: 'dbt target environment (optional):',
    placeholder: 'e.g., prod, dev, staging (leave empty for default)',
  });

  if (p.isCancel(dbtTarget)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  // LLM provider and API key
  const { llmProvider, llmApiKey } = await selectLLMProvider();

  // LLM models
  const { llmModel, llmProfilingModel } = await selectLLMModels(llmProvider, llmApiKey);

  // Company context
  const companyContext = await collectCompanyContext(projectPath);

  // Profiling scope (models/schemas)
  const { modelSelection, schemaSelection } = await selectProfilingScope(
    projectPath,
    dbtTarget || undefined
  );

  // Slack configuration (optional)
  const { slackBotToken, slackSigningSecret } = await configureSlack();

  return {
    dbtTarget: dbtTarget || undefined,
    llmProvider,
    llmApiKey,
    llmModel,
    llmProfilingModel,
    companyContext,
    modelSelection,
    schemaSelection,
    slackBotToken,
    slackSigningSecret,
    uiPort: DEFAULT_CONFIG.interface.uiPort,
    gatewayPort: DEFAULT_CONFIG.interface.gatewayPort,
  };
}

/**
 * Select LLM provider and get API key
 */
async function selectLLMProvider(): Promise<{ llmProvider: LLMProvider; llmApiKey: string }> {
  const openRouterKey = validateLLMApiKey('openrouter');

  const llmProvider: LLMProvider = 'openrouter';
  let llmApiKey: string;

  if (openRouterKey) {
    llmApiKey = openRouterKey;
    p.log.success('Using OpenRouter (detected in environment)');
  } else {
    const apiKey = await p.password({
      message: 'Enter OpenRouter API key:',
      validate: (value) => {
        if (!value || value.length === 0) return 'API key is required';
        return undefined;
      },
    });

    if (p.isCancel(apiKey)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    llmApiKey = apiKey;
  }

  return { llmProvider, llmApiKey };
}

/**
 * Select LLM models for chat and profiling
 */
async function selectLLMModels(
  llmProvider: LLMProvider,
  llmApiKey: string
): Promise<{ llmModel: string; llmProfilingModel: string }> {
  if (llmProvider !== 'openrouter') {
    throw new Error('Unsupported LLM provider');
  }

  const spinner = p.spinner();
  spinner.start('Loading OpenRouter models');
  let models: OpenRouterModel[] = [];

  try {
    models = await fetchOpenRouterModels(llmApiKey);
    spinner.stop(`✓ Loaded ${models.length} OpenRouter models`);
  } catch (error) {
    spinner.stop('⚠ Failed to load OpenRouter models, using curated list');
    models = [];
  }

  const fallbackModels: OpenRouterModel[] = OPENROUTER_MODELS.map((model) => ({
    id: model.id,
    name: model.name,
    contextLength: model.contextWindow || undefined,
    pricing: undefined,
  }));

  const catalog = models.length > 0 ? models : fallbackModels;

  const defaultChat = getDefaultModel(llmProvider, 'chat').id;
  const defaultProfiling = getDefaultModel(llmProvider, 'profiling').id;

  const llmModel = await selectOpenRouterModel({
    models: catalog,
    message: 'Select model for chat interactions:',
    recommendedIds: getRecommendedModelIds('chat'),
    defaultId: defaultChat,
  });

  const llmProfilingModel = await selectOpenRouterModel({
    models: catalog,
    message: 'Select model for context profiling (recommend fast/cost-effective):',
    recommendedIds: getRecommendedModelIds('profiling'),
    defaultId: defaultProfiling,
  });

  return {
    llmModel,
    llmProfilingModel,
  };
}

type OpenRouterModel = {
  id: string;
  name?: string;
  contextLength?: number;
  pricing?: { prompt?: string; completion?: string };
};

async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModel[]> {
  const client = new OpenRouter({ apiKey });
  const response = await client.models.list();

  const data = (response as { data?: unknown }).data;
  const modelsArray = Array.isArray(data) ? data : [];

  const results: OpenRouterModel[] = [];

  for (const model of modelsArray) {
    const raw = model as {
      id?: unknown;
      name?: unknown;
      context_length?: unknown;
      pricing?: { prompt?: unknown; completion?: unknown };
    };

    const id = typeof raw.id === 'string' ? raw.id : '';
    if (!id) continue;

    results.push({
      id,
      name: typeof raw.name === 'string' ? raw.name : undefined,
      contextLength:
        typeof raw.context_length === 'number'
          ? raw.context_length
          : typeof raw.context_length === 'string'
            ? Number(raw.context_length)
            : undefined,
      pricing:
        raw.pricing && typeof raw.pricing === 'object'
          ? {
              prompt: typeof raw.pricing.prompt === 'string' ? raw.pricing.prompt : undefined,
              completion:
                typeof raw.pricing.completion === 'string' ? raw.pricing.completion : undefined,
            }
          : undefined,
    });
  }

  return results.sort((a, b) => a.id.localeCompare(b.id));
}

function getRecommendedModelIds(type: 'chat' | 'profiling'): string[] {
  if (type === 'profiling') {
    return [
      'google/gemini-2.5-flash',
      'x-ai/grok-4.1-fast',
      'arcee-ai/trinity-large-preview:free',
      'google/gemini-3-flash-preview-20251217',
    ];
  }

  return [
    'openrouter/auto',
    'minimax/minimax-m2.5-20260211',
    'moonshotai/kimi-k2.5-0127',
    'z-ai/glm-5-20260211',
    'deepseek/deepseek-v3.2-20251201',
    'anthropic/claude-4.5-sonnet-20250929',
    'anthropic/claude-4.6-opus-20260205',
  ];
}

async function selectOpenRouterModel(options: {
  models: OpenRouterModel[];
  message: string;
  recommendedIds: string[];
  defaultId: string;
}): Promise<string> {
  const { models, message, recommendedIds, defaultId } = options;
  const recommendedModels = models.filter((model) => recommendedIds.includes(model.id));
  const baseModels = recommendedModels.length > 0 ? recommendedModels : models.slice(0, 12);
  const optionsList = buildOpenRouterOptions(
    baseModels,
    recommendedModels.length > 0 ? recommendedIds : []
  );

  const selection = await p.select({
    message,
    options: [
      ...optionsList,
      { value: '__search__', label: 'Search all models' },
      { value: '__manual__', label: 'Enter model ID manually' },
    ],
    initialValue: defaultId,
  });

  if (p.isCancel(selection)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  if (selection === '__search__') {
    return await selectModelBySearch(models, message, defaultId);
  }

  if (selection === '__manual__') {
    return await promptManualModelId();
  }

  return selection as string;
}

async function selectModelBySearch(
  models: OpenRouterModel[],
  message: string,
  defaultId: string
): Promise<string> {
  while (true) {
    const query = await p.text({
      message: 'Search models by name or ID:',
      placeholder: 'e.g., gemini, claude, openrouter/auto',
    });

    if (p.isCancel(query)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return defaultId;
    }

    const filtered = models.filter((model) => {
      return (
        model.id.toLowerCase().includes(normalized) ||
        (model.name && model.name.toLowerCase().includes(normalized))
      );
    });

    if (filtered.length === 0) {
      p.log.warn('No models matched. Try another search term.');
      continue;
    }

    const limited = filtered.slice(0, 20);
    const selected = await p.select({
      message,
      options: [
        ...buildOpenRouterOptions(limited, []),
        { value: '__search__', label: 'Search again' },
        { value: '__manual__', label: 'Enter model ID manually' },
      ],
      initialValue: defaultId,
    });

    if (p.isCancel(selected)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    if (selected === '__search__') {
      continue;
    }

    if (selected === '__manual__') {
      return await promptManualModelId();
    }

    return selected as string;
  }
}

async function promptManualModelId(): Promise<string> {
  const manual = await p.text({
    message: 'Enter OpenRouter model ID:',
    placeholder: 'e.g., openrouter/auto',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Model ID is required';
      }
      return undefined;
    },
  });

  if (p.isCancel(manual)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  return manual.trim();
}

function buildOpenRouterOptions(
  models: OpenRouterModel[],
  recommendedIds: string[]
): Array<{ value: string; label: string; hint?: string }> {
  const recommendedSet = new Set(recommendedIds);
  const modelMap = new Map(models.map((model) => [model.id, model]));
  const ordered = [
    ...recommendedIds.filter((id) => modelMap.has(id)).map((id) => modelMap.get(id)!),
    ...models.filter((model) => !recommendedSet.has(model.id)),
  ];

  return ordered.map((model) => {
    const name = model.name || model.id;
    const label = recommendedSet.has(model.id) ? `${name} (Recommended)` : name;
    const hintParts = [] as string[];

    if (model.contextLength && model.contextLength > 0) {
      hintParts.push(`${(model.contextLength / 1000).toFixed(0)}K context`);
    }

    if (model.pricing?.prompt || model.pricing?.completion) {
      const promptValue = model.pricing.prompt ? Number(model.pricing.prompt) : undefined;
      const completionValue = model.pricing.completion
        ? Number(model.pricing.completion)
        : undefined;
      const promptCost = Number.isFinite(promptValue)
        ? (promptValue as number) * 1_000_000
        : undefined;
      const completionCost = Number.isFinite(completionValue)
        ? (completionValue as number) * 1_000_000
        : undefined;

      if (promptCost !== undefined && completionCost !== undefined) {
        hintParts.push(`$${promptCost.toFixed(2)}/$${completionCost.toFixed(2)} per 1M tokens`);
      }
    }

    return {
      value: model.id,
      label,
      hint: hintParts.length > 0 ? hintParts.join(' • ') : undefined,
    };
  });
}

/**
 * Collect company context information
 */
async function collectCompanyContext(projectPath: string): Promise<CompanyContext | undefined> {
  const companyName = await p.text({
    message: 'Company name (optional):',
    placeholder: 'e.g., Acme Corp',
  });

  if (p.isCancel(companyName)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  const industry = await p.text({
    message: 'Industry (optional):',
    placeholder: 'e.g., E-commerce, SaaS, Healthcare',
  });

  if (p.isCancel(industry)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  // Ask if they want to provide website URLs
  const provideWebsites = await p.confirm({
    message: 'Provide website URLs to scrape for company context?',
    initialValue: false,
  });

  if (p.isCancel(provideWebsites)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  let websites: string[] | undefined;
  let scrapedContent: string[] | undefined;

  if (provideWebsites) {
    const websiteUrls = await p.text({
      message: 'Enter website URLs (comma-separated):',
      placeholder: 'https://example.com/about, https://example.com/products',
      validate: (value) => {
        if (!value) return undefined;
        const urls = value.split(',').map((u) => u.trim());
        for (const url of urls) {
          try {
            new URL(url);
          } catch {
            return `Invalid URL: ${url}`;
          }
        }
        return undefined;
      },
    });

    if (p.isCancel(websiteUrls)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    if (websiteUrls && websiteUrls.length > 0) {
      websites = websiteUrls.split(',').map((u) => u.trim());

      // Scrape websites
      const s = p.spinner();
      s.start('Scraping websites for company context');
      const scraper = new WebsiteScraper();
      scrapedContent = await scraper.scrapeUrls(websites);
      s.stop(`✓ Scraped ${scrapedContent.length} URLs`);
    }
  }

  // Ask for additional context
  const userContext = await p.text({
    message: 'Additional company context (optional):',
    placeholder: 'e.g., Key metrics we track, business terminology, goals...',
  });

  if (p.isCancel(userContext)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  // Scan dbt project for business terminology
  const s = p.spinner();
  s.start('Scanning dbt project for business terminology');
  const projectScanner = new DbtProjectScanner(projectPath);
  const scanResult = await projectScanner.scanProject();
  s.stop(`✓ Found ${scanResult.terminology.length} terms, ${scanResult.domains.length} domains`);

  const companyContext: CompanyContext = {
    name: companyName || undefined,
    industry: industry || undefined,
    websites,
    scrapedContent: scrapedContent && scrapedContent.length > 0 ? scrapedContent : undefined,
    userContext: userContext || undefined,
    keyMetrics: scanResult.metrics.length > 0 ? scanResult.metrics : undefined,
  };

  return Object.keys(companyContext).length > 0 ? companyContext : undefined;
}

/**
 * Select models to profile
 */
async function selectModelsForProfiling(): Promise<string | undefined> {
  const selectModels = await p.select({
    message: 'Which dbt models should be profiled?',
    options: [
      {
        value: 'all',
        label: 'All models (comprehensive, slower)',
      },
      {
        value: 'select',
        label: 'Select specific models using dbt syntax',
      },
      {
        value: 'list',
        label: 'List individual model names',
      },
      {
        value: 'marts',
        label: 'Only marts layer (common choice)',
      },
      {
        value: 'staging',
        label: 'Only staging layer',
      },
    ],
    initialValue: 'marts',
  });

  if (p.isCancel(selectModels)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  let modelSelection: string | undefined;

  if (selectModels === 'select') {
    const customSelection = await p.text({
      message: 'Enter dbt selection syntax:',
      placeholder: 'e.g., tag:core, marts.finance.*, +dim_customers',
      validate: (value) => {
        if (!value || value.length === 0) return 'Selection is required';
        return undefined;
      },
    });

    if (p.isCancel(customSelection)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    modelSelection = customSelection;
  } else if (selectModels === 'list') {
    const modelNames = await p.text({
      message: 'Enter model names (comma-separated):',
      placeholder: 'e.g., dim_customers, fct_orders, stg_users',
      validate: (value) => {
        if (!value || value.length === 0) return 'At least one model name is required';
        return undefined;
      },
    });

    if (p.isCancel(modelNames)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    modelSelection = modelNames;
  } else if (selectModels === 'marts') {
    modelSelection = 'marts.*';
  } else if (selectModels === 'staging') {
    modelSelection = 'staging.*';
  }

  return modelSelection;
}

/**
 * Select profiling scope (models, schemas, or both)
 */
async function selectProfilingScope(
  projectPath: string,
  dbtTarget?: string
): Promise<{ modelSelection?: string; schemaSelection?: string[] }> {
  const schemas = await listWarehouseSchemas(projectPath, dbtTarget);
  if (schemas.length > 0) {
    p.log.info(`Available schemas: ${schemas.join(', ')}`);
  }

  const scope = await p.select({
    message: 'How should we scope profiling?',
    options: [
      { value: 'dbt', label: 'Select dbt models (recommended)' },
      { value: 'schemas', label: 'Select warehouse schemas' },
      { value: 'both', label: 'Select dbt models and limit to schemas' },
      { value: 'all', label: 'Profile everything' },
    ],
    initialValue: 'dbt',
  });

  if (p.isCancel(scope)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  if (scope === 'all') {
    return {};
  }

  if (scope === 'dbt') {
    const modelSelection = await selectModelsForProfiling();
    return { modelSelection };
  }

  if (scope === 'schemas') {
    const schemaSelection = await selectSchemasFromList(schemas);
    return { schemaSelection };
  }

  const modelSelection = await selectModelsForProfiling();
  const schemaSelection = await selectSchemasFromList(schemas);
  return { modelSelection, schemaSelection };
}

async function listWarehouseSchemas(projectPath: string, dbtTarget?: string): Promise<string[]> {
  try {
    const warehouseConnection = await getWarehouseConnectionFromDbt(
      projectPath,
      undefined,
      dbtTarget
    );
    const connector = await createWarehouseConnector(warehouseConnection);
    try {
      return await connector.listSchemas();
    } finally {
      await connector.close();
    }
  } catch (error) {
    p.log.warn('Unable to list schemas. You can still select models.');
    return [];
  }
}

async function selectSchemasFromList(schemas: string[]): Promise<string[] | undefined> {
  if (schemas.length === 0) {
    p.log.warn('No schemas found. Profiling will include all schemas.');
    return undefined;
  }

  const schemaOptions = schemas.map((schema) => ({ value: schema, label: schema }));
  const defaultSelection = schemas.includes('MARTS') ? ['MARTS'] : undefined;
  const selectedSchemas = await p.multiselect({
    message: 'Select schemas to profile:',
    options: [{ value: '__all__', label: 'All schemas' }, ...schemaOptions],
    initialValues: defaultSelection,
    required: true,
  });

  if (p.isCancel(selectedSchemas)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  const selected = selectedSchemas as string[];
  if (selected.includes('__all__')) {
    return undefined;
  }

  return Array.from(new Set(selected));
}

/**
 * Configure Slack integration (optional)
 */
async function configureSlack(): Promise<{
  slackBotToken?: string;
  slackSigningSecret?: string;
}> {
  const configureSlack = await p.confirm({
    message: 'Configure Slack bot integration?',
    initialValue: false,
  });

  if (p.isCancel(configureSlack)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  if (!configureSlack) {
    return {};
  }

  const botToken = await p.password({
    message: 'Enter Slack Bot Token:',
    validate: (value) => {
      if (!value || value.length === 0) return 'Bot token is required';
      return undefined;
    },
  });

  if (p.isCancel(botToken)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  const signingSecret = await p.password({
    message: 'Enter Slack Signing Secret:',
    validate: (value) => {
      if (!value || value.length === 0) return 'Signing secret is required';
      return undefined;
    },
  });

  if (p.isCancel(signingSecret)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  return {
    slackBotToken: botToken,
    slackSigningSecret: signingSecret,
  };
}
