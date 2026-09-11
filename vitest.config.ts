import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '.',
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: ['src/**/*.mock.ts', 'src/**/index.ts']
    },
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    teardownTimeout: 5_000,
    threads: true,
    maxWorkers: 4,
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  },
  resolve: {
    alias: {
      // Allow extensionless imports to resolve
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
});
