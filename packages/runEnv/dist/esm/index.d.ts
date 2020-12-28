/**
 * Is this code running in **non-Worker** environment? For browser and nodejs.
 *
 * `true` if negative {@link isNodeJSWorker} and {@link isWebWorker}, and {@link isWebWorklet}, and {@link isDenoWorker}.
 *
 * @see [isNodeJSMainThread]{@link isNodeJSMainThread}
 * @see [isWebMainThread]{@link isWebMainThread}
 * @see [isDenoMainThread]{@link isDenoMainThread}
 */
export declare const isMainThread: boolean;
/**
 * Is this code running in **Worker** environment? For browser (worker and worklet) and nodejs (worker).
 *
 * `true` if positive {@link isNodeJSWorker} or {@link isWebWorker}, or {@link isWebWorklet}, or {@link isDenoWorker}.
 *
 * {@link isNodeJSMainThread}, {@link isWebMainThread} and {@link isDenoMainThread} will be `false`.
 */
export declare const isWorkerThread: boolean;
/**
 * Is this code running in nodejs environment?
 *
 * @see [isNodeJSMainThread]{@link isNodeJSMainThread}
 * @see [isNodeJSDependentProcess]{@link isNodeJSDependentProcess}
 * @see [isNodeJSWorker]{@link isNodeJSWorker}
 */
export declare const isNodeJS: boolean;
/**
 * Is this code running in nodejs **non-Worker** environment?
 *
 * If `true`, {@link isNodeJS} will be `true` and {@link isNodeJSWorker} will be `false`.
 */
export declare const isNodeJSMainThread: boolean;
/**
 * Is Node.js process is spawned with an IPC channel (see the [Child Process]{@link https://nodejs.org/api/child_process.html}
 * and [Cluster]{@link https://nodejs.org/api/cluster.html} documentation).
 *
 * [`process.send`]{@link https://nodejs.org/api/process.html#processsendmessage-sendhandle-options-callback}
 * and
 * [`process.disconnect`]{@link https://nodejs.org/api/process.html#processdisconnect}
 * functions is defined.
 *
 * Node.js docs about IPC channel and subprocess:
 *
 * > When an IPC channel has been established between the parent and child ( i.e. when using [child_process.fork()](https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options)),
 * > the `subprocess.send()` method can be used to send messages to the child process. When the child process is a
 * > Node.js instance, these messages can be received via the ['message'](https://nodejs.org/api/process.html#process_event_message)
 * > event.
 * >
 * > Child Node.js processes will have a process.send() method of their own that allows the child to send messages back to the parent.
 * >
 * > Accessing the IPC channel fd in any way other than [process.send()](https://nodejs.org/api/process.html#processsendmessage-sendhandle-options-callback)
 * > or using the IPC channel with a child process that is not a Node.js instance is not supported.
 * >
 * > See example here: [nodejs/docs/child_process/subprocess.send]{@link https://nodejs.org/api/child_process.html#subprocesssendmessage-sendhandle-options-callback}
 *
 * Node.js docs about Cluster worker processes:
 *
 * > A single instance of Node.js runs in a single thread. To take advantage of multi-core systems, the user will sometimes want to launch a cluster of Node.js processes to handle the load.
 * >
 * > The cluster module allows easy creation of child processes that all share server ports.
 * >
 * > See example here: [nodejs/docs/cluster/Event:'message']{@link https://nodejs.org/api/cluster.html#event-message}
 *
 * @see `cluster.isPrimary` and `cluster.isWorker` from [nodejs/docs/cluster]{@link https://nodejs.org/api/cluster.html#clusterisprimary}
 * @see `child_process.[fork/spawn] options.stdio` [nodejs/docs/child_process_options_stdio]{@link https://nodejs.org/api/child_process.html#optionsstdio}
 * @see [isNodeJS]{@link isNodeJS}
 * @see [isNodeJSMainThread]{@link isNodeJSMainThread}
 */
export declare const isNodeJSDependentProcess: boolean;
/**
 * Is this code running in nodejs **Worker** environment?
 *
 * If `true`, {@link isNodeJS} will be `true`, {@link isNodeJSMainThread} will be `false`.
 *
 * @see [nodejs/docs/worker_threads/Worker]{@link https://nodejs.org/api/worker_threads.html#class-worker}
 */
