import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy de la API en desarrollo para evitar CORS y cookies cross-site.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Los specs E2E (Playwright) se ejecutan con `npm run e2e`, no con Vitest.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
