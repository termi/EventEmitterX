// Compile-only source and emitted-declaration fixtures; never execute this file.
import { EventEmitterX, getEventListeners, isEventEmitterX, TimeoutError, captureRejectionSymbol } from 'emitter-under-test';
import type { Listener, ICompatibleEmitter, IEventTiming } from 'emitter-under-test';
import type { EventEmitter } from 'node:events';

const symbolEvent = Symbol('typed event');
type Events = {
    data: (value: number, label: string) => void;
    [symbolEvent]: (enabled: boolean) => void;
};
const typed = new EventEmitterX<Events>();
typed.on('data', (value, label) => { value.toFixed(); label.toUpperCase(); });
typed.once(symbolEvent, enabled => { const value: boolean = enabled; });
typed.emit('data', 1, 'ready');
typed.emit(symbolEvent, true);
// @ts-expect-error Typed emit preserves the event's parameter tuple.
typed.emit('data', 'wrong', 1);
// @ts-expect-error Symbol events preserve their payload type.
typed.emit(symbolEvent, 1);
// @ts-expect-error Listener payloads cannot be weakened to another domain.
typed.on('data', (value: string) => {});

const emitter = new EventEmitterX();
const nodeCompatible: EventEmitter = emitter;
const compatible: ICompatibleEmitter = emitter;
const names: (string | symbol)[] = emitter.eventNames();
const listener: Listener = function(value) { this?.emit('other', value); };
emitter.once('data', listener);
const original: Listener | undefined = emitter.rawListeners('data')[0]?.listener;
const tag: string = emitter[Symbol.toStringTag];
const timeoutTag: string = new TimeoutError()[Symbol.toStringTag];
emitter[captureRejectionSymbol] = (error, eventName, ...args) => { const reason: unknown = error; };
const timing: IEventTiming = { time(_names) {}, timeEnd(_names, _omit) {} };
EventEmitterX.once(emitter, 'data', { timing });
// @ts-expect-error A timing backend must support ending a measurement.
EventEmitterX.once(emitter, 'data', { timing: { time() {} } });
const target = new EventTarget();
getEventListeners(target, 'data');
getEventListeners(emitter, symbolEvent);
const object: object = {};
if (isEventEmitterX(object)) object.emit('data', 1);
// @ts-expect-error Arbitrary instance symbol properties are not declared by fixing rejection metadata.
const invalid = emitter[Symbol('unrelated')];

void [nodeCompatible, compatible, names, original, tag, timeoutTag, captureRejectionSymbol];