export declare const isNodeJSWorker: boolean;
/**
 * Is this code running in [Deno]{@link https://deno.land/} environment?
 *
 * Deno: Next-generation JavaScript Runtime.
 *
 * @see [isDenoMainThread]{@link isDenoMainThread}
 * @see [isDenoWorker]{@link isDenoWorker}
 * @see [isDenoWorkerWithImportScripts]{@link isDenoWorkerWithImportScripts}
 * @see [Deno | Runtime APIs | namespace Deno]{@link https://deno.land/api?s=Deno}
 */
export declare const isDeno: boolean;
/**
 * Is Deno main thread.
 *
 * @see [isDeno]{@link isDeno}
 * @see [isDenoWorker]{@link isDenoWorker}
 * @see [isDenoWorkerWithImportScripts]{@link isDenoWorkerWithImportScripts}
 * @see [Deno | Runtime APIs | namespace Deno]{@link https://deno.land/api?s=Deno}
 *
 * @example Deno result example:
 * {
 *  isMainThread: true,
 *  isDeno: true,
 *  isDenoMainThread: true
 * }
 */
export declare const isDenoMainThread: boolean;
/**
 * Is [Deno Worker]{@link https://docs.deno.com/runtime/manual/runtime/workers}.
 * Deno supports [`Web Worker API`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker}.
 *
 * @see [isDeno]{@link isDeno}
 * @see [isDenoMainThread]{@link isDenoMainThread}
 * @see [isDenoWorkerWithImportScripts]{@link isDenoWorkerWithImportScripts}
 *
 * @example Deno Worker result example:
 * {
 *   isWorkerThread: true,
 *   isDeno: true,
 *   isDenoWorker: true,
 *   isWebWorkerThreadCompatible: true
 *   isWebWorker: true,
 *   isWebDedicatedWorker: true
 * }
 */
export declare const isDenoWorker: boolean;
/**
 * Is [Deno Worker]{@link https://docs.deno.com/runtime/manual/runtime/workers} with
 * [`importScripts`]{@link https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts}
 * function supports.
 *
 * In Deno, `importScripts` is optional for Worker's.
 *
 * @see [isDeno]{@link isDeno}
 * @see [isDenoMainThread]{@link isDenoMainThread}
 * @see [isDenoWorker]{@link isDenoWorker}
 * @see [Using the "lib" property / "webworker.importscripts"]{@link https://docs.deno.com/runtime/manual/advanced/typescript/configuration#using-the-lib-property}
 */
export declare const isDenoWorkerWithImportScripts: boolean;
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
export declare const isBun: boolean;
/**
 * Is Bun main thread.
 *
 * @see [isBun]{@link isBun}
 * @see [isBunWorker]{@link isBunWorker}
 * @see [What is Bun?]{@link https://bun.sh/docs}
 *
 * @example Bun result example:
 * {
 *   isMainThread: true,
 *   isNodeJS: true,
 *   isNodeJSMainThread: true,
 *   isBun: true,
 *   isBunMainThread: true
 * }
 */
export declare const isBunMainThread: boolean;
/**
 * Is [Bun Worker]{@link https://bun.sh/docs/api/workers}.
 *
 * Bun implements a <u>minimal version</u> of the [`Web Worker API`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker}
 * with extensions that make it work better for server-side use cases.
 * Like the rest of Bun, Worker in Bun support CommonJS, ES Modules, TypeScript, JSX, TSX and more out of the box.
 * No extra build steps are necessary.
 *
 * Bun Worker is NOT a Web-like WebWorker compatible, but more like NodeJS Workers.
 *
 * @see [isBun]{@link isBun}
 * @see [isBunMainThread]{@link isBunMainThread}
 * @see [isNodeJSWorker]{@link isNodeJSWorker}
 *
 * @example Deno Worker result example:
 * {
 *   isWorkerThread: true,
 *   isNodeJS: true,
 *   isNodeJSWorker: true,
 *   isBun: true,
 *   isBunMainThread: true,
 *   isBunWorker: true
 * }
 */
export declare const isBunWorker: boolean;
/**
 * Is this code running in **WEB-like** environment with such global objects available:
 * * [`window`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window}
 * * [`document`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/document}
 * * [`navigator`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/navigator}

 * In *common cases* this mean this is fully compatible **WEB** environment.
 *
 * If `true`, one of ({@link isNodeJS}, {@link isDeno}, {@link isNWJSMixedContextWindow}, {@link isElectron}, etc) may be `true`.
 */
