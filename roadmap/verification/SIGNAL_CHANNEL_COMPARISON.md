---
iso date: "2026-10-06T21:00:50.351Z"
timestamp: 1791320450351
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: docs, api, test
---

# Signal notification channels: three alternatives

## Implementations and decision

`dev` retains phase 1. Phase 2 and the linked prototype are preserved on
`experiment/eventsignal-instance-channels`, commit `d17917f2518a7b3a0700131b2076a949fdb0ae89`, without a merge into `dev`.
This document and raw results are retained on `dev` as evidence; the experimental code and benchmark are not.

Phase 1 is committed at `686c0d19603b447a8b31ead6552b705c60acafca`: three module-level
EventEmitterX channels with weak callbacks. Phase 2 replaces these emitters with channels owned by each signal;
callbacks and reverse detach operations remain weak. Channels are allocated lazily. Both implementations have
automatic-collection coverage; phase 2 is an ownership/architecture change, not another claim that phase 1 leaked.

The third alternative is a runnable doubly linked channel prototype in `_dev/compare_signal_channels.cjs`,
with a Map from callback identity to list node. It is a comparison candidate, not an integrated EventSignal implementation.

| Aspect            | Phase 1: global channels                                          | Phase 2: instance channels                                                          | Linked-list prototype                                                                                |
|-------------------|-------------------------------------------------------------------|-------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| Ownership         | Module owns listener storage; owners retain original callbacks    | Signal owns lazy storage; reverse links are weak                                    | Owner would own list; same weak ownership must be added to an integrated design                      |
| Delivery          | Global emitter lookup by signal symbol                            | Direct source channel, with symbol local to that channel                            | Walk source's list                                                                                   |
| Forgotten owner   | Weak callbacks allow collection; finalizer removes global entries | Own channels collect with owner; finalizer detaches outgoing/external registrations | List alone does not solve retention; nodes must not strongly own dependent signals                   |
| Unused signal     | No per-signal channel container                                   | One small container, no emitters                                                    | Would need a lazy list container                                                                     |
| Removal           | Existing EventEmitterX implementation                             | Same emitter implementation                                                         | Map lookup plus O(1) unlink; Map/node overhead remains                                               |
| Delivery mutation | EventEmitterX copies on mutation rather than on every emit        | Same behavior                                                                       | Prototype snapshots list on each emit; mutation semantics need more work for a snapshot-free version |
| Compatibility     | Existing once/prepend/deduplication behavior                      | Retains the same emitter and public subscription API                                | Only focused ordering/deduplication/removal/once/nested-once checks; not the full emitter API        |

The owner decided to keep phase 1 active and preserve phase 2 separately for possible future work. Localized
ownership does not currently outweigh the measured memory cost without a reliable full-graph speed gain.
Do not replace production channels with the list prototype based solely on these microbenchmarks. A future compact
channel could preserve instance ownership while specializing the single-listener case; that requires a separate
behavioral and multi-runtime assessment.

## Method and reproduction

From the repository root in a checkout of `experiment/eventsignal-instance-channels` (the script is absent on `dev`):

```powershell
node --expose-gc _dev/compare_signal_channels.cjs
node --expose-gc _dev/compare_signal_channels.cjs core phase1
node --expose-gc _dev/compare_signal_channels.cjs core phase2
node --expose-gc _dev/compare_signal_channels.cjs channels linked
```

The full command alternates implementation order and runs five samples per variant in fresh processes.
The baseline is read with `git show`; both source versions use the same ts-node instance and project compiler
options. It neither switches branches nor changes the working tree. The baseline commit must be available locally.
The runtime was Node v26.8.1, Windows x64, TypeScript 5.9.3. Raw samples and CPU metadata are in
[signal-channel-results.json](signal-channel-results.json).

Core measurements include 4,000 unused signals, marginal heap for another 1,000 computed signals each with a
subscriber, and 200 updates delivered to 1,000 active computed signals after 30 warm-up updates. The final value of
every computed signal is asserted. Reads do not publish compatibility addresses in this workload.

Channel measurements include 10,000 channels with one weak callback each and a live callback owner, 1,000,000
deliveries, 200,000 remove/add pairs, and 20,000 emits with 64 weak callbacks. Global-channel adapters share one
emitter; instance adapters allocate separate emitters. Heap numbers include adapters, original callbacks, WeakRefs
and registration structures; they are not isolated object sizes. Focused differential checks run before channel samples.

