import { Command } from 'commander';
import { newCommand } from './commands/new.js';

export const createCli = () => {
  const program = new Command();

  program
    .name('blueprintdata')
    .description('CLI tool to scaffold data stack projects')
    .version('0.1.0');

  program.addCommand(newCommand);

  return program;
};
