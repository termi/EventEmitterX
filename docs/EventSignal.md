# EventSignal — API Reference

> **EventSignal** is not just another reactive primitive. It's a full-featured, battle-tested signals system designed to bridge event-driven code and modern React UIs — with zero glue code and automatic dependency tracking.

---

## Why EventSignal?

Most signal libraries are built in isolation — they operate within their own ecosystem and require adaptation to work with existing event-based infrastructure. EventSignal is different:

- It natively integrates with **any `EventEmitter` or `EventTarget`** as a reactive data source
- It renders **directly in JSX** without wrapper components or adapters
- It tracks dependencies **automatically** — no manual subscriptions, no selector boilerplate
- It handles both **sync and async** computations with built-in `pending` / `error` status
- It ships with **React hooks** (`use()`, `useListener()`) and a full **component type system**
- It manages its own **lifecycle** cleanly — destructors, `Symbol.dispose`, AbortSignal

### Feature Overview

| Feature                   | Description                                                                           |
|---------------------------|---------------------------------------------------------------------------------------|
| ⚡ **Auto-tracking**       | Dependencies are tracked automatically on `.get()` calls inside a computation         |
| ⚛️ **React-native**       | `use()` hook, direct JSX rendering, polymorphic component system — no adapters        |
| 🔀 **Async-ready**        | First-class async computations with `status`, `lastError`, and deduplication          |
| 📡 **Event bridge**       | Subscribe to any `EventEmitter` / `EventTarget` via `sourceEmitter`                   |
| ⏰ **Triggers**            | Clock, emitter, or signal-based recomputation with throttle support                   |
| 🔗 **Derived signals**    | `map()`, `createMethod()`, computed chains — compose complex state from simple pieces |
| 🔮 **Promise & async**    | `toPromise()`, `for await...of` async iteration support                               |
| 🏷️ **TypeScript-native** | Full generics: `EventSignal<T, S, D, R>` — typed value, source, data, and return      |
| ♻️ **Safe lifecycle**     | `destructor()`, `Symbol.dispose`, `finaleValue` — no memory leaks                     |

### Quick Start

```typescript
import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

// Simple writable store
const count$ = new EventSignal(0);

// Computed — automatically tracks count$, recomputes on change
const doubled$ = new EventSignal(0, () => count$.get() * 2);

count$.set(5);
console.log(doubled$.get()); // 10

// Async computed with built-in status tracking
const user$ = new EventSignal(null, async (prev, userId) => {
  const res = await fetch(`/api/users/${userId}`);
  return res.json();
});
// user$.status === 'pending' while fetching, 'error' on failure

// React integration
EventSignal.initReact(React);

function Counter() {
  const n = count$.use();  // subscribes & triggers re-render on change
  return <button onClick={() => count$.set(n + 1)}>{n}</button>;
}

// Render a signal directly in JSX — no component wrapper needed
const label$ = new EventSignal('Hello', { componentType: 'my-label' });
EventSignal.registerReactComponentForComponentType('my-label', MyLabelComponent);

function App() {
  return <div>{label$}</div>;  // renders as <MyLabelComponent current$={label$} />
}
```

### Reactive Composition

EventSignal excels at building complex state from simple pieces:

```typescript
const a$ = new EventSignal(2);
const b$ = new EventSignal(3);

// Computed chain — automatically stays in sync
const sum$     = new EventSignal(0, () => a$.get() + b$.get());
const product$ = new EventSignal(0, () => a$.get() * b$.get());
const label$   = new EventSignal('', () => `${a$.get()} + ${b$.get()} = ${sum$.get()}`);

a$.set(10);
console.log(label$.get()); // "10 + 3 = 13"
```

### Bridging External Events

Connect any `EventEmitter` or `EventTarget` to reactive state:

