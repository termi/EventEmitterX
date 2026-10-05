---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# Technical and Consumer Audit

## Conclusion

The project has a strong functional foundation: events, awaited events, async iteration, computed signals, external
sources and React. Existing specifications are substantially broader than demonstration examples. Current consumer
obstacles are signal retention by global listeners, unfinished distribution, imprecise generic contracts and an
unverified claim of full Node compatibility. The detailed findings below provide locations and recommendations.

The recommended first release resolves P0 lifecycle and packaging issues and limits promises to a verified environment
matrix. New features do not replace that work.

## Method and Observed Results

At the original audit on 2026-10-05, no local AGENTS.md was found in the repository or its parent directories. The audit
read the then-current .github/copilot-instructions.md, EventSignal knowledge, project overviews, improvement plans,
Junct and WEATHER documents. The checkout already contained changes to .gitattributes, .github/skills-EventSignal.md and
WEATHER/Junct documents; the audit did not overwrite them. On 2026-10-06, AGENTS.md and .agents/rules became the
instruction sources; this documentation update follows them and does not rerun or relabel the historical results.

Verification environment: Windows, Node 26.8.1 and installed TypeScript 5.9.3. These describe the observed local run,
not the chosen minimum supported versions.

| Check                                                        | Result                                                                                          | Interpretation                                                                                          |
|--------------------------------------------------------------|-------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Jest through the local CLI, --runInBand --ci, separate cache | 3 suites: 2 passed, 1 failed; 352 passed, 14 failed, 1 skipped, 6 todo; 373 total               | EventSignal_spec and test_spec passed; events_spec failed                                               |
| Classification of 14 failures                                | 12 with performance.mark is not a function; 2 with error test in EventTarget/iterator scenarios | Environment limitations, test isolation and runtime defects still need separation; causes are not fixed |
| tsc -p tsconfig.json --noEmit --incremental false            | exit 2, 372 diagnostics; 37 directly under modules/                                             | Broad include captures demos/dependencies; diagnostics are not confined to demos                        |
| Dependency-registry probe                                    | 100 computed derived signals → 100 listeners; explicit destructor → 0                           | Explicit cleanup works for this path                                                                    |
| Probe after dropping external derived references             | 5 event-loop cycles + global.gc(): 100 listeners, final WeakRef alive                           | The retaining path was reproduced; a bounded GC run does not establish every leak variant               |

The GC probe used local ts-node transpileOnly and existing polyfills. It is a separate runtime experiment, not a type
check. Commands and the probe are preserved in verification/; library sources were unchanged. Jest did not update
snapshots.

## Issue Registry

The registry summarizes detailed findings rather than replacing their source evidence.

| ID       | Status / priority                               | Observation                                                             | Consumer effect                                                         | Stage  |
|----------|-------------------------------------------------|-------------------------------------------------------------------------|-------------------------------------------------------------------------|--------|
| MEM-01   | confirmed, P0                                   | Global dependency listener closes over the derived instance             | Removed Models/Views can retain data/computation                        | 02     |
| MEM-02   | risk, P0                                        | Finalization does not break strong retention before GC                  | Automatic cleanup assumptions are unsafe                                | 02     |
| PKG-01   | confirmed, P0                                   | Missing root index and referenced build configurations                  | Standard import/build is not provided                                   | 06     |
| PKG-02   | intentional temporary scheme, P0 before release | Local links/aliases and different package names                         | Independent tarball installation is unverified                          | 05     |
| PKG-03   | confirmed, P0                                   | Inconsistent wildcard require extension; root lacks exports/types/files | Inconsistent resolution and uncontrolled package contents               | 05, 06 |
| DEV-01   | confirmed, P0                                   | Placeholder test, development postinstall, latest TypeScript            | Consumer install depends on author tooling; builds lack reproducibility | 01, 06 |
| TYPE-01  | confirmed, P0                                   | createSignal overload loses parameters; get casts to R                  | Source/data/sync-async types may be inaccurate                          | 03     |
| TYPE-02  | confirmed, P1                                   | Unconstrained mutate; map preserves S and suppresses overload error     | Invalid fields may compile; projection write semantics are unclear      | 03     |
| API-01   | confirmed, P1                                   | eventNames omits Symbol keys                                            | Node discrepancy and incomplete diagnostics                             | 03     |
| API-02   | verification needed, P0 for claims              | README claims full compatibility; iterator options have TODOs           | Consumers may expect unimplemented behavior                             | 03     |
| LIFE-01  | confirmed in source, P1                         | unsubscribe does not guard the closed flag                              | Repeated cleanup requires runtime verification                          | 02     |
| LIFE-02  | static risk, P1                                 | Cleanup callbacks are sequential without exception isolation            | One exception may interrupt remaining cleanup                           | 02     |
| REACT-01 | risk, P1                                        | Core embeds hooks/registration; synthetic tests dominate                | Tight coupling and unverified real React/SSR contracts                  | 04, 07 |
| FLOW-01  | observed architecture, P2                       | Array queues/shift; watermarks are TODOs                                | Slow-consumer memory growth needs workload measurement                  | 09     |

