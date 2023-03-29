'use strict';

// see https://www.npmjs.com/package/web-streams-polyfill

import type { EventEmitter } from 'node:events';
import type { Stream } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
// import type { Readable as NodeReadable } from 'node:stream';
import type { QueuingStrategy, UnderlyingSource/*, UnderlyingByteSource*/ } from 'node:stream/web';

import type { EventEmitterEx, EventName } from "../events";

import { isNodeJS } from "../../common/runEnv";
import { createAbortError } from 'termi@abortable';
import { isNodeStream } from "../../type_guards/stream";

/**
 * A Web ReadableStream constructor
 *
 * @see [MDN / Streams API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Streams_API}
 * @see [MDN / ReadableStream]{@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream}
 * @see [Node.js DOC / Web Streams API]{@link https://nodejs.org/api/webstreams.html}
 */
let ReadableStreamConstructor: {
    prototype: ReadableStream,
    // new(underlyingSource: UnderlyingByteSource, strategy?: QueuingStrategy<Uint8Array>): ReadableStream<Uint8Array>;
    new<R = any>(underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>): ReadableStream<R>,
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
} = (typeof ReadableStream !== 'undefined' ? ReadableStream : void 0)!;

if (!ReadableStreamConstructor) {
    if (isNodeJS) {
        try {
            ReadableStreamConstructor = require('node:stream/web').ReadableStream;
        }
        catch (err) {
            // In this nodejs version WEB ReadableStream is not supported
            console.warn(`streamUtils.ts: nodejs version: require('node:stream/web') error:`, err);

            try {
                ReadableStreamConstructor = require('web-streams-polyfill/ponyfill').ReadableStream;
            }
            catch (err) {
                // In this nodejs version WEB ReadableStream is not supported
                console.error(`streamUtils.ts: nodejs version: error while require('web-streams-polyfill/ponyfill'):`, err);
            }
        }
    }
}

/**
 * @see [MDN / ReadableStream / Async iterator to stream]{@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream#async_iterator_to_stream}
 * @see [MDN / Iterators and generators]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators}
 * @see [MDN / Using readable streams]{@link https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams}
 */
export function iteratorToWebReadableStream<T>(
    iterator: AsyncIterator<T, void, void> | Iterator<T, void, void>,
    // todo: more options
    {
        signal,
    } = {} as {
        signal?: AbortSignal,
    },
): NodeWebReadableStream<T> {
    if (!ReadableStreamConstructor) {
        throw new Error('This context has no ReadableStream implementation.');
    }

    let abortSignalHandler: ((this: AbortSignal, event_: AbortSignalEventMap["abort"]) => any) | void = void 0;
    const terminateStream = () => {
        if (signal) {
            // eslint-disable-next-line unicorn/no-lonely-if
            if (abortSignalHandler) {
                signal.removeEventListener('abort', abortSignalHandler);

                abortSignalHandler = void 0;
            }
        }
    };

    const readableStream = new ReadableStreamConstructor({
        start(controller) {
            if (signal) {
                abortSignalHandler = () => {
                    if (abortSignalHandler) {
                        signal.removeEventListener('abort', abortSignalHandler);

                        abortSignalHandler = void 0;
                    }

                    controller.close();
                };

                signal.addEventListener('abort', abortSignalHandler);
            }
        },
        /**
         *  This method, also defined by the developer, will be called repeatedly when the stream's internal queue of
         *  chunks is not full, up until it reaches its high water mark. If `pull()` returns a promise, then it won't
         *  be called again until that promise fulfills; if the promise rejects, the stream will become errored.
         *  The `controller` parameter passed to this method is a [ReadableStreamDefaultController]{@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultController}
         *  or a [ReadableByteStreamController]{@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableByteStreamController},
         *  depending on the value of the `type` property. This can be used by the developer to control the stream as
         *  more chunks are fetched.
         * @param controller
         */
        async pull(controller) {
            const { value, done } = await iterator.next();

            if (done) {
                terminateStream();

                controller.close();
            }
            else {
                controller.enqueue(value);
            }
        },

        // This is called if the reader cancels.
        cancel() {
            terminateStream();
        },
    });

    if (!('values' in readableStream)) {
        Object.defineProperty(readableStream, 'values', {
            // todo: values(options?: { preventCancel?: boolean }): AsyncIterableIterator<R>;
            value() {
                // todo:
            },
        });
    }
    if (!(Symbol.asyncIterator in readableStream)) {
        Object.defineProperty(readableStream, Symbol.asyncIterator, {
            // todo: [Symbol.asyncIterator](): AsyncIterableIterator<R>;
            value() {
                // todo:
            },
        });
    }

    return readableStream as NodeWebReadableStream<T>;
}

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

// see https://github.com/nodejs/node/blob/2f169ad58aefe7c9406fd2062da33172f87e3792/lib/events.js#L1005
/**
 * todo: Move to events.ts
 *
 * Returns an `AsyncIterator` that iterates `event` events.
 *
 * @see [Node.js documentation / Events / events.on(emitter, eventName): AsyncIterator]{@link https://nodejs.org/api/events.html#eventsonemitter-eventname-options}
 */