```typescript
const windowWidth$ = new EventSignal(window.innerWidth, (prev, event) => {
  return (event?.target as Window)?.innerWidth ?? prev;
}, {
  sourceEmitter: window,
  sourceEvent: 'resize',
});

// Now windowWidth$ stays in sync with window resize events automatically
```

---

## Overview

`EventSignal` is a reactive signals system compatible with `EventEmitter`/`EventTarget` and deeply integrated with React. Signals hold reactive values that automatically track dependencies, support computed values (sync and async), and can be rendered directly in JSX.

---

## Import

```typescript
import { EventSignal, isEventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';
```

---

## Constructor

```typescript
new EventSignal<T, S, D, R>(initialValue: T)
new EventSignal<T, S, D, R>(initialValue: T, options: NewOptions)
new EventSignal<T, S, D, R>(initialValue: T, computation: ComputationFn)
new EventSignal<T, S, D, R>(initialValue: T, computation: ComputationFn, options: NewOptions)
```

### Type Parameters

| Param | Description                                 |
|-------|---------------------------------------------|
| `T`   | Value type                                  |
| `S`   | Source value type (defaults to `T`)         |
| `D`   | Data payload type (defaults to `undefined`) |
| `R`   | Return type from `get()` (defaults to `T`)  |

### Computation Function

```typescript
type ComputationWithSource<T, S, D, R> = (
  prevValue: Awaited<T>,
  sourceValue: S | undefined,
  eventSignal: EventSignal<T, S, D, R>
) => R | undefined;
```

Returning `undefined` from a computation means "no update" — the current value is kept.

### NewOptions

| Option              | Type                         | Description                                                      |
|---------------------|------------------------------|------------------------------------------------------------------|
| `description`       | `string`                     | Human-readable name (used in Symbol description, React DevTools) |
| `deps`              | `{ eventName: symbol }[]`    | Explicit dependencies (signal symbols)                           |
| `data`              | `D`                          | Arbitrary payload attached to the signal                         |
| `signal`            | `AbortSignal`                | Abort signal for lifecycle management                            |
| `finaleValue`       | `Awaited<R>`                 | Value set when signal is destroyed                               |
| `finaleSourceValue` | `S`                          | Source value set when signal is destroyed                        |
| `componentType`     | `string \| symbol \| number` | React component type identifier                                  |
| `reactFC`           | `ReactFC`                    | Direct React function component for rendering                    |
| `trigger`           | `TriggerDescription`         | External trigger (clock, emitter, or eventSignal)                |
| `throttle`          | `TriggerDescription`         | Throttle trigger for rate-limiting                               |
| `onDestroy`         | `() => void`                 | Callback when signal is destroyed                                |

### NewOptionsWithSource (extends NewOptions)

| Option               | Type                              | Description                    |
|----------------------|-----------------------------------|--------------------------------|
| `sourceEmitter`      | `EventEmitter \| EventTarget`     | External event source          |
| `sourceEvent`        | `EventName \| EventName[]`        | Event name(s) to listen to     |
| `sourceMap`          | `(eventName, ...args) => S`       | Map event args to source value |
| `sourceFilter`       | `(eventName, ...args) => boolean` | Filter events                  |
| `initialSourceValue` | `S`                               | Initial source value           |

---

## Creating Signals

### Simple signal (store)

```typescript
const counter$ = new EventSignal(0, {
  description: 'counter',
});

counter$.set(1);
console.log(counter$.get()); // 1
```

### Computed signal

```typescript
const firstName$ = new EventSignal('John');
const lastName$ = new EventSignal('Doe');

const fullName$ = new EventSignal('', () => {
  return `${firstName$.get()} ${lastName$.get()}`;
}, {
  description: 'fullName',
});

console.log(fullName$.get()); // "John Doe"

firstName$.set('Jane');
// fullName$ automatically recomputes on next access
console.log(fullName$.get()); // "Jane Doe"
```

### Static factory

```typescript
const signal$ = EventSignal.createSignal(0);
const computed$ = EventSignal.createSignal(0, (prev, source, self) => {
  return someOther$.get() * 2;
});
```

