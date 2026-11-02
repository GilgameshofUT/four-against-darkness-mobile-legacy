import { defineConfig } from 'vitest/config'

// Isolated test config — keeps the PWA plugin out of the test run.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
