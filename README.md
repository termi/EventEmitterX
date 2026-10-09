---
iso date: "2026-10-08T22:55:40.798Z"
timestamp: 1791500140798
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs"
---

# EventEmitterX

A cross-platform `EventEmitter` implementation for Node.js and browsers, with an advanced reactive signals system (**EventSignal**) deeply integrated with React.

<a href="https://termi.github.io/EventEmitterX/" target="_blank" rel="noopener noreferrer"><strong>Online documentation and Demo ↗</strong></a>

## Key Features

### EventEmitterX
- ✅ Node.js-style `EventEmitter` API — [verified contracts and remaining boundaries](docs/EVENT_COMPATIBILITY.md)
- 🌐 Works in browsers without polyfills
- 🔒 `listenerOncePerEventType` — prevent duplicate listeners per event
- 📊 `emitCounter` — count emit calls for monitoring
- ⏱️ Enhanced `static once()` — Promise-based with **filter**, **timeout**, **AbortSignal**, **multiple event names**, and both `EventEmitter`/`EventTarget` support
- 🔄 `static on()` — async iterator for event streams with value transformation
- 🧹 `destructor()` / `Symbol.dispose` — safe resource cleanup
- 🐛 `isDebugTraceListeners` — attach call stacks to listeners for debugging

### EventSignal
- ⚡ Reactive computed values with automatic dependency tracking
- 🔀 Sync and async computations
- ⚛️ Deep React integration: `use()`, `useListener()`, direct JSX rendering
- 🎭 Component type system for polymorphic rendering (`registerReactComponentForComponentType`)
- 📡 Source emitters — subscribe to external `EventEmitter`/`EventTarget` events
- ⏰ Triggers — clock, emitter, or signal-based recomputation
- 🎯 `createMethod` — typed action methods bound to signals
- 📦 `Subscription` objects with `suspend()`/`resume()`
- 🔮 Promise API and async iteration (`for await...of`)

## Development Verification

Run `pnpm verify` with the existing development dependencies. It separately checks strict library types,
source/emitted contracts, Node/DOM runtime tests, CJS/ESM development outputs, built CJS behavior and signal GC.
Current local result: 480 tests pass, zero failures/todo and zero strict diagnostics; one existing skip remains.
[Commands, evidence and limits](roadmap/verification/BASELINE_VERIFICATION.md).

These checks do not yet establish native ESM package loading, clean installation or a supported runtime range.

## Quick Start

```typescript
import { EventEmitterX } from '@termi/eventemitterx/modules/events';
import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

// --- EventEmitterX ---
const emitter = new EventEmitterX();

// Promise-based once with filter and timeout
const [data] = await EventEmitterX.once(emitter, 'data', {
  filter: (event, value) => value > 10,
  timeout: 5000,
});

// Async iterator
for await (const [tick] of EventEmitterX.on(emitter, 'tick')) {
  console.log(tick);
}

// --- EventSignal ---
const counter$ = new EventSignal(0);
const doubled$ = new EventSignal(0, () => counter$.get() * 2);

counter$.set(5);
console.log(doubled$.get()); // 10

// React integration
EventSignal.initReact(React);

function App() {
  const count = counter$.use();
  return <div>{count}</div>;
}
```

## Documentation

| Document                                   | Description                            |
|--------------------------------------------|----------------------------------------|
| [Project Analysis](PROJECT_ANALYSIS.md)    | Full project overview and architecture |
| [Module Index](docs/INDEX.md)              | Brief overview of all modules          |
| [EventEmitterX API](docs/EventEmitterX.md) | Detailed API reference with examples   |
| [EventSignal API](docs/EventSignal.md)     | Detailed API reference with examples   |
| [Improvements](docs/IMPROVEMENTS.md)       | Potential improvements and roadmap     |

> 📖 Russian versions (`_RU.md`) are available for all documentation files.

## Demo Applications

### EventSignal React Demo

A React + Vite application demonstrating EventSignal features: counters, computed values, async data fetching, i18n, component switching, and more.

```bash
cd demo/eventSignals-test-app ; pnpm i ; pnpm run dev
```

### Clicker (Full-Stack)

A real-time multiplayer clicker game with Fastify backend, Prisma ORM, and SSE-based updates.

```bash
cd demo/clicker ; ./bash/run_dev_backend_frontend.sh
```

## Installation

```bash
pnpm install
```

## Build

```bash
pnpm run build        # CJS + ESM
pnpm run build:cjs    # CommonJS only
pnpm run build:esm    # ES Modules only
```

## License

ISC
