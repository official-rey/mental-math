import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  test: {
    include: ['tests/**/*.test.ts'],
    // The fs module cache keeps a stale import.meta.glob result when catalog files are added.
    experimental: { fsModuleCache: false },
  },
});
