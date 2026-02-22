import { build } from 'esbuild';
import { mkdirSync, existsSync } from 'fs';
import { chmod, cp, rm } from 'fs/promises';
import path from 'path';

// Ensure dist directory exists
mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  banner: {
    js: '#!/usr/bin/env node',
  },
  sourcemap: true,
  minify: true,
  packages: 'external',
  allowOverwrite: true,
  inject: [],
});

// Set execute permissions
try {
  await chmod('dist/index.js', 0o755);
} catch (error) {
  console.warn('Warning: Could not set execute permissions:', error);
  console.log('Run: chmod +x dist/index.js');
}

const webDistPath = path.join('..', 'web', 'dist');
const cliWebPath = path.join('dist', 'web');

if (existsSync(webDistPath)) {
  try {
    await rm(cliWebPath, { recursive: true, force: true });
    await cp(webDistPath, cliWebPath, { recursive: true });
  } catch (error) {
    console.warn('Warning: Failed to copy web assets into CLI dist:', error);
  }
} else {
  console.warn('Warning: Web app build not found. Run `bun run build:web` first.');
}

console.log('✅ Build complete!');