## Detailed Findings

#### 🔴 MEM-01 — Global callbacks retain derived signals

**Problem:**
Confirmed P0: the module registry stores a callback closing over this. Dropping external references does not remove that
retaining path. The original probe retained 100 listeners and its final child after five GC cycles; explicit cleanup
removed the 100 listeners.

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 30–40

```typescript
//  2. Кидать события onCreateEventSignal, onDestroyEventSignal и другие
//  3. Добавить в опции конструктора EventSignal свойство "domain" для переопределения, какой signalEventsEmitter использовать.
const signalEventsEmitter = new EventEmitterX({
    listenerOncePerEventType: true,
});
const timersTriggerEventsEmitter = new EventEmitterX({
    listenerOncePerEventType: true,
});

const subscribersEventsEmitter = new EventEmitterX({
    listenerOncePerEventType: true,
```

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 101–105

```typescript
    private readonly _oneOfDepUpdated = (noEventSignalDepUpdate?: boolean) => {
        const stateFlags = this._stateFlags;
        const hasNoThrottle_or_wasThrottleTrigger = ((stateFlags & EventSignal.StateFlags.hasThrottle) === 0
            || (stateFlags & EventSignal.StateFlags.wasThrottleTrigger) !== 0
        );
```

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 1833–1836

```typescript
            //    2.1. cleanupCallback(onTeardown) - коллбек, который должен вызываться, когда этот listener удаляется
            //    2.2. weakSpyOnTarget - объект, который нужно добавить в WeakMap и при удалении которого GC мы должны удалить listener (это будет проверять setInterval каждые 2-5 минут).
            signalEventsEmitter.addListener(signalSymbol, this._oneOfDepUpdated);
        }
```

**Recommendation:**
Use weak instance lookup in registry callbacks and non-retaining cleanup metadata; map every strong reference and verify
heap retaining paths alongside deterministic destructor tests. Stage 02.

#### 🟠 MEM-02 — Finalization does not break strong retention

**Problem:**
P0 lifecycle risk: registration/finalization by symbol can remove listeners only after the target becomes eligible for
collection. It cannot make a strongly retained target collectible and does not represent complete timer/source/abort
cleanup.

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 574–577

```typescript
        });

        eventSignalsFinalizationRegistry?.register(this, this._signalSymbol);
    }
```

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 3404–3410

```typescript
if (typeof FinalizationRegistry !== 'undefined') {
    eventSignalsFinalizationRegistry = new FinalizationRegistry(signalSymbol => {
        signalEventsEmitter.removeAllListeners(signalSymbol);
        subscribersEventsEmitter.removeAllListeners(signalSymbol);
    });
}

```

**Recommendation:**
First remove strong retaining paths. Treat finalization as a fallback; retain deterministic destructor/abort cleanup and
define guarantees in environments without native WeakRef. Stage 02.

#### 🟠 PKG-01 — Root entry and build configurations are missing

**Problem:**
Confirmed P0: the manifest references index.ts and tsconfig.cjs.json/tsconfig.esm.json, which were absent in the
inspected checkout. A standard root import and the declared dual build cannot be validated as supplied.