export declare const isWebMainThreadCompatible: boolean;
/**
 * Is this code running in **WebWorker-like** environment

 * In *common cases* this mean this is fully compatible **WebWorker** environment.
 *
 * If `true`, one of ({@link isWebWorker}, {@link isDenoWorker}, {@link isBunWorker}, etc) may be `true`.
 */
export declare const isWebWorkerThreadCompatible: boolean;
/**
 * Is this code running in **WEB** environment?
 *
 * If `true`, {@link isNodeJS} will be `false`.
 *
 * @see [isWebDependentWindow]{@link isWebDependentWindow}
 * @see [isWebWorker]{@link isWebWorker}
 * @see [isWebWorklet]{@link isWebWorklet}
 * @see [isWebDedicatedWorker]{@link isWebDedicatedWorker}
 * @see [isWebSharedWorker]{@link isWebSharedWorker}
 * @see [isWebServiceWorker]{@link isWebServiceWorker}
 */
export declare const isWeb: boolean;
/**
 * Is this code running in **WEB** environment and it is a **common web Window** process (**non-Worker** environment)?
 *
 * `true` if positive {@link isWeb}, and negative {@link isWebWorker} and {@link isWebWorklet}.
 *
 * @see [isWebDependentWindow]{@link isWebDependentWindow}
 */
export declare const isWebMainThread: boolean;
/**
 * Is this code running in main **WEB** environment in window opened by `window.open` (**dependent window** environment)?
 *
 * @see [isWeb]{@link isWeb}
 * @see [isWebMainThread]{@link isWebMainThread}
 * @see [MDN / window.open]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/open}
 * @see [MDN / window.opener]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/opener}
 */
export declare const isWebDependentWindow: boolean;
/**
 * Is this code running in **Web Worker** environment?
 *
 * If `true`, {@link isWeb} will be `true`.
 *
 * @see [isWebDedicatedWorker]{@link isWebDedicatedWorker}
 * @see [isWebSharedWorker]{@link isWebSharedWorker}
 * @see [isWebServiceWorker]{@link isWebServiceWorker}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 * @see [Live WebWorker Example]{@link https://mdn.github.io/simple-web-worker/}
 */
export declare const isWebWorker: boolean;
/**
 * Is this code running in **DedicatedWorker** environment?
 *
 * If `true`,  {@link isWebWorker} will be `true` and {@link isWeb} will be `true`.
 *
 * @see [MDN / DedicatedWorker]{@link https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorker}
 * @see [MDN / DedicatedWorkerGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 */
export declare const isWebDedicatedWorker: boolean;
/**
 * Is this code running in **SharedWorker** environment?
 *
 * If `true`,  {@link isWebWorker} will be `true` and {@link isWeb} will be `true`.
 *
 * @see [MDN / SharedWorker]{@link https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker}
 * @see [MDN / SharedWorkerGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/SharedWorkerGlobalScope}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 * @see [lib.webworker.d.ts]{@link ../node_modules/typescript/lib/lib.webworker.d.ts}
 */
export declare const isWebSharedWorker: boolean;
/**
 * Is this code running in **ServiceWorker** environment?
 *
 * If `true`,  {@link isWebWorker} will be `true` and {@link isWeb} will be `true`.
 *
 * @see [MDN / ServiceWorker]{@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker}
 * @see [MDN / ServiceWorkerGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope}
 * @see [MDN / Web Workers API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 */
export declare const isWebServiceWorker: boolean;
/**
 * Is this code running in **Web Worklet** environment?
 *
 * If {@link isWebWorklet} = `true`, {@link isWeb} always will be `true`.
 *
 * @see [isWebPaintWorklet]{@link isWebPaintWorklet}
 * @see [isWebAudioWorklet]{@link isWebAudioWorklet}
 * @see [MDN / Worklet]{@link https://developer.mozilla.org/en-US/docs/Web/API/Worklet}
 * @see [whatwg / HTML spec / Worklets]{@link https://html.spec.whatwg.org/multipage/worklets.html}
 * @see [MDN / Using web workers]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers}
 * @see [Live WebWorker Example]{@link https://mdn.github.io/simple-web-worker/}
 * @see [HTML Living Standard / WorkletGlobalScope]{@link https://html.spec.whatwg.org/multipage/worklets.html#workletglobalscope}
 */
