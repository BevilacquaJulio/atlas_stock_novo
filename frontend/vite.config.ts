import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:
          loadEnv(mode, process.cwd(), '').API_PROXY_TARGET ||
          'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test/**',
      ],
      reportsDirectory: './coverage',
    },
  },
}));