**File:** `package.json`, lines 7–16

```json
  "type": "commonjs",
  "main": "index.ts",
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "postinstall": "node _dev/postinstall/index.cjs",
    "test": "echo \"Error: no test specified\" && exit 1",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build": "npm run build:cjs && npm run build:esm",
    "build:parallel": "npm run build:cjs & npm run build:esm"
```

**Recommendation:**
Implement the public root index with the EventEmitter alias and real CJS/ESM/declaration builds; verify packed entry
points in clean consumers. Preserve the intended TypeScript source distribution. Stage 06.

#### 🔵 PKG-02 — Local dependencies are intentionally provisional

**Problem:**
P0 before publication, not an accidental development defect: termi@ aliases use link: paths while the linked manifests
declare different canonical names. Installation outside the checkout is unverified. Existing dist artifacts are not
proof of reproducible independent packages.

**File:** `package.json`, lines 18–26

```json
  "dependencies": {
    "~": "link:./",
    "termi@ProgressControllerX": "link:./packages/ProgressControllerX",
    "termi@ServerTiming": "link:./packages/ServerTiming",
    "termi@abortable": "link:./packages/abortable",
    "termi@polyfills": "link:./packages/polyfills",
    "termi@runEnv": "link:./packages/runEnv",
    "termi@type_guards": "link:./packages/type_guards",
    "typescript": "latest"
```

**File:** `packages/runEnv/package.json`, lines 1–7

```json
{
  "name": "@termi/runenv",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.mjs",
  "types": "./dist/esm/index.d.ts",
```

**File:** `packages/type_guards/package.json`, lines 1–7

```json
{
  "name": "@repo/type_guards",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.mjs",
  "types": "./dist/esm/index.d.ts",
```

**File:** `packages/abortable/package.json`, lines 1–7

```json
{
  "name": "@termi/abortable",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.mjs",
  "types": "./dist/esm/index.d.ts",
```

**Recommendation:**
Inventory sources/builds and choose canonical names and a publication graph. Check JS, source and public declarations
without local links or cftools. Revisiting the packages/ edit restriction is deferred; do not modify it now. Stage 05.

#### 🟠 PKG-03 — Export paths and package contents need a consistent contract

**Problem:**
Confirmed P0: type_guards root require selects .cjs while wildcard require selects .mjs under dist/cjs. The inspected
root manifest has no exports/types/files contract; its main points at the unfinished source entry. A clean tarball
matrix has not verified resolution or controlled package contents.

**File:** `packages/type_guards/package.json`, lines 8–21

```json
  "exports": {
    ".": {
      "types": "./dist/esm/index.d.ts",
      "require": "./dist/cjs/index.cjs",
      "import": "./dist/esm/index.mjs",
      "default": "./dist/esm/index.mjs"
    },
    "./package.json": "./package.json",
    "./*": {
      "types": "./dist/esm/*.d.ts",
      "require": "./dist/cjs/*.mjs",
      "import": "./dist/esm/*.mjs",
      "default": "./dist/esm/*.mjs"
    }
```

**File:** `package.json`, lines 1–16

```json
{
  "name": "@termi/eventemitterx",
  "version": "0.1.0",
  "description": "Another implementation of EventEmitter for Nodejs and browsers",
  "license": "ISC",
  "author": "",
  "type": "commonjs",
  "main": "index.ts",
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "postinstall": "node _dev/postinstall/index.cjs",
    "test": "echo \"Error: no test specified\" && exit 1",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build": "npm run build:cjs && npm run build:esm",
    "build:parallel": "npm run build:cjs & npm run build:esm"
```

**Recommendation:**
Align require/import/types subpaths with actual output and use an explicit file allowlist. Verify both root and wildcard
resolution against the tarball. Package changes remain planned until the restriction is revisited. Stages 05–06.

#### 🟠 DEV-01 — Development setup obscures release verification

**Problem:**
Confirmed P0: the root test script is a placeholder, postinstall patches ts-node/Jest, and TypeScript is a latest
runtime dependency. ts-jest also disables strict options. Passing runtime tests therefore does not establish strict
declaration correctness or a reproducible consumer install.

