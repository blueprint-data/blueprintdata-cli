import { Command } from 'commander';
import * as p from '@clack/prompts';
import { loadConfig, isAnalyticsInitialized } from '../../utils/config.js';
import { createWarehouseConnector } from '@blueprintdata/warehouse';
import { ContextBuilder, DbtIntegration } from '@blueprintdata/analytics';

export const syncCommand = new Command('sync')
  .description('Sync agent context with latest dbt models and warehouse schema')
  .option('--force', 'Force full re-sync')
  .option('--profiles-only', 'Only re-profile tables without updating summary/modelling')
  .option('--select <pattern>', 'Sync specific models (comma-separated names or dbt syntax)')
  .option('--target <environment>', 'dbt target environment (prod, dev, etc.)')
  .option('--list-models', 'List available dbt model names and exit')
  .option('--exclude <pattern>', 'Exclude models (not yet implemented)')
  .option('--dry-run', 'Preview changes without updating (not yet implemented)')
  .action(
    async (options: {
      force?: boolean;
      profilesOnly?: boolean;
      select?: string;
      target?: string;
      listModels?: boolean;
      exclude?: string;
      dryRun?: boolean;
    }) => {
      try {
        p.intro('🔄 Syncing Agent Context');

        const projectPath = process.cwd();

        // Check if analytics is initialized
        if (!(await isAnalyticsInitialized(projectPath))) {
          throw new Error("Analytics not initialized. Run 'blueprintdata analytics init' first.");
        }

        // Load configuration
        const s1 = p.spinner();
        s1.start('Loading configuration');
        const config = await loadConfig(projectPath);
        s1.stop('✓ Configuration loaded');

        if (options.listModels) {
          const dbtTarget = options.target || config.dbtTarget;
          const dbtIntegration = new DbtIntegration(projectPath, dbtTarget);
          await dbtIntegration.ensureManifest();
          const models = await dbtIntegration.listModels();

          if (models.length === 0) {
            p.log.warn('No dbt models found. Run `dbt parse` or check your project configuration.');
          } else {
            p.log.info(`Found ${models.length} dbt models:`);
            for (const model of models.sort()) {
              console.log(`- ${model}`);
            }
          }
          p.outro('✅ Model listing complete');
          return;
        }

        // Connect to warehouse
        const s2 = p.spinner();
        s2.start('Connecting to warehouse');
        const connector = await createWarehouseConnector(config.warehouseConnection);
        const connectionOk = await connector.testConnection();

        if (!connectionOk) {
          s2.stop('❌ Connection failed');
          throw new Error('Failed to connect to warehouse');
        }
        s2.stop('✓ Warehouse connection successful');

        // Note about not-yet-implemented features
        if (options.exclude || options.dryRun) {
          p.log.warn('Note: --exclude and --dry-run flags are not yet implemented');
        }

        // Update context
        const s3 = p.spinner();
        const message = options.profilesOnly
          ? 'Re-profiling tables only (this may take a few minutes)'
          : 'Updating agent context (this may take a few minutes)';
        s3.start(message);

        const builder = new ContextBuilder({
          projectPath,
          config,
          connector,
          force: options.force,
        });

        await builder.update({
          force: options.force,
          profilesOnly: options.profilesOnly,
          modelSelection: options.select,
          dbtTarget: options.target || config.dbtTarget,
        });
        s3.stop('✓ Agent context updated');

        // Close warehouse connection
        await connector.close();

        p.outro('✅ Sync completed successfully!');
      } catch (error) {
        if (error instanceof Error) {
          p.log.error(error.message);
        } else {
          p.log.error('An unknown error occurred');
        }
        process.exit(1);
      }
    }
  );
