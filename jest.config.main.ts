'use strict';

import type { InitialOptionsTsJest, TsJestGlobalOptions } from 'ts-jest/dist/types';
import type { Config as JestConfig } from './node_modules/@jest/types';

import { TIME } from "./utils/time";
import { joinPath } from './_dev/util/pathUtils';

import 'termi@polyfills';

require('./_dev/jest/jestProcess_onCreate');
require('./_dev/jest/jestProcess_BufferedConsole');

type ExtendedGlobalThis = typeof globalThis & {
    /** setup custom cache dir */
    __CACHE_ROOT__?: string | undefined,
    /** turn on JSDOM env */
    __USE_JSDOM__?: boolean | undefined,
    /** turn on React and jsx support */
    __USE_REACT__?: boolean | undefined,
};

const cacheDirRoot = String((globalThis as ExtendedGlobalThis).__CACHE_ROOT__ || '');
const isInWebStormDebuggerMode = !!process.env["JB_IDE_HOST"] || !!process.env["JB_IDE_PORT"];
const isUseReact = (globalThis as ExtendedGlobalThis).__USE_REACT__ === true;
const isUseJSDOM = (globalThis as ExtendedGlobalThis).__USE_JSDOM__ === true
    || ((globalThis as ExtendedGlobalThis).__USE_JSDOM__ !== false && isUseReact)
;
// Добавил это, чтобы DOM API работала в тестах. Возможно, это повлияет как-то на nodejs-специфические тесты - это ещё нужно проверить.
const testEnvironment = isUseJSDOM ? 'jsdom' : void 0;
const TEST_DEFAULT_TIMEOUT_INTERVAL = isInWebStormDebuggerMode
    ? TIME.MINUTES_5
    : TIME.SECONDS_5
;

process.env["TEST_DEFAULT_TIMEOUT_INTERVAL"] = String(TEST_DEFAULT_TIMEOUT_INTERVAL);

if (isUseReact) {
    /**
     * * [How to Upgrade to React 18 / Configuring Your Testing Environment](https://react.dev/blog/2022/03/08/react-18-upgrade-guide#configuring-your-testing-environment)
     * * [React / Test Utilities / act()](https://legacy.reactjs.org/docs/test-utils.html#act)
     * * [testing-library / issues / The current testing environment is not configured to support act(...) with vitest and React 18](https://github.com/testing-library/react-testing-library/issues/1061)
     */
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean })["IS_REACT_ACT_ENVIRONMENT"] = true;
}

//todo: load 'tsconfig.json' with comment, "extends" and other specific
// const tsconfig = require('./_dev/ts-config-helpers').requireTSConfig('./tsconfig.json');
const tsconfig = require('./tsconfig.json');
const {
    compilerOptions,
} = tsconfig as {
    compilerOptions: Exclude<TsJestGlobalOptions["tsconfig"], boolean | string | void>,
};
const {
    /** @see [ts-jest / config / paths-mapping]{@link https://huafu.github.io/ts-jest/user/config/#paths-mapping} */
    moduleNameMapper,
}: InitialOptionsTsJest = {
    moduleNameMapper: (compilerOptions.paths)
        ? require('ts-jest').pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' })
        : void 0
    ,
};

delete compilerOptions.outDir;

compilerOptions.target = 'es2020';
compilerOptions.module = 'CommonJS';
compilerOptions.sourceMap = true;
compilerOptions.removeComments = false;
compilerOptions.preserveConstEnums = true;
compilerOptions.declaration = false;
compilerOptions.strict = false;
compilerOptions.strictFunctionTypes = false;
compilerOptions.strictPropertyInitialization = false;
compilerOptions.noImplicitAny = false;
compilerOptions.noImplicitThis = false;
compilerOptions.allowJs = true;
compilerOptions.skipLibCheck = false;
compilerOptions.noEmitOnError = false;
compilerOptions.resolveJsonModule = true;
// compilerOptions.types = [ ...(compilerOptions.types || []), 'jest-extended/types' ];

const compiler = (function() {
    /*
    // todo: return 'ts-patch/compiler', (see https://github.com/nonara/ts-patch?tab=readme-ov-file#usage)
    try {
        require.resolve('ttypescript');

        return 'ttypescript';
    }
    catch {
        // ignore
    }
    */

    return 'typescript';
})();

const tsJest_globals: TsJestGlobalOptions = {
    // https://kulshekhar.github.io/ts-jest/docs/getting-started/options#options
    compiler,
    diagnostics: false,
    // https://kulshekhar.github.io/ts-jest/docs/getting-started/options/tsconfig#inline-compiler-options
    // https://www.typescriptlang.org/docs/handbook/compiler-options.html#compiler-options
    tsconfig: compilerOptions,
    // isolatedModules: true,
};

const cacheDirectories = cacheDirRoot
    ? `<rootDir>/${cacheDirRoot}/`
    : [
        `<rootDir>/build/`,
        `<rootDir>/build_cache/`,
        `<rootDir>/build_ts/`,
        `<rootDir>/dist/`,
    ]
