#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from 'fs';

mkdirSync('dist', { recursive: true });

const result = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  naming: 'index.js',
  target: 'node',
  minify: true,
  sourcemap: 'linked',
  external: ['giget'],
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

const output = readFileSync('dist/index.js', 'utf-8');
writeFileSync('dist/index.js', `#!/usr/bin/env node\n${output}`);

console.log('✅ Build complete!');
