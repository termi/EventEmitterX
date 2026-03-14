# EventEmitterX — API Reference

## Overview

`EventEmitterX` is a cross-platform `EventEmitter` implementation compatible with both Node.js and browsers. It extends the standard Node.js EventEmitter API with additional features for debugging, performance monitoring, and advanced asynchronous patterns.

---

## Import

```typescript
import { EventEmitterX } from '@termi/eventemitterx/modules/events';
// or
import EventEmitterX, { once, on } from '@termi/eventemitterx/modules/events';
```

---

## Constructor

```typescript
new EventEmitterX(options?: ConstructorOptions)
```

### ConstructorOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxListeners` | `number` | `Infinity` | Maximum number of listeners per event before a warning is emitted |
| `listenerOncePerEventType` | `boolean` | `false` | If `true`, a listener can be registered at most once per event type (similar to `EventTarget` behavior) |
| `captureRejections` | `boolean` | `false` | Enable automatic rejection capture for async listeners |
| `emitCounter` | `Console \| ICounter` | — | Count emit calls. Pass `console` for console.count or a custom `ICounter` |
| `listenerWithoutThis` | `boolean` | `false` | Call listener functions without binding `this` to the emitter |
| `supportEventListenerObject` | `boolean` | `false` | Support DOM `{ handleEvent }` pattern |
| `isDebugTraceListeners` | `boolean` | `false` | Attach call stack to listeners via `listener.__debugTrace` |

### Example

```typescript
const emitter = new EventEmitterX({
  maxListeners: 50,
  listenerOncePerEventType: true,
  emitCounter: console,
});
```

---

## Instance Methods

### Standard EventEmitter Methods

These methods behave identically to Node.js `EventEmitter`:

| Method | Signature |
|--------|-----------|
| `on(event, listener)` | Add a listener for `event`. Returns `this`. |
| `addListener(event, listener)` | Alias for `on`. |
| `once(event, listener)` | Add a one-time listener. Removed after first call. Returns `this`. |
| `off(event, listener)` | Alias for `removeListener`. |
| `removeListener(event, listener)` | Remove a specific listener. Returns `this`. |
| `removeAllListeners(event?)` | Remove all listeners (optionally for a specific event). Returns `this`. |
| `prependListener(event, listener)` | Add listener to the beginning of the list. Returns `this`. |
| `prependOnceListener(event, listener)` | Add one-time listener to the beginning. Returns `this`. |
| `emit(event, ...args)` | Emit an event. Returns `true` if listeners existed. |
| `listeners(event)` | Returns a copy of the listener array (unwraps once-wrappers). |
| `rawListeners(event)` | Returns a copy of the raw listener array (includes once-wrappers). |
| `listenerCount(event)` | Returns the number of listeners for `event`. |
| `eventNames()` | Returns an array of event names with registered listeners. |
| `setMaxListeners(n)` | Set max listeners. Returns `this`. |
| `getMaxListeners()` | Get current max listeners value. |

### Non-Standard Methods

#### `hasListeners(event)`

Check if there are any listeners for the given event.

```typescript
if (emitter.hasListeners('data')) {
  emitter.emit('data', payload);
}
```

#### `hasListener(event, listenerToCheck?)`

Check if a specific listener is registered. If `listenerToCheck` is omitted, behaves like `hasListeners`.

```typescript
const handler = () => console.log('event!');
emitter.on('data', handler);
emitter.hasListener('data', handler); // true
```

#### `destructor()`

Destroy the emitter. Emits `kDestroyingEvent`, removes all listeners, and prevents future listener additions.

```typescript
emitter.destructor();
emitter.isDestroyed; // true
```

#### `[Symbol.dispose]()`

Alias for `destructor()`. Enables `using` syntax (TC39 Explicit Resource Management).

```typescript
{
  using emitter = new EventEmitterX();
  emitter.on('data', handler);
} // automatically destroyed here
```

---

## Static Methods

### `EventEmitterX.once()` — Enhanced Promise-based Once

This is the most significant departure from Node.js `events.once()`. It supports:

- **Multiple event names** — resolves on whichever fires first
- **Filter function** — only resolve when the filter returns `true`
- **Timeout** — reject with `TimeoutError` after specified ms
- **AbortSignal** — reject with `AbortError` when signal is aborted
- **AbortControllers array** — group multiple abort controllers
- **ServerTiming** — track timing metrics
- **Custom error event name** — override the default `'error'` event
- **onDone callback** — called before promise resolves
- **Custom Promise constructor** — use a custom Promise implementation
- **Works with EventEmitter, EventTarget, and compatible emitters**

#### Signatures

```typescript
// With EventEmitterX
static once(emitter: EventEmitterX, types: EventName | EventName[], options?: StaticOnceOptions): Promise<any[]>;

// With Node.js EventEmitter
static once(emitter: NodeEventEmitter, types: string | symbol | (string | symbol)[], options?: StaticOnceOptions): Promise<any[]>;

// With DOM EventTarget
static once(eventTarget: EventTarget, types: string | string[], options?: StaticOnceOptionsEventTarget): Promise<[Event]>;
```

#### Options (StaticOnceOptions)

