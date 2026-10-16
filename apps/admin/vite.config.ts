import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
  build: { sourcemap: true, target: 'es2022' },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], testTimeout: 20_000 },
});
