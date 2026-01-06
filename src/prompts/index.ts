import * as p from '@clack/prompts';
import { StackType, StorageType, ProjectConfig } from '../types.js';
import { promptStackType } from './stack-type.js';
import { promptProjectName } from './project-name.js';
import { promptStorage } from './storage.js';
import { createProject } from '../templates/index.js';

export interface NewProjectOptions {
  projectName?: string;
  stack?: string;
  storage?: string;
}

export const handleNewProject = async (options: NewProjectOptions) => {
  p.intro('Create a new BlueprintData project');

  const stackType: StackType = (options.stack as StackType) || (await promptStackType());

  const projectName = options.projectName || (await promptProjectName());

  const storageType: StorageType = (options.storage as StorageType) || (await promptStorage());

  const config: ProjectConfig = {
    stackType,
    projectName,
    storageType,
    targetDir: `./${projectName}`,
  };

  await createProject(config);

  p.outro('Project created successfully!');
};
