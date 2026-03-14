# Module Index

This document provides a brief overview of each module in the EventEmitterX project.

---

## Core Modules

| Module | File | Description |
|--------|------|-------------|
| **EventEmitterX** | `modules/events.ts` | Cross-platform EventEmitter implementation for Node.js and browsers. Drop-in replacement with enhanced features like `listenerOncePerEventType`, `emitCounter`, advanced `static once()` with filters/timeouts/AbortSignal, and async iterators. |
| **EventSignal** | `modules/EventEmitterEx/EventSignal.ts` | Reactive signals system with automatic dependency tracking, computed values, async computation support, and deep React integration. Signals can be rendered directly in JSX. |
| **eventsAsyncIterator** | `modules/EventEmitterEx/eventsAsyncIterator.ts` | Async iterator for event streams. Implements `EventEmitterX.on()` — compatible with Node.js `events.on()`. Supports value transformation, stop/error events, and AbortSignal. |
| **view_utils** | `modules/EventEmitterEx/view_utils.ts` | (BETA) React ViewContext utilities for EventSignal. Provides `createEventSignalMagicContext` for component-type-based rendering. |
| **utils** | `modules/EventEmitterEx/utils.ts` | Shared utility functions: circular-reference-safe JSON serialization, array content stringification, runtime detection (Vite dev mode). |

---

## Detailed Documentation

- **[EventEmitterX API Reference](EventEmitterX.md)** — Full API docs for `EventEmitterX`, including constructor options, instance methods, static methods (`once`, `on`, `getEventListeners`), and usage examples.
- **[EventSignal API Reference](EventSignal.md)** — Full API docs for `EventSignal`, including constructor, getters/setters, computed signals, React hooks, component rendering, triggers, subscriptions, and usage examples.
- **[Improvements & Roadmap](IMPROVEMENTS.md)** — Potential improvements, known limitations, and TODO items.

---

## Module Dependency Graph

```
EventEmitterX (events.ts)
├── uses: abortable, object utils
└── exports: EventEmitterX, once, on, addAbortListener, errorMonitor, ...

EventSignal (EventSignal.ts)
├── uses: EventEmitterX (internally for signal/subscriber/timer event buses)
├── uses: abortable, type_guards, runEnv
├── uses: view_utils (React ViewContext)
├── uses: utils (serialization)
└── exports: EventSignal, isEventSignal

eventsAsyncIterator (eventsAsyncIterator.ts)
├── uses: abortable
└── exports: eventsAsyncIterator (aliased as EventEmitterX.on)
```

