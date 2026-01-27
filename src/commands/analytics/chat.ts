import { Command } from 'commander';
import { DEFAULT_CONFIG } from '../../config/defaults.js';

export const chatCommand = new Command('chat')
  .description('Start analytics chat interface (UI and/or Slack)')
  .option(
    '--port <port>',
    `UI server port (default: ${DEFAULT_CONFIG.interface.uiPort})`,
    String(DEFAULT_CONFIG.interface.uiPort)
  )
  .option(
    '--gateway-port <port>',
    `Gateway WebSocket port (default: ${DEFAULT_CONFIG.interface.gatewayPort})`,
    String(DEFAULT_CONFIG.interface.gatewayPort)
  )
  .option('--ui-only', 'Start UI interface only (skip Slack)')
  .action(async (options) => {
    try {
      console.log('Analytics chat command - Coming soon!');
      console.log('Options:', options);
      // TODO: Implement in Phase 6
      // - Start gateway server
      // - Start UI server
      // - Open browser
      // - Optionally start Slack bot
    } catch (error) {
      console.error();
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Error: An unknown error occurred');
      }
      console.error();
      process.exit(1);
    }
  });
