import { Command } from 'commander';
import { templateCommand } from './commands/template.js';
import { analyticsCommand } from './commands/analytics/index.js';
import { authCommand } from './commands/auth/index.js';
import { versionCommand } from './commands/version.js';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersionInfo() {
  const pkgPath = join(__dirname, '../package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  // Check if local development
  let isLocal = false;
  try {
    const realPath = resolve(__dirname);
    if (realPath.includes('blueprintdata-cli') && !realPath.includes('node_modules/.bin')) {
      isLocal = true;
    }
  } catch {
    // Ignore
  }

  return { version: pkg.version, isLocal };
}

export const createCli = () => {
  const { version, isLocal } = getVersionInfo();
  const program = new Command();

  program
    .name('blueprintdata')
    .description('CLI tool to scaffold data stack projects')
    .version(version, '-v, --version', 'Show version number')
    .addHelpText(
      'after',
      `
${isLocal ? '\n🔧 LOCAL DEVELOPMENT VERSION\nRun "bun run verify-local" to check linked packages\n' : ''}`
    );

  program.addCommand(templateCommand);
  program.addCommand(analyticsCommand);
  program.addCommand(authCommand);
  program.addCommand(versionCommand);

  return program;
};