export function eventsAsyncIterator<T=(unknown[])>(
    emitter: EventEmitter | EventEmitterEx,
    event: EventName,
    // todo: more options
    {
        signal,
        stopEventName,
        errorEventName = 'error',
        isDebug = false,
    } = {} as {
        signal?: AbortSignal,
        stopEventName?: EventName | null,
        errorEventName?: EventName | null,
        isDebug?: boolean,
    },
): EventsAsyncIterator<T> {
    // todo: validateAbortSignal(signal, 'options.signal');
    // if (signal?.aborted)
    //     throw new AbortError(undefined, { cause: signal?.reason });

    if (event === void 0 || event === null) {
        throw new TypeError(`eventsAsyncIterator: Invalid "event" argument. Received ${event}`);
    }

    let iteratorErrorToReject: Error | void;
    let finishedState: _ITERATOR_STOP_REASON = _ITERATOR_STOP_REASON___NONE_;
    const unconsumedEvents: T[] = [];
    const unconsumedPromises: {
        resolve: ((value: IteratorReturnResult<undefined> | IteratorYieldResult<T> | PromiseLike<IteratorYieldResult<T>>) => void),
        reject: ((reason?: any) => void),
    }[] = [];
    const onEvent = (...eventArgs: unknown[]) => {
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
            signal.removeEventListener('abort', onAbort);
        }

        emitter.removeListener(event as string | symbol, onEvent);

        if (stopEventName !== void 0 && stopEventName !== null) {
            emitter.removeListener(stopEventName as string | symbol, onStop);
        }
        if (errorEventName !== void 0 && errorEventName !== null && errorEventName !== event) {
            emitter.removeListener(errorEventName as string | symbol, onError);
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
                    iteratorErrorToReject = abortError;
                }
            }
            else if (reason === _ITERATOR_STOP_REASON__ON_ERROR_EVENT) {// iteratorErrorToReject should be defined
                // eslint-disable-next-line unicorn/no-lonely-if
                if (unconsumedPromises.length > 0) {
                    const promise = unconsumedPromises.shift();

                    if (promise) {
                        promise.reject(iteratorErrorToReject);

                        iteratorErrorToReject = void 0;
                    }
                }
            }
        }

        if (unconsumedPromises.length > 0) {
            // todo: А точно тут не нужно подставлять значение, если unconsumedEvents - не пустой?
            for (const promise of unconsumedPromises) {
                promise.resolve({
                    value: void 0,
                    done: true,
                } as IteratorReturnResult<undefined>);
            }

            unconsumedPromises.length = 0;
        }
        // todo: [tag: unconsumedEvents__BUG_1] С очищением списка недоставленных событий что-то не то:
        // Если в nodejs выполнить код:
        // ```
        //
        // ee.emit('test', 3);ee.emit('test', 4);ee.emit('error');ee.emit('test', 5);
        // (async() => { try { for await (let a of asyncIterator)console.log('test', a) } catch(e) {console.error(e);globalThis._ERROR = e} })();
        // // повторяем "for-await-of" ещё раз
        // (async() => { try { for await (let a of asyncIterator)console.log('test', a) } catch(e) {console.error(e);globalThis._ERROR = e} })();
        // ```
        // то `'test' [5]` НЕ выведется - т.к. итератор полностью закроется и не будет больше отдавать значений.
        // При этом, в нашей реализации, если мы будем очищать тут список недоставленных событий, то не будет проходить
        //  некоторые ВАЖНЫЕ тесты:
        //  - 'stream should return all received values after iterator was aborted'
        //  - 'stream should return all received values after iterator was aborted'
        //  - 'iterator should return all values after iterator was closed'
        //  и другие.
        // Нужно разобраться, как nodejs events.on правильно работает в такой ситуации, а наш код - нет
        //
        // if (unconsumedEvents.length > 0) {
        //     unconsumedEvents.length = 0;
        // }
    };
    const onStop = () => {
        terminateIterator(_ITERATOR_STOP_REASON__ON_STOP_EVENT);
    };
    const onAbort = () => {
        terminateIterator(_ITERATOR_STOP_REASON__ABORT);
    };
    const onError = (error: Error|any) => {
        iteratorErrorToReject = error;

        terminateIterator(_ITERATOR_STOP_REASON__ON_ERROR_EVENT);
    };

    emitter.on(event as string | symbol, onEvent);

    if (stopEventName !== void 0 && stopEventName !== null) {
        emitter.on(stopEventName as string | symbol, onStop);
    }
    if (errorEventName !== void 0 && errorEventName !== null && errorEventName !== event) {
        emitter.on(errorEventName as string | symbol, onError);
    }

    if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
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
            // Тут логика обработки события 'error' такая же, как в nodejs events.on:
            //  Если был `ee.emit('test')` - без аргумента (или `ee.emit('test', null)`, или `ee.emit('test', false)`),
            //   то итератор завершиться БЕЗ ВЫБРОСА ОШИБКИ.
            //  Возможно, это логическая проблема в nodejs events.on, но нам нужно под него мимикрировать, так что,
            //   оставляем туже логику.
            if (iteratorErrorToReject) {
                const error = iteratorErrorToReject;

                // Only the first element errors
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
        return() {
            terminateIterator(_ITERATOR_STOP_REASON__RETURN_CALL);

            return Promise.resolve({
                value: void 0,
                done: true,
            } as IteratorReturnResult<undefined>);
        },
        throw(err: Error) {
            if (!err || !(err instanceof Error)) {
                throw new TypeError('eventsAsyncIterator#throw(): Invalid argument', { cause: err });
            }

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
/**
 *
 * @deprecated delete after 23.01.2023
 * @use [isNodeStream]{@link isNodeStream}
 */
export function isStream(stream: Stream | unknown): stream is Stream {
    return isNodeStream(stream);
}
