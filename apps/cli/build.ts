import { build, type Plugin } from 'esbuild';
import { mkdirSync } from 'fs';
import { chmod } from 'fs/promises';

// Ensure dist directory exists
mkdirSync('dist', { recursive: true });

// Internal @blueprintdata/* workspace packages are private and never
// published to npm, so they must be bundled into dist/index.js. Everything
// else (third-party npm dependencies) stays external and is resolved from
// the installer's node_modules at runtime, same as before.
const bundleWorkspacePackages: Plugin = {
  name: 'bundle-workspace-packages',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /.*/ }, (args) => {
      if (args.path.startsWith('.') || args.path.startsWith('/')) return;
      if (args.path.startsWith('@blueprintdata/')) return;
      return { path: args.path, external: true };
    });
  },
};

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
  plugins: [bundleWorkspacePackages],
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
