import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,mjs,cjs,ts,mts,cts}'],
    exclude: ['tests/**/*.spec.{js,mjs,cjs,ts,mts,cts}'],
    environment: 'jsdom',
  },
});
