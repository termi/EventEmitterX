---
layout: home

hero:
  name: "EventEmitterX"
  text: "TypeScript Event System"
  tagline: Cross-platform EventEmitter and Reactive Signals for Node.js and browsers.
  actions:
    - theme: brand
      text: EventEmitterX Docs
      link: /eventemitterx
    - theme: brand
      text: EventSignal Docs
      link: /eventsignal
    - theme: alt
      text: Live Demo ↗
      link: /demo/

features:
  - icon: ⚡
    title: EventEmitterX
    details: Cross-platform EventEmitter compatible with Node.js and browsers. Drop-in replacement with listenerOncePerEventType, emitCounter, advanced static once() with filters/timeouts/AbortSignal, and async iterators.
    link: /eventemitterx
    linkText: API Reference
  - icon: 🔄
    title: EventSignal
    details: Reactive signals system with automatic dependency tracking, computed values (sync & async), and deep React integration. Signals can be rendered directly in JSX.
    link: /eventsignal
    linkText: API Reference
  - icon: 🚀
    title: Live Demo
    details: Try EventSignal in an interactive demo application built with React 19 and Vite.
    link: /demo/
    linkText: Open Demo
---

## Core Modules

| Module | File | Description |
|--------|------|-------------|
| **[EventEmitterX](/eventemitterx)** | `modules/events.ts` | Cross-platform EventEmitter for Node.js and browsers. Drop-in replacement with enhanced features. |
| **[EventSignal](/eventsignal)** | `modules/EventEmitterEx/EventSignal.ts` | Reactive signals system with dependency tracking and React integration. |
| **eventsAsyncIterator** | `modules/EventEmitterEx/eventsAsyncIterator.ts` | Async iterator for event streams, compatible with Node.js `events.on()`. |
| **view_utils** | `modules/EventEmitterEx/view_utils.ts` | (BETA) React ViewContext utilities for EventSignal. |
| **utils** | `modules/EventEmitterEx/utils.ts` | Shared utility functions: JSON serialization, runtime detection. |

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

