import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
    plugins: [react()],
    test: {
        name: 'frontend',
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/tests/setup.ts'],
        css: false,
        include: ['src/tests/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/tests/**', 'src/main.tsx', 'src/vite-env.d.ts'],
        },
    },
    define: {
        'globalThis.__BACKEND_PORT__': JSON.stringify('3001'),
    },
    resolve: {
        alias: {
            // Позволяет резолвить пути с верхнего уровня монорепо
            '@root': path.resolve(__dirname, '..'),
        },
    },
});

