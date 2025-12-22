'use strict';

/*
import * as ts from 'typescript';
import { ModuleKind } from 'typescript';
import { vitePluginTypescriptTransform } from 'vite-plugin-typescript-transform';
import typescript2 from 'rollup-plugin-typescript2';
*/
import { defineConfig } from 'vite';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import reactPlugin from '@vitejs/plugin-react';

import { createPrebuildPlugin } from './dev/vite/plugins/prebuild.vite';
import { createCSSHotReloadConfirmPlugin } from "./dev/vite/plugins/cssHotReloadConfirm.vite";

// Подменяем esbuild компилятор TypeScript на настоящий typescript.
/*
На данный момент [02.10.2024] это не особо полезно и может быть закомментировано (весь этот файл), но в будущем
 это позволит добавить полноценную поддержку TypeScript, а не кастрированную как в esbuild (но для этого, нужно
 переписать 'vite-plugin-typescript-transform' чтобы он использовал не ts.transpileModule (в котором принудительно
 включен isolatedModules
*/
export default defineConfig({
    server: {
        fs: {
            allow: [
                './',
                import.meta.resolve('cftools'),
            ],
        },
    },
    // ...your vite configuration
    build: {
        rollupOptions: {
            treeshake: 'recommended',
            output: {
                manualChunks(id: string) {
                    if (id.includes('react')) {
                        return 'react';
                    }

                    if (id.includes('cftools')) {
                        console.log(id);
                    }

                    if (id.includes('/modules/EventEmitterX/')
                        // 'cftools/modules/EventEmitterEx' is for backward compatibility
                        || id.includes('/modules/EventEmitterEx/')
                        || id.includes('/modules/events')
                    ) {
                        return 'events';
                    }

                    if (id.includes('/cftools/')) {
                        return 'cftools';
                    }

                    if (id.includes('/node_modules/')) {
                        return 'vendor';
                    }

                    return null;
                },
            },
        },
    },
    css: {
        modules: {
            localsConvention: 'camelCase', // или 'dashes'
            generateScopedName: '[local]',
            // generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
    },
    plugins: [
        reactPlugin({
            // Включить fast refresh
            fastRefresh: true,
        }),
        /*
        {
            ...typescript2({
                typescript: ts,
            }),
            apply: 'build',
        },
        vitePluginTypescriptTransform({
            enforce: 'pre',
            filter: {
                files: {
                    include: /\.ts(x)?$/,
                },
            },
            tsconfig: {
                override: {
                    target: ts.ScriptTarget.ES2022,
                    module: ModuleKind.ESNext,
                },
            },
        }),
        */
        createCSSHotReloadConfirmPlugin(),
        createPrebuildPlugin({ projectRoot: __dirname }),
    ],
});