**File:** `package.json`, lines 10–15

```json
    "preinstall": "npx only-allow pnpm",
    "postinstall": "node _dev/postinstall/index.cjs",
    "test": "echo \"Error: no test specified\" && exit 1",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build": "npm run build:cjs && npm run build:esm",
```

**File:** `package.json`, lines 24–27

```json
    "termi@runEnv": "link:./packages/runEnv",
    "termi@type_guards": "link:./packages/type_guards",
    "typescript": "latest"
  },
```

**File:** `_dev/postinstall/index.cjs`, lines 1–9

```typescript
'use strict';

const { fix_ts_node_configuration } = require('./lib/ts-node.cjs');
const { fix_node_modules_jest_runner_testWorker } = require('./lib/jest-runner_testWorker.cjs');
const { patch_node_modules_jest_snapshot_InlineSnapshots } = require('./lib/jest-snapshot_InlineSnapshots.cjs');

fix_ts_node_configuration();
fix_node_modules_jest_runner_testWorker();
patch_node_modules_jest_snapshot_InlineSnapshots();
```

**File:** `jest.config.main.ts`, lines 73–83

```typescript
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

```

**Recommendation:**
Separate explicit development setup from consumer install, pin tooling and provide working library tests plus
independent strict type/declaration checks. Investigate the historical failures without disabling assertions. Stages 01
and 06.

#### 🟠 TYPE-01 — Factory overload and read types lose precision

**Problem:**
Confirmed P0: one createSignal overload returns EventSignal<T,T> despite accepting S/D/R options; get casts runtime
values/promises to R. This is source evidence of an incomplete contract, not a proof that every overload is wrong.

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 2619–2622

```typescript
    static createSignal<T>(initialValue: T): EventSignal<T, T>;
    static createSignal<T, S, D, R = T>(initialValue: T, computation: EventSignal.ComputationWithSource<T, S, D, T>, options?: EventSignal.NewOptions<T, S, D, R> | EventSignal.NewOptionsWithSource<T, S, D, R>): EventSignal<T, S, D, R>;
    static createSignal<T, S, D, R = T>(initialValue: T, options: EventSignal.NewOptionsWithSource<T, S, D, R>): EventSignal<T, S, D, R>;
    static createSignal<T, S, D, R>(initialValue: T, options: EventSignal.NewOptions<T, S, D, R>): EventSignal<T, T>;
```

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 1289–1296

```typescript
        }

        if ((stateFlags & EventSignal.StateFlags.wasLastAsyncComputation) !== 0) {
            return Promise.resolve(this._value) as unknown as R;
        }

        return this._value as unknown as R;
    };
```

**Recommendation:**
Define value/source/data/read-result roles and sync/async/hybrid semantics, then complete overloads and compile
positive/negative consumers against emitted declarations. Stage 03.

#### 🟠 TYPE-02 — Mutation and projection types need explicit constraints

**Problem:**
Confirmed P1: mutate provides a generic default without an extends constraint. map preserves the original S and
suppresses a constructor-overload error; projected getter/setter semantics are therefore unclear and invalid mutation
inputs may be inferred.

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 1468–1474

```typescript
    mutate<PROPS=Partial<Awaited<S>>>(props: PROPS) {
        if (props == null || (this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            return false;
        }

        if (typeof props !== 'object') {
            if (this._setSourceValue(props as S, true)) {
```

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 2537–2547

```typescript
    map<CR>(computation: (currentSourceValue: T) => CR) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore `TS2769: No overload matches this call.
        //   Overload 1 of 5, '(initialValue: CR | Awaited<CR>, options: NewOptions<CR, S, undefined> | NewOptionsWithSource<CR, S, undefined>): EventSignal<...>', gave the following error.
        //     Argument of type '() => CR' is not assignable to parameter of type 'NewOptions<CR, S, undefined> | NewOptionsWithSource<CR, S, undefined>'.
        //     Overload 2 of 5, '(initialValue: CR | Awaited<CR>, computation: ComputationWithSource<CR, S, undefined>): EventSignal<CR, S, undefined>', gave the following error.
        //       Argument of type '() => CR' is not assignable to parameter of type 'ComputationWithSource<CR, S, undefined>'.
        // `
        return new EventSignal<CR, S>(void 0 as CR, () => {
            return computation(this.get() as unknown as T);
        });