export declare const isWebWorklet: boolean;
/**
 * Is this code running in **PaintWorklet** environment?
 *
 * If {@link isWebPaintWorklet} = `true`, {@link isWebWorklet} always will be `true` and {@link isWeb} always will be `true`.
 *
 * @see [isWebWorklet]{@link isWebWorklet}
 * @see [MDN / PaintWorklet]{@link https://developer.mozilla.org/en-US/docs/Web/API/PaintWorklet}
 * @see [MDN / PaintWorkletGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/PaintWorkletGlobalScope}
 * @see [MDN / CSS Painting API]{@link https://developer.mozilla.org/en-US/docs/Web/API/CSS_Painting_API}
 * @see [MDN / Using the CSS Painting API]{@link https://developer.mozilla.org/en-US/docs/Web/API/CSS_Painting_API/Guide}
 * @see [CSS Painting API Level 1 / Paint Worklet]{@link https://www.w3.org/TR/css-paint-api-1/#paint-worklet}
 */
export declare const isWebPaintWorklet: boolean;
/**
 * Is this code running in **AudioWorklet** environment?
 *
 * If {@link isWebAudioWorklet} = `true`,  {@link isWebWorklet} always will be `true` and {@link isWeb} always will be `true`.
 *
 * @see [isWebWorklet]{@link isWebWorklet}
 * @see [MDN / AudioWorklet]{@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet}
 * @see [MDN / AudioWorkletGlobalScope]{@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope}
 * @see [MDN / Web Audio API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API}
 * @see [MDN / Using the Web Audio API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API}
 * @see [MDN / Background audio processing using AudioWorklet]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet}
 * @see [Web Audio API / The AudioWorklet Interface]{@link https://www.w3.org/TR/webaudio/#AudioWorklet}
 * @see [Audio Worklet Examples]{@link https://googlechromelabs.github.io/web-audio-samples/audio-worklet/}
 */
export declare const isWebAudioWorklet: boolean;
/**
 * Is this code running in any Cordova environment?
 *
 * @see [Documentation - Apache Cordova]{@link https://cordova.apache.org/docs/en/latest/}
 */
export declare const isCordova: boolean;
/**
 * NW.js lets you call all Node.js modules directly from DOM and enables a new way of writing applications
 * with all Web technologies. It was previously known as “node-webkit” project.
 *
 * Note that {@link isWebMainThreadCompatible} will be also `true` if this NWJS window is include Web context.
 *
 * @see [NW.js Main page]{@link https://nwjs.io/}
 * @see [NW.js Documentation]{@link https://docs.nwjs.io/en/latest/}
 *
 * @example nwjs result example:
 * {
 *   isMainThread: true,
 *   isNWJSMixedContextWindow: true,
 *   isNodeJS: true,
 *   isNodeJSMainThread: true,
 *   isWebMainThreadCompatible: true
 * }
 */
export declare const isNWJSMixedContextWindow: boolean;
/**
 * Is this code running in any Electron environment?
 *
 * [Electron Documentation]{@link https://www.electronjs.org/docs/}
 *
 * * For Main process: {@link isElectronMain} = `true`
 * * For Renderer process: {@link isElectronRenderer} = `true`
 * * For WebWorker: {@link isWebWorker} = `true`
 * * Check node integration by {@link isElectronNodeIntegration}
 *
 * @see [isElectronMain]{@link isElectronMain}
 * @see [isElectronRenderer]{@link isElectronRenderer}
 * @see [isElectronNodeIntegration]{@link isElectronNodeIntegration}
 * @see [electronjs/docs/process.type]{@link https://www.electronjs.org/docs/latest/api/process#processtype-readonly}
 **/
export declare const isElectron: boolean;
/**
 * Is this is [main Electron process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process}?
 *
 * Electron Glossary: [main process]{@link https://www.electronjs.org/docs/latest/glossary#main-process}
 *
 * The main process, commonly a file named `main.js`, is the entry point to every Electron app. It controls the life of
 * the app, from open to close. It also manages native elements such as the Menu, Menu Bar, Dock, Tray, etc. The main
 * process is responsible for creating each new renderer process in the app. The full Node API is built in.
 *
 * Every app's main process file is specified in the `main` property in `package.json`. This is how `electron .` knows
 * what file to execute at startup.
 *
 * In Chromium, this process is referred to as the "browser process". It is renamed in Electron to avoid confusion with renderer processes.
 *
 * @see [electronjs/docs/Process Model#The main process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process}
 * @see [electronjs/docs/Glossary/main process]{@link https://www.electronjs.org/docs/latest/glossary#main-process}
 * @see [electronjs/docs/Quick Start]{@link https://www.electronjs.org/docs/latest/tutorial/quick-start}
 * @see [electronjs/docs/process.isMainFrame]{@link https://www.electronjs.org/docs/latest/api/process#processismainframe-readonly}
 **/
