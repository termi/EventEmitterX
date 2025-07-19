/// <reference lib="dom" />
/// <reference lib="webworker" />
/// <reference types="node" />
// noinspection RedundantIfStatementJS

'use strict';

const _global = globalThis;

// [`node:process` free solution](https://github.com/flexdinesh/browser-or-node/issues/27)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
// @ts-ignore Ignore in WEB-build
const nodeProcess = _global["process"] as typeof import('node:process') & { browser?: boolean } | undefined;
const _IS_PROCESS = typeof nodeProcess !== 'undefined' && !!nodeProcess;
const _nodeProcessEnv = _IS_PROCESS ? nodeProcess?.env || void 0 : void 0;
const _IS_WINDOW = typeof window !== 'undefined' && !!window;
const _IS_DOCUMENT = typeof document !== 'undefined' && !!document;
const _IS_NAVIGATOR = typeof navigator === 'object' && !!navigator;

const _toString = Object.prototype.toString;

type BunGlobalObject = {
    /** @see [Bun / Utils / Bun.version]{@link https://bun.sh/docs/api/utils#bun-version} */
    version: string,
    /** @see [Bun / Workers / Bun.isMainThread]{@link https://bun.sh/docs/api/workers#bun-ismainthread} */
    isMainThread: boolean,
};

const bunGlobalObject = (_global as unknown as { Bun: BunGlobalObject | undefined }).Bun;
const _IS_BUN = !!bunGlobalObject;

let ENVIRONMENT_IS_NODE = _IS_PROCESS
    // Don't get fooled by e.g. browserify environments.
    // Only Node.JS has a process variable that is of [[Class]] process
    && _toString.call(nodeProcess) === "[object process]"
    // if the checks above will not be enough:
    // && typeof require === 'function'
    // && Object.prototype.toString.call(_global) === "[object global]"
    // // from https://github.com/realm/realm-js/blob/992392e477cb2f5b059b21f6f04edb5f5e7073c2/packages/realm-network-transport/src/NetworkTransport.ts#L24
    // && "node" in process.versions
;
let ENVIRONMENT_IS_NODE_MAIN_THREAD = false;

if (_IS_PROCESS) {
    if (ENVIRONMENT_IS_NODE) { // Maybe this is Node.js
        if (_IS_WINDOW) {
            // global `window` is defined
            // if (ENVIRONMENT_IS_ELECTRON) {
            //     // todo: Support electron with JSDOM (for electron's test environment?)
            //     // this is Electron process.
            //     //  isNodeJS = true for Main Electron process
            //     //  isNodeJS = false for Renderer or without node integration processes
            //     ENVIRONMENT_IS_NODE = ELECTRON_ENV === ELECTRON__MAIN;
            // }
            // else if (ENVIRONMENT_IS_NWJS) {
            //     // todo: nwjs main window is mixed_context with both Node context and DOM context,
            //     //  so ONLY for nwjs main window it should be `isNodeJS == true && isWeb == true`.
            //     ENVIRONMENT_IS_NODE = true;
            // }
            // todo: use ENVIRONMENT_ISDOM in this check
            /* else */ if (!String(window.print).includes('[native code]')) {
                // This is workaround for jest+JSDOM due jsdom is used automatically (https://github.com/facebook/jest/issues/3692#issuecomment-304945928)
                ENVIRONMENT_IS_NODE = true;
            }
            else {
                ENVIRONMENT_IS_NODE = false;
            }
        }
        // else if (ENVIRONMENT_IS_ELECTRON_WEB_WORKER_NODE_INTEGRATION) {
        //     // this is Electron process.
        //     //  isNodeJS = false for nodeIntegrationInWorker=true in a web worker
        //     ENVIRONMENT_IS_NODE = false;
        // }
        else if (nodeProcess["browser"]) {
            // babel process shim
            ENVIRONMENT_IS_NODE = false;
        }
        // else {
        //     ENVIRONMENT_IS_NODE === true
        // }
    }

    if (ENVIRONMENT_IS_NODE) {
        try {
            // (-) `const worker_threads = require('worker_threads');`
            // Trying to hide `require('module_name')` from bundlers and builders:
            // Hide require from "rollup", "webpack" and it's friends
            /* prev version (NOT WORKING):
            const worker_threads = (new Function(_stringJoin('return req', 'uire("worker_threads")'))()) as typeof import('node:worker_threads');
            */
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore Ignore in WEB-build
            const worker_threads = _hiddenRequire(`worker_threads`) as typeof import('node:worker_threads') | undefined;

            if (typeof worker_threads?.["isMainThread"] === 'boolean') {
                ENVIRONMENT_IS_NODE_MAIN_THREAD = worker_threads.isMainThread;
            }
            else {
                ENVIRONMENT_IS_NODE_MAIN_THREAD = true;
            }
        }
        catch {
            // old nodejs without Worker's support
            ENVIRONMENT_IS_NODE_MAIN_THREAD = true;
        }
    }
}
/**
 * [Bun APIs]{@link https://bun.sh/docs/runtime/bun-apis}
 */
