---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 03 — Public Contracts and Precise Types

Priority P0 for correct public declarations and compatibility claims, P1 for convenience extensions. Depends on 01;
lifecycle is verified alongside 02.

## EventSignal

- [ ] Establish the runtime roles of T (value), S (source), D (data) and R (computation/get result), then agree on one
  sync/async/hybrid model.
- [ ] Complete every createSignal and constructor overload; check initialValue/computation/options/source/data
  inference, literals, unions, undefined and Promise. Preserve the existing createSignal(value) form.
- [ ] Document pending, error, last-value behavior and exact return types for
  get/getSync/getSafe/getSyncSafe/getLast/tryGet; remove unjustified casts and unused ts-expect-error directives.
- [ ] Constrain mutate according to the chosen source semantics: unknown keys and incorrect values must be rejected.
  Scalars need a separate verified form. A generic default is not a constraint.
- [ ] Define map as a one-way computed projection for the first release. Express write permissions in types; design
  two-way transformations as a separate later API rather than implicitly implementing a TODO.
- [ ] Define whether map preserves data/React metadata, the resulting source type and the derived lifetime. Check a DTO
  projection over a numeric revision.
- [ ] Preserve undefined from computation as “no update”; describe how to store/read undefined as a value without
  silently changing semantics.
- [ ] Describe laziness without subscribers, active microtask recalculation, coalescing of synchronous set calls and
  errors; verify forced get is not needed to notify an active subscriber.
- [ ] Check dynamic dependencies, cycles and reads before/after await; do not promise async dependency tracking beyond
  the implementation.
- [ ] Add positive and negative compile fixtures against final declarations, not only sources. Check NodeNext and
  Bundler resolution; choose the supported TS range from tests.

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
