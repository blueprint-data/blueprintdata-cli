import validate from 'validate-npm-package-name';
import path from 'path';
import fs from 'fs-extra';

export const validateProjectName = (name: string): { valid: boolean; error?: string } => {
  const result = validate(name);

  if (!result.validForNewPackages) {
    const errors = result.errors || [];
    const warnings = result.warnings || [];
    return {
      valid: false,
      error: [...errors, ...warnings].join(', '),
    };
  }

  return { valid: true };
};

export const validateDirExists = async (dirPath: string): Promise<boolean> => {
  try {
    return await fs.pathExists(dirPath);
  } catch {
    return false;
  }
};

export const validateNonEmptyDir = async (dirPath: string): Promise<boolean> => {
  try {
    const exists = await fs.pathExists(dirPath);
    if (!exists) return false;
    const files = await fs.readdir(dirPath);
    return files.length > 0;
  } catch {
    return false;
  }
};

/**
 * Validate that we're in a dbt project directory
 */
export const validateDbtProject = async (
  projectPath: string = process.cwd()
): Promise<{ valid: boolean; error?: string }> => {
  const dbtProjectPath = path.join(projectPath, 'dbt_project.yml');

  if (!(await fs.pathExists(dbtProjectPath))) {
    return {
      valid: false,
      error: 'dbt_project.yml not found. Please run this command in a dbt project directory.',
    };
  }

  // Check if dbt_project.yml is valid YAML
  try {
    const yaml = await import('yaml');
    const content = await fs.readFile(dbtProjectPath, 'utf-8');
    const project = yaml.parse(content);

    if (!project || typeof project !== 'object') {
      return {
        valid: false,
        error: 'dbt_project.yml is not a valid YAML file.',
      };
    }

    // Check for required fields
    if (!project.name) {
      return {
        valid: false,
        error: 'dbt_project.yml is missing required field: name',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to parse dbt_project.yml: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Validate that dbt models directory exists
 */
export const validateDbtModels = async (
  projectPath: string = process.cwd()
): Promise<{ valid: boolean; error?: string }> => {
  const modelsPath = path.join(projectPath, 'models');

  if (!(await fs.pathExists(modelsPath))) {
    return {
      valid: false,
      error: 'models/ directory not found in dbt project.',
    };
  }

  return { valid: true };
};
