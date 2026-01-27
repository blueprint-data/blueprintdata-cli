import { Command } from 'commander';
import { templateCommand } from './commands/template.js';
import { analyticsCommand } from './commands/analytics/index.js';

export const createCli = () => {
  const program = new Command();

  program
    .name('blueprintdata')
    .description('CLI tool to scaffold data stack projects')
    .version('0.1.0');

  program.addCommand(templateCommand);
  program.addCommand(analyticsCommand);

  return program;
};
