---
iso date: "2026-10-06T21:36:58.824Z"
timestamp: 1791322618824
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "logic, api, types, tests, docs, scripts"
---

# Signal Contract — Implementation and Decisions

This implements the connected core of roadmap 03.1 and 03.2. Decisions below are
reviewable choices made while the owner was away. Package publication, React
extraction, automatic garbage collection and a broader TypeScript version matrix
remain separate work.

## Value and Type Model

`EventSignal<T, S = Awaited<T>, D = undefined, R = T>` keeps the four existing
generic positions. T describes the initial value, S the writable source, D the
data object and R the raw computation result. Resolved output is
`Awaited<T> | Awaited<R>`. Primitive literals may widen during contextual inference;
named callbacks can preserve the initial literal. Consumers should rely on the
public output type rather than a particular inferred initial literal.

Constructor and factory infer inline sync, async and hybrid callbacks, including
`self$.data`, named callbacks and Jest mocks on TypeScript 5.9.3:

```ts
using signal$ = EventSignal.createSignal('initial', async (_prev, source, self$) =>
    `value:${source + self$.data.step}`, {
    initialSourceValue: 0, data: { step: 1 },
});
signal$.set((_prev, source, data) => source + data.step);
const value = await signal$.get(); // string
```

The inferred callback's third argument is the complete EventSignal class,
including writes, subscriptions, React methods and markNextValueAsForced.
Its result mode is conservatively the initial domain or Promise of its resolved
domain, independent of the callback result R. Connecting contextual self directly
to R reproduced recursive inference failures; separating the result mode retains
automatic inference without removing methods or introducing any. The created
signal still infers its actual R from the callback. Compatibility overloads allow
explicitly annotated callbacks that require a precise self result mode.

An earlier read-only Pick omitted methods used by existing computations; it was
rejected after the object-returning regression exposed markNextValueAsForced.
Compile fixtures now check the full class type/API, typed writes/data, constructor
and factory inference, no-source and hybrid callbacks, projections from self,
and that exact object-returning example. Anonymous initial/result object types
can form a structurally equivalent union; property types and assignment in both
directions are checked instead of requiring nominal type identity.

The inferred result must fit the initial resolved domain, widening primitive
literals for the compatibility check. A different initial/output domain requires
an explicit union, because the first previous value and later previous values
must both be accepted:

```ts
using union$ = new EventSignal<string | number, number, undefined, string>(
    0, (_prev, source) => `value:${source}`, { initialSourceValue: 0 },
);
```

Alternatives were replacing all four generic positions, using an unconstrained
result with a misleading previous-value type, and accepting `any` for self.
These were rejected to preserve explicit consumers and sound callback inputs.
TypeScript does not infer omitted arguments after explicitly supplied generic
arguments: use inference for the complete call, or specify all four positions
for an explicitly typed asynchronous computation.

## Readers and Projections

`getLast`, `getSync` and `getSyncSafe` return resolved output. A Promise initial
value adds `undefined` until its first resolution. Listener and React snapshot
types include the same possibility; a pending initial Promise is not exposed as
a listener value.

`get` and `getSafe` describe synchronous output and a Promise of the output domain.
For an async string computation the read type is `string | Promise<string>`:
hybrid computations and resolved writable initial-Promise signals can still return
a synchronous value. Native async computations preserve Promise fallback reads,
including after destruction, using Promise.resolve. An observed Promise result
also preserves Promise reads after destruction; a pending initial Promise returns
Promise.resolve(getLast()), without waiting for abandoned initial work. Native
async functions are recognized without executing them before disposal.
`await signal$.get()` works for both paths. `tryGet` mirrors this
contract with `{ ok, error, result }` payloads. Existing computation-error reads
retain their last-value behavior; queued writes additionally reject on failure.

The generic R is erased at runtime. An ordinary function returning Promise cannot
be distinguished from a synchronous function before its first invocation. Therefore
the static get type remains a union; guaranteeing Promise for every call requires
an explicit runtime async contract as tracked in stage 03. Tests that require an
actual Promise use an instanceof guard before then. Jest expect alone does not
narrow a TypeScript union. Consumers can await or use Promise.resolve to normalize
reads, but a test must not normalize away the behavior it is checking.

Promise payloads include prior output after undefined/no-update or error fallback.
ReadResult normalizes this payload instead of exposing the raw computation Promise
type, eliminating repeated Promise branches and including undefined for projections
that have not published their first output.

`map` is a one-way projection over resolved output, waits for a pending async
read, starts with `undefined`, and has source type `never`. Writes and mutations
also throw at runtime. It does not copy data, methods or React metadata. Dispose
the derived signal independently; reads performed after await do not acquire a
new async dependency-tracking guarantee. Two-way mapping is a future API.

## Ordered Reducers and Publication

Plain source writes remain lazy and retain latest-write behavior. Writable
reducers receive the last accepted value. Computed reducers receive the output
of preceding accepted writes, with source supplied separately. Intermediate
output is held in a private cache; it does not change the published last value,
version or release the throttle. Actual intermediate computations increment
`computationsCount`, and the final calculation reuses a still-current preview.
Accepted source and dependency updates invalidate previews by epoch.

