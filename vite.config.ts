import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      '@api': fileURLToPath(new URL('./src/api/index.ts', import.meta.url)),
    },
  },
  build: { outDir: 'dist' },
});
