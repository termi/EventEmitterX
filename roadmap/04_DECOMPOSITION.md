---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 04 — Decomposition with Git History Preservation

Priority P1. Owner requirement: **moves must retain the ability to trace the history of extracted lines**. Do not
rewrite existing branch history or mix moves with behavior changes, formatting or mass variable renaming.

## Module Boundaries

- [x] Extract all React work from EventSignal into a separate adapter, for example EventSignalReact.ts: initReact,
  hooks/use/useListener, JSX element properties, component registration/context/error boundary and the React scheduler.
- [x] EventSignal core owns values, dependencies, computation scheduling, subscriptions and lifecycle. Connect React
  through a narrow adapter interface; existing methods temporarily delegate to preserve API. Avoid a runtime cycle
  between core and adapter.
- [ ] Extract the implementation of EventEmitterX.static once into **EventAwait**, for example EventAwait.ts. Keep
  EventEmitterX.once as a delegating compatibility entry and retain typed overloads. EventAwait must not import
  EventEmitterX at runtime merely for basic event awaiting.
- [ ] Subsequently extract subscription/trigger/cleanup primitives and shared emitter/EventTarget helpers where measured
  coupling justifies it.
- [ ] Evaluate proxy classes in events.ts and the async iterator as separate public modules; avoid splitting files
  without a clear responsibility.
- [ ] Re-export modules through the index and subpaths without changing class identity or singleton registries within
  one build.

## Completed React Extraction

Implemented on dev from main 4e3b6c1. EventSignalReact.ts contains hooks, initialization,
JSX, component registry/context and rendering; EventSignalReactScheduler.ts contains
the RAF pool. Core keeps state, computation, dependencies, writes/lifecycle and
public delegating methods. The adapter's reverse core import is type-only.

[Reason and history verification](../changelogs/reasons/EventSignal_REACT_DECOMPOSITION.md)
record branches, merge and nine verified original line commits. log --follow reaches
the old history; moved React blocks require blame -M -C -C. Do not squash the
rename commits or multi-parent merge.

Validation: 108 EventSignal tests passed, 1 skipped; five new React tests also pass
against the original main source. Strict fixtures and three declaration modes pass
with the same 36 library diagnostics. Full suite: 391 passed, the same 14 events_spec
failures, 1 skipped, 6 todo. Real React/SSR, a standalone consumer React entry point
and subsequent timer/adapter extraction remain open.

## History Preservation Procedure

Git tracks snapshots and infers renames/copies heuristically; git mv alone does not guarantee the history of each
extracted fragment. Verify both file history and line provenance after a move.

1. Record the base revision and file state; existing unrelated changes must be reconciled in the future implementation
   stage. Use a dedicated branch/worktree and preserve uncommitted files.
2. Separate a pure move from subsequent import/API fixes. Preserve the text formatting of moved blocks.
3. For a large-file split, test a branch that renames the source to the extracted module, removes irrelevant parts and
   preserves the remainder at the old path. If history is ambiguous, use two branches from one base: one renames the
   file to the extracted module and keeps the extracted code; the other preserves/renames the core and keeps the
   remaining code; merge manually assembles both results and delegation. The static once comment already suggests a
   similar strategy.
4. A two-branch merge is not automatically sufficient: Git may see rename/delete conflicts or choose different
   heuristics. Check representative lines; if provenance is poor, adjust the size/order of pure moves before accepting
   the merge.
5. After each extraction, check `git --no-pager log --follow -- <new-file>`,
   `git --no-pager log -M -C -- <old-file> <new-file>` and `git --no-pager blame -M -C -C <new-file>` for original
   lines. The future PR description records the base, old/new paths and representative original commits.
6. Only then fix delegation/contracts in separate commits. The final merge preserves move commits and merge ancestry;
   squash may destroy the chosen traceability and is allowed only after rechecking and an explicit change to the owner's
   requirement.

The React extraction above was explicitly authorized on dev. Future extractions require their own authorization.
Choose the exact procedure from trial history rather than treating two branches as a ritual.

## Completion

Moved lines can be traced to pre-refactor commits through the listed commands. Runtime and public type fixtures pass
before/after. A Node-only import does not require React initialization; direct React-adapter imports work; old entry
points delegate. There are no accidental duplicated registries/constructors caused by cyclic imports. File layout
changes do not become undeclared breaking API changes.
