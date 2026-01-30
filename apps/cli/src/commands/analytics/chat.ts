import { Command } from 'commander';
import { DEFAULT_CONFIG } from '@blueprintdata/config';
import { ChatService } from '../../services/analytics/ChatService';
import { logger } from '../../utils/logger';

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
  .option('--no-open', 'Do not open browser automatically')
  .action(async (options) => {
    try {
      const chatService = new ChatService({
        uiPort: parseInt(options.port),
        gatewayPort: parseInt(options.gatewayPort),
        noOpen: options.noOpen,
      });

      await chatService.start();
    } catch (error) {
      logger.error('Chat command failed: ' + error);
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Error: An unknown error occurred');
      }
      process.exit(1);
    }
  });
