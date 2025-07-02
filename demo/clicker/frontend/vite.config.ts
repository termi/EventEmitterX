'use strict';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [ react() ],
    esbuild: { target: 'es2022' },
    define: {
        'globalThis.__BACKEND_PORT__': JSON.stringify(process.env.VITE_BACKEND_PORT || '3001'),
    },
});
