'use strict';

// see https://www.npmjs.com/package/web-streams-polyfill

import type { EventEmitter } from 'node:events';

import type { EventEmitterEx, EventName } from "../events";

import { createAbortError } from 'termi@abortable';

const _ITERATOR_STOP_REASON___NONE_ = 0;
const _ITERATOR_STOP_REASON__ABORT = 1;
const _ITERATOR_STOP_REASON__ON_ERROR_EVENT = 2;
const _ITERATOR_STOP_REASON__ON_STOP_EVENT = 3;
const _ITERATOR_STOP_REASON__RETURN_CALL = 4;
const _ITERATOR_STOP_REASON__THROW_CALL = 5;

type _ITERATOR_STOP_REASON =
    | typeof _ITERATOR_STOP_REASON___NONE_
    | typeof _ITERATOR_STOP_REASON__ABORT
    | typeof _ITERATOR_STOP_REASON__ON_ERROR_EVENT
    | typeof _ITERATOR_STOP_REASON__ON_STOP_EVENT
    | typeof _ITERATOR_STOP_REASON__RETURN_CALL
    | typeof _ITERATOR_STOP_REASON__THROW_CALL
;

type EventsAsyncIterator<T> =
    & AsyncIterator<T, undefined>
    & Required<Pick<AsyncIterator<T, undefined>, "return">>
    & Required<Pick<AsyncIterator<T, undefined>, "throw">>
    & { [Symbol.asyncIterator](): AsyncIterator<T> }
    & { getDebugInfo(): Object | void }
;

let _AsyncIteratorPrototype: Object;

function _getAsyncIteratorPrototype() {
    if (_AsyncIteratorPrototype !== void 0) {
        return _AsyncIteratorPrototype as Object;
    }

    _AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function *() {}).prototype);

    return _AsyncIteratorPrototype;
}

// const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function*() {}).prototype);

type EventsAsyncIterator_Options = {
    signal?: AbortSignal,
    // todo: `filter(this: EventsAsyncIterator, eventName: EventName, ...args)` to filter events
    /**
     * todo: make compatible with nodejs `events.on#options.close` (https://github.com/nodejs/node/blob/71951a0e86da9253d7c422fa2520ee9143e557fa/lib/events.js#L1010)
     *  1. make it array
     *  2. rename to 'close'
     *  3. add to 'closeEventFilter(this: EventsAsyncIterator, eventName: EventName, ...args)'
     */
    stopEventName?: EventName | null,
    /**
     * todo:
     *  1. make it array
     *  2. rename to 'error'
     *  3. add to 'errorEventFilter(this: EventsAsyncIterator, eventName: EventName, ...args)'
     */
    errorEventName?: EventName | null,
    /**
     * @see [MDN / ReadableStream / queuingStrategy.highWaterMark]{@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream#highwatermark}
     */
    // todo: add highWaterMark?: number, также добавить поддержку свойства "highWatermark" - для совместимости с `nodejs events.on` (только если в nodejs не переименуют свойство в highWaterMark)
    // todo: add lowWaterMark?: number, также добавить поддержку свойства "lowWatermark" - для совместимости с `nodejs events.on` (только если в nodejs не переименуют свойство в lowWaterMark)
    isDebug?: boolean,
};

