import { TemplateConfig, FetchedTemplate } from '../types.js';
import { downloadTemplate } from 'giget';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { emptyDir } from '../utils/fs.js';
import { LOCAL_TEMPLATE_DIR } from '../constants.js';

export const fetchTemplate = async (config: TemplateConfig): Promise<FetchedTemplate> => {
  const tempDir = path.join(os.tmpdir(), `blueprintdata-${Date.now()}`);

  const branch = config.branch ? `#${config.branch}` : '';
  const templateUrl = `${config.repoUrl}${branch}`;

  const localTemplatePath = path.join(LOCAL_TEMPLATE_DIR, path.basename(config.path));

  if (await fs.pathExists(localTemplatePath)) {
    return { path: localTemplatePath, isTemporary: false };
  }

  try {
    const result = await downloadTemplate(templateUrl, {
      dir: tempDir,
    });

    if (!result.dir || !(await fs.pathExists(result.dir))) {
      throw new Error('Template directory not found after download');
    }

    const templatePath = path.join(result.dir, config.path);

    if (!(await fs.pathExists(templatePath))) {
      throw new Error(`Template path ${config.path} not found in downloaded repository`);
    }

    return { path: templatePath, isTemporary: true };
  } catch (error) {
    await emptyDir(tempDir);

    if (error instanceof Error) {
      throw new Error(`Failed to download template: ${error.message}`);
    }

    throw new Error('Failed to download template: Unknown error');
  }
};
