import validate from 'validate-npm-package-name';

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

export const validateDirExists = async (path: string): Promise<boolean> => {
  try {
    const fs = await import('fs-extra');
    return await fs.pathExists(path);
  } catch {
    return false;
  }
};

export const validateNonEmptyDir = async (path: string): Promise<boolean> => {
  try {
    const fs = await import('fs-extra');
    const exists = await fs.pathExists(path);
    if (!exists) return false;
    const files = await fs.readdir(path);
    return files.length > 0;
  } catch {
    return false;
  }
};
