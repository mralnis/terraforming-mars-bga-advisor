import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, cpSync } from 'fs';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: {
    'content/main': 'src/content/main.ts',
    'content/page-bridge': 'src/content/page-bridge.ts',
    'background/service-worker': 'src/background/service-worker.ts',
    'popup/popup': 'src/popup/popup.ts',
  },
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  target: 'chrome120',
  minify: !isWatch,
};

async function build() {
  // Build TypeScript
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
  }

  // Copy static files
  mkdirSync('dist/popup', { recursive: true });
  mkdirSync('dist/styles', { recursive: true });
  mkdirSync('dist/assets', { recursive: true });

  copyFileSync('manifest.json', 'dist/manifest.json');
  copyFileSync('src/popup/popup.html', 'dist/popup/popup.html');
  copyFileSync('src/popup/popup.css', 'dist/popup/popup.css');
  copyFileSync('styles/overlay.css', 'dist/styles/overlay.css');

  try {
    cpSync('assets/icons', 'dist/assets/icons', { recursive: true });
  } catch {}

  console.log('Build complete.');
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
