import { Command } from 'commander';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersionInfo() {
  // Read CLI package.json
  const cliPackagePath = join(__dirname, '../package.json');
  const cliPackage = JSON.parse(readFileSync(cliPackagePath, 'utf8'));

  // Get installation path
  let installPath = __dirname;
  let isLocal = false;
  let isLinked = false;

  try {
    // Check if this is a symlink
    const realPath = resolve(__dirname);
    if (realPath !== __dirname) {
      isLinked = true;
      installPath = realPath;
    }

    // Check if it's in the development directory
    if (installPath.includes('blueprintdata-cli') && !installPath.includes('node_modules')) {
      isLocal = true;
    }
  } catch {
    // Not a symlink
  }

  return {
    version: cliPackage.version,
    name: cliPackage.name,
    installPath,
    isLocal,
    isLinked,
  };
}

export const versionCommand = new Command('version')
  .description('Show detailed version information')
  .option('--verbose', 'Show verbose version info')
  .action((options) => {
    const info = getVersionInfo();

    console.log('\n📦 BlueprintData CLI');
    console.log(`   Version: ${info.version}`);
    console.log(`   Path: ${info.installPath}`);

    if (info.isLocal) {
      console.log('   ✅ LOCAL DEVELOPMENT VERSION');
      console.log('   Changes will reflect after rebuild: bun run build:packages');
    } else if (info.isLinked) {
      console.log('   🔗 LINKED VERSION');
    } else {
      console.log('   📥 NPM INSTALLED VERSION');
    }

    if (options.verbose) {
      console.log('\n📋 Package Details:');
      console.log(`   Name: ${info.name}`);
      console.log(`   Full Path: ${info.installPath}`);
    }

    console.log();
  });
