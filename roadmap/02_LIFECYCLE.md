---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 02 — Memory Leak and Lifecycle Completion

Priority P0. The owner's known problem was reproduced for derived signals. A signal without registered retaining
callbacks may be collected; the audit does not establish that every instance always leaks. See MEM-01, MEM-02 and
LIFE-01/LIFE-02 in [the audit](AUDIT.md#detailed-findings).

## Retaining Path

`module signalEventsEmitter → listener under a dependency symbol → derived._oneOfDepUpdated → derived (this) → computation/data/source`.

After external references to the derived signal are removed, the registry retains its callback and instance.
FinalizationRegistry cannot repair this path: its callback runs after the object becomes eligible for collection.
Existing finalization is neither a guaranteed destructor nor a complete resource-cleanup mechanism.

## Work

- [ ] Map strong references in dependency/subscriber/timer registries, sourceEmitter, AbortSignal, the React component
  registry, the requestAnimationFrame queue, deferred promises and error objects.
- [ ] Choose a weak notification design: registry callbacks must hold a WeakRef to the instance rather than a closure
  containing this; finalization metadata must not include the instance or a callback returning it. Object keys in weak
  storage may be more portable than Symbol keys.
- [ ] Do not assume replacing Object with Map fixes retention: Map retains values strongly. Symbol-keyed WeakMap also
  requires platform checks and examination of every reverse reference.
- [ ] Separate automatic collection of forgotten signals from deterministic resource cancellation.
  Destructor/AbortSignal/Disposable remain the means of immediate cleanup; GC is a fallback rather than a closure timer.
- [ ] Define an honest fallback and documented guarantees for environments without WeakRef; a fake WeakRef with a strong
  field does not provide automatic release.
- [ ] Make destructor/dispose and unsubscribe idempotent. Define suspend/resume after closure and cleanup after source
  destruction.
- [ ] Ensure other resources are cleaned up if a user cleanup/onDestroy throws; choose error aggregation/reporting.
  Check constructor failure and an already-aborted signal.
- [ ] Verify late async resolution/rejection does not revive a destroyed signal or notify subscribers, and completes
  waiting promises according to the contract.
- [ ] Add test diagnostics for active relationships that do not introduce strong references to signals. Do not count
  Symbol events through the current eventNames().

## Verification and Completion

Deterministic tests: explicit cleanup, double cleanup, cleanup exceptions, abort before/after subscription, destruction
during computation, timers/RAF and dynamic dependencies. GC suite: a separate expose-gc process, event-loop boundaries,
WeakRef and heap retaining paths; a bounded GC run can be unstable by itself, so compare it with the reference graph.

P0 acceptance: without an external owner or an intentionally retaining user subscription, global registry callbacks do
not retain a derived signal; repeated creation/removal does not accumulate relationships. Explicit destructor releases
resources immediately and exactly once. The solution preserves laziness and notification delivery.
