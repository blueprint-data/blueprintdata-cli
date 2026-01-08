import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  shims: true,
  sourcemap: true,
  target: 'bun',
  platform: 'node',
  banner: {
    js: '#!/usr/bin/env bun',
  },
});