---

## Value Access

### `get()`

Get the current value. Triggers computation if needed. Registers automatic dependency if called inside another computation.

```typescript
const value = signal$.get();
```

### `value` (getter)

Alias for `getSync()`.

```typescript
const value = signal$.value;
```

### `getSync()`

Get the current value synchronously. If the value is a Promise (async computation), returns the last resolved value.

### `getSafe()`

Like `get()`, but catches errors and returns the last value on failure.

### `getSyncSafe()`

Like `getSync()` + `getSafe()`. Returns the last sync value, ignoring errors and async pending state.

### `getLast()`

Returns the internal `_value` directly without triggering any computation.

### `tryGet()`

Returns a `TryResult<T>` object:

```typescript
type TryResult<T> = {
  ok: boolean;
  error: unknown | null;
  result: T;  // Current value or last value if error
};
```

### `getSourceValue()`

Get the current source value (set via `set()` or `sourceEmitter`).

---

## Value Modification

### `set(newSourceValue)`

Set a new source value. Triggers recomputation.

```typescript
counter$.set(42);
```

### `set(setter)`

Set using a function. Receives `(prevValue, sourceValue, data)`.

```typescript
counter$.set(prev => prev + 1);
counter$.set((prev, source, data) => prev + data.step);
```

### `mutate(props)`

Partially update an object value. Only triggers if changes are detected.

```typescript
const user$ = new EventSignal({ name: 'John', age: 30 });

user$.mutate({ age: 31 });
// Equivalent to: user$.set(prev => ({ ...prev, age: 31 }))
// But more efficient — modifies in place with change detection
```

### `markNextValueAsForced()`

Force the next value update even if shallow-equal to the current value.

---

## Computed Signals — Real-World Examples

### Counter with string representation (from demo)

```typescript
const counter1$ = new EventSignal(0, { description: 'counter1$' });

const computed1$ = new EventSignal('', (_prev, sourceValue, self) => {
  // When set() is called directly on computed1$, propagate to counter1$
  if ((self.getStateFlags() & EventSignal.StateFlags.wasSourceSetting) !== 0) {
    counter1$.set(sourceValue);
  }
  return `Value = ${counter1$.get()}`;
}, {
  initialSourceValue: counter1$.get(),
  description: 'computed1$',
  finaleValue: 'Counter is destroyed',
  componentType: '--counter--',
});
```

### Sum of two signals

```typescript
const countersSum$ = new EventSignal(0, () => {
  return counter1$.get() + counter2$.get();
}, {
  description: 'countersSum',
});
```

### Async computed signal (API fetch, from demo)

```typescript
const userSignal$ = new EventSignal(1, async (prevUserId, sourceUserId, self) => {
  const newUserId = sourceUserId ?? prevUserId;

  self.data.abortController.abort();
  const abortController = new AbortController();
  self.data.abortController = abortController;

  const response = await fetch(`https://api.example.com/users/${newUserId}`, {
    signal: abortController.signal,
  });
  const user = await response.json();

  self.data.userDTO = user;
  return newUserId;
}, {
  description: 'user',
  componentType: 'userCard',
  initialSourceValue: undefined,
  data: {
    userDTO: null,
    abortController: new AbortController(),
  },
});
```

---

## Subscriptions

### `on(callback)` / `addListener(callback)`

Subscribe to value changes. Returns a `Subscription` object.

```typescript
const sub = signal$.on((newValue) => {
  console.log('New value:', newValue);
});

