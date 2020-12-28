'use strict';

const path = require("node:path");
const fs = require("node:fs");

const hashSum = require('../hashSum.cjs').default;

//  * [Restore cache functionality (default to off)](https://github.com/TypeStrong/ts-node/issues/951)
//  * [Disk caching in transpile-only via new project "typescript-cached-transpile"](https://github.com/TypeStrong/ts-node/issues/908)
//  * [typescript-cached-transpile](https://www.npmjs.com/package/typescript-cached-transpile)
//  * [Дискуссию о восстановлении кеша в `ts-node` прикрыли: "Closing, since --swc is so fast that we can avoid any disk caching complexity."](https://github.com/TypeStrong/ts-node/issues/908#issuecomment-1060214613)

let _tsNode_registered = false;
let _tsNode_last_register_error = void 0;
let _tsNode_handler;
let _tsNode_cacheDir = '.';
// note: If `--experimental-transform-types` provided for nodejs, `require.extensions` will be undefined
const originalJsHandler = require.extensions?.['.js'];
/** @type {'typescript' | 'ttypescript' | '@swc/core'} */
let typescriptCompilerModuleName = 'ttypescript';
const transpileOnly = false;
// https://github.com/cspotcode/personal-monorepo/blob/4bb8542e61bd0939f8a4219831e9f193f5e48b58/packages/typescript-cached-transpile/src/cache.ts#L40-L64
const CACHE_CHECK_CORRUPTED_KEY = '\n// "ts-node" AUTO-loader cache check corrupted key: cc1b66d7-e3c4-4c40-aa8a-fae0bfdcc344';

const ignoreImports = false;
// /** @type {typeof import('../../nodejs/sourceCodeUtils') | undefined} */
// let sourceCodeUtilsModule;
/** @type {typeof import('typescript/lib/typescript.d.ts').ts | undefined} */
let typescript;
/** swc compiler */
let swc;
/** @type {string} */
let compilerVersion;

const _IMPORTS_EXTRACTOR_SCAN_MAX_SYMBOLS = 5000;

/**
 * @private
 */
