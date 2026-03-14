# EventEmitterX — Project Analysis

## Overview

**EventEmitterX** is a TypeScript library providing a cross-platform `EventEmitter` implementation compatible with both Node.js and browsers. The project also includes **EventSignal** — a reactive signals system compatible with `EventEmitter`/`EventTarget` and deeply integrated with React.

- **Package name:** `@termi/eventemitterx`
- **Version:** `0.1.0`
- **Language:** TypeScript
- **Runtime:** Node.js / Browsers
- **Test framework:** Jest (with ts-jest)
- **Package manager:** pnpm

---

## Repository Structure

```
EventEmitterX/
├── modules/                    # Core library modules
│   ├── events.ts               # EventEmitterX — main EventEmitter implementation (~3800 lines)
│   └── EventEmitterEx/
│       ├── EventSignal.ts      # EventSignal — reactive signals system (~3850 lines)
│       ├── EventSignal_types.d.ts  # React-related type declarations
│       ├── eventsAsyncIterator.ts  # Async iterator for events (events.on analog)
│       ├── utils.ts            # Utility functions (JSON serialization, etc.)
│       ├── view_utils.ts       # React ViewContext utilities (BETA)
│       └── docs/               # Internal docs & references
├── spec/                       # Tests (Jest)
│   ├── test_spec.ts
│   └── modules/
│       ├── events_spec.ts          # EventEmitterX tests (~4700 lines)
│       └── EventEmitterEx/
│           └── EventSignal_spec.ts # EventSignal tests (~4100 lines)
├── spec_utils/                 # Test helpers and fakes
├── utils/                      # Shared utility functions
├── packages/                   # Internal "external" dependencies (future npm packages)
├── demo/
│   ├── eventSignals-test-app/  # React demo app showcasing EventSignal
│   └── clicker/                # Full-stack demo app (frontend + backend)
├── _dev/                       # Dev tooling, postinstall scripts, jest config helpers
├── docs/                       # Documentation files
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## Core Modules

### 1. EventEmitterX (`modules/events.ts`)

A full-featured `EventEmitter` implementation for both Node.js and browsers.

**Key features:**
- Full API compatibility with Node.js `EventEmitter`
- Works in browsers without polyfills
- `listenerOncePerEventType` option — prevents duplicate listeners per event
- `emitCounter` option — count emit calls (accepts `console` or custom `ICounter`)
- `listenerWithoutThis` option — call listeners without `this` binding
- `captureRejections` — handle async listener rejections
- `supportEventListenerObject` — support `{ handleEvent }` pattern (DOM-compatible)
- `isDebugTraceListeners` — attach call stack info to listeners for debugging
- `destructor()` / `Symbol.dispose` — safe cleanup with `kDestroyingEvent`
- Enhanced `static once()` — Promise-based with `filter`, `timeout`, `AbortSignal`, `ServerTiming`, multiple event names, and support for both `EventEmitter` and `EventTarget`
- `static on()` — async iterator (`eventsAsyncIterator`) with `computeValue`, `stopEventName`, `errorEventName`
- Static helper methods: `getEventListeners`, `addAbortListener`
- `errorMonitor` and `captureRejectionSymbol` compatibility

### 2. EventSignal (`modules/EventEmitterEx/EventSignal.ts`)

A reactive signals system inspired by Preact Signals, Effector, and SolidJS, deeply integrated with React.

**Key features:**
- Reactive computed values with automatic dependency tracking
- Supports sync and async computations
- Deep React integration: `use()`, `useListener()`, direct JSX rendering via `$$typeof`
- Component type system: `registerReactComponentForComponentType` for polymorphic rendering
- Source emitters: subscribe to external `EventEmitter`/`EventTarget` events
- Triggers: clock-based (interval/timeout), emitter-based, or EventSignal-based
- Throttle support for rate-limiting computations
- `createMethod` — create typed action methods bound to a signal
- `map` — create derived signals
- `mutate` — partial object updates with change detection
- Promise API: `toPromise()`, async iteration via `Symbol.asyncIterator`
- Safe getters: `get()`, `getSafe()`, `getSyncSafe()`, `getLast()`, `tryGet()`
- `Subscription` objects with `suspend()`/`resume()` support
- `finaleValue` / `finaleSourceValue` — values set on destruction
- `AbortSignal` integration for lifecycle management
- Shallow equality comparison for object values

### 3. eventsAsyncIterator (`modules/EventEmitterEx/eventsAsyncIterator.ts`)

Implements `EventEmitterX.on()` — an async iterator for event streams.

**Key features:**
- Compatible with Node.js `events.on()` API
- Works with both `EventEmitter` and `EventTarget`
- `computeValue` callback for transforming events
- `stopEventName` / `errorEventName` for iterator termination
- `AbortSignal` support
- Debug info via `getDebugInfo()`

---

## Demo Applications

### 1. EventSignals Test App (`demo/eventSignals-test-app/`)

A React + Vite application demonstrating EventSignal features:
- Counter signals with computed values
- User card with name composition via computed signals
- Async data fetching from JSONPlaceholder API
- i18n with reactive locale switching
- Component type switching at runtime
- PiP (Picture-in-Picture) window support
- Routing with reactive state
- ErrorBoundary integration

### 2. Clicker (`demo/clicker/`)

A full-stack application (frontend + backend) demonstrating real-time multiplayer interactions:
- Backend: Fastify, Prisma ORM, SSE channels
- Frontend: React
- Uses EventEmitterX for event-driven communication
- Round-based clicker game with real-time updates

---

## Internal Dependencies (`packages/`)

> These are internal libraries, slated to become separate npm packages.

| Package               | Purpose                               |
|-----------------------|---------------------------------------|
| `abortable`           | AbortController/AbortSignal utilities |
| `polyfills`           | ES2024+ polyfills                     |
| `ProgressControllerX` | Progress tracking controller          |
| `runEnv`              | Runtime environment detection         |
| `ServerTiming`        | Server-Timing header utilities        |
| `type_guards`         | TypeScript type guard functions       |

---

## Testing

- **Framework:** Jest 27.5 with ts-jest
- **Environment:** jsdom (for browser API emulation)
- **Test coverage:**
  - `events_spec.ts` — ~4700 lines of EventEmitterX tests
  - `EventSignal_spec.ts` — ~4100 lines of EventSignal tests
  - Covers: basic emit/on/once, `static once()` with filters/timeouts/AbortSignal, async iterators, computed signals, triggers, throttle, React hooks, async computations, lifecycle/disposal

---

## Build & Configuration

- **TypeScript:** Strict mode, dual CJS/ESM output via `tsconfig.json` / `tsconfig.esm.json`
- **Package manager:** pnpm 6.32+
- **Node.js:** Required (devEngines)
- **Scripts:**
  - `postinstall` — patching dev dependencies
  - `build` / `build:cjs` / `build:esm` — TypeScript compilation

---

## Key Design Decisions

1. **`class extends null`** — Both `EventEmitterX` and `EventSignal` use `Object.setPrototypeOf(prototype, null)` to minimize prototype chain overhead.
2. **Bitfield flags** — Internal state managed via bitwise flags for performance (`_f` in EventEmitterX, `_stateFlags` in EventSignal).
3. **Performance-optimized emit** — Specialized emit paths for 0–3 arguments to avoid `arguments` object and `apply()`.
4. **React compatibility** — EventSignal instances are valid React elements (`$$typeof`, `type`, `props`, `ref`), enabling direct JSX rendering.
5. **Shallow equality** — Object values are compared using shallow equality to prevent unnecessary re-renders/recomputations.

---

## Further Documentation

- [Module Index](docs/INDEX.md) — Overview of all modules
- [EventEmitterX API](docs/EventEmitterX.md) — Detailed API reference
- [EventSignal API](docs/EventSignal.md) — Detailed API reference
- [Improvements & Roadmap](docs/IMPROVEMENTS.md) — Potential improvements and TODOs