// see https://github.com/nodejs/node/blob/2f169ad58aefe7c9406fd2062da33172f87e3792/lib/events.js#L1005

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
export function eventsAsyncIterator<T=(unknown[]), TReturn = void>(
    emitter: EventEmitter | EventEmitterEx | EventTarget,
    event: EventName,
    options: EventsAsyncIterator_Options = {},
): EventsAsyncIterator<T> {
    // todo: validateAbortSignal(signal, 'options.signal');
    // if (signal?.aborted)
    //     throw new AbortError(undefined, { cause: signal?.reason });

    if (event === void 0 || event === null) {
        throw new TypeError(`eventsAsyncIterator: Invalid "event" argument. Received ${event}`);
    }

    const {
        signal,
        stopEventName,
        errorEventName = 'error',
        isDebug = false,
    } = options;
    const isEventTarget = _isEventTargetCompatible(emitter);
    /**
     * Из-за того, что iteratorErrorToReject может иметь значение `undefined` после произошедшей ошибки,
     *  нужно отдельно выставлять флаг, что ошибка произошла.
     *
     * Пример: `emitter.emit('error');// error is undefined`
     */
    let has_iteratorErrorToReject = false;
    let iteratorErrorToReject: Error | void;
    let finishedState: _ITERATOR_STOP_REASON = _ITERATOR_STOP_REASON___NONE_;
    /**
     * @see [nodejs / internal/fixed_queue]{@link https://github.com/nodejs/node/blob/main/lib/internal/fixed_queue.js}
     */
    const unconsumedEvents: T[] = [];
    /**
     * @see [nodejs / internal/fixed_queue]{@link https://github.com/nodejs/node/blob/main/lib/internal/fixed_queue.js}
     */
    const unconsumedPromises: {
        resolve: ((value: IteratorReturnResult<undefined> | IteratorYieldResult<T> | PromiseLike<IteratorYieldResult<T>>) => void),
        reject: ((reason?: any) => void),
    }[] = [];
    const _onEvent = (...eventArgs: unknown[]) => {
        if (finishedState) {
            return;
        }

        if (unconsumedPromises.length > 0) {
            const promise = unconsumedPromises.shift();

            if (promise) {
                promise.resolve({
                    value: eventArgs as unknown as T,
                    done: false,
                } as IteratorYieldResult<T>);

                return;
            }
        }

        unconsumedEvents.push(eventArgs as unknown as T);
    };
    const terminateIterator = (reason: _ITERATOR_STOP_REASON) => {
        finishedState = reason;

        if (signal) {
            signal.removeEventListener('abort', _onAbort);
        }

        if (isEventTarget) {
            _eventTargetRemoveListener(emitter, event, _onEvent);

            if (stopEventName !== void 0 && stopEventName !== null) {
                _eventTargetRemoveListener(emitter, stopEventName, _onStop);
            }
            if (errorEventName !== void 0 && errorEventName !== null && errorEventName !== event) {
                _eventTargetRemoveListener(emitter, errorEventName, _onError);
            }
        }
        else {
            emitter.removeListener(event as string | symbol, _onEvent);

            if (stopEventName !== void 0 && stopEventName !== null) {
                emitter.removeListener(stopEventName as string | symbol, _onStop);
            }
            if (errorEventName !== void 0 && errorEventName !== null && errorEventName !== event) {
                emitter.removeListener(errorEventName as string | symbol, _onError);
            }
        }

        if (reason === _ITERATOR_STOP_REASON__ABORT
            || reason === _ITERATOR_STOP_REASON__RETURN_CALL
            || reason === _ITERATOR_STOP_REASON__ON_ERROR_EVENT
        ) {
            if (reason === _ITERATOR_STOP_REASON__ABORT) {
                const abortError = createAbortError(void 0, signal ? signal.reason : void 0);
                let errorHandled = false;

                if (unconsumedPromises.length > 0) {
                    const promise = unconsumedPromises.shift();

                    if (promise) {
                        promise.reject(abortError);

                        errorHandled = true;
                    }
                }

                if (!errorHandled) {
                    // The next time we call next()
                    has_iteratorErrorToReject = true;
                    iteratorErrorToReject = abortError;
                }
            }
            else if (reason === _ITERATOR_STOP_REASON__ON_ERROR_EVENT) {
                // eslint-disable-next-line unicorn/no-lonely-if
                if (unconsumedPromises.length > 0) {
                    const promise = unconsumedPromises.shift();

                    if (promise) {
                        // iteratorErrorToReject should be defined at `.on('error', handler)` - `onError`
                        const error = iteratorErrorToReject;

                        has_iteratorErrorToReject = false;
                        iteratorErrorToReject = void 0;

                        promise.reject(error);
                    }
                }
            }
        }

        if (unconsumedPromises.length > 0) {
            // todo: А точно тут не нужно подставлять значение, если unconsumedEvents - не пустой?
            //  [23.12.2022] РЕЗОЛЮЦИЯ:
            //   1. Логически, должно быть:
            //     - если unconsumedPromises - не пустой, то unconsumedEvents - путой
            //     - если unconsumedEvents - не пустой, то unconsumedPromises - путой
            //   2. Точно также сдеално в nodejs / events.on: https://github.com/nodejs/node/blob/71951a0e86da9253d7c422fa2520ee9143e557fa/lib/events.js#L1161
            if (isDebug) {
                if (unconsumedEvents.length > 0) {
                    console.warn('eventsAsyncIterator: logical error: unconsumedEvents should be empty array');
                }
            }

            const doneResult = {
                value: void 0,
                done: true,
            } as IteratorReturnResult<undefined>;

            for (const promise of unconsumedPromises) {
                promise.resolve(doneResult);
            }

            unconsumedPromises.length = 0;
        }
        // todo: [tag: unconsumedEvents__BUG_1] С очищением списка недоставленных событий что-то не то:
        // Если в nodejs выполнить код:
        // ```
        // var ee = new events(), asyncIterator = events.on(ee, 'test');
        // ee.emit('test', 3);ee.emit('test', 4);ee.emit('error', new Error('error'));ee.emit('test', 5);
        // (async() => { try { for await (let a of asyncIterator)console.log('test', a) } catch(e) {console.error(e);globalThis._ERROR = e} })();
        // // повторяем "for-await-of" ещё раз
        // (async() => { try { for await (let a of asyncIterator)console.log('test', a) } catch(e) {console.error(e);globalThis._ERROR = e} })();
        // ```
        // то `'test' [5]` НЕ выведется - т.к. итератор полностью закроется и не будет больше отдавать значений.
        // [22.12.2022] Дополнение к комментарию выше: итератор asyncIterator закроется при событии 'error' и до `'test' [5]`
        //  в любом случае не дойдёт дело. Почему у меня тогда возник вопрос с этим кодом и как он связан с очищением
        //  списка событий сейчас НЕ ПОНЯТНО.
        //
        // При этом, в нашей реализации, если мы будем очищать тут список недоставленных событий, то не будет проходить
        //  некоторые ВАЖНЫЕ тесты:
        //  - 'stream should return all received values after iterator was aborted'
        //  - 'stream should return all received values after iterator was aborted'
        //  - 'iterator should return all values after iterator was closed'
        //  и другие.
        // Нужно разобраться, как nodejs events.on правильно работает в такой ситуации, а наш код - нет
        //
        // [22.12.2022] РЕЗОЛЮЦИЯ: "nodejs events.on" отправляет события из unconsumedEvents даже после закрытия asyncIterator,
        //  в том числе закрытия по событию 'error'.
        //  Вот тут продолжают отдаваться события: https://github.com/nodejs/node/blob/2f169ad58aefe7c9406fd2062da33172f87e3792/lib/events.js#L1019
        //  А тут, после того, как больше событий не осталось, итератор проверяется на закрытость: https://github.com/nodejs/node/blob/2f169ad58aefe7c9406fd2062da33172f87e3792/lib/events.js#L1035
        //  Т.е., очищаться список неотправленных событий (unconsumedEvents) тут НЕ НУЖНО.
        //
        // if (unconsumedEvents.length > 0) {
        //     unconsumedEvents.length = 0;
        // }
    };
    const _onStop = () => {
        terminateIterator(_ITERATOR_STOP_REASON__ON_STOP_EVENT);
    };
    const _onAbort = () => {
        terminateIterator(_ITERATOR_STOP_REASON__ABORT);
    };
    const _onError = (errorReason: Error | any) => {
        // on 'error' event errorReason can be `undefined`!!!
        has_iteratorErrorToReject = true;
        iteratorErrorToReject = errorReason;

        terminateIterator(_ITERATOR_STOP_REASON__ON_ERROR_EVENT);
    };

    if (isEventTarget) {
        _eventTargetAddListener(emitter, event, _onEvent);

        if (stopEventName !== void 0 && stopEventName !== null) {
            _eventTargetAddListener(emitter, stopEventName, _onStop);
        }
        if (errorEventName !== void 0 && errorEventName !== null && errorEventName !== event) {
            _eventTargetAddListener(emitter, errorEventName, _onError);
        }
    }
    else {
        emitter.on(event as string | symbol, _onEvent);

        if (stopEventName !== void 0 && stopEventName !== null) {
            emitter.on(stopEventName as string | symbol, _onStop);
        }
        if (errorEventName !== void 0 && errorEventName !== null && errorEventName !== event) {
            emitter.on(errorEventName as string | symbol, _onError);
        }
    }

    if (signal) {
        signal.addEventListener('abort', _onAbort, { once: true });
    }

    return Object.setPrototypeOf({
        [Symbol.asyncIterator]() {
            return this;
        },
        next() {
            // First, we consume all unread events
            if (unconsumedEvents.length > 0) {
                const eventArgs = unconsumedEvents.shift();

                return Promise.resolve({
                    value: eventArgs,
                    done: false,
                } as IteratorYieldResult<T>);
            }

            // Then we error, if an error happened
            // This happens one time if at all, because after 'error'
            // we stop listening
            //
            // Должна ли тут логика обработки события 'error' быть такая же, как в nodejs events.on?:
            //  Если был `ee.emit('error')` - без аргумента (или `ee.emit('error', null)`, или `ee.emit('error', false)`),
            //   то итератор завершиться БЕЗ ВЫБРОСА ОШИБКИ.
            //  Возможно, это логическая проблема в nodejs events.on, но нам нужно под него мимикрировать, так что,
            //   нужно решить, делать ли туже логику.
            //
            // [22.12.2022] Дополнение к комментарию выше:
            // код:
            // ```
            // var ee = new events(), asyncIterator = events.on(ee, 'test');
            // asyncIterator.next().then(a => console.log('NEXT:', a)).catch(e => console.warn('ERROR:', e));
            // ee.emit('error');
            // ```
            // вполне себе завершается с ошибкой (будет выведено в консоль: `ERROR: undefined`)
            // ОДНАКО!, код:
            // ```
            // var ee = new events(), asyncIterator = events.on(ee, 'test');
            // ee.emit('error');
            // asyncIterator.next().then(a => console.log('NEXT:', a)).catch(e => console.warn('ERROR:', e));
            // ```
            // завершиться БЕЗ ошибки (будет выведено в консоль: `NEXT: { value: undefined, done: true }`)
            //
            // todo: [22.12.2022] РЕЗОЛЮЦИЯ: считаем это логическим багом nodejs и делаем, чтобы в обоих случаях asyncIterator
            //  завершался с ошибкой (должно выводиться в консоль: `ERROR: undefined`)
            // todo: [29.03.2023] Дополнение: Сделать issue на https://github.com/nodejs/node/issues для выяснения этого вопроса.
            // todo: [29.03.2023] Дополнение: вернуться к этому вопросы после выхода новой версии nodejs и изменениях в `events.on()`.
            //
            if (has_iteratorErrorToReject) {
                const error = iteratorErrorToReject;

                // Only the first element errors
                has_iteratorErrorToReject = false;
                iteratorErrorToReject = void 0;

                return Promise.reject(error);
            }

            // If the iterator is finished, resolve to done
            if (finishedState) {
                return Promise.resolve({
                    value: void 0,
                    done: true,
                } as IteratorReturnResult<undefined>);
            }

            // Wait until an event happens
            return new Promise<IteratorReturnResult<undefined> | IteratorYieldResult<T>>((resolve, reject) => {
                unconsumedPromises.push({ resolve, reject });
            });
        },
        return(value?: TReturn) {
            terminateIterator(_ITERATOR_STOP_REASON__RETURN_CALL);

            return Promise.resolve({
                value,
                done: true,
            } as IteratorReturnResult<TReturn>);
        },
        throw(err: Error) {
            if (!err || !(err instanceof Error)) {
                throw new TypeError('eventsAsyncIterator#throw(): Invalid argument', { cause: err });
            }

            has_iteratorErrorToReject = true;
            iteratorErrorToReject = err;

            terminateIterator(_ITERATOR_STOP_REASON__THROW_CALL);

            // todo: Я не уверен, что это правильное поведение. Может быть нужно резолвить все промисы в
            //  unconsumedPromises с `{ value: void 0,  done: true }` и в результате это функции тоже возвращать
            //  `{ value: void 0,  done: true }`? Т.е., также, как для return().
            //  В реализации от nodejs вообще нет возвращаемого значения, что странно https://github.com/nodejs/node/blob/2f169ad58aefe7c9406fd2062da33172f87e3792/lib/events.js#L1066
            // firstly send all events from unconsumedEvents
            return this.next();
        },

        getDebugInfo() {
            if (!isDebug) {
                return void 0;
            }

            return {
                isDebug,

                unconsumedEvents_length: unconsumedEvents.length,
                unconsumedPromises_length: unconsumedPromises.length,
                finishedState,
                has_iteratorErrorToReject,
                iteratorErrorToReject,

                eventName: event,
                errorEventName,
                stopEventName,

                has_signal: signal,
            };
        },
    }, _getAsyncIteratorPrototype());
}

