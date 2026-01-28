#!/usr/bin/env node
/**
 * Verify Local Development Version
 *
 * This script checks if you're using the locally linked version
 * and shows detailed version information.
 */

import { execSync } from 'child_process';
import { readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGES = [
  '@blueprintdata/models',
  '@blueprintdata/errors',
  '@blueprintdata/config',
  '@blueprintdata/warehouse',
  '@blueprintdata/analytics',
  '@blueprintdata/gateway',
  'blueprintdata-cli',
];

function getPackageInfo(packageName) {
  try {
    // Try to resolve the package
    const packagePath = require.resolve(`${packageName}/package.json`, {
      paths: [process.cwd(), join(process.cwd(), 'node_modules')],
    });

    const packageDir = dirname(packagePath);
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    const stats = statSync(packageDir);

    // Check if it's a symlink (linked package)
    const isSymlink = (() => {
      try {
        const realPath = resolve(packageDir);
        return realPath !== packageDir;
      } catch {
        return false;
      }
    })();

    // Get real path if symlinked
    let realPath = packageDir;
    try {
      realPath = resolve(packageDir);
    } catch {
      // Not a symlink
    }

    return {
      name: packageName,
      version: pkg.version,
      path: packageDir,
      realPath: realPath,
      isSymlink: isSymlink,
      isLocal: realPath.includes('blueprintdata-cli') || realPath.includes('.bun/install'),
      lastModified: stats.mtime,
    };
  } catch (error) {
    return {
      name: packageName,
      error: error.message,
      notFound: true,
    };
  }
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}

function main() {
  console.log('\n🔍 BlueprintData Local Development Verification\n');
  console.log('='.repeat(70));

  let allLocal = true;
  let anyLinked = false;

  for (const packageName of PACKAGES) {
    const info = getPackageInfo(packageName);

    console.log(`\n📦 ${info.name}`);

    if (info.notFound) {
      console.log('   ❌ Not installed');
      allLocal = false;
      continue;
    }

    if (info.error) {
      console.log(`   ❌ Error: ${info.error}`);
      allLocal = false;
      continue;
    }

    console.log(`   Version: ${info.version}`);
    console.log(`   Path: ${info.path}`);

    if (info.isSymlink) {
      console.log(`   Real Path: ${info.realPath}`);
      anyLinked = true;
    }

    if (info.isLocal) {
      console.log('   ✅ Using LOCAL version (linked)');
      console.log(`   Last Modified: ${formatDate(info.lastModified)}`);
    } else {
      console.log('   ⚠️  Using NPM version (not linked)');
      allLocal = false;
    }
  }

  console.log('\n' + '='.repeat(70));

  if (allLocal && anyLinked) {
    console.log('\n✅ All packages are using LOCAL linked versions!');
    console.log('   You are in development mode. Changes will reflect after rebuild.');
  } else if (anyLinked) {
    console.log('\n⚠️  Some packages are using NPM versions, not local linked versions.');
    console.log('   Run: bun run link');
  } else {
    console.log('\n❌ No packages are linked. Using NPM versions only.');
    console.log('   Run: bun run local-install');
  }

  console.log('\n💡 Tips:');
  console.log('   - After making changes, rebuild: bun run build:packages');
  console.log('   - To check for updates: bun run verify-local');
  console.log('   - To relink: bun run unlink && bun run link');
  console.log();
}

main();
