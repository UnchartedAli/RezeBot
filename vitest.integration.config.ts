import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    hookTimeout: 60_000,
    testTimeout: 60_000,
    teardownTimeout: 10_000
  },
});