;
/**
 * A map from regular expressions to paths to transformers. Optionally, a tuple with configuration options can be
 * passed as second argument: `{filePattern: ['path-to-transformer', {options}]}`.
 * For example, here is how you can configure `babel-jest` for non-default behavior: `{'\\.js$': ['babel-jest', {rootMode: 'upward'}]}`.
 *
 * ---
 * Jest runs the code of your project as JavaScript, hence a transformer is needed if you use some syntax not supported
 * by Node out of the box (such as JSX, TypeScript, Vue templates). By default, Jest will use [`babel-jest`]{@link https://github.com/jestjs/jest/tree/main/packages/babel-jest#setup}
 * transformer, which will load your project's Babel configuration and transform any file matching the `/\.[jt]sx?$/` RegExp
 * (in other words, any `.js`, `.jsx`, `.ts` or `.tsx` file). In addition, `babel-jest` will inject the Babel plugin
 * necessary for mock hoisting talked about in [ES Module mocking]{@link https://jestjs.io/docs/manual-mocks#using-with-es-module-imports}.
 *
 * ---
 * See the [Code Transformation]{@link https://jestjs.io/docs/code-transformation} section for more details and
 * instructions on building your own transformer.
 *
 * ---
 * note: Build in Jest Babel will also be disabled if not to include `babel-jest` transformer explicitly in this object.
 *
 * @default {"\\.[jt]sx?$": "babel-jest"}
 * @see [jest / config / transform]{@link https://jestjs.io/docs/configuration#transform-objectstring-pathtotransformer--pathtotransformer-object}
 */
const transform: JestConfig.InitialOptions["transform"] = {
    "^.+\\.[mc]?tsx?$": "<rootDir>/_dev/jest/ts_jest_transform_wrapper.cjs",
};
const default_transformIgnorePatterns = [
    "\\.json$",
    "\\.[mc]?jsx?$",
];
/**
 * An array of regexp pattern strings that are matched against all source file paths before transformation.
 * If the file path matches any of the patterns, it will not be transformed.
 *
 * @default ["/node_modules/", "\\.pnp\\.[^\\\/]+$"]
 * @see [How to set transformIgnorePatterns to fix "Jest encountered an unexpected token"]{@link https://github.com/nrwl/nx/issues/812}
 * @see [jest / config / transformIgnorePatterns]{@link https://jestjs.io/docs/configuration#transformignorepatterns-arraystring}
 */
const transformIgnorePatterns: JestConfig.InitialOptions["transformIgnorePatterns"] = default_transformIgnorePatterns;

/**
 * @see [ts-jest / Configuration]{@link https://huafu.github.io/ts-jest/user/config/}
 */
const jestConfigOptions: JestConfig.InitialOptions = {
    maxWorkers: '50%',
    testTimeout: TEST_DEFAULT_TIMEOUT_INTERVAL,
    clearMocks: true,
    // setupFiles: ['./frontend/testUtils/helpers.js'],
    // https://jestjs.io/docs/configuration#testmatch-arraystring
    // https://github.com/micromatch/micromatch glob patterns
    testMatch: [
        '<rootDir>/spec/**/*_(spec|test|snap)\\.?([cm])[jt]s?(x)',
    ],
    // testRegex : /\/spec\/\*\*\/?(*.)+_(spec|test|snap).[jt]s?(x)/,
    // modulePathIgnorePatterns: [ ...cacheDirectories, '/node_modules/' ],
    // testPathIgnorePatterns: [ ...cacheDirectories, '/node_modules/' ],

    modulePathIgnorePatterns: [
        ...cacheDirectories,
        '/node_modules/',
    ],
    testPathIgnorePatterns: [
        ...cacheDirectories,
        '/node_modules/',
        '<rootDir>/spec_utils/',
        '<rootDir>/spec_data/',
    ],
    coveragePathIgnorePatterns: [
        ...cacheDirectories,
        '/node_modules/',
        '<rootDir>/spec_utils/',
        '<rootDir>/spec_data/',
    ],
    // setupFilesAfterEnv: [
    //     require.resolve('jest-extended/all'),
    //     require.resolve('expect-more-jest'),
    // ],
    verbose: false,
    preset: 'ts-jest',
    testEnvironment,
    globals: {
        // In jest 29+:
        // ts-jest[ts-jest-transformer] (WARN) Define `ts-jest` config under `globals` is deprecated. Please do
        // transform: {
        //     <transform_regex>: ['ts-jest', { /* ts-jest config goes here in Jest */ }],
        // },
        'ts-jest': tsJest_globals,
        // note: can add `__DEV__: true,` here
    },
    cacheDirectory: joinPath('./', cacheDirRoot, 'build_cache/ts-jest/'),
    moduleNameMapper: isUseReact
        ? {
            ...moduleNameMapper,
            /**
             * {@link https://stackoverflow.com/questions/54627028/jest-unexpected-token-when-importing-css}
            */
            '\\.(css|less|scss)$': '<rootDir>/_dev/noop.cjs',
        }
        : moduleNameMapper
    ,
    transform,
    transformIgnorePatterns,
};

module.exports = jestConfigOptions;
