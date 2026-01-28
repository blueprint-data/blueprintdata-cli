import { build } from 'esbuild';
import { mkdirSync } from 'fs';
import { chmod } from 'fs/promises';

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

console.log('✅ Build complete!');
