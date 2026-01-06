import { copyDir, replaceInDir, removeDir } from '../utils/fs.js';
import { IGNORED_DIRS } from '../constants.js';

interface ProcessOptions {
  [key: string]: string;
}

export const processTemplate = async (
  sourceDir: string,
  targetDir: string,
  replacements: ProcessOptions
): Promise<void> => {
  await copyDir(sourceDir, targetDir, IGNORED_DIRS);
  await replaceInDir(targetDir, replacements);
  await removeDir(sourceDir);
};
