'use strict';

import * as module from "node:module";

export function createPrebuildPlugin({ projectRoot }: { projectRoot: string }) {
    return {
        name: "rebuild",
        buildStart() {
            // cache.clear();
        },
        // // https://vite.dev/guide/api-plugin#handlehotupdate
        // handleHotUpdate(params) {
        //     const { file, modules } = params;
        //     const short_modules = modules.map(module => {
        //         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //         // @ts-expect-error
        //         const importers = [ ...(module["importers"] || []) ].map(a => a.id);
        //         // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //         // // @ts-expect-error
        //         // const clientImportedModules = [ ...(module["clientImportedModules"] || []) ].map(a => a.id);
        //         // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        //         // @ts-ignore
        //         const staticImportedUrls = [ ...(module["staticImportedUrls"] || []) ];
        //
        //         return {
        //             url: module.url,
        //             id: module.id,
        //             file: module.file,
        //             importers: JSON.stringify(importers),
        //             // clientImportedModules: JSON.stringify(clientImportedModules),
        //             staticImportedUrls: JSON.stringify(staticImportedUrls),
        //         };
        //     });
        //
        //     console.log({ file, short_modules: short_modules });
        //
        //     // return modules;
        // },
        async transform(code: string, file: string) {
            if (!file.includes('.prebuild.')) {
                return;
            }

            const babel = await import('@babel/core');

            // Настройки Babel для конвертации ES модулей в CommonJS
            const babelOptions = {
                presets: [
                    [
                        '@babel/preset-env', {
                            targets: {
                                node: 'current',
                            },
                            modules: 'commonjs', // Важно: конвертируем модули в CommonJS
                        },
                    ],
                ],
                sourceMaps: false,
                filename: file,
            };

            // Выполняем транспиляцию
            const codeCommonjs: string = babel.transformSync(code, babelOptions).code;

            const vm = await import('node:vm');
            const context = {
                __proto__: null,
                exports: {},
                require: module.createRequire(__filename),
                console: console,
                ...globalThis,
            };

            if (!context.globalThis) {
                context.globalThis = context.global || globalThis;
            }

            vm.runInNewContext(codeCommonjs, vm.createContext(context));

            const moduleFromCode = context.exports;
            const { onBuild } = moduleFromCode;

            if (!onBuild) {
                return;
            }

            const onBuildResult: {
                beforeCode: string,
                afterCode: string,
            } = await onBuild({
                projectRoot,
                thisFilepath: file,
            });

            // console.log(onBuildResult);

            let resultCode = `${onBuildResult.beforeCode || ''}\n`;
            const keys: string[] = [];

            for (const key of Object.keys(moduleFromCode)) {
                if (key === 'onBuild') {
                    continue;
                }

                let value = moduleFromCode[key];

                if (typeof value === 'function') {
                    continue;
                }

                keys.push(key);

                if (!(value || value === 0)) {
                    value = '';
                }

                resultCode += `\nconst ${key} = ${JSON.stringify(value)};`;
            }

            resultCode += `\nexport { ${keys.join(', ')} };`;

            if (onBuildResult.afterCode) {
                resultCode += `\n${onBuildResult.afterCode}`;
            }

            return resultCode;
        },
    };
}
