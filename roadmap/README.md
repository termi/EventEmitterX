---
iso date: "2026-10-08T22:55:40.798Z"
timestamp: 1791500140798
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# EventEmitterX / EventSignal Roadmap

Audit date: 2026-10-05. Status: a plan for the agreed direction; implementation of these stages did not begin during the
audit. Documentation compliance update: 2026-10-06.

Goal: an independently installable event and signal library with reliable lifecycle management, precise types, CJS/ESM
and TypeScript sources, separately published dependencies, and a clear consumer contract.

Current status: the core of 03.1/03.2 is implemented and library checks pass: 480 tests and zero strict diagnostics.
See [baseline verification](verification/BASELINE_VERIFICATION.md) and [signal contract](03_SIGNAL_CONTRACT.md). Stage
02 retains global channels with weak callbacks. The reducer result below is a historical snapshot of the earlier
implementation.

## First Fix Candidates — Reducer Accumulation (P0)

- [x] Address this contract immediately after the reproducible baseline in [stage 01](01_BASELINE.md),
  as one of the first API fixes in [stage 03](03_API_TYPES.md). Do not wait for decomposition or release packaging.

### Implementation Result — 2026-10-06

Ordinary writable reducers now receive the latest accepted value as `prev`, without requiring `get()`.
Computed reducers retain the last output as `prev` and the latest accepted source as `sourceValue`;
setting source does not force computation. Throttle release and microtask notification scheduling are preserved.
The implementation is in `modules/EventEmitterEx/EventSignal.ts`, lines 1421–1428.

Twelve regression cases cover unobserved writes, reads, microtask boundaries, subscriptions and coalescing,
literal/null/zero values, immutable objects and data, undefined and errors, synchronous/asynchronous computed
output, mapped laziness, throttling and dependency isolation. All EventSignal tests pass. The full suite has
364 passing tests, the same 14 pre-existing failures in `events_spec`, one skipped test and six todo cases.
Library-only strict checking retains 36 diagnostics. This completes proposal item 01.3 (the writable reducer
contract), not the third checkbox in stage 01 concerning runtime/type-check separation.

Next: remaining [stage 03 contracts](03_API_TYPES.md) — the complete Node matrix and inline data with
nested methods (03.1.1); expand the stage 01 runtime/CI matrix.

The following finding records the pre-fix evidence; the pinned Junction ORM copy is unchanged.

#### 🟠 Warning — Consecutive reducers lose increments without intermediate reads

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 1426 and 1447–1449 (pre-fix snapshot).

**Problem:** `set` obtains the reducer's first argument through `_innerGet()`, while its second argument uses
`_sourceValue`. In the pinned Junction ORM integration (`junct.io` / `f3bb99e2b4c34152de74dc5b04885122e3880fde`), the first argument
remains stale across consecutive unobserved writes. Consumer reads therefore change the outcome of a counter.
The owner considers this behavior illogical and requests that it be among the first refactoring candidates.
The experiment below was run against the pinned integration; regression tests also reproduced it locally before the fix.

```ts
const currentValue = this._innerGet();
const { _sourceValue } = this;
const currentSourceValue = (_sourceValue !== void 0 ? _sourceValue : currentValue) as S;
const _newSourceValue = (newSourceValue as ((prev: T, sourceValue: S, data: D) => S))(
    currentValue as T, currentSourceValue, this.data,
);
```

```ts
const changes = EventSignal.createSignal(0);
changes.set(prev => ++prev);
changes.set(prev => ++prev);
changes.set(prev => ++prev);
changes.get(); // Observed: 1. Expected: 3.
```

**Recommendation:** Make reducers on ordinary writable signals consume the latest accepted value, regardless of
intermediate `get()` calls or subscriptions. Preserve lazy derived computations and the distinction between source
and computed values for mapped signals; specify their reducer contract separately rather than blindly replacing
`prev` everywhere. The temporary Junction ORM workaround is `set((_prev, sourceValue) => ++sourceValue)`; it must not
become a requirement for an ordinary counter.