// Later
sub.unsubscribe();
```

### `once(callback)`

Subscribe for one value change only.

```typescript
signal$.once((newValue) => {
  console.log('First change:', newValue);
});
```

### `subscribe(callback)`

Alternative subscription API. Returns an unsubscribe function (compatible with `useSyncExternalStore`).

```typescript
const unsubscribe = signal$.subscribe(() => {
  console.log('Changed!');
});
```

### Subscription object

```typescript
interface Subscription {
  unsubscribe(): void;
  suspend(): boolean;   // Pause — returns true if wasn't suspended
  resume(): boolean;    // Unpause — returns true if was suspended
  suspended: boolean;
  closed: boolean;
}
```

### EventEmitter-compatible API

EventSignal also supports an event-name-based API for compatibility, though the event name is ignored:

```typescript
signal$.on('change', callback);     // 'change' is ignored
signal$.removeListener('data', callback);
```

Valid ignored event names: `''`, `'change'`, `'changed'`, `'data'`, `'error'`. Any other value throws `TypeError`.

---

## Triggers

Triggers allow a signal to recompute based on external events.

### Clock trigger

```typescript
const clock$ = new EventSignal(0, (prev) => prev + 1, {
  trigger: {
    type: 'clock',
    ms: 1000,  // every second
  },
});
```

### Emitter trigger

```typescript
const signal$ = new EventSignal(null, (prev) => /* ... */, {
  trigger: {
    type: 'emitter',
    emitter: someEventTarget,
    event: 'resize',
    filter: (eventName, event) => event.target.innerWidth > 768,
  },
});
```

### EventSignal trigger

```typescript
const signal$ = new EventSignal('', (prev) => /* ... */, {
  trigger: {
    type: 'eventSignal',
    eventSignal: otherSignal$,
  },
});
```

### Throttle

Limit computation frequency with a separate trigger:

```typescript
const throttled$ = new EventSignal(0, () => {
  return fastChanging$.get();
}, {
  throttle: {
    type: 'clock',
    ms: 200,  // compute at most every 200ms
  },
});
```

---

## Source Emitters

Subscribe to external event sources:

```typescript
const signal$ = new EventSignal(null, (prev, sourceValue) => {
  return processData(sourceValue);
}, {
  sourceEmitter: webSocket,
  sourceEvent: 'message',
  sourceMap: (eventName, event) => event.data,
  sourceFilter: (eventName, event) => event.type === 'update',
});
```

---

## Actions (createMethod)

Create typed action functions bound to a signal:

```typescript
const counter$ = new EventSignal(0);

const increment = counter$.createMethod<number | void>((prevValue, arg = 1) => {
  return prevValue + arg;
});

const decrement = counter$.createMethod<number | void>((prevValue, arg = 1) => {
  return prevValue - arg;
});

increment();    // counter$.get() === 1
increment(5);   // counter$.get() === 6
decrement(2);   // counter$.get() === 4
```

---

## Derived Signals (map)

Create a read-only derived signal:

```typescript
const doubled$ = counter$.map(value => value * 2);
console.log(doubled$.get()); // counter$.get() * 2
```

---

## Promise API

### `toPromise()`

Get a Promise that resolves on next value change:

```typescript
const nextValue = await signal$.toPromise();
```

### Async Iteration

```typescript
for await (const value of signal$) {
  console.log('New value:', value);
  if (value > 100) break;
}
```

---

## React Integration

### Initialization

Call once at app startup:

```typescript
import * as React from 'react';
import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

EventSignal.initReact(React);
```

### `use()` — React Hook

Use a signal's value in a React component. Triggers re-render on changes.

```typescript
function Counter() {
  const count = counter$.use();
  return <div>{count}</div>;
}
```

With a reducer (selector):

```typescript
function IsEven() {
  const isEven = counter$.use(value => value % 2 === 0);
  return <div>{isEven ? 'Even' : 'Odd'}</div>;
}
```

### `useListener()` — React Effect Hook

Subscribe to changes without triggering re-renders:

```typescript
function Logger() {
  const lastValue = counter$.useListener((newValue) => {
    console.log('Counter changed to:', newValue);
  });

  return <div>Last: {lastValue}</div>;
}
```

### Direct JSX Rendering

EventSignal instances are valid React elements — render directly in JSX:

```typescript
const greeting$ = new EventSignal('Hello, World!');