// todo: implement addAbortSignal (https://nodejs.org/api/stream.html#streamaddabortsignalsignal-stream)
/*
const controller = new AbortController();
setTimeout(() => controller.abort(), 10_000); // set a timeout
const stream = addAbortSignal(
  controller.signal,
  fs.createReadStream(('object.json'))
);
(async () => {
  try {
    for await (const chunk of stream) {
      await process(chunk);
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      // The operation was cancelled
    } else {
      throw e;
    }
  }
})();
*/

/*
// todo: iteratorToNodeReadableStream (https://nodejs.org/api/stream.html#readable_constructcallback)
const { Readable } = require('node:stream');
const fs = require('node:fs');

class ReadStream extends Readable {
  constructor(filename) {
    super();
    this.filename = filename;
    this.fd = null;
  }
  _construct(callback) {
    fs.open(this.filename, (err, fd) => {
      if (err) {
        callback(err);
      } else {
        this.fd = fd;
        callback();
      }
    });
  }
  _read(n) {
    const buf = Buffer.alloc(n);
    fs.read(this.fd, buf, 0, n, null, (err, bytesRead) => {
      if (err) {
        this.destroy(err);
      } else {
        this.push(bytesRead > 0 ? buf.slice(0, bytesRead) : null);
      }
    });
  }
  _destroy(err, callback) {
    if (this.fd) {
      fs.close(this.fd, (er) => callback(er || err));
    } else {
      callback(err);
    }
  }
}
*/

