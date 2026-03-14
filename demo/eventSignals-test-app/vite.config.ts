'use strict';

import fs from 'node:fs';
import path from 'node:path';

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
    base: process.env.VITE_BASE_URL ?? '/',
    server: {
        fs: {
            allow: [
                './'
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

                    if (id.includes('/modules/EventEmitterX/')
                        // 'cftools/modules/EventEmitterEx' is for backward compatibility
                        || id.includes('/modules/EventEmitterEx/')
                        || id.includes('/modules/events')
                    ) {
                        return 'events';
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
        {
            name: 'remove-vite-json',
            // Turn off internal 'vite:json' plugin
            configResolved(config) {
                const index = config.plugins.findIndex(p => p.name === 'vite:json');

                if (index !== -1) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                    // @ts-ignore TS2551: Property splice does not exist on type readonly Plugin<any>[]. Did you mean slice?
                    config.plugins.splice(index, 1);
                }
            },
        },
        {
            // see [The cost of JavaScript in 2019 / The cost of parsing JSON](https://v8.dev/blog/cost-of-javascript-2019#json)
            // see [Subsume JSON a.k.a. JSON ⊂ ECMAScript/ Embedding JSON into JavaScript programs with JSON.parse](https://v8.dev/features/subsume-json#embedding-json-parse)
            name: 'custom-json-loader',
            enforce: 'pre',

            resolveId(id, importer) {
                if (id.endsWith('.json')) {
                    return path.resolve(importer ? path.dirname(importer) : process.cwd(), id);
                }
            },

            load(id) {
                if (id.endsWith('.json')) {
                    // eslint-disable-next-line unicorn/prefer-json-parse-buffer
                    const raw = fs.readFileSync(id, 'utf8');
                    const json = JSON.parse(raw);
                    /**
                     * Support [Named export](https://vite.dev/guide/features#json)
                     * ```
                     * // import a root field as named exports - helps with tree-shaking!
                     * // import { field } from './example.json'
                     * ```
                     */
                    const parsedKeys = Object.keys(json);
                    const rawString = JSON.stringify(json);
                    // for using not '`', but "'": const escapedString = JSON.stringify(rawString);

                    return {
                        code: `
const __json = JSON.parse(\`${rawString}\`);
export default __json;
${
    parsedKeys
        .map(key => `export const ${key} = __json[${JSON.stringify(key)}];`)
        .join('\n')
}
                        `,
                        map: null,
                    };
                }
            },
        },
    ],
});

