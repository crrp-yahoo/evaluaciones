import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Las pruebas de integración comparten la misma BD: ejecutarlas en serie.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
})
