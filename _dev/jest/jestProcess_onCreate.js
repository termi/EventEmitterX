'use strict';

// This file will be hack-patched to `jest-runner/build/testWorker.js` in `cftools/_dev_utils/cftools_deps_lifecycle/lib_postinstall/jest-runner_testWorker.js`

// Note: Возможно, можно добиться того же эффекта, что и этим файлом, за счет [jest.config.testEnvironment](https://jestjs.io/docs/configuration#testenvironment-string)

// Should be only JS-polyfills!
// require('./polyfills/jscore');

const vm = require('node:vm');
const { createContext } = vm;
const nodejsSetTimeout = globalThis.setTimeout;
const nodejsClearTimeout = globalThis.clearTimeout;
const nodejsSetInterval = globalThis.setInterval;
const nodejsClearInterval = globalThis.clearInterval;
const nodejsSetImmediate = globalThis.setImmediate || globalThis.setTimeout;
const nodejsClearImmediate = globalThis.clearImmediate;
const nodejsQueueMicrotask = globalThis.queueMicrotask;
const nodejsRequire = require;
const nodejsConsole = console;
const nodejsBuffer = Buffer;
const nodejsPerformance = typeof performance !== 'undefined' ? performance : (function() {
    try {
        return require('node:perf_hooks').performance;
    }
    catch (error) {
        // ignore
    }
})();
const nodejs_structuredClone = typeof structuredClone === 'function'
    ? structuredClone
    : void 0
;
/** @type {Map<string, typeof require>} */
const _nativeRequireCache = new Map();
/**
 * @param {string} __filename
 * @returns {NodeJS.Require}
 * @example How to use it in TypeScript file
    const _getNativeRequire = globalThis["nodejsGetNativeRequire"] as ((__filename: string) => typeof require) | undefined;
    const _require = _getNativeRequire?.(__filename);

    if (!_require) {
        console.error('Native nodejs require is not available');

        return;
    }
 */
const getNativeRequire = function(__filename) {
    const value = _nativeRequireCache.get(__filename);

    if (value) {
        return value;
    }

    {
        const value = nodejsRequire('node:module').createRequire(__filename);

        _nativeRequireCache.set(__filename, value);

        return value;
    }
};

const { URL: nodeWebURL } = require('node:url');
const { Blob: nodeWebBlob } = require('node:buffer');

vm.createContext = function(context) {
    if (!context) {
        context = {};
    }

    /**
     * Temporary solution for issue [jsdom / ReferenceError: AggregateError is not defined]{@link https://github.com/jsdom/jsdom/issues/3205}
     */
    if (!context.AggregateError && typeof AggregateError === 'function') {
        // eslint-disable-next-line no-undef
        context.AggregateError = AggregateError;
    }

    // setImmediate polyfill can be defined via `require('./polyfills/jscore');`.

    /*
    Use it like this to create native require function:
    ```
    const nativeNode_require = nodejsRequire('node:module').createRequire(__filename);
    ```
    */
    // link to real nodejs require, to use it in tests.
    context.nodejsRequire = nodejsRequire;
    context.nodejsGetNativeRequire = getNativeRequire;
    context.nodejsConsole = nodejsConsole;
    context.nodejsSetTimeout = nodejsSetTimeout;
    context.nodejsClearTimeout = nodejsClearTimeout;
    context.nodejsSetInterval = nodejsSetInterval;
    context.nodejsClearInterval = nodejsClearInterval;
    context.nodejsSetImmediate = nodejsSetImmediate;
    context.nodejsClearImmediate = nodejsClearImmediate;
    context.nodejsQueueMicrotask = nodejsQueueMicrotask;
    context.nodeWebURL = nodeWebURL;
    context.nodeWebBlob = nodeWebBlob;
    context.nodejsBuffer = nodejsBuffer;
    context.nodejsPerformance = nodejsPerformance;

    if (!context.structuredClone && nodejs_structuredClone) {
        context.structuredClone = nodejs_structuredClone;
    }
    if (!context.setImmediate) {
        context.setImmediate = nodejsSetImmediate;
    }

    if (globalThis["IS_REACT_ACT_ENVIRONMENT"] && context["IS_REACT_ACT_ENVIRONMENT"] == null) {
        /**
         * * [How to Upgrade to React 18 / Configuring Your Testing Environment](https://react.dev/blog/2022/03/08/react-18-upgrade-guide#configuring-your-testing-environment)
         * * [React / Test Utilities / act()](https://legacy.reactjs.org/docs/test-utils.html#act)
         * * [testing-library / issues / The current testing environment is not configured to support act(...) with vitest and React 18](https://github.com/testing-library/react-testing-library/issues/1061)
         */
        context["IS_REACT_ACT_ENVIRONMENT"] = true;
    }

    return createContext(context);
};