function _eventTargetAddListener(
    eventTarget: EventTarget,
    type: EventName | bigint,
    handler: EventListenerOrEventListenerObject,
    options?: EventListenerOptions | boolean,
) {
    let _type = type;

    if (typeof _type === 'symbol' && !_isDOMEventTargetSupportSymbolAsType(eventTarget)) {
        _type = String(_type);
    }

    eventTarget.addEventListener(_type as string, handler, options);
}

function _eventTargetRemoveListener(
    eventTarget: EventTarget,
    type: EventName | bigint,
    handler: EventListenerOrEventListenerObject,
    options?: EventListenerOptions | boolean,
) {
    let _type = type;

    if (typeof _type === 'symbol' && !_isDOMEventTargetSupportSymbolAsType(eventTarget)) {
        _type = String(_type);
    }

    eventTarget.removeEventListener(_type as string, handler, options);
}

function _isEventTargetCompatible(maybeDOMEventTarget: EventTarget | Object): maybeDOMEventTarget is EventTarget {
    return !!maybeDOMEventTarget
        && typeof (maybeDOMEventTarget as EventTarget).addEventListener === 'function'
        && typeof (maybeDOMEventTarget as EventTarget).removeEventListener === 'function'
    ;
}

const kEventTargetSupportSymbolAsType = Symbol('kEventTargetSupportSymbolAsType');

function _isDOMEventTargetSupportSymbolAsType(eventTarget: EventTarget) {
    if (eventTarget[kEventTargetSupportSymbolAsType] !== void 0) {
        return eventTarget[kEventTargetSupportSymbolAsType];
    }

    let eventTargetSupportSymbolAsType = false;
    const listener = () => {};

    try {
        eventTarget.addEventListener(kEventTargetSupportSymbolAsType as unknown as string, listener);
        eventTarget.removeEventListener(kEventTargetSupportSymbolAsType as unknown as string, listener);

        eventTargetSupportSymbolAsType = true;
    }
    catch {
        // error should be `TypeError: can't convert symbol to string`
    }

    eventTarget[kEventTargetSupportSymbolAsType] = eventTargetSupportSymbolAsType;

    return eventTargetSupportSymbolAsType;
}