| Option | Type | Description |
|--------|------|-------------|
| `prepend` | `boolean` | Add listener at the beginning of the list |
| `signal` | `AbortSignal` | Cancel the waiting with an abort signal |
| `abortControllers` | `AbortController[]` | Group of abort controllers to listen to |
| `timeout` | `number` | Timeout in ms before rejection with `TimeoutError` |
| `errorEventName` | `EventName` | Custom error event name (default: `'error'`) |
| `filter` | `(emitEventName, ...args) => boolean` | Filter function — only resolve when returns `true` |
| `onDone` | `(emitEventName, ...args) => void` | Callback executed before resolve |
| `timing` | `ServerTiming` | Server-Timing tracking |
| `Promise` | `PromiseConstructor` | Custom Promise constructor |
| `debugInfo` | `Object` | Debug info attached to timeout/abort errors |

#### Examples

**Basic usage:**

```typescript
const emitter = new EventEmitterX();

setTimeout(() => emitter.emit('ready', { status: 'ok' }), 1000);

const [result] = await EventEmitterX.once(emitter, 'ready');
console.log(result); // { status: 'ok' }
```

**Multiple event names (race):**

```typescript
const emitter = new EventEmitterX();

// Resolves on whichever fires first
const result = await EventEmitterX.once(emitter, ['success', 'failure']);
```

**With filter:**

```typescript
const emitter = new EventEmitterX();

// Only resolve when the value is greater than 10
const [value] = await EventEmitterX.once(emitter, 'data', {
  filter: (eventName, value) => value > 10,
});
```

**With timeout:**

```typescript
try {
  const result = await EventEmitterX.once(emitter, 'response', {
    timeout: 5000,
  });
} catch (error) {
  // error.name === 'TimeoutError'
  // error.code === 'ETIMEDOUT'
}
```

**With AbortSignal:**

```typescript
const controller = new AbortController();

setTimeout(() => controller.abort(), 3000);

try {
  await EventEmitterX.once(emitter, 'data', {
    signal: controller.signal,
  });
} catch (error) {
  // error.name === 'AbortError'
}
```

**With DOM EventTarget:**

```typescript
const button = document.querySelector('#myButton');

const [event] = await EventEmitterX.once(button, 'click', {
  timeout: 10000,
  passive: true,
});
```

**Edge case — waiting for `'error'` itself:**

```typescript
// When waiting for 'error' event itself, no special error handling is applied
const [error] = await EventEmitterX.once(emitter, 'error');
```

---

### `EventEmitterX.on()` — Async Iterator

Creates an async iterator for event streams. Alias for `eventsAsyncIterator`.

```typescript
static on(emitter: EventEmitter | EventTarget, event: EventName, options?: Options): AsyncIterator
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `signal` | `AbortSignal` | Abort the iterator |
| `computeValue` | `(eventName, eventArgs, addCallback) => T` | Transform event args before yielding |
| `stopEventName` | `EventName` | Event that stops the iterator |
| `errorEventName` | `EventName` | Event that causes the iterator to throw (default: `'error'`) |

#### Example

```typescript
const emitter = new EventEmitterX();

// Produce events
setInterval(() => emitter.emit('tick', Date.now()), 1000);

// Consume as async iterator
for await (const [timestamp] of EventEmitterX.on(emitter, 'tick')) {
  console.log('Tick at:', timestamp);
  if (timestamp > deadline) break;
}
```

---

### `EventEmitterX.getEventListeners(emitter, eventName)`

Get listeners from any compatible emitter (EventEmitterX, Node EventEmitter, or EventTarget).

```typescript
const listeners = EventEmitterX.getEventListeners(emitter, 'data');
```

---

### `EventEmitterX.addAbortListener(signal, callback)`

Safely listen to an `AbortSignal` abort event. Returns a `Disposable`.

```typescript
const disposable = EventEmitterX.addAbortListener(signal, () => {
  console.log('Aborted!');
});

// Later: cleanup
disposable[Symbol.dispose]();
```

---

## Static Properties

| Property | Type | Description |
|----------|------|-------------|
| `errorMonitor` | `symbol` | Symbol for monitoring error events without catching them |
| `captureRejectionSymbol` | `symbol` | `Symbol.for('nodejs.rejection')` |
| `usingDomains` | `false` | Domains are not supported |

---

## Special Events

| Event | When emitted |
|-------|-------------|
| `'newListener'` | Before a new listener is added |
| `'removeListener'` | After a listener is removed |
| `'error'` | On error. If no listener — throws. |
| `'duplicatedListener'` | When `listenerOncePerEventType` is enabled and a duplicate listener is detected |
| `kDestroyingEvent` | During `destructor()` call, before all listeners are removed |

---

## TypeScript Generics

```typescript
interface MyEvents {
  data: (payload: Buffer) => void;
  error: (err: Error) => void;
  close: () => void;
}

const emitter = new EventEmitterX<MyEvents>();

emitter.on('data', (payload) => {
  // payload is typed as Buffer
});

const [payload] = await EventEmitterX.once(emitter, 'data');
```

---

## Compatibility Notes

- `EventEmitterEx` is a deprecated alias for `EventEmitterX`
- `EventEmitter` is also exported as an alias
- `ICompatibleEmitter` / `IMinimumCompatibleEmitter` interfaces define the minimum contract for `static once()` compatibility