function _ts_extension_handling(module, filename) {
    _check_tsNode_cacheDir_exists_and_create();

    const cachedFilePath = path.join(_tsNode_cacheDir, `${path.basename(filename, path.extname(filename))}_${hashSum(filename)}.js__cache`);
    const cachedFileInfoPath = path.join(_tsNode_cacheDir, `${path.basename(filename, path.extname(filename))}_${hashSum(filename)}.js__info.json`);
    let fileStats;

    try {
        fileStats = fs.statSync(filename);
    }
    // eslint-disable-next-line unicorn/catch-error-name
    catch (err) {
        // nothing
    }

    if (fileStats) {
        let cachedFileInfo;

        try {
            // Use fs.readFileSync('name.json') instead of require('name.json'), to prevent caching result in require.cache.
            cachedFileInfo = JSON.parse(fs.readFileSync(cachedFileInfoPath).toString());
        }
        // eslint-disable-next-line unicorn/catch-error-name
        catch (err) {
            // _e = e;
            // Ignore error. Just guess the cache is corrupted.
        }

        if (cachedFileInfo
            && cachedFileInfo.mtime_iso === fileStats.mtime.toISOString()
            && cachedFileInfo.transpileOnly === transpileOnly
            // Проверим наличие самого файла (генерация путей могла измениться и старое название не актуальное)
            && fs.existsSync(cachedFilePath)
        ) {
            const __compile = module._compile;

            module._compile = function(_code, fileName) {
                // __content_mode = 2;

                const code = fs.readFileSync(cachedFilePath).toString();

                if (!code.endsWith(CACHE_CHECK_CORRUPTED_KEY)) {
                    // code is corrupted
                    // Это может быть из-за того, что процесс, который писал этот файл неожиданно завершился не успев дописать файл
                    // todo: https://github.com/cspotcode/personal-monorepo/blob/4bb8542e61bd0939f8a4219831e9f193f5e48b58/packages/typescript-cached-transpile/src/cache.ts#L40-L64
                }

                return __compile.call(this, code, fileName);
            };

            return originalJsHandler(module, filename);
        }
    }

    if (!_tsNode_registered) {
        _tsNode_registered = true;

        require.extensions['.ts'] = void 0;

        const useSWCCompiler = typescriptCompilerModuleName === '@swc/core';
        const compilerAbsolutePath = useSWCCompiler
            ? void 0
            // Путь относительно `cftools`, а не относительно проекта в котором запускается eslint
            : require.resolve(typescriptCompilerModuleName)
        ;

        try {
            require('ts-node').register({
                // "swc" быстрее чем "tsc", но требует дополнительных dev-зависимостей.
                // При острой необходимости, можно добавить: `pnpm i -D @swc/core@1.2.143 @swc/helpers@0.3.3`
                swc: useSWCCompiler,
                compiler: compilerAbsolutePath,
                transpileOnly: false,
                compilerOptions: {
                    allowJs: false,
                    // todo: 'ESM' support
                    module: "commonjs",
                    target: "ES2020",
                },
            });

            if (useSWCCompiler) {
                // '@swc/core' уже загружен в память nodejs, достаём из кеша
                swc = require(typescriptCompilerModuleName);
                compilerVersion = swc.version;
            }
            else {
                // 'typescript' / 'ttypescript' уже загружен в память nodejs, достаём из кеша
                typescript = require(typescriptCompilerModuleName);
                compilerVersion = typescript.version;
            }
        }
        catch (err) {
            _tsNode_last_register_error = String(err);

            _tsNode_registered = false;

            throw err;
        }

        _tsNode_handler = require.extensions['.ts'];

        require.extensions['.ts'] = _ts_extension_handling;
    }

    _lockCacheFile(cachedFileInfoPath);

    const __compile = module._compile;

    const detectImportsBeforeSymbol = _IMPORTS_EXTRACTOR_SCAN_MAX_SYMBOLS;
    const detectImportsForThisFile = !ignoreImports && detectImportsBeforeSymbol !== 0;

    if (!typescript) {
        throw new Error(`"typescript" is the only working option for now. Details: ${JSON.stringify({
            typescriptCompilerModuleName,
            detectImportsForThisFile,
            compilerVersion,
            _tsNode_registered,
            _tsNode_last_register_error,
        })}`);
    }

    const importsBeforeCompile = detectImportsForThisFile
        ? typescript.preProcessFile(fs.readFileSync(filename).toString(), true, true)
            .importedFiles.map(file => {
                const { fileName } = file;

                if (fileName.startsWith('node:')) {
                    return;
                }

                return {
                    path: file.fileName,
                };
            }).filter(a => !!a)
        : void 0
    ;

    /**
     * @param {string} code
     * @param {string} filename
     * @private
     */
    module._compile = function(code, filename) {
        let fileStats;

        try {
            fileStats = fs.statSync(filename);
        }
        // eslint-disable-next-line unicorn/catch-error-name
        catch (err) {
            console.error(`[${__filename}]: Can't read file stats for:`, filename);
        }

        if (fileStats) {
            const {
                importsBeforeCompile: _importsBeforeCompile,
                importsAfterCompile,
            } = detectImportsForThisFile
                ? _buildImportsInfo(filename, code, detectImportsBeforeSymbol, importsBeforeCompile)
                : {
                    importsBeforeCompile: [],
                    importsAfterCompile: [],
                }
            ;

            const codeWithCorruptedCheckKey = code + CACHE_CHECK_CORRUPTED_KEY;

            fs.writeFileSync(cachedFilePath, codeWithCorruptedCheckKey);
            fs.writeFileSync(cachedFileInfoPath, JSON.stringify({
                filename,
                mtime_iso: fileStats.mtime.toISOString(),
                transpileOnly,
                detectImportsForThisFile,
                detectImportsBeforeSymbol: ignoreImports ? 0 : detectImportsBeforeSymbol,
                importsBeforeCompile: _importsBeforeCompile || [],
                importsAfterCompile,
                compiler: typescriptCompilerModuleName,
                compilerVersion,
            }));
        }

        return __compile.call(this, code, filename);
    };

    return _tsNode_handler(module, filename);
}

_ts_extension_handling.__is_ts_node_loader = true;

function _lockCacheFile(cachedFilePath) {
    const lockFileName = cachedFilePath + '.lock';

    // console.log('Here would be locking the', lockFileName, 'for', cachedFilePath);
}

/**
 * @param {string} filename
 * @param {string} codeAfterCompile
 * @param {number} detectImportsBeforeSymbol
 * @param {ReturnType<typeof import('../../nodejs/sourceCodeUtils').extractImportsFromSource>} importsBeforeCompile
 * @private
 */
