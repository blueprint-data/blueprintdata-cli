import * as p from '@clack/prompts';
import fs from 'fs-extra';
import { ProjectConfig } from '../types.js';
import {
  TEMPLATE_MAPPINGS,
  STORAGE_DISPLAY_NAMES,
  README_NEXT_STEPS,
  PLACEHOLDERS,
} from '../constants.js';
import { fetchTemplate } from './fetcher.js';
import { processTemplate } from './processor.js';
import { logger, logNextSteps } from '../utils/logger.js';
import { initGit } from '../utils/git.js';

const { PROJECT_NAME, STORAGE_TYPE, STORAGE_DISPLAY_NAME } = PLACEHOLDERS;

export const createProject = async (config: ProjectConfig) => {
  const spinner = p.spinner();
  let templatePath: string | null = null;

  try {
    spinner.start('Downloading template...');

    const templateConfig = TEMPLATE_MAPPINGS[config.stackType];
    templatePath = await fetchTemplate(templateConfig);

    spinner.stop('Template downloaded');

    spinner.start('Processing template...');

    const storageDisplayName = STORAGE_DISPLAY_NAMES[config.storageType];

    await processTemplate(templatePath, config.targetDir, {
      [PROJECT_NAME]: config.projectName,
      [STORAGE_TYPE]: config.storageType,
      [STORAGE_DISPLAY_NAME]: storageDisplayName,
    });

    spinner.stop('Template processed');

    spinner.start('Initializing git repository...');

    const gitInitSuccess = await initGit(config.targetDir);

    if (gitInitSuccess) {
      spinner.stop('Git repository initialized');
    } else {
      spinner.stop('Git initialization skipped (git not available)');
    }

    console.log();
    logger.success(`Project created at ${config.targetDir}`);
    console.log();

    logNextSteps(README_NEXT_STEPS, config.projectName);
  } catch (error) {
    spinner.stop('Error creating project');

    if (templatePath && (await fs.pathExists(templatePath))) {
      try {
        await fs.remove(templatePath);
      } catch {
        // Ignore cleanup errors
      }
    }

    if (await fs.pathExists(config.targetDir)) {
      try {
        await fs.remove(config.targetDir);
      } catch {
        // Ignore cleanup errors
      }
    }

    if (error instanceof Error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    throw new Error('Failed to create project: Unknown error');
  }
};
