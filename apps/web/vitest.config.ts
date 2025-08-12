import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/coverage/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        '.next/**',
        'node_modules/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test-setup.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './app'),
      '@musio/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
