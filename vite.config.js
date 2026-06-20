import { defineConfig } from 'vite';

export default defineConfig({
  base: '/lagoonvalley/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    host: true,
  },
});