function App() {
  return <div>{greeting$}</div>;
}
```

### Component Type System

Register React components for signal rendering:

```typescript
// Register a component for 'user-card' type
EventSignal.registerReactComponentForComponentType('user-card', UserCardComponent);

// Register status-specific components
EventSignal.registerReactComponentForComponentType('user-card', Spinner, 'pending');
EventSignal.registerReactComponentForComponentType('user-card', ErrorView, 'error');
EventSignal.registerReactComponentForComponentType('user-card', ErrorBoundary, 'error-boundary');

// Create a signal with that component type
const user$ = new EventSignal(userData, {
  componentType: 'user-card',
});

// Renders as <UserCardComponent current$={user$} />
function App() {
  return <div>{user$}</div>;
}
```

Dynamic component switching at runtime:

```typescript
// Switch component at runtime
EventSignal.registerReactComponentForComponentType('counter', SignalAsString1);
// ...later
EventSignal.registerReactComponentForComponentType('counter', SignalAsString2);
```

---

## Lifecycle

### `destructor()` / `[Symbol.dispose]()`

Destroy the signal. Cleans up subscriptions, resolves finale values, rejects pending promises.

```typescript
signal$.destructor();
signal$.destroyed; // true
```

### `destroyed` (getter)

Check if signal is destroyed.

### `getDispose()`

Get the dispose function (useful for passing as a callback).

### `clearDeps()`

Remove all dependency subscriptions without destroying the signal.

---

## Properties

| Property            | Type       | Description                                         |
|---------------------|------------|-----------------------------------------------------|
| `id`                | `number`   | Auto-incrementing unique ID                         |
| `key`               | `string`   | String key (base-36 of id), usable as React key     |
| `isEventSignal`     | `true`     | Type guard marker                                   |
| `data`              | `D`        | Arbitrary payload                                   |
| `status`            | `string?`  | Current status: `'default'`, `'pending'`, `'error'` |
| `lastError`         | `unknown?` | Last computation error                              |
| `componentType`     | `string?`  | React component type identifier                     |
| `version`           | `number`   | Increments on each value change                     |
| `computationsCount` | `number`   | Total computations count                            |
| `eventName`         | `symbol`   | Internal signal symbol                              |

---

## State Flags

Access via `signal$.getStateFlags()`. Use with `EventSignal.StateFlags` enum:

| Flag                        | Description                                          |
|-----------------------------|------------------------------------------------------|
| `wasDepsUpdate`             | A dependency was updated                             |
| `wasSourceSetting`          | Source value was set (via `set()` or source emitter) |
| `wasSourceSettingFromEvent` | Source value came from a source emitter event        |
| `wasThrottleTrigger`        | Throttle trigger fired                               |
| `wasForceUpdateTrigger`     | Force update trigger fired                           |
| `isNeedToCalculateNewValue` | Computation is pending                               |
| `hasSourceEmitter`          | Has a source emitter configured                      |
| `hasComputation`            | Has a computation function                           |
| `hasDepsFromProps`          | Has explicit deps from constructor                   |
| `hasThrottle`               | Has throttle configured                              |
| `isDestroyed`               | Signal is destroyed                                  |

---

## Helper Function

### `isEventSignal(value, inThisRealm?)`

Type guard to check if a value is an EventSignal instance.

```typescript
if (isEventSignal(maybeSignal)) {
  console.log(maybeSignal.get());
}
```

---

## Edge Cases

1. **Circular dependencies** — Detected at runtime. Throws `EventSignalError('Depends on own value')` if a signal reads itself during computation, or `EventSignalError('Now in computing state (cycle deps?)')` for indirect cycles.

2. **Undefined from computation** — Returning `undefined` means "no update". The current value is preserved.

3. **Object equality** — Object values use shallow equality by default. Use `markNextValueAsForced()` to bypass.

4. **Async computation** — Experimental. Sets status to `'pending'` during async computation. Concurrent async computations are deduplicated — only the last one's result is used.

5. **Destroyed signal reads** — `get()` returns the last value (or `finaleValue` if set). `set()` is a no-op.

6. **React StrictMode** — Compatible. Double-invocations from StrictMode are handled correctly.

---

## 🗺️ Roadmap — Coming Soon

EventSignal is actively developed. Here are the planned improvements and new features on the horizon.

---

### ⚛️ Enhanced React Support

- **Visibility-aware rendering** — Signals will leverage `IntersectionObserver` to automatically skip re-rendering components that are currently off-screen. This dramatically reduces wasted renders in long lists, virtualized layouts, and off-viewport panels — with zero configuration required.

- **HTML signal bindings** — First-class JSX wrappers for native HTML elements with automatic **two-way binding**: DOM events update the signal, signal changes update the DOM:

  ```tsx
  // Two-way binding out of the box
  <EventSignal.$.input    value={text$}     />
  <EventSignal.$.textarea value={bio$}      />
  <EventSignal.$.select   value={country$}  />
  <EventSignal.$.input    type="checkbox" checked={isDark$} />
  ```

  No `onChange` handlers, no `value={x}` + `onChange={() => setX(...)}` boilerplate.

---

### 🏭 Signal Factory Helpers

Ergonomic factory functions as the primary API — replacing `new EventSignal(...)` with intent-revealing helpers:

```typescript
import { createSignal, createComputedSignal, createReadonlySignal,
         createAsyncSignal, createSourceSignal } from '@termi/eventsignal';

