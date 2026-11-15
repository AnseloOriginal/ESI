import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: './', // relative paths, so the build works from any folder or subpath (GitHub Pages, Netlify, ...)
  server: { host: '127.0.0.1', port: 5173 },
  // `vite build --mode static` always means "read the pre-exported JSON files, no API server".
  // (No .env file needed, so it can't get lost on upload.)
  define: { 'import.meta.env.VITE_STATIC': JSON.stringify(mode === 'static' ? '1' : '0') },
}));
