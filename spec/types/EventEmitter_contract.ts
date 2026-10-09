// Compile-only source and emitted-declaration fixtures; never execute this file.
import { EventEmitterX, EventEmitterSimpleProxy, EventEmitterProxy, getEventListeners, isEventEmitterX, TimeoutError, captureRejectionSymbol } from 'emitter-under-test';
import type { Listener, ICompatibleEmitter, IEventTiming, EventMapFromTuples, IEventEmitter } from 'emitter-under-test';
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

const simpleProxy = new EventEmitterSimpleProxy<Events>({ emitter });
const routedProxy = new EventEmitterProxy<Events>({
    sourceEmitter: emitter,
    getSourceEmitter: (_default, event) => event === symbolEvent ? emitter : null,
    getTargetEmitter: (_default, _event, args) => args ? emitter : undefined,
    allowDirectEmitToTarget: true,
});
simpleProxy.on('data', (value, label) => { value.toFixed(); label.toUpperCase(); });
routedProxy.once(symbolEvent, enabled => { const value: boolean = enabled; });
routedProxy.emit('data', 1, 'forwarded');
// @ts-expect-error Proxy events retain the declared payload tuple.
simpleProxy.emit('data', false);
// @ts-expect-error Routed proxy symbols retain their payload domain.
routedProxy.emit(symbolEvent, 1);
// @ts-expect-error Source routing must return a compatible emitter, null or undefined.
new EventEmitterProxy({ getSourceEmitter: () => ({ invalid: true }) });
const simpleCompatible: EventEmitter = simpleProxy;
const routedCompatible: EventEmitter = routedProxy;
void [simpleCompatible, routedCompatible];



type TuplePayloads = {
    data: readonly [value: number, label?: string];
    rest: [prefix: string, ...counts: number[]];
    empty: readonly [];
    [symbolEvent]: readonly [enabled: boolean];
};
type TupleEvents = EventMapFromTuples<TuplePayloads>;
const tupleEmitter = new EventEmitterX<TupleEvents>();
tupleEmitter.on('data', function(value, label) {
    value.toFixed();
    label?.toUpperCase();
    const context: EventEmitterX | undefined = this;
});
tupleEmitter.emit('data', 1);
tupleEmitter.emit('data', 1, 'ready');
tupleEmitter.emit('rest', 'counts', 1, 2, 3);
tupleEmitter.emit('empty');
tupleEmitter.once(symbolEvent, enabled => { const value: boolean = enabled; });
tupleEmitter.emit(symbolEvent, true);
const tupleProxy = new EventEmitterSimpleProxy<TupleEvents>({ emitter });
const routedTupleProxy = new EventEmitterProxy<TupleEvents>({ sourceEmitter: emitter });
tupleProxy.on('rest', (prefix, ...counts) => { prefix.toUpperCase(); counts.forEach(count => count.toFixed()); });
routedTupleProxy.emit('data', 1, 'forwarded');
const tupleView: IEventEmitter<TupleEvents> = tupleEmitter;
tupleView.emit('data', 1);
tupleView.listenerCount('data', (value, label) => {});
// @ts-expect-error Interface emit must not escape its tuple through any[].
tupleView.emit('data', 'wrong');
// @ts-expect-error Rest entries retain their number type.
tupleEmitter.emit('rest', 'counts', false);
// @ts-expect-error Empty events reject payloads.
tupleEmitter.emit('empty', 1);
// @ts-expect-error Symbols keep boolean payloads.
tupleProxy.emit(symbolEvent, 1);
// @ts-expect-error Routed proxies keep optional tuple payload types.
routedTupleProxy.emit('data', 1, false);
// @ts-expect-error Unknown tuple keys are closed.
tupleEmitter.on('missing', () => {});
// @ts-expect-error Callback filtering keeps the event's listener type.
tupleEmitter.listenerCount('data', (value: string) => {});
// @ts-expect-error Tuple maps reject scalar entries.
type InvalidTupleMap = EventMapFromTuples<{ data: number }>;
const legacyView: IEventEmitter<Events> = typed;
// @ts-expect-error Legacy function maps retain strict interface payloads too.
legacyView.emit('data', false);
// @ts-expect-error Typed listenerCount rejects a mismatched callback.
typed.listenerCount(symbolEvent, (enabled: number) => {});
