---
iso date: "2026-10-06T12:42:03.527Z"
timestamp: 1791290523527
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 03 — Public Contracts and Precise Types

Priority P0 for declarations and compatibility; P1 for convenience. Depends on 01; lifecycle is checked alongside 02.

## 03.1 — Automatic Signal Type Inference

Status: core implemented on TypeScript 5.9.3. See [contract, decisions and migration](03_SIGNAL_CONTRACT.md).

- [x] Define T/S/D/R, initial/resolved output and source/data separately.
- [x] Check inline, named, Jest mock and self.data callbacks; sync/async/hybrid, Promise initial values, literals, unions, null and undefined.
- [x] Repair constructor/createSignal inference; preserve explicit full-self overloads.
- [x] Align readers, listeners, React snapshots, set/mutate/map and createMethod.
- [x] Strict source fixtures and emitted-declaration consumers under CommonJS, NodeNext and Bundler.
- [x] Document inference boundaries, alternatives and migration.
- [ ] Check additional TypeScript/runtime versions and choose a supported range.
- [ ] Validate real React/SSR consumers and published package resolution.

Run `pnpm typecheck:signals`. The command explicitly accounts for 36 existing library diagnostics. Declaration consumers use skipLibCheck to check public use; the full library typecheck remains failing.

## 03.1.1 — Inline Data with Nested Methods

- [ ] Restore automatic D inference for inline data containing nested methods with default parameters, alongside a contextually typed computation callback. The reported constructor case currently selects D=undefined; reproduce it in strict source and emitted-declaration fixtures before changing signatures.
- [ ] Cover constructor and createSignal, access through self$.data, optional numeric method arguments and invalid arguments; keep sync/async/hybrid inference and full self API checks passing.
- [ ] Compare independent options/data inference with a factory or staged builder. Preserve existing generic positions and assess migration before adding an options generic; constructor overloads cannot declare their own type parameters.

Current mitigation: declare the data object in a local variable before the call. Its methods and data type are inferred without casts or explicit generics. This resolves the reported specification case but does not restore the original inline form. Signature experiments did not resolve the reproduction without losing other type checks; the broader API change is deferred rather than weakening declarations.

## 03.2 — Ordered Computed Reducers and Async Output Waiting

Status: implemented. Three consecutive `set(v => ++v)` calls in the trigger regression produce 4 without a workaround.

- [x] Private working output preserves distinct source and ordered reducers.
- [x] Count intermediate computations, cache previews and invalidate on source/dependency updates.
- [x] Keep literal writes lazy, notification coalescing and throttle-controlled publication.
- [x] Queue on pending output; order interleaved writes and generated methods.
- [x] Define void/Promise completion, errors, pending initial values and recovery.
- [x] Reject Promise-returning reducers and mutation bypass of pending writes.
- [x] Dispose/abort queued callbacks and suppress late completion after destruction.
- [x] Test transformed output, null, undefined/no-update, async races, subscribers and triggers.

The instance owns its uncapped queue until settlement or explicit disposal/abort. Global registry retention remains [stage 02](02_LIFECYCLE.md); automatic collection is not established.

## Remaining EventSignal Work

- [ ] Define an explicit runtime async read contract so Promise-only get typing is
  sound even for ordinary Promise-returning functions disposed before their first
  invocation. Compare a declared read mode with a dedicated async factory;
  preserve inference, laziness and synchronous/hybrid consumers. R alone is erased.
- [ ] Systematically check dynamic dependencies, cycles and before/after-await boundaries; do not promise absent async tracking.
- [ ] Verify a DTO projection over numeric revision and integration cleanup.
- [ ] Consider metadata-preserving or two-way projection APIs separately; current map is one-way.
- [ ] Repair global retention and subscription ownership in stage 02 before release.
- [ ] Consider independently cancellable writes or queue limits when supported by consumer evidence; do not silently drop accepted writes.

## EventEmitterX and the EventEmitter Alias

The reference is `node:events` (the discussion's `node:event` spelling is corrected to the actual built-in). The alias
exports the same constructor, not a wrapper or a different implementation.

- [ ] A differential suite compares default configuration with native EventEmitter: ordering, synchronous emit, this,
  duplicate listeners, once wrappers/rawListeners, prepend, removeListener/removeAllListeners,
  listeners/eventNames/listenerCount, listener changes during emit, newListener/removeListener, error/errorMonitor,
  captureRejections and maxListeners.
- [ ] Fix Symbol handling in eventNames; test numeric names as an explicit extension, not default Node behavior.
- [ ] Create a separate matrix for static once/on/addAbortListener/getEventListeners and options: implemented, extended,
  different or absent. Do not promise the entire node:events module based on class compatibility.
- [ ] Check event-map types, tuples/readonly tuples, symbol keys, this, overloads and structural compatibility with Node
  EventEmitter.
- [ ] Compare AbortSignal/stopImmediatePropagation, once cleanup on success/error/abort/timeout and EventTarget
  semantics separately from Node.

Official reference: [Node events](https://nodejs.org/api/events.html). Choose and record the Node versions in the
matrix. Replace the README's “full compatibility” claim with the precise matrix result when implementing this stage; the
audit has not changed README.

## Completion

Every public form has a precise runtime/type example, negative type checks, documented cleanup and an async contract.
Junct consumers do not need a reduced interface, a StateSignal wrapper or forced reads after set. Breaking changes have
migration examples.
