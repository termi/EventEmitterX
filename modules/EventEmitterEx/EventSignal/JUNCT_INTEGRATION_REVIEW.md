---
iso date: 2026-10-05T20:36:24.321Z
timestamp: 1791232584321
ai_model: GPT6
git user: '"Egor Khalimonenko" <egor@callforce.pro>'
area: api, types, deps, tests, scripts
---

# Junct.io integration needs and EventSignal audit agenda

This is an input to the owner's separate audit/publication session, not a completed audit or authorization to publish. The local implementation is `modules/EventEmitterEx/EventSignal.ts`; the adjacent `EventSignal/` directory contains this development document. Junct.io currently preserves upstream commit `f3bb99e2b4c34152de74dc5b04885122e3880fde`. Audit the local working tree independently before choosing a release.

## Correcting the consumer, not changing the signal

Junct.io's DRAFT commit `c6ed061` hid native methods behind `StateSignal`, constructed signals inside TextView and forced `get()` after `set()`. Those were consumer design choices, not required upstream changes. The revised integration should expose native `createSignal`, `subscribe`, `addListener`, `mutate`, `map` and destructor, with signals owned by Dataset/Model. React and terminal consumers should share those identities. Never add an eager read merely to force notification: native subscriptions already activate computation; unsubscribed computed projections remain lazy.

## 🟠 Warning — Publish a consumable package and independent dependencies

**Files:** `package.json`, lines 8–15 and 20–29; `packages/abortable/package.json`, `packages/runEnv/package.json`, `packages/type_guards/package.json` (inspect their declared entrypoints before release).

```json
"main": "index.ts",
"postinstall": "node _dev/postinstall/index.cjs",
"test": "echo \"Error: no test specified\" && exit 1"
```

```json
"termi@abortable": "link:./packages/abortable",
"termi@runEnv": "link:./packages/runEnv",
"termi@type_guards": "link:./packages/type_guards"
```

**Problem:** Junct.io could not consume the preserved revision as an independently installed JS/typed npm dependency: its sibling dependency packages had manifests pointing at unavailable dist. A temporary private build redirects imports to `cftools/common/runEnv`, `cftools/type_guards/symbols`, `cftools/common/AbortController` and the type-only `cftools/modules/ServerTiming`. This is a transitional local dependency, not a npm release contract.

**Recommendation:** P0 before publication: publish the independent dependencies with the owner, define CJS/ESM/types exports and files, and validate `npm pack` in a clean consumer with no links, postinstall source mutation or sibling cftools. Include Node and Bun; browser/React exports must not pull server-only runtime dependencies. Test the actual tarball, not just the checkout.

## 🟡 Suggestion — Make subscription cancellation explicitly idempotent

**File:** `modules/EventEmitterEx/EventSignal.ts`, lines 1921–1930.

```typescript
let closed = false;
const unsubscribe = () => {
    closed = true;
    this._removeListener(ignoredEventName, listener, true);
    listener = void 0;
};
```

**Problem:** The subscription records closure but repeated cancellation still enters `_removeListener`, after its listener reference was cleared. This is a proposal to improve cleanup, not a reason to wrap every subscription in Junct.io.

**Recommendation:** P1: return immediately when already closed. Verify repeated unsubscribe, unsubscribe after suspend, resume after closure, destruction then cleanup and exception paths. Preserve the native function returned by `subscribe`; callers should not need a second active flag.

## 🔵 Info — Preserve native lazy and subscribed scheduling

**Files:** `modules/EventEmitterEx/EventSignal.ts`, lines 1628–1644, 1680–1692 and 2412–2418.

```typescript
this._recalcPromise = Promise.resolve()
    .then(async () => {
        // Native subscriber-triggered recalculation in a microtask.
    });
```

```typescript
subscribe = (func: () => void) => {
    return this._addListener(func, void 0, 1 << 3).unsubscribe;
};
```

**Problem:** Consumers need a documented distinction between laziness without observers and active subscriptions. The preserved implementation schedules subscribed recalculation in a microtask; multiple synchronous writes can coalesce. It does not promise a synchronous callback for every intermediate assignment. Junct.io should not reinterpret this as a need to call `get()` after every write.

**Recommendation:** P1: specify and test read-after-set, subscription activation, microtask coalescing, listener ordering, computed dependencies and unsubscribe-before-delivery. Decide explicitly whether an optional synchronous/every-write mode is desirable; retain the existing default unless the owner selects a new contract. No scheduling change is required just to support Junct.io.

## 🟡 Suggestion — Certify the complete typed factory/projection API

**Files:** `modules/EventEmitterEx/EventSignal.ts`, lines 1468–1500, 2537–2547 and 2619–2631.

```typescript
mutate<PROPS=Partial<Awaited<S>>>(props: PROPS)
map<CR>(computation: (currentSourceValue: T) => CR)
static createSignal<T>(initialValue: T): EventSignal<T, T>;
```

**Problem:** `mutate`'s unconstrained generic can infer arbitrary keys instead of enforcing the source object's field types. `map` retains the original source type S, so a DTO projection over a revision signal has a numeric setter source even though get returns a DTO. Factory and projection implementations suppress overload errors internally. Junct.io now emits full upstream declarations rather than inventing a reduced interface; these native type contracts deserve isolated checks.

**Recommendation:** P1: compile positive/negative consumers for object mutation, unknown keys, wrong field values, scalar signals, derived source/output distinctions, sync/async get, and createSignal overloads. Prefer constrained mutation overloads and named sync/async signal contracts if needed. Do not change static createSignal behavior just to duplicate its one-argument form: it already fits writable state. Ask the owner about derived writable semantics before implementation.

## Validation and release criteria

- Add a real root test script and run existing `spec/modules/EventEmitterEx/EventSignal_spec.ts`; inspect failed cases rather than certifying the entire project from Junct.io's small integration subset.
- Generate declarations with a library environment containing WeakRef (ES2021); declaration emit of the preserved source otherwise reported TS4033 at line 3269. Keep the chosen JavaScript runtime target explicit and fail builds on declaration-emit diagnostics.
- Test lifecycle/resource cleanup, React useSyncExternalStore/getSnapshotVersion identity, pending/errors, partial object mutation and lazy derived values.
- Publish only after the owner finishes audit and explicitly selects the release. No source code or package version is changed by this document.
