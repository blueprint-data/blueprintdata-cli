import { execa } from 'execa';

export const initGit = async (dirPath: string): Promise<boolean> => {
  try {
    await execa('git', ['init'], { cwd: dirPath });
    return true;
  } catch (error) {
    return false;
  }
};

export const gitCommit = async (dirPath: string, message: string): Promise<boolean> => {
  try {
    await execa('git', ['add', '.'], { cwd: dirPath });
    await execa('git', ['commit', '-m', message], { cwd: dirPath });
    return true;
  } catch (error) {
    return false;
  }
};
