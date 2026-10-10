import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // the examples import the kit by its package name; in tests that is the source
  resolve: { alias: { 'kwartz-showcase': path.resolve('src/index.ts') } },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // every test starts from clean mocks and real timers
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html'],
    },
  },
})
