---
iso date: "2026-10-06T11:50:43.762Z"
timestamp: 1791287443762
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 03 — Public Contracts and Precise Types

Priority P0 for correct public declarations and compatibility claims, P1 for convenience extensions. Depends on 01;
lifecycle is verified alongside 02.

## 03.1 — Next: Automatic Signal Type Inference

Priority P0 for sound declarations and P1 for convenience. Schedule this immediately after the writable
reducer fix, before the remaining API/type work. Status: partially verified; the general repair is open.

### Verified Small Case

On TypeScript 5.9.3 the existing constructor already infers all type arguments for:

```ts
const signal$ = new EventSignal('initial', async (_prev, source) => `async:${source}`, {
    initialSourceValue: 0,
});
// EventSignal<string, number, undefined, Promise<string>>
// signal$.get(): Promise<string>; reducer prev: string; source: number
```

The runtime regression now uses this form without explicit generics.
`spec/types/EventSignal_inference.ts` checks exact inferred types for sync, async and writable constructors,
plus rejection of invalid source writes and reducers. A compiler-API check with project strict options finds
zero diagnostics in this fixture; imported dependencies still produce 43 diagnostics in that check.
This isolated result does not replace the library's existing strict-check baseline.

### 🟠 Warning — Inference Is Not Consistent Across Public Forms

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 63, 256–258, 2598–2610 and 3204–3208.

**Problem:** The class defaults R to T, constructor callbacks use ReturnTypeOrPromise<R>, while the
computation overload of createSignal fixes its callback result to T. Direct constructor inference works
for the small case above, but a factory call rejects its Promise result. Using self.data inside the
inline async constructor callback also makes inference fall back to R=string and produces TS2769.
A numeric initial value with string computation output produces TS2769 as well. Types printed for
rejected calls are compiler recovery types, not valid inferred contracts.

```ts
export class EventSignal<T, S=T, D=undefined, R=T> { /* ... */ }
// Existing factory computation parameter:
computation: EventSignal.ComputationWithSource<T, S, D, T>

// Reproductions without explicit type arguments:
EventSignal.createSignal('initial', async (_prev, source) => `value:${source}`,
    { initialSourceValue: 0 }); // TS2322: Promise<string> is not assignable to string
new EventSignal('initial', async (_prev, source, self) => `${source}:${self.data.step}`,
    { initialSourceValue: 0, data: { step: 1 } }); // TS2769
new EventSignal(0, (_prev, source) => `value:${source}`,
    { initialSourceValue: 0 }); // TS2769
```

**Recommendation:** Repair constructor and factory declarations together after defining the value/result
model. Do not widen every callback to any, hide failures with casts or change R's default globally as
a convenience patch. The self parameter introduces a recursive inference dependency; experiment with
separating inference inputs from the contextual self type before choosing a solution.

### Work and Acceptance

- [ ] Define initial/stored output, awaited computation output, source, data and raw computation result
  separately. Choose whether differing initial/output types are rejected clearly or represented as a union:
  the first prev can be the initial value, later prev can be the computed result.
- [ ] Build a compile matrix for inline callbacks, named callbacks, Jest mocks and callbacks using self.data;
  no-source versus initialSourceValue, sync/async/hybrid, Promise initial values, literals, null and undefined.
  Preserve undefined as no-update. Check constructor and createSignal with the same examples.
- [ ] Prototype inference on minimal declarations first. Compare a compatible T/S/D/R model with an output/source/data
  model deriving the result from the callback; prefer the least disruptive sound option. Keep existing explicit
  generic uses working or document their migration. TypeScript cannot infer information absent from arguments.
- [ ] Fix factory callback/result coupling and contextual self inference; then verify get/getLast/getSync/getSafe/
  getSyncSafe/tryGet, set/mutate, map, listeners and React declarations against that model. Preserve laziness,
  accepted-write accumulation, pending/error behavior and microtask scheduling.
- [ ] Add a dedicated strict compile-fixture command with positive exact-type assertions and negative checks;
  do not treat relaxed ts-jest as proof. Existing imported diagnostics remain visible and must be accounted for.
  Check emitted declarations and the supported TS versions as part of stage completion.
- [ ] Document common calls without generic arguments, the cases requiring annotations, and migration examples
  for any breaking changes. Match constructor and factory results; no accidental any/unknown or silently
  synchronous get type for an async computation.

Assessment: automatic inference is possible and already works for the verified small case. Universal support
requires coordinated public-type work; the experiments do not establish a general TypeScript impossibility.
Official background: [generic class inference](https://www.typescriptlang.org/docs/handbook/2/classes.html#generic-classes)
and [generic defaults](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-parameter-defaults).

## 03.2 — Ordered Computed Reducers and Async Output Waiting

Priority P0 for the recorded target behavior. Implement after 03.1 settles source/output/result types.
The owner confirms that the formerly commented reducer sequences are requirements; arithmetic shortcuts were
temporary workarounds. Do not redefine those sequences as source-only updates merely to make a test pass.

### 🟠 Warning — The Computed Sequence Still Loses Updates

**File:** `spec/modules/EventEmitterEx/EventSignal_spec.ts`, lines 3040–3048;
`modules/EventEmitterEx/EventSignal.ts`, lines 1417–1428.

**Problem:** Ordinary writable accumulation is fixed, including clock and emitter throttles.
Computed reducers still read the last output without applying pending computation between successive writes.
The trigger test starts with output 1; its required sequence returns 2 instead of 4:

```ts
counterValue$.set(v => ++v);
counterValue$.set(v => ++v);
counterValue$.set(v => ++v);
expect(counterValue$.get()).toBe(4); // Actual: 2
```

**Recommendation:** Preserve this exact sequence as the acceptance case. Its existing trigger test is explicitly
skipped until implementation; the temporary +3 workaround has been removed. Re-enable the whole test when
the target behavior passes. The emitter-throttle sequence now runs as two actual reducers and passes.

### Design and Acceptance

- [ ] Decide how each computed reducer receives the output produced by the preceding accepted update while keeping
  source and output distinct. Include computations that transform the source, not only identity-like counters.
- [ ] Compare synchronous intermediate computation with an ordered reducer queue and with a separate internal
  working output. Specify computationsCount, dependency invalidation, errors and side effects for each option.
  Preserve lazy computation for ordinary source writes and derived reads; explicitly document any exception
  required for computed reducer sequencing instead of silently forcing get().
- [ ] Define how throttle and triggers affect intermediate output: reducer ordering must not accidentally release
  public output or subscriber notifications before a permitted trigger. Include source changes caused by events
  and triggers between reducer calls.
- [ ] Specify async waiting separately: does a reducer wait for pending output, and what does set return?
  Cover a pending Promise initial value, async computation in flight, rejection, obsolete completions,
  writes interleaved with reducers and destruction/abort while work is queued. Decide whether setters that
  return Promise are supported, rejected or require a distinct API.
- [ ] Bound queue ownership and define cancellation/cleanup so that abandoned reducers cannot retain signals.
  Preserve dependency-free setter reads: setting another signal inside computation must not subscribe to it.
- [ ] Add exact-type and runtime checks for sync/async/hybrid source/output combinations, sequential results,
  throttling, notification coalescing and errors. Restore the skipped clock-trigger test without a workaround.

The old SET_WITH_SETTER__QUEUES tag mixed fixed writable accumulation, a forced _innerGet recalculation sketch
and an unimplemented Promise queue. Those inactive sketches were removed; source comments point here.
No queue or eager computation has been introduced by this cleanup.

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
