'use strict';

// import ts from 'typescript';
import { defineConfig } from 'vite';
// todo: Ни vitePluginTypescriptTranspile, ни vitePluginTypescriptTransform не работают как надо, потому что
//  компилируют файлы по-одному, а значит, что TypeScript не может использовать фичи, которые требуют доступа ко всем
//  файлам. Такие как: inline const enum и проверка типов.
// import { vitePluginTypescriptTranspile } from 'vite-plugin-typescript-transpile';
// import { vitePluginTypescriptTransform } from 'vite-plugin-typescript-transform';

import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        //todo: Не работает, нужно писать свой плагин, который будет запускать tsx (tsgo?) и кешировать результат
        // vitePluginTypescriptTranspile({ compilerOverrides: { target: "es2022", module: "esnext" } }),
        // vitePluginTypescriptTransform({
        //     enforce: 'pre',
        //     filter: {
        //         files: {
        //             include: /\.ts$/,
        //         },
        //     },
        //     tsconfig: {
        //         override: {
        //             module: ts.ModuleKind.ESNext,
        //             target: ts.ScriptTarget.ES2021,
        //         },
        //     },
        // }),
    ],
    esbuild: { target: 'es2022' },
    define: {
        'globalThis.__BACKEND_PORT__': JSON.stringify(process.env.VITE_BACKEND_PORT || '3001'),
    },
});