const ENVIRONMENT_IS_BUN = _IS_BUN
    && typeof bunGlobalObject.version === 'string'
;

/**
 * Can be Web Worker or Deno Worker.
 */
const ENVIRONMENT_IS_WEB_WORKER = !ENVIRONMENT_IS_NODE
    // && typeof 'onmessage' in _global
    // && typeof 'postMessage' in _global
    // see node_modules/typescript/lib/lib.webworker.d.ts
    && typeof WorkerGlobalScope !== 'undefined'
    // // in Deno, importScripts is optional for Worker's
    // && (ENVIRONMENT_IS_DENO
    //     || typeof (/** @type {import("typescript/lib/lib.webworker").WorkerGlobalScope} */_global)["importScripts"] === 'function'
    // )
    && !_IS_DOCUMENT
    && !_IS_WINDOW
    && _IS_NAVIGATOR
    // Can't <reference lib="webworker" /> due error like:
    // `TS2403: Subsequent variable declarations must have the same type. Variable 'location' must be of type 'Location', but here has type 'WorkerLocation'.  lib.dom.d.ts(19615, 13): 'location' was also declared here.`
    // see node_modules/typescript/lib/lib.webworker.d.ts
    && typeof WorkerNavigator !== 'undefined' && (/** @type {import("typescript/lib/lib.webworker").WorkerNavigator} */navigator) instanceof WorkerNavigator
;
const ENVIRONMENT_IS_WEB_WORKLED = !ENVIRONMENT_IS_NODE
    // // Deno (now?) not support Worklet's
    // && !ENVIRONMENT_IS_DENO
    && typeof ((_global as unknown as { WorkletGlobalScope?: () => void })["WorkletGlobalScope"]) !== 'undefined'
;
const ENVIRONMENT_IS_WEB_MAIN_PROCESS_COMPATIBLE = _IS_WINDOW
    && _global === window
    && !ENVIRONMENT_IS_WEB_WORKLED
    && !ENVIRONMENT_IS_WEB_WORKER
    // /*
    // In Electon Renderer process (Web Window) with { nodeIntegration: true, contextIsolation: false }: `Object.prototype.toString.call(window) === '[object global]'`.
    // Also see: https://www.electronjs.org/docs/latest/api/process#processcontextisolated-readonly
    // */
    // && ((ELECTRON_ENV === ELECTRON__RENDERER_WITH_NODE_INTEGRATION && _IS_PROCESS && nodeProcess["contextIsolated"] === false)
    //         ? _toString.call(window) === '[object global]'
    //         : _toString.call(window) === '[object Window]'
    // )
    && _IS_DOCUMENT
    && _IS_NAVIGATOR
;
const ENVIRONMENT_IS_WEB_PROCESS = ENVIRONMENT_IS_WEB_MAIN_PROCESS_COMPATIBLE
    && !ENVIRONMENT_IS_NODE
    // && !ENVIRONMENT_IS_DENO
;
const ENVIRONMENT_IS_MAIN_THREAD = ENVIRONMENT_IS_NODE
    ? ENVIRONMENT_IS_NODE_MAIN_THREAD
    // : ENVIRONMENT_IS_DENO
    //     ? !ENVIRONMENT_IS_DENO_WORKER
        : (
            ENVIRONMENT_IS_WEB_PROCESS
            && !ENVIRONMENT_IS_WEB_WORKER
            && !ENVIRONMENT_IS_WEB_WORKLED
        )
