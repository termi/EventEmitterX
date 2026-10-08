---
iso date: "2026-10-06T21:36:58.824Z"
timestamp: 1791322618824
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 02 — Memory Leak and Lifecycle Completion

Priority P0. The owner's known problem was reproduced for derived signals. A signal without registered retaining
callbacks may be collected; the audit does not establish that every instance always leaks. See MEM-01, MEM-02 and
LIFE-01/LIFE-02 in [the audit](AUDIT.md#detailed-findings).

## Global Channels First — Implementation Status

The active implementation on `dev` retains all three global EventEmitterX channels with weak callback ownership.
The instance-channel alternative was implemented and evaluated, then preserved separately instead of merged.

- [x] Weak registrations for dependencies, subscribers, source events, triggers, AbortSignal and React component/RAF
  callbacks; live signals own original callbacks.
- [x] Finalization metadata contains symbols and detach operations without an owner reference. Explicit disposal
  unregisters finalization and releases resources immediately.
- [x] Constructor failures, already-aborted owners, cleanup-error aggregation and guards against resuming
  closed/destroyed subscriptions.
- [x] Nine standalone GC scenarios, a live-owner control and an explicit-disposal fallback without native WeakRef.
- [x] Implement and evaluate instance channels/direct links after the owner's phase 1 commit; preserve the experiment
  separately with its tests, reasoning and measurements.
- [ ] Reconsider adoption only if a concrete benefit outweighs the measured memory cost; adoption is deferred,
  not a required next step.

## Architecture Decision — 2026-10-06

Keep phase 1 on `dev`. Both variants pass their GC checks, so phase 2 does not demonstrate an additional correction
of the known retention problem. In the measured workload, active computed signals with subscribers need about
12.7% more marginal heap in phase 2; full-graph update time ranges overlap. Local ownership is architecturally useful,
but does not justify adoption by itself for the current implementation.

The experiment is retained on `experiment/eventsignal-instance-channels`, commit
`d17917f2518a7b3a0700131b2076a949fdb0ae89`, based on phase 1 commit
`686c0d19603b447a8b31ead6552b705c60acafca`. It was not merged or cherry-picked into `dev`.
[The comparison](verification/SIGNAL_CHANNEL_COMPARISON.md) and raw measurements remain available here;
the implementation, benchmark script and extra GC tests belong to that branch.

Revisit a compact per-instance channel or linked-list backend only with preserved subscription/mutation semantics
and measured benefits in representative workloads. The linked-list prototype alone does not establish a better
full EventSignal implementation. Runtime portability, dynamic cycles and source-destruction semantics remain stage 02 work.

Run `pnpm test:signals:gc`; fallback: `node --expose-gc _dev/check_signal_lifecycle.cjs --without-weakref`. The GC
regression fails on the original HEAD source and passes on the repair. All 114 EventSignal tests pass (one skipped);
strict library checks and three declaration-consumer modes now require zero diagnostics.
See [current baseline verification](verification/BASELINE_VERIFICATION.md).

[Design, alternatives and guarantees](../changelogs/reasons/EventSignal_WEAK_NOTIFICATION_OWNERSHIP.md).

Native WeakRef allows collection; FinalizationRegistry provides eventual removal of registrations, without a deadline.
Without these capabilities, explicit disposal is required. External subscription handles intentionally own their signal.
In-flight asynchronous work can retain its owner until the external Promise settles; existing disposal and
late-completion tests still pass. Multi-runtime validation, exhaustive dynamic-cycle analysis and source-destruction
semantics remain open: stage 02 is not complete.

## Original Retaining Path

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