export declare const isElectronMain: boolean;
/**
 * Is this is [Renderer process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process}
 * of [browser Window]{@link https://www.electronjs.org/docs/latest/api/browser-window}
 * in Electron app?
 *
 * Electron Glossary: [renderer process]{@link https://www.electronjs.org/docs/latest/glossary#renderer-process}
 *
 * Note that it can be Renderer process without node integration: {@link isElectronRenderer} = `true` and {@link isElectronNodeIntegration} = `false`.
 *
 * The renderer process is a browser window in your app. Unlike the main process, there can be multiple of these and
 * each is run in a separate process. They can also be hidden.
 *
 * In normal browsers, web pages usually run in a sandboxed environment and are not allowed access to native resources.
 * Electron users, however, have the power to use Node.js APIs in web pages allowing lower level operating system
 * interactions.
 *
 * @see [electronjs/docs/Process Model#The renderer process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process}
 * @see [electronjs/docs/Glossary/renderer process]{@link https://www.electronjs.org/docs/latest/glossary#renderer-process}
 * @see [electronjs/docs/Quick Start]{@link https://www.electronjs.org/docs/latest/tutorial/quick-start}
 **/
export declare const isElectronRenderer: boolean;
/**
 * Is this is [Preload scripts]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts}
 * of [Renderer process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process}
 * of [browser Window]{@link https://www.electronjs.org/docs/latest/api/browser-window}
 * in Electron app?
 *
 * You can use this value to check if `contextBridge` API is enable (or you can use `process.contextIsolated`).
 * <br />Error example: `contextBridge API can only be used when contextIsolation is enabled`.
 *
 * ---
 *
 * Note: With `{ webPreferences: { nodeIntegrationInWorker: true, contextIsolation: false } }` we can't detect preload
 * process, so this value always be `false` even executing in `preload.js` file.
 *
 * @see [electronjs/docs/Process Model#Preload scripts]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts}
 * @see [electronjs/docs/Understanding context-isolated processes]{@link https://www.electronjs.org/docs/latest/tutorial/ipc#understanding-context-isolated-processes}
 * @see [electronjs/docs/Context Isolation]{@link https://www.electronjs.org/docs/latest/tutorial/context-isolation}
 * @see [electronjs/docs/process.contextIsolated]{@link https://www.electronjs.org/docs/latest/api/process#processcontextisolated-readonly}
 */
export declare const isElectronRendererPreload: boolean;
/**
 * Is it Electron process with node integration? One of case should be `true`:
 * - It's [Electron Main process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process}.
 * In this case: {@link isElectronMain} = `true`.
 * - It's [Electron Renderer process]{@link https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process}
 * with `nodeIntegration==true` and `contextIsolation==false`. In this case: {@link isElectronMain} = `false`, {@link isElectronRenderer} = `true`.
 * - It's [WebWorker]{@link https://www.electronjs.org/docs/latest/tutorial/multithreading}
 * running in Electron app with `nodeIntegrationInWorker==true` and `contextIsolation==false`.
 * In this case: {@link isElectronMain} = `false` and {@link isElectronRenderer} = `false`, and  {@link isElectron} = `true`, and {@link isWebWorker} = `true`.
 *
 *
 * @example opening a new window with node integration:
```
 // https://www.electronjs.org/docs/latest/api/browser-window
var win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,// It's false by default
    contextIsolation: false,// It's true by default
  },
});
win.loadURL('http://google.com');
win.show();
```
 * @example opening a new window and running WebWorker on it (without code for Worker running):
```
 // https://www.electronjs.org/docs/latest/api/browser-window
var win = new BrowserWindow({
  webPreferences: {
    nodeIntegrationInWorker: true,// It's false by default
    contextIsolation: false,// It's true by default
  },
});
win.loadURL('https://www.html5rocks.com/en/tutorials/workers/basics/');
win.show();
 // ...running WebWorker on page...
```
 * @see [electronjs/docs/Tag Attributes/nodeintegration]{@link https://www.electronjs.org/docs/latest/api/webview-tag#nodeintegration}
 * @see [electronjs/docs/Tag Attributes/nodeintegrationinsubframes]{@link https://www.electronjs.org/docs/latest/api/webview-tag#nodeintegrationinsubframes}
 * @see [electronjs/docs/new BrowserWindow(options: { webPreferences })/nodeIntegration, nodeIntegrationInWorker, nodeIntegrationInSubFrames]{@link https://www.electronjs.org/docs/latest/api/browser-window#new-browserwindowoptions}
 * @see [Changing the defaults for nodeIntegration and contextIsolation to improve the default security posture of Electron applications]{@link https://github.com/electron/electron/issues/23506}
 */