```

**Recommendation:**
Constrain allowed object fields/values and define scalar behavior separately. Keep first-release map one-way with
explicit write permissions and test revision→DTO plus sync/async projections. Stage 03.

#### 🟠 API-01 — eventNames omits Symbol events

**Problem:**
Confirmed P1: Object.keys does not enumerate Symbol keys, although signals and consumers can use Symbol events. This
differs from native Node behavior and can hide registrations in diagnostics.

**File:** `modules/events.ts`, lines 1384–1389

```typescript
    eventNames(): NodeEventName[] {
        // todo:
        //  1. return number key as number
        //  2. return Symbol's keys: `[ ...Object.keys(this._events), ...Object.getOwnPropertySymbols(this._events) ]`
        return Object.keys(this._events);
    }
```

**Recommendation:**
Include Symbol keys and compare ordering/return values with native node:events; test numeric keys as a separate project extension. Use direct listenerCount(symbol) for the current retention probe. Stage 03.

#### 🟠 API-02 — Full Node compatibility is not established

**Problem:**
P0 for release claims: README says full Node.js EventEmitter API compatibility, while iterator close/watermark options remain TODOs. Class compatibility and the entire events module are different scopes; the claim needs a versioned matrix rather than assumption.

**File:** `README.md`, lines 9–16

```markdown
### EventEmitterX
- ✅ Full Node.js `EventEmitter` API compatibility
- 🌐 Works in browsers without polyfills
- 🔒 `listenerOncePerEventType` — prevent duplicate listeners per event
- 📊 `emitCounter` — count emit calls for monitoring
- ⏱️ Enhanced `static once()` — Promise-based with **filter**, **timeout**, **AbortSignal**, **multiple event names**, and both `EventEmitter`/`EventTarget` support
- 🔄 `static on()` — async iterator for event streams with value transformation
- 🧹 `destructor()` / `Symbol.dispose` — safe resource cleanup
```

**File:** `modules/EventEmitterEx/eventsAsyncIterator.ts`, lines 65–75

```typescript
    /**
     * todo: make compatible with nodejs `events.on#options.close` (https://github.com/nodejs/node/blob/71951a0e86da9253d7c422fa2520ee9143e557fa/lib/events.js#L1010)
     *  1. make it array
     *  2. rename to 'close' as in [nodejs.events.on.options](https://nodejs.org/api/events.html#eventsonemitter-eventname-options)
     *  3. add to 'closeEventFilter(this: EventsAsyncIterator, eventName: EventName, ...args)'
     */
    stopEventName?: EventName | null,
    /**
     * todo:
     *  1. make it array
     *  2. rename to 'error'
```

**File:** `modules/EventEmitterEx/eventsAsyncIterator.ts`, lines 80–87

```typescript
     * @see [MDN / ReadableStream / queuingStrategy.highWaterMark]{@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream#highwatermark}
     * @see [NodeJS / api / events / on.options / (highWaterMark, lowWaterMark)]{@link https://nodejs.org/api/events.html#eventsonemitter-eventname-options}
     */
    // todo: add highWaterMark?: number, также добавить поддержку свойства "highWatermark" - для совместимости с `nodejs events.on` (только если в nodejs не переименуют свойство в highWaterMark)
    //  Default: `Number.MAX_SAFE_INTEGER` The high watermark. The emitter is paused every time the size of events being buffered is higher than it. Supported only on emitters implementing `pause()` and `resume()` methods.
    // todo: add lowWaterMark?: number, также добавить поддержку свойства "lowWatermark" - для совместимости с `nodejs events.on` (только если в nodejs не переименуют свойство в lowWaterMark)
    //  Default: `1` The low watermark. The emitter is resumed every time the size of events being buffered is lower than it. Supported only on emitters implementing `pause()` and `resume()` methods.
    isDebug?: boolean,
