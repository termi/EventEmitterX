---
iso date: "2026-10-08T22:55:40.798Z"
timestamp: 1791500140798
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, types, tests, docs"
---

# EventEmitterX compatibility: verified scope

## Reference and coverage

The reference for this run is the installed native `node:events` on Node 26.8.1, Windows x64.
This is a focused matrix, not a declaration of complete Node module compatibility or a supported-runtime range.
Run `pnpm verify` to check library types, consumers, runtime specifications, builds and GC separately.

`spec/node/events_node_spec.ts` explicitly uses the Node environment. The existing emitter suite and
`spec/modules/events_dom_spec.ts` explicitly use jsdom. A DOM EventTarget is not a Node EventEmitter;
error-event handling, event objects and options must be assessed separately.

| Contract                                                      | Evidence                                                          | Status                                                                                                         |
|---------------------------------------------------------------|-------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| Synchronous emit, order, listener this and duplicates         | Native differential sequence                                      | Checked                                                                                                        |
| Once/prependOnce and nested once                              | Differential sequence and wrapper identity tests                  | Checked                                                                                                        |
| Listener mutation during emit                                 | Removing an existing callback and adding another                  | Checked for that scenario                                                                                      |
| listeners/rawListeners and original once identity             | Native and custom callbacks, removal by original identity         | Checked; raw wrappers expose `.listener`                                                                       |
| eventNames string/symbol/numeric order                        | Native differential enumeration before/after removal              | Checked; numeric input is an explicit type extension and becomes a string key                                  |
| newListener/removeListener identity for once                  | Native differential lifecycle sequence                            | Checked for once delivery                                                                                      |
| Static once success/error/abort cleanup                       | Native and custom implementations in Node                         | Checked                                                                                                        |
| Static on next/return/throw cleanup                           | Native and custom implementations in Node                         | Cleanup checked; immediate throw result parity is not claimed                                                  |
| captureRejectionSymbol and ordinary async listener hook       | Standard symbol identity and custom hook result                   | Checked                                                                                                        |
| DOM wait success/abort with timing                            | DOM event identity, explicit provider and listener removal        | Checked separately                                                                                             |
| Structural Node EventEmitter assignment                       | Strict source and emitted-declaration fixtures                    | Checked as a type contract, not proof of runtime equivalence                                                   |
| Typed closed-object event maps and symbol payloads            | Positive/negative source and declaration fixtures                 | Checked for current function-based map form                                                                    |
| error/errorMonitor and async once rejection                   | Monitor-before-throw, handler mutation, raw Promise and hook this | Checked for these scenarios; maxListeners remains open                                                         |
| addAbortListener/stopImmediatePropagation                     | Paired native Node tests and separate DOM fallback tests          | Native capability checked; browser propagation limitation explicit; complete static helper matrix remains open |
| readonly tuple maps and a broader type/runtime version matrix | Additional strict fixtures and runtimes                           | Still open                                                                                                     |

## Timing provider

The `timing` option accepts `IEventTiming`, the structural protocol actually consumed by static once:

```typescript
import { EventEmitterX, type IEventTiming } from './modules/events';

const timing: IEventTiming = {
    time(names) { /* Start synchronous measurement(s). */ },
    timeEnd(names, omitNotExisted) { /* End measurement(s). */ },
};
const emitter = new EventEmitterX();
const pending = EventEmitterX.once(emitter, 'data', { timing });
emitter.emit('data', 7);
await pending;
```

`timeClear` is optional; `time` and `timeEnd` are required. Inputs may be individual event names or arrays.
Existing ServerTiming instances remain structurally compatible. The library does not instantiate or import a
concrete timing package through this type. Providers execute synchronously; this change does not add new
exception handling for a throwing provider.

ServerTiming tests in jsdom explicitly supply `node:perf_hooks.performance` through `customPerformance`.
They do not replace global DOM performance or fake successful timing calls. A custom browser/runtime provider
must supply the User Timing operations it uses; the library does not synthesize missing mark/measure capabilities.

## Types, builds and limits

Strict source checking and emitted-declaration consumers pass with `skipLibCheck: false` and zero allowed diagnostics.
Internal listener/debug/error and EventTarget feature metadata have localized types; global DOM/Node declarations
are not augmented and emitters do not gain an unrestricted symbol index signature. The capture-rejection hook has
the standard unique-symbol type. A public optional `.listener` describes once-wrapper introspection.

CJS and ESM development outputs include authored declaration inputs. The CJS output passes an actual runtime smoke;
ESM native package loading, `.mjs` naming, export maps and clean installed consumers remain stage 06 work.
No internal package, generated demo copy or instance-channel experiment was changed or adopted.

The current run passes 480 tests, with one existing skip and no todo cases. The ts-jest 27/TypeScript 5.9
peer warning remains; strict types are checked independently. See [verification and pending scenarios](../roadmap/verification/BASELINE_VERIFICATION.md).

## Error and abort migration — 2026-10-09

A monitor observes an unhandled error before emit throws. Monitor mutations determine the current error handlers.
Once callbacks now return their result to captureRejections; with capture disabled, rejected once Promises are no longer
privately logged/swallowed. Enable capture with an error handler/hook or catch in the callback. Rejection hooks receive the emitter as this.

Node addAbortListener delegates to the native capability when present. Browser fallback is once-only and disposable,
but cannot bypass stopImmediatePropagation. Pre-aborted registration now schedules a callback; immediate disposal does not
cancel it. The fallback supplies a synthetic abort Event; native pre-aborted delivery can omit the event argument.
Invalid null signal/callback now throws. Older/non-native environments use the fallback with its limits.

[Proxy ownership guide](PROXY_SUBSCRIPTIONS.md), [error delivery rationale](../changelogs/reasons/EventEmitterX_ERROR_DELIVERY.md),
[abort capabilities rationale](../changelogs/reasons/EventEmitterX_ABORT_LISTENER_CAPABILITIES.md).
