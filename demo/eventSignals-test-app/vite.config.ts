'use strict';

import * as ts from 'typescript';
import { ModuleKind } from 'typescript';
import { defineConfig } from 'vite';
import { vitePluginTypescriptTransform } from 'vite-plugin-typescript-transform';
import typescript2 from 'rollup-plugin-typescript2';

// Подменяем esbuild компилятор TypeScript на настоящий typescript.
/*
На данный момент [02.10.2024] это не особо полезно и может быть закомментировано (весь этот файл), но в будущем
 это позволит добавить полноценную поддержку TypeScript, а не кастрированную как в esbuild (но для этого, нужно
 переписать 'vite-plugin-typescript-transform' чтобы он использовал не ts.transpileModule (в котором принудительно
 включен isolatedModules
*/
export default defineConfig({
    // ...your vite configuration
    plugins: [
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
    ],
});
