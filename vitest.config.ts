import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: [
      'apps/portfolio/src/**/*.test.tsx',
      'projects/*/app/src/**/*.test.{ts,tsx}',
    ],
    setupFiles: ['./apps/portfolio/src/test-setup.ts'],
    restoreMocks: true,
  },
});
