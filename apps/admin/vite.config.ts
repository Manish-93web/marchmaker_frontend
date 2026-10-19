import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Listen on every address so the console can be opened at http://127.0.0.1:5174, which keeps its sign-in cookies apart from the member site on localhost.
    host: true,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
  build: { sourcemap: true, target: 'es2022' },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], testTimeout: 20_000 },
});
