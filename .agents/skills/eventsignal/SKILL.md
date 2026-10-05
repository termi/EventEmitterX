---
name: eventsignal
description: "Work on EventSignal computation, dependency tracking, subscriptions, lifecycle, generic types and React integration in this repository."
metadata:
  iso date: "2026-10-05T21:33:25.756Z"
  timestamp: 1791236005756
  ai_model: "GPT6"
  git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
  area: "config/ai"
---

# EventSignal

Use this skill for signal behavior, type contracts, resource lifetime or React
integration. Read emitter knowledge only when an affected dependency requires it.

## Workflow

1. Read applicable root AGENTS.md rules and inspect current source/specifications.
   Read [references/architecture.md](references/architecture.md) for the relevant
   signal lifecycle, registries, dependency tracking or React details.
2. Establish the existing contract before editing: value versus source, sync
   versus async result, undefined as no-update, equality, lazy computation and
   microtask notification. Do not add forced get calls after set merely to make
   an active subscription work.
3. Track ownership separately for the signal and each subscription. Check abort,
   unsubscribe, suspend/resume, destructor and late async completion. Global
   callbacks can strongly retain signals: FinalizationRegistry alone does not
   break a retaining path. A fake WeakRef is not a weak-lifetime guarantee.
4. For generic changes, test constructor/createSignal/get/map/mutate on positive
   and negative compile examples. Preserve distinct source/output/data types;
   runtime tests under relaxed ts-jest do not prove strict declaration correctness.
5. For React changes, check stable snapshots, repeated cleanup, component
   registration and RAF scheduling. Use fakeReact for focused tests and real
   React/SSR fixtures when claims depend on actual framework behavior.
6. Run the affected specifications; record genuine limitations and observed
   failures according to the review rules. Apply documentation/changelog rules
   to deliverables without expanding authorization to commits or publication.

## Source and Verification

Paths below are relative to the repository root:

- `modules/EventEmitterEx/EventSignal.ts`: computation, subscriptions and React API.
- `modules/EventEmitterEx/EventSignal_types.d.ts`: React-related declarations.
- `modules/EventEmitterEx/view_utils.ts`: view context helpers.
- `spec/modules/EventEmitterEx/EventSignal_spec.ts`: runtime and type scenarios.
- `spec_utils/simple-react-hooks.ts`: synthetic React helpers.

Follow `$` for signal values and `$$` for signal-returning functions. Preserve
Russian inline comments unless translation is requested. Keep decomposition
separate from behavior changes and preserve git history when moving code.