## Full EventSignal results

Values are medians; bracketed intervals are the observed minimum–maximum across five processes.

| Measurement                                            |             Phase 1 |             Phase 2 |
|--------------------------------------------------------|--------------------:|--------------------:|
| Unused signal, retained bytes per owner                | 3,058 [3,057–3,060] | 3,094 [3,094–3,094] |
| Active computed + subscriber, marginal bytes per owner | 4,280 [4,280–4,280] | 4,824 [4,824–4,824] |
| 200 updates × 1,000 computed signals, ms               | 69.97 [68.50–73.70] | 73.34 [69.56–76.01] |

Unused-owner overhead rises about 36 bytes (1.2%); active-owner overhead rises about 544 bytes (12.7%). The update
median is 4.8% higher, but ranges overlap: this experiment does not establish a reliable speed improvement or
a statistically significant regression. Microbenchmark gains do not translate directly into full graph gains.

## Channel prototype results

| Measurement                                        |      Global emitter |   Instance emitters |    Linked prototype |
|----------------------------------------------------|--------------------:|--------------------:|--------------------:|
| Retained bytes per single-listener channel + owner |       550 [549–550] |       967 [967–967] |       509 [509–509] |
| 1,000,000 single-listener deliveries, ms           | 60.01 [58.65–60.43] | 54.97 [53.75–56.59] | 48.34 [47.50–49.57] |
| 200,000 remove/add pairs, ms                       | 25.65 [25.26–26.33] | 16.75 [16.67–16.96] | 18.55 [18.14–19.48] |
| 20,000 emits × 64 listeners, ms                    | 23.78 [23.39–24.53] | 24.57 [24.11–24.64] | 28.13 [27.90–28.28] |

The list prototype is compact and competitive for one listener, but its snapshot allocation loses to EventEmitterX
at 64 listeners in this run. Both list removal and emitter removal depend on their actual storage and mutation rules;
an O(1) unlink does not make every subscription operation faster. A snapshot-free intrusive list requires rules for
removal, re-addition, prepend, nested emit and once before its performance can be compared fairly.

## Lifecycle and compatibility verification

Phase 2 passes 116 EventSignal tests (one skipped), nine existing GC scenarios, a forgotten three-signal graph,
collection of a source with a live dependent/trigger owner, and the live-owner delivery control. Explicit disposal
without native WeakRef passes. Strict checks retain the existing 36 library diagnostics with no additions, and
CommonJS/NodeNext/Bundler declaration consumers pass. Full Jest: 403 passed, 14 previously recorded failures,
one skipped, six todo. Those failures remain in the emitter suite.

`eventName` publishes a weak compatibility address only when read. Normal dynamic dependencies and `deps: [source$]`
use direct channels. `deps: [{ eventName: source$.eventName }]` resolves that address. Unknown arbitrary names have
no producing signal and remain inert. Test/debug `__test__get_*Emitter` exports now expose frozen read-only
diagnostic views (`listeners`, `listenerCount`, `hasListener`, `eventNames`), not mutable shared buses. Enumeration
covers published addresses only; it is not a census of every signal.

Shared clock groups keep weak channel-dispatch callbacks and weak detach operations; timer grouping and existing
scheduling are preserved. Signal symbols identify subscriptions without requiring weak-symbol support. No historical
timer or React implementation was moved: the new helper contains the new storage/link design.

## Limits and follow-up

Native WeakRef is needed for weak lifetime guarantees. FinalizationRegistry provides eventual external cleanup,
not a deadline or a substitute for dispose. Without finalization, dead weak address entries can be pruned on lookup,
but timer/external registration metadata may remain until explicit cleanup. Without native WeakRef, use dispose.
User computations may intentionally retain sources; returned subscription handles retain their owner. Pending
external Promises can still retain a signal until they settle.

This experiment is one local V8/runtime workload. It does not cover browsers, Bun, Deno, async graphs, every dynamic
cycle, or all source-destruction semantics. The linked prototype does not model EventSignal computation, timers,
React, external sources, the full EventEmitterX API, listener context or multiple arguments. No full-core linked-list
memory or speed claim is made. Stage 02 remains open for those lifecycle and runtime investigations.
