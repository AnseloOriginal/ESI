import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths, so the build works from any folder or subpath (GitHub Pages, Netlify, ...)
  server: { host: '127.0.0.1', port: 5173 },
});