```ts
using signal$ = new EventSignal(0, (_prev, source) => source * 10,
    { initialSourceValue: 0 });
signal$.get();
signal$.set(prev => prev + 1); // source 1
signal$.set(prev => prev + 1); // source 11
signal$.set(prev => prev + 1); // source 111
signal$.getLast(); // 0, until normal publication
signal$.get(); // 1110
```

Computing intermediate output is the deliberate laziness exception needed when
a reducer consumes output. Alternatives were source-only reducers, calling the
public get between writes, and retaining stale output. They either contradict
the required sequence or prematurely publish values. Active subscribers retain
microtask coalescing; throttle/trigger controls public publication. Computation
side effects can consequently run more often for computed reducer sequences.
Use literal source writes when only the final computation is needed.

`createMethod` now delegates through set so generated actions obey the same
ordering. The existing racing async test uses literal writes to continue testing
latest-write wins; reducers in that test would now intentionally serialize.
Computation `undefined` still means no update. `null` is a real source/output
value and does not fall back to the published value in source comparison.

## Async Queue, Errors and Lifetime

`set` and generated methods return `void | Promise<void>`. A reducer waits when
its input output is pending; later reducers and literal writes join the same
instance queue. Awaiting a write means its source has been applied, not that the
final output has been published. Read the final result with `await get()`.
Queued get calls wait for the batch before reading.

Reducers must return synchronous source values. Promise-returning reducers are
rejected in types and at runtime; asynchronous computations remain supported.
Preview rejection, in-flight computation failure and reducer exceptions reject
the remaining batch. A later independent write can recover. A normal get retains
the pre-existing last-value fallback on computation failure. Ignored write
Promises have internal rejection handlers; explicitly awaiting them still
observes rejection.

`mutate` retains its synchronous boolean result. It rejects while reducer writes
are pending, so it cannot silently bypass their order. Alternatives were making
mutate asynchronous or queuing a mutation while returning an inaccurate boolean.
Await the write first, or express the update as a reducer. A pending initial value
without an accepted source must also resolve before synchronous mutation. Unknown object keys,
including keys carried by variables, and incorrect scalar/property values are
rejected by the compile fixtures.

Disposal and AbortSignal destruction clear queued callbacks and previews, reject
pending writes/reads, and invalidate continuation identity. New wait continuations
use WeakRef; late completions cannot resurrect a disposed signal or notify its
subscribers. Queue cancellation establishes explicit cleanup; the separate global
notification retention repair is documented in [stage 02](02_LIFECYCLE.md). Native weak references
are required for weak retention; a strong-reference polyfill cannot provide it.

There is no arbitrary queue-length cap: dropping accepted writes would violate
ordering. The instance owns the queue until pending output settles or explicit
disposal/abort cancels it. Queue limits and an independently cancellable write API
can be considered later if consumer evidence calls for them. Tests use controlled
Promises and explicit disposal, rather than asserting nondeterministic garbage
collection.

## Verification and Remaining Work

Run `pnpm typecheck:contracts` (the `typecheck:signals` alias remains available) or `node _dev/check_signal_types.cjs`.
Strict EventSignal and EventEmitterX source fixtures, library sources and emitted-declaration consumers now require
zero diagnostics. CommonJS, NodeNext and Bundler consumers use `skipLibCheck: false`.
The former 36-diagnostic ledger was removed after repairing its causes. `pnpm verify` also checks both builds,
their actual declarations, CJS execution and native/fallback lifecycle.

Verified: Node 26.8.1, TypeScript 5.9.3; 114 EventSignal tests pass, one existing skip.
Full suite: 429 pass, zero failures, one skip, six todo. No new skip/todo cases were introduced.
The existing ts-jest 27 peer warning remains; runtime tests do not replace strict typing.
See [baseline verification](verification/BASELINE_VERIFICATION.md) for details and ownership of pending cases.

Remaining acceptance: additional supported TypeScript/runtime versions, real React/SSR consumers,
published package resolution and dependency tracking across async boundaries.
Stage 02 weak notification ownership is implemented; broader lifecycle contracts remain open.
Review the documented contextual result mode, map and mutate behavior as migration choices before release.

## Migration Checklist

- Replace an assumed Promise-only get type with the declared union, or await it.
- Use `using signal$ = ...` or explicit disposal for owned signals.
- Promise initial values default source to the resolved payload, not Promise.
- Prefer inferred complete constructor/factory calls; explicit async calls use
  `EventSignal<string, number, undefined, Promise<string>>`.
- Use an explicit initial/output union when computation changes the value domain.
- All self methods remain available. When its exact sync/async result mode is
  required, annotate the callback and all generics through the compatibility overload.
- Dispose mapped signals independently and remove writes to one-way projections.
- Await pending reducer writes before synchronous mutation.