const count$    = createSignal(0);                              // writable store
const doubled$  = createComputedSignal(() => count$.get() * 2);// auto-tracked computed
const readonly$ = createReadonlySignal(count$);                 // read-only view
const user$     = createAsyncSignal(async () =>                 // async computed
  fetchUser(id$.get())
);
const resize$   = createSourceSignal(window, 'resize',          // EventTarget source
  (e) => e.target.innerWidth
);
```

---

### 📦 Standalone `@termi/eventsignal` Package

EventSignal will be extracted as a fully **independent npm package** — **zero dependency** on `EventEmitterX`. If you only need reactive signals and don't use the event system, you'll be able to install just:

```bash
npm install @termi/eventsignal
```

Same API, same TypeScript types, smaller bundle.

---

### ⏱️ Advanced Throttle & Debounce

`ThrottleDescriptionDebounce` — full control over how and when subscriber notifications are fired:

```typescript
// Debounce mode: notify 300ms after the *last* update
const search$ = new EventSignal('', async (prev, query) => fetchResults(query), {
  throttle: {
    type: 'debounce',
    ms: 300,
  },
});

// Throttle mode: notify no more often than every 200ms
const scroll$ = new EventSignal(0, () => window.scrollY, {
  throttle: {
    type: 'throttle',
    ms: 200,
  },
});
```

Two configurable modes:
- **Throttle** — fire notifications no more often than every N ms ("leading edge")
- **Debounce** — fire notification only after N ms of inactivity since the last update ("trailing edge")

---

### 💾 External Sync API

New `sync` option for persisting signal values to external storage — signals that survive page reloads, share state across tabs, or sync with a server:

```typescript
// Persist to localStorage
const theme$ = new EventSignal('light', {
  sync: {
    load: ()      => localStorage.getItem('theme') ?? 'light',
    save: (value) => localStorage.setItem('theme', value),
  },
});

// Async sync with custom API
const settings$ = new EventSignal(defaultSettings, {
  sync: {
    load: ()      => api.getSettings(),
    save: (value) => api.saveSettings(value),
  },
});
```

---

### And much more…

- `batch()` — group multiple signal updates into a single subscriber notification
- `peek()` — read a signal's value inside a computation without registering a dependency
- Improved React DevTools integration with signal names and dependency graphs
- Performance improvements and bundle size reduction


