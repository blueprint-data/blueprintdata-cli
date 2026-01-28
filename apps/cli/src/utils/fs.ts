import fs from 'fs-extra';
import path from 'path';

export const ensureDir = async (dirPath: string) => {
  await fs.ensureDir(dirPath);
};

export const copyDir = async (src: string, dest: string, ignore?: string[]) => {
  await fs.copy(src, dest, {
    filter: (srcPath) => {
      if (!ignore) return true;
      const relativePath = path.relative(src, srcPath);
      return !ignore.some((pattern) => relativePath.includes(pattern));
    },
  });
};

export const readFile = async (filePath: string): Promise<string> => {
  return await fs.readFile(filePath, 'utf-8');
};

export const writeFile = async (filePath: string, content: string) => {
  await fs.writeFile(filePath, content, 'utf-8');
};

export const replaceInFile = async (
  filePath: string,
  replacements: Record<string, string>
): Promise<void> => {
  const content = await readFile(filePath);
  let updatedContent = content;
  for (const [placeholder, value] of Object.entries(replacements)) {
    updatedContent = updatedContent.replace(new RegExp(placeholder, 'g'), value);
  }
  await writeFile(filePath, updatedContent);
};

export const replaceInDir = async (
  dirPath: string,
  replacements: Record<string, string>
): Promise<void> => {
  const files = await fs.readdir(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await replaceInDir(filePath, replacements);
    } else {
      await replaceInFile(filePath, replacements);
    }
  }
};

export const removeDir = async (dirPath: string) => {
  await fs.remove(dirPath);
};

export const emptyDir = async (dirPath: string) => {
  await fs.emptyDir(dirPath);
};
