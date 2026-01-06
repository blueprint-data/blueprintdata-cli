import * as p from '@clack/prompts';
import { validateProjectName } from '../utils/validation.js';
import * as fs from 'fs-extra';

export const promptProjectName = async (): Promise<string> => {
  const projectName = await p.text({
    message: 'Enter project name',
    validate: (value) => {
      if (!value) {
        return 'Project name is required';
      }

      const validation = validateProjectName(value);
      if (!validation.valid) {
        return validation.error;
      }

      const dirExists = fs.existsSync(`./${value}`);
      if (dirExists) {
        const files = fs.readdirSync(`./${value}`);
        if (files.length > 0) {
          return 'Directory already exists and is not empty';
        }
      }

      return undefined;
    },
    defaultValue: 'my-data-project',
  });

  if (p.isCancel(projectName)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  return projectName;
};
