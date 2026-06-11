/**
 * Dev-only: builds dist-dev/dev-inject-slim.js — the full content pipeline
 * with the card DB swapped for the 16-card slim test set, prefixed with the
 * CSS injector and the page bridge, for inline injection into a live page.
 */
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const slimAlias = {
  name: 'slim-db',
  setup(build) {
    build.onResolve({ filter: /cards-generated\.js$/ }, (args) => ({
      path: path.resolve('src/data/cards-generated.slim.ts'),
    }));
  },
};

await esbuild.build({
  entryPoints: { 'main-slim': 'src/content/main.ts' },
  bundle: true,
  outdir: 'dist-dev',
  format: 'esm',
  minify: true,
  target: 'chrome120',
  plugins: [slimAlias],
});

await esbuild.build({
  entryPoints: { 'page-bridge': 'src/content/page-bridge.ts' },
  bundle: true,
  outdir: 'dist-dev',
  format: 'esm',
  minify: true,
  target: 'chrome120',
});

const css = JSON.stringify(readFileSync('styles/overlay.css', 'utf-8'));
const bridge = readFileSync('dist-dev/page-bridge.js', 'utf-8');
const main = readFileSync('dist-dev/main-slim.js', 'utf-8');

// Each part wrapped in an IIFE — in the real extension these are separate
// scripts in separate worlds; sharing one eval scope here would let their
// minified top-level identifiers collide.
const bundle = `(function(){var st=document.getElementById('tm-advisor-dev-style');if(!st){st=document.createElement('style');st.id='tm-advisor-dev-style';document.head.appendChild(st);}st.textContent=${css};})();
(function(){
${bridge}
})();
(function(){
${main}
})();`;

mkdirSync('dist-dev', { recursive: true });
writeFileSync('dist-dev/dev-inject-slim.js', bundle, 'utf-8');

// base64 + checksum for chunked transport
const b64 = Buffer.from(bundle, 'utf-8').toString('base64');
writeFileSync('dist-dev/dev-inject-slim.b64', b64, 'utf-8');
let sum = 0;
for (let i = 0; i < b64.length; i++) sum = (sum + b64.charCodeAt(i) * (i % 251 + 1)) % 2147483647;
console.log(`bundle bytes: ${bundle.length}, b64 chars: ${b64.length}, checksum: ${sum}`);
