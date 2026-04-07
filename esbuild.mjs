import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const extensionConfig = {
  entryPoints: ['src/extension/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode', 'typescript'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
};

const rendererConfig = {
  entryPoints: ['src/renderer/index.ts'],
  bundle: true,
  outfile: 'out/renderer.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: false,
};

if (isWatch) {
  const [extCtx, rendCtx] = await Promise.all([
    esbuild.context(extensionConfig),
    esbuild.context(rendererConfig),
  ]);
  await Promise.all([extCtx.watch(), rendCtx.watch()]);
  console.log('Watching for changes...');
} else {
  await Promise.all([
    esbuild.build(extensionConfig),
    esbuild.build(rendererConfig),
  ]);
  console.log('Build complete.');
}
