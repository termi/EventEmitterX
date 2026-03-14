# Agent Skills — EventSignal

> EventSignal module architecture and React integration knowledge for AI agents.

---

## EventSignal Overview

**EventSignal** (`modules/EventEmitterEx/EventSignal.ts`, ~3850 lines) is a reactive signals system with deep React integration. It is part of the `@termi/eventemitterx` package.

- Reactive computed values with automatic dependency tracking
- Supports sync and async computations
- Deep React integration: `use()`, `useListener()`, direct JSX rendering via `$$typeof`
- Component type system: `registerReactComponentForComponentType` for polymorphic rendering
- Source emitters: subscribe to external `EventEmitter`/`EventTarget` events
- Triggers: clock-based (interval/timeout), emitter-based, or EventSignal-based
- Throttle support for rate-limiting computations

---

## Architecture

### Internal Event Buses

EventSignal uses three internal `EventEmitterX` instances (module-level singletons):

1. **`signalEventsEmitter`** — Notifies dependent signals when a signal's value changes
2. **`subscribersEventsEmitter`** — Notifies external subscribers (`.on()`, `.addListener()`)
3. **`timersTriggerEventsEmitter`** — Dispatches timer-based trigger events

All three use `listenerOncePerEventType: true`.

### Signal Lifecycle

```
new EventSignal(initialValue, computation?, options?)
  ↓
  Auto-subscribe to deps (inside computation via currentSignal tracking)
  Subscribe to sourceEmitter events (if configured)
  Subscribe to trigger/throttle (if configured)
  ↓
  .get() → triggers _calculateValue() if isNeedToCalculateNewValue flag is set
  .set() → updates _sourceValue → triggers recomputation via microtask
  ↓
  destructor() or [Symbol.dispose]()
    ↓
    Set finaleValue/finaleSourceValue (if configured)
    Clear all deps and subscriptions
    Reject pending promises
    Call onDestroy callback
```

### Dependency Tracking

- `currentSignal` module-level variable tracks which signal is currently computing
- When `signal$.get()` is called inside another signal's computation, `_subscribeTo()` is called
- Dependencies stored in `_subscriptionsToDeps: Set<symbol>` keyed by signal's `_signalSymbol`

### Key Internals

- `_stateFlags: number` — Bitfield flags (see `EventSignal.StateFlags` enum)
- `_value: T` — Current computed/stored value
- `_sourceValue: S` — Source value set via `.set()` or source emitter
- `_computation` — Optional computation function `(prevValue, sourceValue, self) => R | undefined`
- `_signalSymbol: symbol` — Unique symbol identifying this signal instance
- `_subscriptionsToDeps: Set<symbol>` — Symbols of signals this signal depends on

### Error Handling

- `EventSignal` uses `status` + `lastError` for error state tracking
- Custom error class: `EventSignalError extends Error` with `eventSignal` property
- `status` values: `'default'`, `'pending'`, `'error'`

---

## React Integration

### Initialization

- `EventSignal.initReact(React)` sets up hooks on the prototype: `_useSyncExternalStore`, `_useRef`, `_useState`, `_useEffect`, `_useLayoutEffect`, `_useCallback`

### Signal as React Element

- Signals are valid React elements: `$$typeof = Symbol.for("react.element")`, `type = React.memo(EventSignalComponent)`
- For React ≥19: `$$typeof = Symbol.for("react.transitional.element")`
- `props`, `keyProps`, `ref`, `displayName` are lazily defined on prototype via getters

### `use()` Hook

- Uses `useSyncExternalStore` with `subscribeOnNextAnimationFrame` (debounced via `requestAnimationFrame`)
- Supports optional `reducer` and `areReducedValueEqual` arguments for derived/selector values
- Calls `getSyncSafe()` internally to trigger computation before subscribing

### `useListener()` Hook

- Uses `useLayoutEffect` internally
- Calls listener immediately in effect, then subscribes via `_addListener` with `makeItEasyAndFastAndUseSubscription` flag
- Returns cleanup via `subscription.unsubscribe`

### Component Type System

- `_reactFunctionComponentByComponentType_Map` — For `string | number` component types
- `_reactFunctionComponentByComponentType_WeakMap` — For `object | symbol` component types
- `registerReactComponentForComponentType(componentType, reactFC, status?, preDefinedProps?)` — Register components for specific statuses (`'default'`, `'pending'`, `'error'`, `'error-boundary'`)
- `_componentsEmitter` — Internal `EventEmitterX` that emits when a component type registration changes

### `EventSignalComponent` (internal)

- The wrapper component rendered when a signal is used in JSX
- Resolves which `reactFC` to render based on: context value → `signal._reactFC` → registered component type → `sDefaultFC` prop
- Detects recursive rendering in dev mode via React fiber traversal
- Wraps with `ErrorBoundary` if an `'error-boundary'` component is registered

---

## Writing Tests for EventSignal

```typescript
import { EventSignal, isEventSignal } from '../../../modules/EventEmitterEx/EventSignal';
```

Test-only exports (available when `isTest || isReactDev`):
```typescript
import {
  __test__get_signalEventsEmitter,
  __test__get_subscribersEventsEmitter,
  __test__get_timersTriggerEventsEmitter,
} from '../../../modules/EventEmitterEx/EventSignal';
```

For React hooks testing without real React:
```typescript
import { fakeReact, FakeMiniHTMLElement } from '../../../spec_utils/simple-react-hooks';
```

---

## Naming Conventions (EventSignal-specific)

- **EventSignal instances:** Dollar suffix — `counter$`, `computed1$`, `userFullName$`
- **Component types:** String constants — `'--counter--'`, `'--UserCard--'`
- **Internal flags:** `EventSignal.StateFlags` enum with bitfield values
- **Subscription flags in `_addListener`:** Inline bit positions — `1 << 1` (once), `1 << 2` (prepend), `1 << 3` (makeItEasyAndFast)

---

## Common Pitfalls (EventSignal-specific)

1. **`undefined` return from computation = no update** — This is intentional, not a bug.
2. **Shallow equality for objects** — EventSignal uses `_shallowEqualObjects` by default. Use `markNextValueAsForced()` to bypass.
3. **Async dependency tracking is limited** — Signals accessed after an `await` inside computation may not be tracked. Only synchronous `.get()` calls register dependencies.
4. **`set()` inside computation** — Use `_innerGet()` instead of `get()` to avoid cross-signal subscription side-effects when calling `.set()` from within another signal's listener/computation.
5. **Event name parameter is ignored** — `on('change', cb)`, `on('data', cb)` etc. — the event name is purely decorative. Only `''`, `'change'`, `'changed'`, `'data'`, `'error'` are accepted; others throw `TypeError`.
6. **`removeAllListeners()` is not implemented** — Throws `Error('Not implemented')`. Use `destructor()` instead.

