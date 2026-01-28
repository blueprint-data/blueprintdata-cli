import { Command } from 'commander';
import { initCommand } from './init.js';
import { syncCommand } from './sync.js';
import { chatCommand } from './chat.js';

export const analyticsCommand = new Command('analytics')
  .description('Analytics agent for dbt modeling and data analysis')
  .addCommand(initCommand)
  .addCommand(syncCommand)
  .addCommand(chatCommand);
