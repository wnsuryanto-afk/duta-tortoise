import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Konfigurasi test terpisah dari vite.config.js supaya plugin Base44
// (proxy, HMR notifier, visual edit agent) tidak ikut dimuat saat test.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