```

**Recommendation:**
Run differential tests for the default class and separately classify static helpers/options as supported, extended,
different or absent. Publish only the verified claim. Stage 03.

#### 🟡 LIFE-01 — Repeated unsubscribe has no closed guard

**Problem:**
Confirmed source observation, P1: unsubscribe sets closed, removes the listener and clears its reference, but a
subsequent call still enters removal. Whether this causes a runtime error depends on the removal path and needs testing.

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 1921–1930

```typescript
        let closed = false;
        let suspended = false;
        const unsubscribe = () => {
            closed = true;

            this._removeListener(ignoredEventName, listener, true);

            listener = void 0;
        };

```

**Recommendation:**
Return early for a closed subscription and test repeated unsubscribe, suspended unsubscribe, resume after closure and
cleanup after destruction. Stage 02.

#### 🟠 LIFE-02 — Cleanup exceptions may interrupt resource release

**Problem:**
Static P1 risk: source/trigger/throttle cleanup runs sequentially before registry cleanup and onDestroy. A throwing
callback can interrupt later steps. A successful explicit-cleanup probe does not verify these exception paths.

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 713–737

```typescript
        if (_sourceCleanup) {
            _sourceCleanup();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this._sourceCleanup = void 0;
        }
        if (_triggerCleanUp) {
            _triggerCleanUp();
            this._triggerCleanUp = void 0;
        }
        if (_throttleCleanUp) {
            _throttleCleanUp();
            this._throttleCleanUp = void 0;
        }

        /**
         * Удаляем подписки ДРУГИХ сигналов на этот EventSignal.
         */
        signalEventsEmitter.removeAllListeners(_signalSymbol);
        /**
         * Удаляем подписки которые были повешены в функции [on]{@link on}.
         */
        subscribersEventsEmitter.removeAllListeners(_signalSymbol);

        _onDestroy?.();
```

**Recommendation:**
Use fault-injection tests and guarantee remaining cleanup through guarded steps/finally with an explicit error-reporting
policy. Verify idempotence after partial failure. Stage 02.

#### 🟡 REACT-01 — React coupling needs extraction and real-framework verification

**Problem:**
P1 architecture/testing risk: core contains hook calls and component registration, while the signal specification
explicitly includes synthetic fakeReact tests. These are useful but do not establish real concurrent React, StrictMode
or SSR behavior.

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 2213–2217

```typescript
                }, [ this, reducer ]);

                return _useSyncExternalStore(this.subscribeOnNextAnimationFrame, getSnapshot);
                // return _useSyncExternalStore(this.subscribeOnNextAnimationFrame, () => {
                //     if (!reducerResultCache) {