function _buildImportsInfo(filename, codeAfterCompile, detectImportsBeforeSymbol, importsBeforeCompile) {
    if (!(detectImportsBeforeSymbol > 0)) {
        return {
            importsBeforeCompile,
            importsAfterCompile: [],
        };
    }

    const importsAfterCompileMap = /** @type {Object} */Object.create(null);
    const importsAfterCompile = typescript.preProcessFile(codeAfterCompile, true, true)
        .importedFiles.map(file => {
            const { fileName } = file;

            if (fileName.startsWith('node:')) {
                return;
            }

            importsAfterCompileMap[file.fileName] = true;

            return {
                path: file.fileName,
            };
        }).filter(a => !!a)
    ;

    if (importsBeforeCompile) {
        for (const libInfo of importsBeforeCompile) {
            if (importsAfterCompileMap[libInfo.path]) {
                continue;
            }

            // Для каждой зависимости, которая отсутствует в итоговом файле, запросим её дату последнего изменения
            {
                const dirname = path.dirname(filename);
                let resolveError1;
                let resolveError2;
                let fullPath;

                try {
                    fullPath = require.resolve(libInfo.path + '.d.ts', { paths: [ dirname ] });
                    libInfo["isDefinitionFile"] = true;
                }
                catch (err) {
                    resolveError1 = err;

                    try {
                        fullPath = require.resolve(libInfo.path, { paths: [ dirname ] });
                    }
                    catch (err) {
                        resolveError2 = err;
                    }
                }

                if (fullPath) {
                    // require.resolve('node:fs') === 'node:fs'
                    if (fullPath !== libInfo.path) {
                        try {
                            const fileStats = fs.statSync(fullPath);

                            libInfo["fullPath"] = fullPath;
                            libInfo["mtime_iso"] = fileStats.mtime.toISOString();
                        }
                        catch (err) {
                            libInfo["_statSync_fileStats_error"] = String(err.message || err);
                        }
                    }
                }
                else {
                    libInfo["_resolve_fullPath_error1"] = resolveError1 && String(resolveError1.message || resolveError1) || void 0;
                    libInfo["_resolve_fullPath_error2"] = resolveError2 && String(resolveError2.message || resolveError2) || void 0;
                }
            }
        }
    }

    return {
        importsBeforeCompile,
        importsAfterCompile,
    };
}

let _was__check_tsNode_cacheDir_exists_and_create = false;

function _check_tsNode_cacheDir_exists_and_create() {
    if (_was__check_tsNode_cacheDir_exists_and_create) {
        return;
    }

    _was__check_tsNode_cacheDir_exists_and_create = true;

    fs.mkdirSync(_tsNode_cacheDir, { recursive: true });
}

function detectIsRunningWithNativeTypeScriptSupport() {
    const { execArgv = [], env = {} } = process;
    const { NODE_OPTIONS = '' } = env;

    return execArgv.includes('--experimental-transform-types') || NODE_OPTIONS.includes('--experimental-transform-types');
}

/**
 *
 * Функция подключит 'ts-node' только по необходимости, если в кеше нет соответствующих файлов.
 * @param {string=} cacheDirName
 * @param {('typescript' | 'ttypescript' | '@swc/core')=} compilerModuleName
 */
function registerTSNodeAutoLoader({
    cacheDirName = './build_cache/ts-node/',
    compilerModuleName = typescriptCompilerModuleName,
} = {}) {
    if (detectIsRunningWithNativeTypeScriptSupport()) {
        // Using Native NodeJS TypeScript support
        console.log('Using Native NodeJS TypeScript support');

        return;
    }

    if (path.isAbsolute(cacheDirName)) {
        _tsNode_cacheDir = cacheDirName;
    }
    else {
        _tsNode_cacheDir = path.resolve(cacheDirName);
    }

    if (compilerModuleName) {
        typescriptCompilerModuleName = compilerModuleName;
    }

    const _existed_ts_extension = require.extensions['.ts'];

    if (_existed_ts_extension) {
        if (_existed_ts_extension === _ts_extension_handling
            || _existed_ts_extension.__is_ts_node_loader
        ) {
            return;
        }

        if (_tsNode_handler && _existed_ts_extension === _tsNode_handler) {
            return;
        }

        throw new Error(`${__filename}~${registerTSNodeAutoLoader.name}: handler for '.ts' extension is already defined`);
    }

    _ts_extension_handling.__prev = _existed_ts_extension;

    // todo: add '.tsx' support
    require.extensions['.ts'] = _ts_extension_handling;
}

function unregisterTSNodeAutoLoader(throwError = true) {
    if (require.extensions['.ts'] === _ts_extension_handling) {
        if (_ts_extension_handling.__prev) {
            require.extensions['.ts'] = _ts_extension_handling.__prev;
        }
        else {
            require.extensions['.ts'] = void 0;
        }
    }
    else {
        const messageText = `Can't "unregisterTSNodeAutoLoader" due current require.extensions['.ts'] is not from "registerTSNodeAutoLoader"`;

        if (throwError) {
            throw new Error(messageText);
        }
        else {
            console.warn(messageText);
        }
    }
}

// noinspection JSUnusedGlobalSymbols
module.exports = {
    registerTSNodeAutoLoader,
    unregisterTSNodeAutoLoader,
};
