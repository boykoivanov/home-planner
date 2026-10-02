import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` → dist-single/index.html: one self-contained page
// (three.js, exporter, styles and the built-in tile photos all inlined).
// That file can be opened directly in a browser, sent to someone, or uploaded to Claude to republish the artifact.
export default defineConfig(({ mode }) => mode === 'single'
  ? { plugins: [viteSingleFile()], build: { outDir: 'dist-single', copyPublicDir: false } }
  : { base: './' });  // relative paths, so the build works under /home-planner/ on GitHub Pages
