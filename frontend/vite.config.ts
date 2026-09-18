/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3001' },
  },
  test: {
    // Component-level tests run under jsdom because they exercise DOM APIs
    // and event dispatching. Playwright still owns full-browser flows.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testing/setup.ts'],
    // Only pick up test files under src/, not the tests/e2e Playwright suite.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '../tests/**'],
    css: false,
  },
});
