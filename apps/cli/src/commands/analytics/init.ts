import { Command } from 'commander';
import * as p from '@clack/prompts';
import { validateLLMApiKey } from '../../utils/env.js';
import { LLMProvider, CompanyContext } from '../../types.js';
import {
  getModelsForProvider,
  getDefaultModel,
  formatModelOption,
} from '@blueprintdata/analytics';
import { WebsiteScraper, DbtProjectScanner } from '@blueprintdata/analytics';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import { InitOptions } from '../../services/analytics/InitService.js';
import { DEFAULT_CONFIG } from '@blueprintdata/config';

export const initCommand = new Command('init')
  .description('Initialize analytics agent in a dbt project')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options: { force?: boolean }) => {
    try {
      p.intro('🚀 BlueprintData Analytics Agent');

      const projectPath = process.cwd();

      // Collect all inputs from user through prompts
      const inputs = await collectInputs();

      // Create service and delegate to business logic
      const initService = ServiceFactory.createInitService();

      // Show build progress
      const s = p.spinner();
      s.start('Building agent context (this may take a few minutes)');

      await initService.initialize({
        projectPath,
        force: options.force,
        ...inputs,
      });

      s.stop('✓ Agent context created in agent-context/');

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
async function collectInputs(): Promise<Omit<InitOptions, 'projectPath' | 'force'>> {
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
  const { llmModel, llmProfilingModel } = await selectLLMModels(llmProvider);

  // Company context
  const companyContext = await collectCompanyContext(process.cwd());

  // Model selection
  const modelSelection = await selectModelsForProfiling();

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
  const anthropicKey = validateLLMApiKey('anthropic');
  const openaiKey = validateLLMApiKey('openai');

  let llmProvider: LLMProvider;
  let llmApiKey: string;

  if (anthropicKey && openaiKey) {
    // Both available, let user choose
    const provider = await p.select({
      message: 'Select LLM provider:',
      options: [
        {
          value: 'anthropic' as LLMProvider,
          label: 'Anthropic Claude (detected in environment)',
        },
        { value: 'openai' as LLMProvider, label: 'OpenAI GPT (detected in environment)' },
      ],
    });

    if (p.isCancel(provider)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    llmProvider = provider as LLMProvider;
    llmApiKey = provider === 'anthropic' ? anthropicKey : openaiKey;
  } else if (anthropicKey) {
    llmProvider = 'anthropic';
    llmApiKey = anthropicKey;
    p.log.success('Using Anthropic Claude (detected in environment)');
  } else if (openaiKey) {
    llmProvider = 'openai';
    llmApiKey = openaiKey;
    p.log.success('Using OpenAI GPT (detected in environment)');
  } else {
    // None available, prompt user
    const provider = await p.select({
      message: 'Select LLM provider:',
      options: [
        { value: 'anthropic' as LLMProvider, label: 'Anthropic Claude' },
        { value: 'openai' as LLMProvider, label: 'OpenAI GPT' },
      ],
    });

    if (p.isCancel(provider)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    llmProvider = provider as LLMProvider;

    const apiKey = await p.password({
      message: 'Enter API key:',
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
  llmProvider: LLMProvider
): Promise<{ llmModel: string; llmProfilingModel: string }> {
  p.log.step('Select LLM models for different tasks');

  const availableModels = getModelsForProvider(llmProvider);
  const modelOptions = availableModels.map((model) => formatModelOption(model));

  // Select chat model
  const chatModel = await p.select({
    message: 'Select model for chat interactions:',
    options: modelOptions,
    initialValue: getDefaultModel(llmProvider, 'chat').id,
  });

  if (p.isCancel(chatModel)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  // Select profiling model
  const profilingModel = await p.select({
    message: 'Select model for context profiling (recommend cost-effective):',
    options: modelOptions,
    initialValue: getDefaultModel(llmProvider, 'profiling').id,
  });

  if (p.isCancel(profilingModel)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  return {
    llmModel: chatModel as string,
    llmProfilingModel: profilingModel as string,
  };
}

/**
 * Collect company context information
 */
async function collectCompanyContext(projectPath: string): Promise<CompanyContext | undefined> {
  p.log.step('Company context helps the agent understand your business');

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
  p.log.step('Model selection for profiling');

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