**Acceptance checks:** Three increments produce `3` without reads, with intermediate reads, with a subscriber,
and across microtask boundaries. Add cases for mapped/computed signals, distinct source/output types, and reducer
errors. Verify notification scheduling and laziness independently: coalescing callbacks must not discard increments.
Deferring this fix risks incorrect revision counters and accumulated state, with results depending on observation.

## Navigation and Order

| Document                                           | Priority          | Result                                                               | Depends on                                                                 |
|----------------------------------------------------|-------------------|----------------------------------------------------------------------|----------------------------------------------------------------------------|
| [Audit](AUDIT.md)                                  | baseline evidence | Findings, evidence, consumer scenarios                               | —                                                                          |
| [01. Reproducible Checks](01_BASELINE.md)          | P0                | An accurate runtime and type-check baseline                          | —                                                                          |
| [02. Memory and Lifecycle](02_LIFECYCLE.md)        | P0                | Elimination of global signal retention                               | 01                                                                         |
| [03. API and Types](03_API_TYPES.md)               | P0/P1             | Verified signal contracts and EventEmitter compatibility             | 01; lifecycle from 02                                                      |
| [04. Decomposition](04_DECOMPOSITION.md)           | P1                | React adapter and EventAwait with preserved history                  | 01, established contracts from 03                                          |
| [05. Independent Dependencies](05_DEPENDENCIES.md) | P0                | Self-contained runEnv/type_guards/abortable packages and their graph | 01; can proceed alongside 02–04 after the package restriction is revisited |
| [06. Distributions](06_DISTRIBUTION.md)            | P0                | Root index and CJS/ESM/types/source exports                          | 03–05                                                                      |
| [07. Consumers and Documentation](07_CONSUMERS.md) | P1                | Verified Node/browser/React/Bun/Deno scenarios                       | 02, 03, 06                                                                 |
| [08. Release](08_RELEASE.md)                       | P0                | Verified tarballs and agreed publication                             | 01–07                                                                      |
| [09. Growth and Demo](09_GROWTH_DEMO.md)           | P2                | Performance, backpressure, weather and subsequent features           | stable contracts; weather after 02, 07                                     |

P0 blocks the first recommended npm release; P1 provides the required API/architecture quality for the chosen release
scope; P2 covers further development. The order expresses dependencies rather than calendar promises. Decomposition
proceeds through small extractions; fixing the P0 leak must not wait for a complete file split.

## Recorded Owner Decisions

- The root index re-exports every public library module in the project. EventEmitterX has the alias EventEmitter; the
  audit must establish its compatibility with `node:events`. Test exports and internals do not automatically become
  public API.
- CJS and ESM (`.mjs`) are required, together with access to TypeScript sources for Bun/Deno. Implement the planned
  build configurations rather than discarding the intention to support multiple builds.
- Local `link:` dependencies are intentional during development. This session is intended to restore/formalize
  independent packages and prepare their publication. The prohibition on editing `packages/` remains in place;
  revisiting it is deferred until the dependency-development stage.
- The createSignal overloads need completion.
- Decomposition of large modules **must preserve git history**. Stage 04 describes the method and verification.
- The known EventSignal leak caused by global registries is a separate P0. Requiring destructor calls alone does not
  repair the architecture.
- WEATHER_INTEGRATION_PLAN is included in stage 09; the original documents are preserved.

## Sources and Boundaries

The audit used the local checkout, existing tests and documentation. Implementation, versions, commits and publication
were not changed. Observed results are separated from hypotheses and future acceptance criteria. These stages form the
development plan; existing PROJECT_ANALYSIS and docs/IMPROVEMENTS remain historical overviews.

Integration documents: `../modules/EventEmitterEx/EventSignal/JUNCT_INTEGRATION_REVIEW.md` and `_RU.md`; existing demo
plans: `../demo/eventSignals-test-app/_dev/todo/WEATHER_INTEGRATION_PLAN.md` and `_RU.md`. The Junction ORM repository was
not modified.

Update task status in the relevant stage: `[ ]` means incomplete, `[x]` means completed with evidence, and “deferred”
needs a reason and target release. Completed work is recorded with evidence in the relevant documents. English files are originals;
adjacent `_RU.md` files contain equivalent Russian translations.