;
const ENVIRONMENT_IS_WORKER_OR_WORKLED_THREAD = ENVIRONMENT_IS_NODE
    ? !ENVIRONMENT_IS_NODE_MAIN_THREAD
    : (ENVIRONMENT_IS_WEB_WORKER || ENVIRONMENT_IS_WEB_WORKLED)
;
const ENVIRONMENT_IS_WEB = ENVIRONMENT_IS_WEB_PROCESS
    || (ENVIRONMENT_IS_WEB_WORKER/* && !ENVIRONMENT_IS_DENO */)
    || ENVIRONMENT_IS_WEB_WORKLED
;

/**
 * @private
 */
function _stringJoin(leftSide: string, rightSide: string) {
    return leftSide
        ? rightSide
            ? leftSide + rightSide
            : leftSide
        : rightSide
            ? rightSide
            : ''
    ;
}

/**
 * Hide `require('module_name')` from bundlers and builders.
 * @see [How can I make webpack skip a require / ANSWER]{@link https://stackoverflow.com/a/62715860/1437207}
 * @private
 */
function _hiddenRequire(moduleName: string) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    const _module = (typeof module === 'object' && module) || void 0;

    if (!_module) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore ignore `TS7053: Element implicitly has an any type because expression of type string can't be used to index type Module`
    return _module[`${_stringJoin('req', 'uire')}`].call(_module, moduleName);
}

const IS_TEST_ENV = _IS_PROCESS && _nodeProcessEnv?.NODE_ENV === 'test';
const IS_DEV_ENV = _IS_PROCESS && _nodeProcessEnv?.NODE_ENV === 'development';
const IS_WEB_STORM_DEBUGGER = _IS_PROCESS
    && (!!_nodeProcessEnv?.JB_IDE_HOST || !!_nodeProcessEnv?.JB_IDE_PORT)
;
const IS_VSCODE_INSPECTOR = _IS_PROCESS
    && !!_nodeProcessEnv?.VSCODE_INSPECTOR_OPTIONS
;

// -----------============================== WEB details ==============================-----------
/**
 * Is this code running in **WEB** environment?
 *
 * If `true`, {@link isNodeJS} will be `false`.
 */
export const isWeb: boolean = ENVIRONMENT_IS_WEB;

/**
 * Is this code running in **WEB** environment and it is a **common web Window** process (**non-Worker** environment)?
 */
export const isWebMainThread: boolean = ENVIRONMENT_IS_WEB && ENVIRONMENT_IS_MAIN_THREAD;

/**
 * Is this code running in **Worker** environment? For browser (worker and worklet) and nodejs (worker).
 */
export const isWorkerThread: boolean = ENVIRONMENT_IS_WORKER_OR_WORKLED_THREAD;
// -----------============================== NodeJS details ==============================-----------

/**
 * Is this code running in nodejs environment?
 */
export const isNodeJS: boolean = ENVIRONMENT_IS_NODE;

/**
 * Is this code running in nodejs **non-Worker** environment?
 */
export const isNodeJSMainThread: boolean = ENVIRONMENT_IS_NODE && ENVIRONMENT_IS_NODE_MAIN_THREAD;

// -----------============================== Bun details ==============================-----------

/**
 * Is this code running in Bun runtime?
 *
 * Bun is a fast JavaScript all-in-one toolkit.
 *
 * Develop, test, run, and bundle JavaScript & TypeScript projects—all with Bun. Bun is an all-in-one JavaScript
 * runtime & toolkit designed for speed, complete with a bundler, test runner, and Node.js-compatible package manager.
 *
 * @see [What is Bun?]{@link https://bun.sh/docs}
 */
export const isBun: boolean = ENVIRONMENT_IS_BUN;

// -----------============================== testing details ==============================-----------

/**
 * Is this code running in development environments?
 */
export const isDev: boolean = IS_DEV_ENV;

/**
 * Is this code running in testing environments?
 */
export const isTest: boolean = IS_TEST_ENV;
/**
 * Is this code running in IDE debugging mode?
 *
 * > Note: this variable is not aimed to detect browser DevTools debugging mode!
 */
export const isIDEDebugger = IS_WEB_STORM_DEBUGGER || IS_VSCODE_INSPECTOR;