export declare const isElectronNodeIntegration: boolean;
/**
 * Browser supports touch.
 *
 * With a high degree of probability this is mobile device (or mobile browser simulator).
 *
 * @see [isMultiTouchDevice]{@link isMultiTouchDevice}
 * @see [navigator.maxTouchPoints]{@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/maxTouchPoints}
 * @see [Touch events]{@link https://developer.mozilla.org/en-US/docs/Web/API/Touch_events}
 */
export declare const isTouchDevice: boolean;
/**
 * Browser supports multi-touch.
 *
 * With a high degree of probability this is mobile device (or mobile browser simulator).
 *
 * @see [isTouchDevice]{@link isTouchDevice}
 * @see [navigator.maxTouchPoints]{@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/maxTouchPoints}
 * @see [Touch events]{@link https://developer.mozilla.org/en-US/docs/Web/API/Touch_events}
 */
export declare const isMultiTouchDevice: boolean;
/**
 * Is running in [ReactNative]{@link https://reactnative.dev/} environment?
 */
export declare const isReactNative: boolean;
/**
 * jsdom is a pure-JavaScript implementation of many web standards, notably the WHATWG DOM and HTML Standards, for use
 * with Node.js. In general, the goal of the project is to emulate enough of a subset of a web browser to be useful
 * for testing and scraping real-world web applications.
 *
 * @see [jsdom githib]{@link https://github.com/jsdom/jsdom#readme}
 */
export declare const isJSDOM: boolean;
/**
 * Is this code running in development environments?
 */
export declare const isDev: boolean;
/**
 * Is this code running in testing environments?
 */
export declare const isTest: boolean;
/**
 * Is this code running in WebStorm debugging mode?
 */
export declare const isWebStormDebugger: boolean;
/**
 * Is this code running in VSCode debugging mode?
 */
export declare const isVSCodeDebugger: boolean;
/**
 * Is this code running in IDE debugging mode?
 *
 * > Note: this variable is not aimed to detect browser DevTools debugging mode!
 *
 * @see [isWebStormDebugger]{@link isWebStormDebugger}
 * @see [isVSCodeDebugger]{@link isVSCodeDebugger}
 */
export declare const isIDEDebugger: boolean;
declare const _envDetailsFull: {
    isMainThread: boolean;
    isWorkerThread: boolean;
    isNodeJS: boolean;
    isNodeJSMainThread: boolean;
    isNodeJSDependentProcess: boolean;
    isNodeJSWorker: boolean;
    isDeno: boolean;
    isDenoMainThread: boolean;
    isDenoWorker: boolean;
    isDenoWorkerWithImportScripts: boolean;
    isBun: boolean;
    isBunMainThread: boolean;
    isBunWorker: boolean;
    isWeb: boolean;
    isWebMainThread: boolean;
    isWebMainThreadCompatible: boolean;
    isWebWorkerThreadCompatible: boolean;
    isWebDependentWindow: boolean;
    isWebWorker: boolean;
    isWebDedicatedWorker: boolean;
    isWebSharedWorker: boolean;
    isWebServiceWorker: boolean;
    isWebWorklet: boolean;
    isWebPaintWorklet: boolean;
    isWebAudioWorklet: boolean;
    isCordova: boolean;
    isNWJSMixedContextWindow: boolean;
    isElectron: boolean;
    isElectronMain: boolean;
    isElectronRenderer: boolean;
    isElectronRendererPreload: boolean;
    isElectronNodeIntegration: boolean;
    isTouchDevice: boolean;
    isMultiTouchDevice: boolean;
    isReactNative: boolean;
    isJSDOM: boolean;
    isDev: boolean;
    isTest: boolean;
    isWebStormDebugger: boolean;
    isVSCodeDebugger: boolean;
    isIDEDebugger: boolean;
};
export type IEnvDetailsFull = typeof _envDetailsFull;
export type IEnvDetails = Partial<typeof _envDetailsFull>;
export type IEnvDetailsKeys = (keyof (typeof _envDetailsFull))[];
export declare const envDetailsFull: IEnvDetailsFull;
export declare const envDetails: IEnvDetails;
export {};
