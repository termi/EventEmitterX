/* eslint-disable @typescript-eslint/no-wrapper-object-types */
/// <reference types="node" />
import type { EventEmitter } from 'node:events';
import type { EventEmitterEx, EventName, IMinimumCompatibleEmitter } from "../events";
type EventsAsyncIterator<T> = AsyncIterator<T, undefined> & Required<Pick<AsyncIterator<T, undefined>, "return">> & Required<Pick<AsyncIterator<T, undefined>, "throw">> & {
    [Symbol.asyncIterator](): AsyncIterator<T>;
} & {
    getDebugInfo(): Object | void;
};
type _ComputeValue_onAfterComputeValueCallback<T extends unknown[] = unknown[]> = (this: EventsAsyncIterator<T>) => Promise<void> | void;
type EventsAsyncIterator_Options<T extends unknown[] = unknown[]> = {
    signal?: AbortSignal;
    /**
     * Не вызывается при добавлении значения через EventsAsyncIterator.return
     *
     * todo: Добавить computeValueOnReturn ?
     */
    computeValue?: (this: EventsAsyncIterator<T>, eventName: EventName, eventArgs: T, addOnAfterComputeValue: (callback: _ComputeValue_onAfterComputeValueCallback<T>) => void) => T | (T extends readonly (infer U)[] ? U : never) | Promise<T> | Promise<(T extends readonly (infer U)[] ? U : never)>;
    /**
     * todo: make compatible with nodejs `events.on#options.close` (https://github.com/nodejs/node/blob/71951a0e86da9253d7c422fa2520ee9143e557fa/lib/events.js#L1010)
     *  1. make it array
     *  2. rename to 'close' as in [nodejs.events.on.options](https://nodejs.org/api/events.html#eventsonemitter-eventname-options)
     *  3. add to 'closeEventFilter(this: EventsAsyncIterator, eventName: EventName, ...args)'
     */
    stopEventName?: EventName | null;
    /**
     * todo:
     *  1. make it array
     *  2. rename to 'error'
     *  3. add to 'errorEventFilter(this: EventsAsyncIterator, eventName: EventName, ...args)'
     */
    errorEventName?: EventName | null;
    /**
     * @see [MDN / ReadableStream / queuingStrategy.highWaterMark]{@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream#highwatermark}
     * @see [NodeJS / api / events / on.options / (highWaterMark, lowWaterMark)]{@link https://nodejs.org/api/events.html#eventsonemitter-eventname-options}
     */
    isDebug?: boolean;
};
/**
 * @example 'error' on eventEmitter to ReadableStream
let ee, asyncIterator, reader, stream, promise, { ReadableStream } = require('node:stream/web');
function iteratorToStream(iterator) { return new ReadableStream({ async pull(controller) { const { value, done } = await iterator.next();done ? controller.close() : controller.enqueue(value);} }); }

 {// test1
 ee = new events(); asyncIterator = events.on(ee, 'test');
 // test: asyncIterator.next().then(a => console.log(a));void ee.emit('test', 123);

 stream = iteratorToStream(asyncIterator);
 ee.emit('error');
 console.info(stream);// ReadableStream { locked: false, state: 'errored', supportsBYOB: false }
 }

 {// test2: no unhandled error in nodejs
 ee = new events(); asyncIterator = events.on(ee, 'test'); stream = iteratorToStream(asyncIterator);
 setImmediate(() => { ee.emit('error'); }); for await (const chunk of stream.values({ preventCancel: true })) { console.log('stream chunk', chunk); break; }
 }
 {// test3: no unhandled error in nodejs, promise is rejected
 ee = new events(); asyncIterator = events.on(ee, 'test'); stream = iteratorToStream(asyncIterator); reader = stream.getReader();void 0;
 setImmediate(() => { ee.emit('error'); }); promise = reader.read(); setImmediate(() => {promise.catch(error => console.error('error:', error)); }); await promise; promise.catch(() => console.error('Unreachable code'));
 // 'error: undefined'
 }
 {// test4: Uncaught error
 ee = new events(); asyncIterator = events.on(ee, 'test'); stream = iteratorToStream(asyncIterator);
 setImmediate(() => { ee.emit('error', new Error('test error')); }); for await (const chunk of stream.values({ preventCancel: true })) { console.log('stream chunk', chunk); break; }
 // Uncaught Error: test error
 }
 {// test5: Handling error
 ee = new events(); asyncIterator = events.on(ee, 'test'); stream = iteratorToStream(asyncIterator);
 setImmediate(() => { ee.emit('error', new Error('test error')); }); try { for await (const chunk of stream.values({ preventCancel: true })) { console.log('stream chunk', chunk); break; } } catch (error) { console.error('HANDLED ERROR:', error); }
 // HANDLED ERROR Error: test error
 }
 */
/**
 * todo: Перенести последние изменения из 'nodejs events.on' сюда (https://github.com/nodejs/node/blob/71951a0e86da9253d7c422fa2520ee9143e557fa/lib/events.js#L1016):
 *  - использование FixedQueue
 *  - options.[highWatermark, lowWatermark]
 *  - поддержка Stream#resume и Stream#pause
 *  - поддержка символов: kWatermarkData (`Symbol.for('nodejs.watermarkData')`), kFirstEventParam
 *
 * `static on(emitter: EventEmitter|DOMEventTarget, event: string): AsyncIterableIterator<any>;`
 *
 * - tests: https://github.com/nodejs/node/blob/master/test/parallel/test-event-on-async-iterator.js
 *
 * Returns an `AsyncIterator` that iterates `event` events.
 *
 * @see [Node.js documentation / Events / events.on(emitter, eventName): AsyncIterator]{@link https://nodejs.org/api/events.html#eventsonemitter-eventname-options}
 * @see [nodejs / Pull requests / lib: performance improvement on readline async iterator]{@link https://github.com/nodejs/node/pull/41276}
 * @see [faster-readline-iterator]{@link https://github.com/Farenheith/faster-readline-iterator}
 * @see [Asynchronous Iterators for JavaScript]{@link https://github.com/tc39/proposal-async-iteration}
 */
export declare function eventsAsyncIterator<T extends unknown[] = unknown[], TReturn = void>(emitter: eventsAsyncIterator.CompatibleEmitter, event: EventName, options?: eventsAsyncIterator.Options<T>): EventsAsyncIterator<T>;
export declare namespace eventsAsyncIterator {
    type CompatibleEmitter = EventEmitter | EventEmitterEx | EventTarget | IMinimumCompatibleEmitter;
    type Options<T extends unknown[] = unknown[]> = EventsAsyncIterator_Options<T>;
}
export {};
