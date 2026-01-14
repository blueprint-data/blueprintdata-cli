import { Command } from 'commander';
import { handleNewProject } from '../prompts/index.js';

export const newCommand = new Command('new')
  .description('Create a new BlueprintData project')
  .argument('[project-name]', 'Name of the project')
  .option('--stack <type>', 'Stack type (lite, lite-postgres, aws)')
  .option('--storage <type>', 'Storage type (postgres, bigquery)')
  .action(async (projectName: string | undefined, options) => {
    try {
      await handleNewProject({ projectName, ...options });
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
