import { Command } from 'commander';
import * as p from '@clack/prompts';
import { validateDbtProject } from '../../utils/validation.js';
import {
  getWarehouseConnectionFromDbt,
  validateLLMApiKey,
  getDefaultProfilesPath,
} from '../../utils/env.js';
import { saveConfig, isAnalyticsInitialized } from '../../utils/config.js';
import { createWarehouseConnector } from '../../warehouse/connection.js';
import { ContextBuilder } from '../../analytics/context/builder.js';
import { AnalyticsConfig, LLMProvider, CompanyContext } from '../../types.js';
import {
  getModelsForProvider,
  getDefaultModel,
  formatModelOption,
} from '../../analytics/llm/models.js';
import { WebsiteScraper, DbtProjectScanner } from '../../analytics/context/scraper.js';

export const initCommand = new Command('init')
  .description('Initialize analytics agent in a dbt project')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options: { force?: boolean }) => {
    try {
      p.intro('🚀 BlueprintData Analytics Agent');

      const projectPath = process.cwd();

      // Step 1: Validate dbt project
      const s1 = p.spinner();
      s1.start('Validating dbt project');
      const dbtValidation = await validateDbtProject(projectPath);
      if (!dbtValidation.valid) {
        s1.stop('❌ Invalid dbt project');
        throw new Error(dbtValidation.error);
      }
      s1.stop('✓ Valid dbt project detected');

      // Step 2: Check if already initialized
      if (await isAnalyticsInitialized(projectPath)) {
        if (!options.force) {
          throw new Error('Analytics already initialized. Use --force to reinitialize.');
        }
        p.log.warn('Reinitializing (--force flag detected)');
      }

      // Step 3: Get warehouse connection from dbt profiles
      const s3 = p.spinner();
      s3.start('Loading dbt profile');
      let warehouseConnection;
      try {
        warehouseConnection = await getWarehouseConnectionFromDbt(projectPath);
        s3.stop(`✓ Found ${warehouseConnection.type} warehouse configuration`);
      } catch (error) {
        s3.stop('❌ Failed to load dbt profile');
        throw new Error(
          `Failed to load dbt profile: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Step 4: Test warehouse connection
      const s4 = p.spinner();
      s4.start('Testing warehouse connection');
      const connector = await createWarehouseConnector(warehouseConnection);
      const connectionOk = await connector.testConnection();

      if (!connectionOk) {
        s4.stop('❌ Connection failed');
        throw new Error(
          'Failed to connect to warehouse. Please check your dbt profiles.yml credentials.'
        );
      }
      s4.stop('✓ Warehouse connection successful');

      // Step 4b: Ask for dbt target environment
      const dbtTarget = await p.text({
        message: 'dbt target environment (optional):',
        placeholder: 'e.g., prod, dev, staging (leave empty for default)',
      });

      if (p.isCancel(dbtTarget)) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }

      // Step 5: Select LLM provider
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
        // Only Anthropic available
        llmProvider = 'anthropic';
        llmApiKey = anthropicKey;
        p.log.success('Using Anthropic Claude (detected in environment)');
      } else if (openaiKey) {
        // Only OpenAI available
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

      // Step 6: Select LLM models (chat and profiling)
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

      // Step 7: Company context collection
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
          const s6a = p.spinner();
          s6a.start('Scraping websites for company context');
          const scraper = new WebsiteScraper();
          scrapedContent = await scraper.scrapeUrls(websites);
          s6a.stop(`✓ Scraped ${scrapedContent.length} URLs`);
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
      const s6b = p.spinner();
      s6b.start('Scanning dbt project for business terminology');
      const projectScanner = new DbtProjectScanner(projectPath);
      const scanResult = await projectScanner.scanProject();
      s6b.stop(
        `✓ Found ${scanResult.terminology.length} terms, ${scanResult.domains.length} domains`
      );

      const companyContext: CompanyContext = {
        name: companyName || undefined,
        industry: industry || undefined,
        websites,
        scrapedContent: scrapedContent && scrapedContent.length > 0 ? scrapedContent : undefined,
        userContext: userContext || undefined,
        keyMetrics: scanResult.metrics.length > 0 ? scanResult.metrics : undefined,
      };

      // Step 8: Model selection (which models to profile)
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
      // If 'all', leave modelSelection as undefined

      // Step 9: Optional Slack configuration
      const configureSlack = await p.confirm({
        message: 'Configure Slack bot integration?',
        initialValue: false,
      });

      if (p.isCancel(configureSlack)) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }

      let slackBotToken: string | undefined;
      let slackSigningSecret: string | undefined;

      if (configureSlack) {
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

        slackBotToken = botToken;
        slackSigningSecret = signingSecret;
      }

      // Step 10: Save configuration
      const s10 = p.spinner();
      s10.start('Saving configuration');

      const config: AnalyticsConfig = {
        projectPath,
        dbtProfilesPath: getDefaultProfilesPath(),
        dbtTarget: dbtTarget || undefined,
        llmProvider,
        llmApiKey,
        llmModel: chatModel as string,
        llmProfilingModel: profilingModel as string,
        warehouseType: warehouseConnection.type,
        warehouseConnection,
        companyContext: Object.keys(companyContext).length > 0 ? companyContext : undefined,
        modelSelection,
        slackBotToken,
        slackSigningSecret,
        uiPort: 3000,
        gatewayPort: 8080,
      };

      await saveConfig(config, projectPath);
      s10.stop('✓ Configuration saved to .blueprintdata/config.json');

      // Step 11: Build agent context
      const s11 = p.spinner();
      s11.start('Building agent context (this may take a few minutes)');
      const builder = new ContextBuilder({
        projectPath,
        config,
        connector,
        force: options.force,
      });

      await builder.build();
      s11.stop('✓ Agent context created in agent-context/');

      // Close warehouse connection
      await connector.close();

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
