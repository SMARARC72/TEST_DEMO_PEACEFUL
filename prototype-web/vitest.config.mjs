import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['tests/**/*.test.{js,mjs,cjs,ts,mts,cts,tsx}'],
    exclude: ['tests/**/*.spec.{js,mjs,cjs,ts,mts,cts}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'threads',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/mocks/**', 'src/**/*.d.ts'],
      // Note: Coverage targets are documented in PRD Phase 3.
      // Thresholds temporarily relaxed; will be enforced incrementally.
      thresholds: {
        // 'src/api/**': { lines: 80, branches: 70 },
        // 'src/stores/**': { lines: 80, branches: 70 },
        // 'src/hooks/**': { lines: 80, branches: 70 },
        // 'src/pages/**': { lines: 60, branches: 50 },
      },
    },
  },
});