```

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 2762–2770

```typescript

            reactInit: if ('useSyncExternalStore' in __React) {
                _EventSignal_prototype._useSyncExternalStore = _useSyncExternalStore = __React.useSyncExternalStore;
                _EventSignal_prototype._useRef = __React.useRef;
                _EventSignal_prototype._useState = __React.useState;
                _EventSignal_prototype._useEffect = _useEffect = __React.useEffect;
                _EventSignal_prototype._useLayoutEffect = __React.useLayoutEffect || __React.useEffect;
                _EventSignal_prototype._useCallback = __React.useCallback;

```

**File:** `spec/modules/EventEmitterEx/EventSignal_spec.ts`, lines 3777–3783

```typescript
    describe('Synthetic testing of React (using own fakeReact)', function() {
        const { requestAnimationFrame } = globalThis;
        const currentReact = EventSignal._React;

        beforeAll(() => {
            // @ts-expect-error
            globalThis.requestAnimationFrame = queueMicrotask;
```

**Recommendation:**
Extract the React adapter with git-history preservation and add real supported-version fixtures for snapshots, hydration
and repeated cleanup. Keep synthetic tests for focused behavior. Stages 04 and 07.

#### 🟡 FLOW-01 — Iterator buffering needs measured backpressure

**Problem:**
Observed architecture, P2: pending events use an array with shift and watermark support is commented out. A slow
consumer can accumulate queued events; the workload impact and correct termination semantics need measurement rather
than a universal performance claim.

**File:** `modules/EventEmitterEx/eventsAsyncIterator.ts`, lines 309–317

```typescript
                return;
            }
        }

        unconsumedEvents.push({
            eventName: event,
            eventArgs: eventArgs as unknown as T,
        });
    };
```

**File:** `modules/EventEmitterEx/eventsAsyncIterator.ts`, lines 497–504

```typescript
            // First, we consume all unread events
            if (unconsumedEvents.length > 0) {
                const unconsumedEvent = unconsumedEvents.shift();

                if (unconsumedEvent) {
                    const { eventName, eventArgs } = unconsumedEvent;
                    let value = eventArgs as T;
                    let computeValueStep1Result: ReturnType_computeValueStep1["step1Result"] | void = void 0;
```

**File:** `modules/EventEmitterEx/eventsAsyncIterator.ts`, lines 80–87

```typescript
     * @see [MDN / ReadableStream / queuingStrategy.highWaterMark]{@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream#highwatermark}
     * @see [NodeJS / api / events / on.options / (highWaterMark, lowWaterMark)]{@link https://nodejs.org/api/events.html#eventsonemitter-eventname-options}
     */
    // todo: add highWaterMark?: number, также добавить поддержку свойства "highWatermark" - для совместимости с `nodejs events.on` (только если в nodejs не переименуют свойство в highWaterMark)
    //  Default: `Number.MAX_SAFE_INTEGER` The high watermark. The emitter is paused every time the size of events being buffered is higher than it. Supported only on emitters implementing `pause()` and `resume()` methods.
    // todo: add lowWaterMark?: number, также добавить поддержку свойства "lowWatermark" - для совместимости с `nodejs events.on` (только если в nodejs не переименуют свойство в lowWaterMark)
    //  Default: `1` The low watermark. The emitter is resumed every time the size of events being buffered is lower than it. Supported only on emitters implementing `pause()` and `resume()` methods.
    isDebug?: boolean,
```

**Recommendation:**
Benchmark slow-consumer workloads, design bounded-buffer/overflow and pause/resume policies, and verify
abort/return/throw and event ordering before replacing queues. Stage 09.

In the inspected checkout, packages/*/dist contains artifacts (for example, four files each for runEnv and abortable).
The Junct document describes missing dist in another saved revision; current completeness and independence require
separate verification. Artifacts alone do not establish available sources or reproducible package builds.

## Consumer Perspective

1. **Node service author:** wants to replace the EventEmitter import and expects the same call order, this, duplicate
   listeners, error semantics and Symbol events. An alias is appropriate; compatibility claims require differential
   tests.
2. **Browser application author:** expects compact ESM without server runtime dependencies and usable subpath imports.
   Measure the EventSignal → EventEmitterX → abortable graph.
3. **React application author:** wants stable snapshots, cleanup on unmount and a shared Model for React/terminal
   consumers. Consumers should not need get after every set or create signals during render.
4. **TypeScript library author:** expects precise source/output types, invalid-mutation errors and generated
   declarations without a fictional reduced interface.
5. **Bun/Deno application author:** wants an official source export with resolvable imports; .ts files in a tarball do
   not guarantee runtime support.
6. **New user:** wants one root import, a short lifecycle recipe and an explicit supported-feature table. README deep
   imports, multiple getter forms and Promise/undefined semantics increase onboarding time; source details are included
   in the findings.

## Growth Opportunities

- An emitter/EventTarget → signal → React bridge without duplicate state is the main practical scenario to make
  exemplary.
- EventAwait as a standalone module is useful without signals/React.
- Small verified subpath exports, independent dependencies and real consumer fixtures offer more first-release value
  than enlarging the API.
- Separating core/React/lifecycle reduces the cost of future audits and the likelihood of hidden import cycles.
- The weather demo can validate cancellation, TTL, lazy projections and resource release as well as UI behavior.

## External References

The Node matrix uses the [official events documentation](https://nodejs.org/api/events.html): synchronous listeners,
this, Symbol events and on/once options. It is a reference for future differential tests, not a compatibility
certificate for the project.

React uses the [official useSyncExternalStore contract](https://react.dev/reference/react/useSyncExternalStore):
snapshot stability and server snapshots. Verify real versions declared by the release; studied documentation does not
replace local verification.
