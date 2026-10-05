---
name: eventemitterx
description: "Work on EventEmitterX behavior, Node event compatibility, event awaiting, async iteration, proxies and tests in this repository."
metadata:
  iso date: "2026-10-05T21:33:25.756Z"
  timestamp: 1791236005756
  ai_model: "GPT6"
  git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
  area: "config/ai"
---

# EventEmitterX

Use this skill for changes or audits involving `modules/events.ts` and
`modules/EventEmitterEx/eventsAsyncIterator.ts`. General documentation or agent
configuration work does not require loading emitter internals.

## Workflow

1. Read the applicable mandatory rules from the root AGENTS.md. Inspect the
   affected source and its matching specification before choosing a change.
2. Read [references/architecture.md](references/architecture.md) for the relevant
   architecture, performance conventions, local import aliases and test helpers.
   Treat it as project knowledge; verify current source before relying on a detail.
3. Distinguish default Node-compatible behavior from opt-in extensions. When
   compatibility is relevant, compare with native `node:events`; do not infer
   full compatibility from method names or existing documentation.
4. For once/iterator work, check listener teardown on success, error, abort,
   timeout, return and throw. Preserve listener identity, ordering, this and
   duplicate-listener semantics unless the requested change explicitly alters them.
5. Preserve hot-path conventions during focused changes; justify performance
   rewrites with a relevant measurement. Use existing helpers and run affected
   specifications, separating environment failures from runtime defects.
6. Follow documentation/review/changelog rules for requested deliverables. A
   skill does not authorize commits or npm publication.

## Source and Verification

Paths below are relative to the repository root:

- `modules/events.ts`: EventEmitterX, proxies, once and exported helpers.
- `modules/EventEmitterEx/eventsAsyncIterator.ts`: iterator and EventTarget bridge.
- `spec/modules/events_spec.ts`: emitter/await/iterator specifications.
- `spec_utils/`: timers, deferred values and fake targets.

Local `termi@*` names resolve through development links. Do not npm-install
those alias names. Do not modify `packages/` at this stage; revising that rule
is deferred to a later dependency-development task. Do not edit compiled demo copies.
