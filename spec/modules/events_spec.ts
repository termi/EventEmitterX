/**
 * @jest-environment jsdom
 */
// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
/* globals describe, xdescribe, it, xit, expect */
'use strict';

require('termi@polyfills');

const NativeAbortController = globalThis.AbortController;

/*
{// JSDOM
    // todo: Начиная с "jest": "^27.0.1" понадобиться вручную инсталировать DOM-классы в globalThis. Примерно вот так:
    //  (Но код не до конца дописан, может быть ещё что-то нужно инсталировать из jsdom).
    const detect_browser_env = ["Window", "Worker", "AudioWorklet"];

    const JSDOM_EventTarget_lib = require('jsdom/lib/jsdom/living/generated/EventTarget');
    // node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js: exports.install
    JSDOM_EventTarget_lib.install(globalThis, detect_browser_env);

    const JSDOM_Event_lib = require('jsdom/lib/jsdom/living/generated/Event');
    // node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js: exports.install
    JSDOM_Event_lib.install(globalThis, detect_browser_env);
}
*/

// The EventTarget comes from polyfill node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js
const NodeEventTarget = EventTarget;

// Удаляем AbortController/AbortSignal после require(jsdom), чтобы не использовались версии из jsdom
// also check AbortController polyfill
{
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    delete globalThis["AbortController"];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    delete globalThis["AbortSignal"];
}

import EmptyFunction = jest.EmptyFunction;
import {
    EventEmitter as NodeEventEmitter,
} from 'node:events';
import { runInNewContext } from 'node:vm';
import events, {
    EventEmitterEx,
    EventEmitterSimpleProxy,
    EventEmitterProxy,
    EventName,
    isEventEmitterCompatible,
    isEventTargetCompatible,
    isEventEmitterEx,
    getEventListeners,
    Listener,
    kDestroyingEvent,
    ABORT_ERR,

    once,
} from '../../modules/events';
import ServerTiming from 'termi@ServerTiming';
import { TIME } from '../../utils/time';
import { AbortController, AbortControllersGroup, AbortSignal } from 'termi@abortable';
import LoggerCap from '../../utils/LoggerCap';
import { FakeEventTarget } from "../../spec_utils/FakeEventTarget";
import { Deferred } from "../../spec_utils/Deferred";
import {
    advanceTimersByTime,
    // advanceTimersByTimeAsync,
    // clearAllTimers,
    useFakeTimers,
    useRealTimers,
} from '../../spec_utils/fakeTimers';

const {
    compatibleEventEmitter_from_EventTarget,
    compatibleOnce_for_EventTarget,
    listenerCount,
    createDomEventLike,
} = require('../../spec_utils/EventTarget_helpers');

let { EventEmitter } = events;
const { errorMonitor } = events;

function isTestError(error: Error) {
    const errorString = String(error);

    return errorString.includes('Expected') && errorString.includes('Received');
}

// todo: тесты можно взять тут:
//  EventEmitter:
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-check-listener-leaks.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-errors.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-get-max-listeners.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-invalid-listener.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-listener-count.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-listeners-side-effects.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-listeners.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-max-listeners-warning-for-null.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-max-listeners-warning-for-symbol.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-max-listeners-warning.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-max-listeners.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-method-names.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-modify-in-emit.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-no-error-provided-to-error-event.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-num-args.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-remove-all-listeners.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-remove-listeners.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-set-max-listeners-side-effects.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-special-event-names.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-events-list.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-events-uncaught-exception-stack.js
//  EventTarget:
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget-memoryleakwarning.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget-once-twice.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget-whatwg-customevent.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget-whatwg-once.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget-whatwg-passive.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget-whatwg-signal.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget.js

describe('events', function() {
    const sTest1 = Symbol('sTest1');
    const sTest2 = Symbol('sTest2');
    const randArr30 = (new Array(30)).fill('').map(() => {
        return Math.floor(Math.random() * 9e9).toString(36);
    });

    let checkEventEmitter;

    describe('EventEmitterEx', checkEventEmitter = (function() {
        if (arguments.length > 0) {
            // eslint-disable-next-line prefer-rest-params
            const EventEmitterClass = arguments[0];

            if (typeof EventEmitterClass === 'function') {
                EventEmitter = EventEmitterClass;
            }
        }

        const ee = new EventEmitter();

        describe('constructor', function() {
            it('instanceof', function() {
                expect(new EventEmitterEx()).toBeInstanceOf(EventEmitterEx);
                expect(new EventEmitter()).toBeInstanceOf(EventEmitter);
                // noinspection JSPotentiallyInvalidConstructorUsage
                expect(new events()).toBeInstanceOf(EventEmitterEx);
            });
        });

        describe('destructor', function() {
            it('should remove all listeners', function() {
                const ee = new EventEmitter();

                ee.on('foo', () => {});
                ee.addListener('foo', () => {});
                ee.once('foo', () => {});
                ee.prependListener('foo', () => {});
                ee.prependOnceListener('foo', () => {});

                expect(ee.listenerCount('foo')).toBe(5);

                ee.destructor();

                expect(ee.listenerCount('foo')).toBe(0);
            });

            it('should not add any listener after destroying', function() {
                const ee = new EventEmitter();

                ee.on('foo', () => {});
                ee.addListener('foo', () => {});
                ee.once('foo', () => {});
                ee.prependListener('foo', () => {});
                ee.prependOnceListener('foo', () => {});

                expect(ee.listenerCount('foo')).toBe(5);

                ee.destructor();

                const console_warn = console.warn;
                const console_warn_mock = jest.fn(() => {});

                console.warn = console_warn_mock;

                ee.on('foo', () => {});
                ee.addListener('foo', () => {});
                ee.once('foo', () => {});
                ee.prependListener('foo', () => {});
                ee.prependOnceListener('foo', () => {});

                expect(console_warn_mock).toHaveBeenCalledTimes(5);
                expect(console_warn_mock.mock.calls.map((a: [ string ][]) => ([ a[0] ]))).toEqual([
                    [ 'Attempt to add listener on destroyed emitter' ],
                    [ 'Attempt to add listener on destroyed emitter' ],
                    [ 'Attempt to add listener on destroyed emitter' ],
                    [ 'Attempt to add listener on destroyed emitter' ],
                    [ 'Attempt to add listener on destroyed emitter' ],
                ]);

                console.warn = console_warn;

                expect(ee.listenerCount('foo')).toBe(0);
            });

            it('should emit kDestroyingEvent on destroying', function() {
                const ee = new EventEmitter();
                let wasCalled = false;

                ee.on(kDestroyingEvent, () => {
                    wasCalled = true;
                });

                expect(ee.listenerCount(kDestroyingEvent)).toBe(1);

                ee.destructor();

                expect(wasCalled).toBe(true);
                expect(ee.listenerCount(kDestroyingEvent)).toBe(0);
            });
        });

        describe('events is an alias for EventEmitter', function() {
            it('instanceof', function() {
                expect(new EventEmitter()).toBeInstanceOf(events);
            });
        });

        describe('EventEmitterEx is an alias for EventEmitter', function() {
            it('instanceof', function() {
                expect(new EventEmitter()).toBeInstanceOf(EventEmitterEx);
            });
        });

        describe('listener context', function() {
            it('default', function() {
                const ee = new EventEmitter();
                let counter = 0;

                ee.on('test', function() {
                    counter++;

                    expect(this).toBe(ee);
                }).emit('test');

                expect(counter).toBe(1);
            });
        });

        describe('with options.emitCounter', function() {
            it('should call `emitCounter.count(eventName)` for every `EventEmitterEx#emit`', function() {
                const event1 = 'test-event1';
                const event2 = 'test-event2';
                const numericEventType = 123;
                const testSymbol = Symbol('testSymbol');
                const counters = {
                    [event1]: 0,
                    [event2]: 0,
                    [numericEventType]: 0,
                    [testSymbol]: 0,
                };

                {
                    const ee = new EventEmitter({
                        emitCounter: {
                            count(eventName: EventName) {
                                counters[eventName]++;
                            },
                        },
                    });

                    ee.emit(event1);
                    ee.emit(event2);
                    ee.emit(event2);
                    ee.emit(numericEventType);
                    ee.emit(testSymbol);

                    expect(counters[event1]).toBe(1);
                    expect(counters[event2]).toBe(2);
                    expect(counters[numericEventType]).toBe(1);
                    expect(counters[testSymbol]).toBe(1);
                }

                {
                    const emitCounter = {
                        count(this: void, eventName: EventName) {
                            counters[eventName]++;
                        },
                    };
                    const emitCounter_count = emitCounter.count = jest.fn(emitCounter.count);
                    const ee = new EventEmitter({
                        emitCounter,
                    });

                    ee.emit(event1);
                    ee.emit(event2);
                    ee.emit(event2);
                    ee.emit(numericEventType);
                    ee.emit(testSymbol);

                    expect(emitCounter_count).toHaveBeenCalledTimes(5);
                    expect(emitCounter_count.mock.calls).toEqual([
                        [ event1, false ],
                        [ event2, false ],
                        [ event2, false ],
                        [ numericEventType, false ],
                        [ testSymbol, false ],
                    ]);
                }
            });

            it('should call `emitCounter.count(eventName, hasEnyListener)` for every `EventEmitterEx#emit`', function() {
                const event1 = 'test-event1';
                const event2 = 'test-event2';
                const numericEventType = 123;
                const testSymbol = Symbol('testSymbol');
                const counters: {
                    [key: number | string | symbol]: {
                        withListener: number,
                        withoutListener: number,
                    },
                } = {
                    [event1]: {
                        withListener: 0,
                        withoutListener: 0,
                    },
                    [event2]: {
                        withListener: 0,
                        withoutListener: 0,
                    },
                    [numericEventType]: {
                        withListener: 0,
                        withoutListener: 0,
                    },
                    [testSymbol]: {
                        withListener: 0,
                        withoutListener: 0,
                    },
                };

                const ee = new EventEmitter({
                    emitCounter: {
                        count(eventName: EventName, hasEnyListener) {
                            const counter = counters[eventName];

                            if (counter) {
                                if (hasEnyListener) {
                                    counter.withListener++;
                                }
                                else {
                                    counter.withoutListener++;
                                }
                            }
                        },
                    },
                });

                ee.on(event1, () => {});
                ee.on(testSymbol, () => {});

                ee.emit(event1);
                ee.emit(testSymbol);
                ee.emit(event2);
                ee.emit(event2);
                ee.emit(numericEventType);

                expect(counters[event1]?.withListener).toBe(1);
                expect(counters[testSymbol]?.withListener).toBe(1);

                expect(counters[event2]?.withoutListener).toBe(2);
                expect(counters[numericEventType]?.withoutListener).toBe(1);
            });

            it('options.emitCounter as global.console', function() {
                const eventType = 'test-event1';
                const numericEventType = 123;
                const testSymbol = Symbol('testSymbol');
                const anonymous_testSymbol1 = Symbol();
                const anonymous_testSymbol2 = Symbol();
                const console_count = console.count;
                const console_count_mock = jest.fn(() => {});

                console.count = console_count_mock;

                {
                    const ee = new EventEmitter({
                        emitCounter: console,
                    });

                    ee.emit(eventType);
                    ee.emit(numericEventType);
                    ee.emit(testSymbol);
                    // will emit `Symbol(): 1` to console
                    ee.emit(anonymous_testSymbol1);
                    // will emit `Symbol(): 2` to console although anonymous_testSymbol1 != anonymous_testSymbol2, cause
                    //  of `console`.time-methods doesn't have `Symbol()` support.
                    ee.emit(anonymous_testSymbol2);

                    expect(console_count_mock).toHaveBeenCalledTimes(5);
                    expect(console_count_mock.mock.calls).toEqual([
                        [ eventType ],
                        [ String(numericEventType) ],
                        [ `Symbol(${testSymbol.description})` ],
                        [ `Symbol()` ],
                        [ `Symbol()` ],
                    ]);
                }

                console.count = console_count;
            });

            it('options.emitCounter as LoggerCap', function() {
                const eventType = 'test-event1';
                const numericEventType = 123;
                const testSymbol = Symbol('testSymbol');
                const anonymous_testSymbol1 = Symbol();
                const anonymous_testSymbol2 = Symbol();

                {
                    const logger = new LoggerCap({
                        addTime: false,
                        useConsole: false,
                    });
                    const ee = new EventEmitter({
                        emitCounter: logger,
                    });

                    ee.emit(eventType);
                    ee.emit(numericEventType);
                    ee.emit(testSymbol);
                    // will emit `Symbol(): 1` to console
                    ee.emit(anonymous_testSymbol1);
                    // will emit `Symbol(): 1` to console unlike `console` behaviour
                    ee.emit(anonymous_testSymbol2);

                    expect(logger.countValue(eventType)).toBe(1);
                    expect(logger.countValue(numericEventType)).toBe(1);
                    expect(logger.countValue(testSymbol)).toBe(1);
                    expect(logger.countValue(anonymous_testSymbol1)).toBe(1);
                    expect(logger.countValue(anonymous_testSymbol2)).toBe(1);
                }
            });
        });

        describe('with options.listenerWithoutThis', function() {
            it('with options.listenerWithoutThis = true: should not pass emitter instance to listener', function() {
                const emitter = new EventEmitter({
                    listenerWithoutThis: true,
                });
                let callCounter = 0;
                const callContexts: undefined[] = [];
                const onTest = function(this: EventEmitterEx|undefined) {
                    callCounter++;
                    callContexts.push(this as undefined);
                };

                emitter.on('test', onTest);

                emitter.emit('test');
                emitter.emit('test', 1);
                emitter.emit('test', 1, 2);
                emitter.emit('test', 1, 2, 3);
                emitter.emit('test', 1, 2, 3, 4);
                emitter.emit('test', 1, 2, 3, 4, 5);
                emitter.emit('test', ...(new Array(25)).fill(1));

                expect(callCounter).toBe(7);
                expect(callContexts).toEqual((new Array(callCounter)).fill(void 0));
            });

            it('(default) with options.listenerWithoutThis = false: should pass emitter instance to listener', function() {
                const emitter = new EventEmitter({
                    listenerWithoutThis: false,
                });
                let callCounter = 0;
                const callContexts: EventEmitterEx[] = [];
                const onTest = function(this: EventEmitterEx|undefined) {
                    callCounter++;
                    callContexts.push(this as EventEmitterEx);
                };

                emitter.on('test', onTest);

                emitter.emit('test');
                emitter.emit('test', 1);
                emitter.emit('test', 1, 2);
                emitter.emit('test', 1, 2, 3);
                emitter.emit('test', 1, 2, 3, 4);
                emitter.emit('test', 1, 2, 3, 4, 5);
                emitter.emit('test', ...(new Array(25)).fill(1));

                expect(callCounter).toBe(7);
                expect(callContexts).toEqual((new Array(callCounter)).fill(emitter));
            });
        });

        describe('#on/#addListener + #once + #prependListener + #prependOnceListener', function() {
            it('should returns this', function() {
                const ee = new EventEmitter();

                expect(ee.on('foo', () => {})).toBe(ee);
                expect(ee.addListener('foo', () => {})).toBe(ee);
                expect(ee.once('foo', () => {})).toBe(ee);
                expect(ee.prependListener('foo', () => {})).toBe(ee);
                expect(ee.prependOnceListener('foo', () => {})).toBe(ee);
            });

            // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-add-listeners.js
            it('should call "newListener" for each new listeners', function() {
                let counter = 0;
                const listener1 = jest.fn(() => { counter++; });
                const listener2 = jest.fn(() => { counter += 2; });
                const events_newListener_emitted: (number | string | symbol)[] = [];
                const listeners_newListener_emitted: Function[] = [];

                ee.on('newListener', function(event, listener) {
                    // Don't track newListener listeners.
                    if (event === 'newListener') {
                        return;
                    }

                    events_newListener_emitted.push(event);
                    listeners_newListener_emitted.push(listener);
                });

                const onceNewListener = jest.fn(function(this: EventEmitterEx, name, listener) {
                    {// additional tests
                        expect(name).toBe('hello_on');
                        expect(listener).toBe(listener1);

                        // 'newListener' should call be before `listener` is added in known listeners list
                        expect((this as EventEmitterEx).listenerCount(name)).toBe(0);
                    }
                });

                ee.once('newListener', onceNewListener);

                ee.on('hello_on', listener1);
                ee.addListener('hello_addListener', listener1);
                ee.once('hello_once', listener2);
                ee.prependListener('hello_prepend', listener1);
                ee.prependOnceListener('hello_prependOnce', listener2);

                ee.emit('hello_on', 'a', 'b');
                ee.emit('hello_addListener', 1, 2);
                ee.emit('hello_once', 1);
                ee.emit('hello_prepend', sTest1, sTest2);
                ee.emit('hello_prependOnce', 2);

                {// main tests
                    expect(counter).toBe(7);

                    expect(onceNewListener).toHaveBeenCalledTimes(1);
                    expect(onceNewListener).toHaveBeenCalledWith('hello_on', listener1);

                    expect(listener1).toHaveBeenNthCalledWith(1, 'a', 'b');
                    expect(listener1).toHaveBeenNthCalledWith(2, 1, 2);
                    expect(listener1).toHaveBeenNthCalledWith(3, sTest1, sTest2);

                    expect(listener2).toHaveBeenNthCalledWith(1, 1);
                    expect(listener2).toHaveBeenNthCalledWith(2, 2);

                    expect(events_newListener_emitted).toEqual([ 'hello_on', 'hello_addListener', 'hello_once', 'hello_prepend', 'hello_prependOnce' ]);
                    expect(listeners_newListener_emitted).toEqual([ listener1, listener1, listener2, listener1, listener2 ]);
                }

                {// cleanup
                    ee.removeAllListeners('newListener');
                    expect(ee.listenerCount('newListener')).toBe(0);

                    ee.removeListener('hello_on', listener1);
                    expect(ee.listenerCount('hello_on')).toBe(0);
                    ee.removeListener('hello_addListener', listener1);
                    expect(ee.listenerCount('hello_addListener')).toBe(0);
                    expect(ee.listenerCount('hello_once')).toBe(0);
                    ee.removeListener('hello_prepend', listener1);
                    expect(ee.listenerCount('hello_prepend')).toBe(0);
                }
            });

            it('"newListener" event with multiply listeners', function() {
                let counter = 0;
                const listener = () => { counter++; };
                const eventName = 'test123';
                let newListenerCounter = 0;

                const newListener = jest.fn(function(this: EventEmitterEx, name, lis) {
                    {// additional tests
                        expect(name).toBe(eventName);
                        expect(lis).toBe(listener);
                    }
                    {// main tests #1
                        const expectedListeners = (new Array(newListenerCounter)).fill(listener);

                        expect(this.listeners(eventName)).toEqual(expectedListeners);
                    }

                    newListenerCounter++;
                });

                {// logic #1
                    ee.once('newListener', newListener);
                    ee.on(eventName, listener);

                    ee.once('newListener', newListener);
                    ee.addListener(eventName, listener);

                    ee.once('newListener', newListener);
                    ee.once(eventName, listener);

                    ee.on('newListener', newListener);
                    ee.prependListener(eventName, listener);
                    ee.prependOnceListener(eventName, listener);
                }

                {// main tests #2
                    expect(ee.listeners(eventName)).toEqual([ listener, listener, listener, listener, listener ]);
                }

                {// logic #2
                    ee.emit(eventName);
                }

                {// main tests #3
                    expect(counter).toBe(5);

                    expect(newListener).toHaveBeenCalledTimes(5);
                    expect(newListener.mock.calls).toEqual([
                        [ eventName, listener ], [ eventName, listener ], [ eventName, listener ],
                        [ eventName, listener ], [ eventName, listener ],
                    ]);
                }

                {// cleanup
                    ee.removeListener('newListener', newListener);
                    expect(ee.listenerCount('newListener')).toBe(0);

                    ee.removeAllListeners(eventName);
                    expect(ee.listenerCount(eventName)).toBe(0);
                }
            });

            it('should not add duplicated listeners if options.listenerOncePerEventType = true', function() {
                let counter1 = 0;
                let counter2 = 0;
                const listener1 = () => { counter1++; };
                const listener2_1 = () => { counter2++; };
                const listener2_2 = () => { counter2++; };
                const ee = new EventEmitter({ listenerOncePerEventType: true });

                // todo: Для полноценной работы флага listenerOncePerEventType, нужно запоминать с какими опциями был
                //  добавлен listener (prepend/once) и если происходит добавление listener с другими опциями, то нужно считать,
                //  что это новый listener
                //  Поэтому, в тестах ниже, только on и addListener должны рассматриваться как добавляющие один и тот же
                //   listener, а все остальные - добавляют свои новые обработчики.

                ee.on('test_duplicates', listener1);
                ee.addListener('test_duplicates', listener1);
                ee.once('test_duplicates', listener1);
                ee.prependListener('test_duplicates', listener1);
                ee.prependOnceListener('test_duplicates', listener1);

                ee.once('test_duplicates_2', listener2_1);
                ee.once('test_duplicates_2', listener2_2);
                ee.prependListener('test_duplicates_2', listener2_1);
                ee.prependListener('test_duplicates_2', listener2_2);
                ee.prependOnceListener('test_duplicates_2', listener2_1);
                ee.prependOnceListener('test_duplicates_2', listener2_2);
                ee.on('test_duplicates_2', listener2_1);
                ee.on('test_duplicates_2', listener2_2);
                ee.addListener('test_duplicates_2', listener2_1);
                ee.addListener('test_duplicates_2', listener2_2);

                ee.emit('test_duplicates', 123);
                ee.emit('test_duplicates_2', 123);

                {// main tests
                    expect(counter1).toBe(1);
                    expect(counter2).toBe(2);
                }

                {// cleanup
                    ee.removeListener('test_duplicates', listener1);
                    expect(ee.listenerCount('test_duplicates')).toBe(0);

                    ee.removeListener('test_duplicates_2', listener2_1);
                    ee.removeListener('test_duplicates_2', listener2_2);
                    expect(ee.listenerCount('test_duplicates_2')).toBe(0);
                }
            });

            it(`should emit 'duplicatedListener' if options.listenerOncePerEventType = true`, function() {
                let counter = 0;
                let duplicatesCounter = 0;
                const listener1 = () => { counter++; };
                const ee = new EventEmitter({ listenerOncePerEventType: true });

                // todo: Для полноценной работы флага listenerOncePerEventType, нужно запоминать с какими опциями был
                //  добавлен listener (prepend/once) и если происходит добавление listener с другими опциями, то нужно считать,
                //  что это новый listener
                //  Поэтому, в тестах ниже, только on и addListener должны рассматриваться как добавляющие один и тот же
                //   listener, а все остальные - добавляют свои новые обработчики.

                ee.on('duplicatedListener', (event, listener) => {
                    expect(event).toBe('test_duplicates');
                    expect(listener).toBe(listener1);

                    duplicatesCounter++;
                });

                // first subscribe
                ee.on('test_duplicates', listener1);
                // duplicate subscribes
                ee.on('test_duplicates', listener1);
                ee.addListener('test_duplicates', listener1);
                ee.once('test_duplicates', listener1);
                ee.prependListener('test_duplicates', listener1);
                ee.prependOnceListener('test_duplicates', listener1);

                ee.emit('test_duplicates', 123);

                {// main tests
                    expect(ee.listenerCount('duplicatedListener')).toBe(1);
                    expect(counter).toBe(1);
                    expect(duplicatesCounter).toBe(5);
                }

                {// cleanup
                    ee.removeListener('test_duplicates', listener1);
                    expect(ee.listenerCount('test_duplicates')).toBe(0);

                    ee.removeAllListeners('duplicatedListener');
                    expect(ee.listenerCount('duplicatedListener')).toBe(0);
                }
            });
        });

        describe('#removeListener/#off', function() {
            it('should returns this', function() {
                const ee = new EventEmitter();

                expect(ee.removeListener('foo', () => {})).toBe(ee);
                expect(ee.off('foo', () => {})).toBe(ee);
            });

            // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-remove-listeners.js
            it('should call "removeListener" for each removed listeners', function() {
                let counter = 0;
                const listener1 = () => { counter++; };
                const listener2 = () => { counter += 2; };
                const events_removeListener_emitted: (number | string | symbol)[] = [];
                const listeners_removeListener_emitted: Function[] = [];

                ee.on('removeListener', function(event, listener) {
                    // Don't track newListener listeners.
                    if (event === 'removeListener') {
                        return;
                    }

                    events_removeListener_emitted.push(event);
                    listeners_removeListener_emitted.push(listener);
                });

                const onceRemoveListener = jest.fn(function(this: EventEmitterEx, name, listener) {
                    {// additional tests
                        expect(name).toBe('hello_on');
                        expect(listener).toBe(listener1);

                        // 'removeListener' should call after `listener` is removed from known listeners list
                        expect((this as EventEmitterEx).listenerCount(name)).toBe(0);
                    }
                });

                ee.once('removeListener', onceRemoveListener);

                {// #1
                    ee.on('hello_on', listener1);
                    ee.emit('hello_on');
                    ee.removeListener('hello_on', listener1);
                }
                {// #2
                    ee.addListener('hello_addListener', listener1);
                    ee.emit('hello_addListener');
                    ee.off('hello_addListener', listener1);
                }
                {// #3. Listener added by once, should be auto-removed
                    ee.once('hello_once', listener2);
                    ee.emit('hello_once');
                }

                {// main tests
                    expect(counter).toBe(4);

                    expect(onceRemoveListener).toHaveBeenCalledTimes(1);
                    expect(onceRemoveListener).toHaveBeenCalledWith('hello_on', listener1);

                    expect(events_removeListener_emitted).toEqual([ 'hello_on', 'hello_addListener', 'hello_once' ]);
                    expect(listeners_removeListener_emitted).toEqual([ listener1, listener1, listener2 ]);
                }

                {// finale check
                    ee.removeAllListeners('removeListener');
                    expect(ee.listenerCount('removeListener')).toBe(0);

                    expect(ee.listenerCount('hello_on')).toBe(0);
                    expect(ee.listenerCount('hello_addListener')).toBe(0);
                    expect(ee.listenerCount('hello_once')).toBe(0);
                }
            });

            it('"removeListener" event with multiply listeners', function() {
                const listener = () => { /* nothing to do here */ };
                const eventName = 'test123';
                let removeListenerCounter = 0;

                const onceRemoveListener = jest.fn(function(this: EventEmitterEx, name, lis) {
                    removeListenerCounter--;

                    {// additional tests
                        expect(name).toBe(eventName);
                        expect(lis).toBe(listener);
                    }
                    {// main tests #1
                        const expectedListeners = (new Array(removeListenerCounter)).fill(listener);

                        expect(this.listeners(eventName)).toEqual(expectedListeners);
                    }
                });

                {// prepare
                    ee.on(eventName, listener);
                    ee.addListener(eventName, listener);
                    ee.once(eventName, listener);
                    ee.prependListener(eventName, listener);
                    ee.prependOnceListener(eventName, listener);
                    removeListenerCounter = 5;
                }

                {// main tests #2
                    expect(ee.listeners(eventName)).toEqual([ listener, listener, listener, listener, listener ]);
                }

                {// logic
                    ee.once('removeListener', onceRemoveListener);
                    ee.removeListener(eventName, listener);

                    ee.once('removeListener', onceRemoveListener);
                    ee.removeListener(eventName, listener);

                    ee.once('removeListener', onceRemoveListener);
                    ee.removeListener(eventName, listener);

                    ee.on('removeListener', onceRemoveListener);
                    ee.removeListener(eventName, listener);
                    ee.removeListener(eventName, listener);
                }

                {// main tests #3
                    expect(onceRemoveListener).toHaveBeenCalledTimes(5);
                    expect(onceRemoveListener.mock.calls).toEqual([
                        [ eventName, listener ], [ eventName, listener ], [ eventName, listener ],
                        [ eventName, listener ], [ eventName, listener ],
                    ]);
                }

                {// cleanup
                    ee.removeListener('removeListener', onceRemoveListener);
                    expect(ee.listenerCount('removeListener')).toBe(0);

                    ee.removeAllListeners(eventName);
                    expect(ee.listenerCount(eventName)).toBe(0);
                }
            });

            it('call removeListener() in "removeListener" event', function() {
                let counter = 0;
                const listener1 = () => { counter += 1; };
                const listener2 = () => { counter += 2; };
                const eventName = 'test12345';

                const onceRemoveListener = jest.fn(function(this: EventEmitterEx, name, lis) {
                    if (lis === listener1) {
                        this.removeListener(eventName, listener2);
                    }
                });

                ee.on(eventName, listener1);
                ee.on(eventName, listener2);

                ee.once('removeListener', onceRemoveListener);

                ee.removeListener(eventName, listener1);
                ee.emit(eventName);

                {// main tests
                    expect(counter).toBe(0);

                    expect(onceRemoveListener).toHaveBeenCalledTimes(1);
                    expect(onceRemoveListener).toHaveBeenCalledWith(eventName, listener1);
                }

                {// finale check
                    expect(ee.listenerCount('removeListener')).toBe(0);
                    expect(ee.listenerCount(eventName)).toBe(0);
                }
            });

            it('call removeListener() in handler', function() {
                let counter = 0;
                const eventName = 'test12345';
                const listener1 = jest.fn(function(this: EventEmitterEx) {
                    this.removeListener(eventName, listener2);
                });
                const listener2 = () => { counter += 1; };

                ee.on(eventName, listener1);
                ee.on(eventName, listener2);

                // listener2 will still be called although it is removed by listener1.
                // This is so because the internal listener array at time of emit
                // was [listener1,listener2]
                ee.emit(eventName);

                // Internal listener array [listener1]
                ee.emit(eventName);

                {// main tests
                    expect(counter).toBe(1);
                    expect(ee.listenerCount(eventName)).toBe(1);

                    expect(listener1).toHaveBeenCalledTimes(2);
                    // eslint-disable-next-line jest/prefer-called-with
                    expect(listener1).toHaveBeenCalled();
                }

                {// cleanup
                    ee.removeListener(eventName, listener1);
                    expect(ee.listenerCount(eventName)).toBe(0);
                }
            });
        });

        describe('[#on + #removeListener] logic', function() {
            it('should call listener multiple times', function() {
                let counter = 0;
                const listener = () => { counter++; };

                ee.on('test', listener);
                ee.emit('test');
                ee.emit('test');

                expect(counter).toBe(2);

                ee.removeListener('test', listener);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('should call listener multiple times for multiple listeners', function() {
                let counter1 = 0;
                let counter2 = 0;
                let counter3 = 0;
                const listener1 = () => { counter1++; };
                const listener2 = () => { counter2++; };
                const listener3 = () => { counter3++; };

                ee.on('test1', listener1);
                ee.on('test2', listener2);
                ee.on('test3', listener3);
                ee.emit('test1');
                ee.emit('test2');
                ee.emit('test2');
                ee.emit('test3');
                ee.emit('test3');
                ee.emit('test3');

                expect(counter1).toBe(1);
                expect(counter2).toBe(2);
                expect(counter3).toBe(3);

                ee.removeListener('test1', listener1);
                ee.removeListener('test2', listener2);
                ee.removeListener('test3', listener3);
                expect(ee.listenerCount('test1')).toBe(0);
                expect(ee.listenerCount('test2')).toBe(0);
                expect(ee.listenerCount('test3')).toBe(0);
            });

            it('should not call listener after removeListener', function() {
                let counter = 0;
                const listener = () => { counter++; };

                ee.on('test', listener);
                ee.emit('test');
                ee.removeListener('test', listener);
                ee.emit('test');

                expect(counter).toBe(1);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('should not call listener after removeListener multiple times for multiple listeners', function() {
                let counter1 = 0;
                let counter2 = 0;
                let counter3 = 0;
                const listener1 = () => { counter1++; };
                const listener2 = () => { counter2++; };
                const listener3 = () => { counter3++; };

                ee.on('test1', listener1);
                ee.on('test2', listener2);
                ee.on('test3', listener3);
                ee.emit('test1');
                ee.removeListener('test1', listener1);
                ee.emit('test1');
                ee.emit('test2');
                ee.emit('test2');
                ee.removeListener('test2', listener2);
                ee.emit('test2');
                ee.emit('test3');
                ee.emit('test3');
                ee.emit('test3');
                ee.removeListener('test3', listener3);
                ee.emit('test3');

                expect(counter1).toBe(1);
                expect(counter2).toBe(2);
                expect(counter3).toBe(3);
                expect(ee.listenerCount('test1')).toBe(0);
                expect(ee.listenerCount('test2')).toBe(0);
                expect(ee.listenerCount('test3')).toBe(0);
            });

            it('event name as symbol', function() {
                // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-symbols.js
                const eventNameSymbol = Symbol('eventNameSymbol');
                let counter = 0;
                const listener = () => { counter++; };

                ee.on(eventNameSymbol, listener);
                ee.emit(eventNameSymbol);
                ee.emit(eventNameSymbol);

                expect(counter).toBe(2);

                expect(ee.listeners(eventNameSymbol)).toEqual([ listener ]);

                ee.removeListener(eventNameSymbol, listener);
                expect(ee.listenerCount(eventNameSymbol)).toBe(0);
            });

            it('event name as number', function() {
                // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-symbols.js
                const eventNameNumber = 123_456_789;
                let counter = 0;
                const listener = () => { counter++; };

                ee.on(eventNameNumber, listener);
                ee.emit(eventNameNumber);
                ee.emit(eventNameNumber);

                expect(counter).toBe(2);

                expect(ee.listeners(eventNameNumber)).toEqual([ listener ]);

                ee.removeListener(eventNameNumber, listener);
                expect(ee.listenerCount(eventNameNumber)).toBe(0);
            });
        });

        describe('[#on + #removeListener] logic - use same listener multiple times', function() {
            it('should call listener multiple times', function() {
                let counter = 0;
                const listener = () => { counter++; };

                ee.on('test', listener);
                ee.on('test', listener);
                ee.emit('test');
                ee.emit('test');

                expect(counter).toBe(4);

                ee.removeListener('test', listener);
                ee.removeListener('test', listener);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('#removeListener should remove only one copy of listener', function() {
                let counter = 0;
                const listener = () => { counter++; };

                ee.on('test', listener);
                ee.on('test', listener);
                ee.on('test', listener);
                ee.emit('test');

                expect(counter).toBe(3);

                ee.removeListener('test', listener);

                ee.emit('test');

                expect(counter).toBe(5);

                ee.removeListener('test', listener);

                ee.emit('test');

                expect(counter).toBe(6);

                ee.removeListener('test', listener);

                expect(ee.listenerCount('test')).toBe(0);
            });

            it('should call listener multiple times for multiple listeners', function() {
                let counter1 = 0;
                let counter2 = 0;
                let counter3 = 0;
                const listener1 = () => { counter1++; };
                const listener2 = () => { counter2++; };
                const listener3 = () => { counter3++; };

                ee.on('test1', listener1);
                ee.on('test1', listener1);
                ee.on('test2', listener2);
                ee.on('test2', listener2);
                ee.on('test3', listener3);
                ee.on('test3', listener3);
                // 'test1' one time
                ee.emit('test1');
                // 'test2' two times
                ee.emit('test2');
                ee.emit('test2');
                // 'test3' three times
                ee.emit('test3');
                ee.emit('test3');
                ee.emit('test3');

                expect(counter1).toBe(2);
                expect(counter2).toBe(4);
                expect(counter3).toBe(6);

                ee.removeListener('test1', listener1);
                ee.removeListener('test1', listener1);
                ee.removeListener('test2', listener2);
                ee.removeListener('test2', listener2);
                ee.removeListener('test3', listener3);
                ee.removeListener('test3', listener3);
                expect(ee.listenerCount('test1')).toBe(0);
                expect(ee.listenerCount('test2')).toBe(0);
                expect(ee.listenerCount('test3')).toBe(0);
            });

            it('removeListener should remove only first matched listener', function() {
                let counter = 0;
                const listener = () => { counter++; };

                ee.on('test', listener);
                ee.on('test', listener);
                ee.emit('test');// counter = 2
                ee.removeListener('test', listener);
                ee.emit('test');// counter = 3
                ee.removeListener('test', listener);
                ee.emit('test');// counter = 3

                expect(counter).toBe(3);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('removeListener should remove only first matched listener for multiple listeners', function() {
                let counter1 = 0;
                let counter2 = 0;
                let counter3 = 0;
                const listener1 = () => { counter1++; };
                const listener2 = () => { counter2++; };
                const listener3 = () => { counter3++; };

                ee.on('test1', listener1);
                ee.on('test1', listener1);
                ee.on('test2', listener2);
                ee.on('test2', listener2);
                ee.on('test3', listener3);
                ee.on('test3', listener3);

                ee.emit('test1');// counter1 = 2
                // remove first listener1
                ee.removeListener('test1', listener1);
                ee.emit('test1');// counter1 = 3
                ee.emit('test2');// counter2 = 2
                ee.emit('test2');// counter2 = 4
                // remove first listener2
                ee.removeListener('test2', listener2);
                ee.emit('test2');// counter2 = 5
                ee.emit('test3');// counter3 = 2
                ee.emit('test3');// counter3 = 4
                ee.emit('test3');// counter3 = 6
                // remove first listener3
                ee.removeListener('test3', listener3);
                ee.emit('test3');// counter3 = 7

                // remove second listener1
                ee.removeListener('test1', listener1);
                // remove second listener2
                ee.removeListener('test2', listener2);
                // remove second listener3
                ee.removeListener('test3', listener3);

                ee.emit('test1');// counter1 = 3
                ee.emit('test2');// counter2 = 5
                ee.emit('test3');// counter3 = 7

                expect(counter1).toBe(3);
                expect(counter2).toBe(5);
                expect(counter3).toBe(7);
            });
        });

        describe('[#on + #removeListener] logic - use same listener multiple times - with listenerOncePerEventType=true', function() {
            const ee = new EventEmitter({ listenerOncePerEventType: true });

            it('should call listener multiple times', function() {
                let counter = 0;
                const listener = () => { counter++; };

                ee.on('test', listener);
                ee.on('test', listener);
                ee.emit('test');
                ee.emit('test');

                expect(counter).toBe(2);

                ee.removeListener('test', listener);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('should call listener multiple times for multiple listeners', function() {
                let counter1 = 0;
                let counter2 = 0;
                let counter3 = 0;
                const listener1 = () => { counter1++; };
                const listener2 = () => { counter2++; };
                const listener3 = () => { counter3++; };

                ee.on('test1', listener1);
                ee.on('test1', listener1);
                ee.on('test2', listener2);
                ee.on('test2', listener2);
                ee.on('test3', listener3);
                ee.on('test3', listener3);
                // 'test1' one time
                ee.emit('test1');
                // 'test2' two times
                ee.emit('test2');
                ee.emit('test2');
                // 'test3' three times
                ee.emit('test3');
                ee.emit('test3');
                ee.emit('test3');
                ee.removeListener('test1', listener1);
                ee.removeListener('test2', listener2);
                ee.removeListener('test3', listener3);

                expect([ counter1, counter2, counter3 ]).toEqual([ 1, 2, 3 ]);
                expect(ee.listenerCount('test1')).toBe(0);
                expect(ee.listenerCount('test2')).toBe(0);
                expect(ee.listenerCount('test3')).toBe(0);
            });

            it('should not call listener after removeListener', function() {
                let counter = 0;
                const listener = () => { counter++; };

                ee.on('test', listener);
                ee.on('test', listener);
                ee.emit('test');
                ee.removeListener('test', listener);
                ee.emit('test');
                ee.emit('test');

                expect(counter).toBe(1);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('should not call listener after removeListener multiple times for multiple listeners', function() {
                let counter1 = 0;
                let counter2 = 0;
                let counter3 = 0;
                const listener1 = () => { counter1++; };
                const listener2 = () => { counter2++; };
                const listener3 = () => { counter3++; };

                ee.on('test1', listener1);
                ee.on('test1', listener1);
                ee.on('test2', listener2);
                ee.on('test2', listener2);
                ee.on('test3', listener3);
                ee.on('test3', listener3);
                ee.emit('test1');
                ee.removeListener('test1', listener1);
                ee.emit('test1');
                ee.emit('test2');
                ee.emit('test2');
                ee.removeListener('test2', listener2);
                ee.emit('test2');
                ee.emit('test3');
                ee.emit('test3');
                ee.emit('test3');
                ee.removeListener('test3', listener3);
                ee.emit('test3');

                expect([ counter1, counter2, counter3 ]).toEqual([ 1, 2, 3 ]);
                expect(ee.listenerCount('test1')).toBe(0);
                expect(ee.listenerCount('test2')).toBe(0);
                expect(ee.listenerCount('test3')).toBe(0);
            });
        });

        describe('#emit', function() {
            describe('simple case', function() {
                it('single listener', function() {
                    let counter = 0;
                    const listener = () => { counter++; };

                    ee.on('test', listener);
                    ee.emit('test');
                    ee.emit('test');
                    ee.removeListener('test', listener);

                    expect(counter).toBe(2);
                    expect(ee.listenerCount('test')).toBe(0);
                });

                it('multiply listeners', function() {
                    let counter = 0;
                    const listener = () => { counter++; };

                    ee.on('test', listener);
                    ee.on('test', listener);
                    ee.on('test', listener);
                    ee.emit('test');
                    ee.emit('test');
                    ee.removeAllListeners('test');

                    expect(counter).toBe(6);
                    expect(ee.listenerCount('test')).toBe(0);
                });
            });

            describe('should not call handler added in current called handler', function() {
                it('single listener', function() {
                    let counter1 = 0;
                    let counter2 = 0;
                    let counter3 = 0;
                    const listener1 = () => {
                        counter1++;

                        ee.on('test', listener2);
                        ee.once('test', listener3);
                    };
                    const listener2 = () => { counter2++; };
                    const listener3 = () => { counter3++; };

                    ee.on('test', listener1);
                    ee.emit('test');
                    ee.removeListener('test', listener1);
                    ee.removeListener('test', listener2);
                    ee.removeListener('test', listener3);

                    expect([ counter1, counter2, counter3 ]).toEqual([ 1, 0, 0 ]);
                    expect(ee.listenerCount('test')).toBe(0);
                });

                it('multiply listeners', function() {
                    let counter1 = 0;
                    let counter2 = 0;
                    let counter3 = 0;
                    const listener1 = () => {
                        counter1++;

                        ee.on('test', listener2);
                        ee.once('test', listener3);
                    };
                    const listener2 = () => { counter2++; };
                    const listener3 = () => { counter3++; };

                    ee.on('test', listener1);
                    ee.on('test', listener1);
                    ee.on('test', listener1);
                    ee.emit('test');
                    ee.removeAllListeners('test');

                    expect([ counter1, counter2, counter3 ]).toEqual([ 3, 0, 0 ]);
                    expect(ee.listenerCount('test')).toBe(0);
                });
            });

            describe('should not call handler added by prependListener in current called handler', function() {
                it('single listener', function() {
                    let counter1 = 0;
                    let counter2 = 0;
                    let counter3 = 0;
                    const listener1 = () => {
                        counter1++;

                        ee.prependListener('test', listener2);
                        ee.prependOnceListener('test', listener3);
                    };
                    const listener2 = () => { counter2++; };
                    const listener3 = () => { counter3++; };

                    ee.on('test', listener1);
                    ee.emit('test');
                    ee.removeListener('test', listener1);
                    ee.removeListener('test', listener2);
                    ee.removeListener('test', listener3);

                    expect([ counter1, counter2, counter3 ]).toEqual([ 1, 0, 0 ]);
                    expect(ee.listenerCount('test')).toBe(0);
                });

                it('multiply listeners', function() {
                    let counter1 = 0;
                    let counter2 = 0;
                    let counter3 = 0;
                    const listener1 = () => {
                        counter1++;

                        ee.prependListener('test', listener2);
                        ee.prependOnceListener('test', listener3);
                    };
                    const listener2 = () => { counter2++; };
                    const listener3 = () => { counter3++; };

                    ee.on('test', listener1);
                    ee.on('test', listener1);
                    ee.on('test', listener1);
                    ee.emit('test');
                    ee.removeAllListeners('test');

                    expect([ counter1, counter2, counter3 ]).toEqual([ 3, 0, 0 ]);
                    expect(ee.listenerCount('test')).toBe(0);
                });
            });

            describe('should call handler removed in current called handler', function() {
                it('single listener', function() {
                    let counter1 = 0;
                    let counter2 = 0;
                    let counter3 = 0;
                    const listener1 = () => {
                        counter1++;

                        ee.removeListener('test', listener2);
                        ee.removeListener('test', listener3);
                    };
                    const listener2 = () => { counter2++; };
                    const listener3 = () => { counter3++; };

                    ee.on('test', listener1);
                    ee.on('test', listener2);
                    ee.once('test', listener3);
                    ee.emit('test');
                    ee.removeListener('test', listener1);

                    expect([ counter1, counter2, counter3 ]).toEqual([ 1, 1, 1 ]);
                    expect(ee.listenerCount('test')).toBe(0);
                });

                it('multiply listeners', function() {
                    let counter1 = 0;
                    let counter2 = 0;
                    let counter3 = 0;
                    const listener1 = () => {
                        counter1++;

                        ee.removeListener('test', listener2);
                        ee.removeListener('test', listener3);
                    };
                    const listener2 = () => { counter2++; };
                    const listener3 = () => { counter3++; };

                    ee.on('test', listener1);
                    ee.on('test', listener1);
                    ee.on('test', listener1);
                    ee.on('test', listener2);
                    ee.on('test', listener2);
                    ee.once('test', listener3);
                    ee.once('test', listener3);
                    ee.emit('test');
                    ee.removeAllListeners('test');

                    expect([ counter1, counter2, counter3 ]).toEqual([ 3, 2, 2 ]);
                    expect(ee.listenerCount('test')).toBe(0);
                });
            });

            describe('arguments length test', function() {
                const ee = new EventEmitterEx<{
                    'test-args0': () => void,
                    'test-args1': (a: number) => void,
                    'test-args2': (a: number, b: string) => void,
                    'test-args3': (a: number, b: string, c: symbol) => void,
                    'test-args9': (n1: 1, n2: 2, n3: 3, n4: 4, n5: 5, n6: 6, n7: 7, n8: 8, n9: 9) => void,
                    'test-argsN': (...args: string[]) => void,
                }>();

                it('args.length = 0', function() {
                    const listener = jest.fn(function(this: EventEmitterEx, ...args) {
                        expect(this).toBe(ee);
                        expect(args).toHaveLength(0);
                    });

                    ee.on('test-args0', listener);
                    // test#1 with single listener
                    ee.emit('test-args0');
                    ee.on('test-args0', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-args0');

                    expect(listener).toHaveBeenCalledTimes(3);

                    {// cleanup
                        ee.removeAllListeners('test-args0');
                        expect(ee.listenerCount('test-args0')).toBe(0);
                    }
                });

                it('args.length = 1', function() {
                    const listener = jest.fn(function(this: EventEmitterEx, a) {
                        expect(this).toBe(ee);
                        expect(a).toBe(9);
                        // eslint-disable-next-line prefer-rest-params
                        expect(arguments).toHaveLength(1);
                    });

                    ee.on('test-args1', listener);
                    // test#1 with single listener
                    ee.emit('test-args1', 9);
                    ee.on('test-args1', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-args1', 9);

                    expect(listener).toHaveBeenCalledTimes(3);

                    {// cleanup
                        ee.removeAllListeners('test-args1');
                        expect(ee.listenerCount('test-args1')).toBe(0);
                    }
                });

                it('args.length = 2', function() {
                    const listener = jest.fn(function(this: EventEmitterEx, a, b) {
                        expect(this).toBe(ee);
                        expect(a).toBe(8);
                        expect(b).toBe('b2');
                        // eslint-disable-next-line prefer-rest-params
                        expect(arguments).toHaveLength(2);
                    });

                    ee.on('test-args2', listener);
                    // test#1 with single listener
                    ee.emit('test-args2', 8, 'b2');
                    ee.on('test-args2', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-args2', 8, 'b2');

                    expect(listener).toHaveBeenCalledTimes(3);

                    {// cleanup
                        ee.removeAllListeners('test-args2');
                        expect(ee.listenerCount('test-args2')).toBe(0);
                    }
                });

                it('args.length = 3', function() {
                    const listener = jest.fn(function(this: EventEmitterEx, a, b, c) {
                        expect(this).toBe(ee);
                        expect(a).toBe(7);
                        expect(b).toBe('b3');
                        expect(c).toBe(sTest1);
                        // eslint-disable-next-line prefer-rest-params
                        expect(arguments).toHaveLength(3);
                    });

                    ee.on('test-args3', listener);
                    // test#1 with single listener
                    ee.emit('test-args3', 7, 'b3', sTest1);
                    ee.on('test-args3', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-args3', 7, 'b3', sTest1);

                    expect(listener).toHaveBeenCalledTimes(3);

                    {// cleanup
                        ee.removeAllListeners('test-args3');
                        expect(ee.listenerCount('test-args3')).toBe(0);
                    }
                });

                it('args.length = 9', function() {
                    const listener = jest.fn(function(this: EventEmitterEx, n1, n2, n3, n4, n5, n6, n7, n8, n9) {
                        expect(this).toBe(ee);
                        expect(n1).toBe(1);
                        expect(n2).toBe(2);
                        expect(n3).toBe(3);
                        expect(n4).toBe(4);
                        expect(n5).toBe(5);
                        expect(n6).toBe(6);
                        expect(n7).toBe(7);
                        expect(n8).toBe(8);
                        expect(n9).toBe(9);
                        // eslint-disable-next-line prefer-rest-params
                        expect(arguments).toHaveLength(9);
                    });

                    ee.on('test-args9', listener);
                    // test#1 with single listener
                    ee.emit('test-args9', 1, 2, 3, 4, 5, 6, 7, 8, 9);
                    ee.on('test-args9', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-args9', 1, 2, 3, 4, 5, 6, 7, 8, 9);

                    expect(listener).toHaveBeenCalledTimes(3);

                    {// cleanup
                        ee.removeAllListeners('test-args9');
                        expect(ee.listenerCount('test-args9')).toBe(0);
                    }
                });

                it('args.length = N', function() {
                    const expectedArgs = randArr30;
                    const listener = jest.fn(function(this: EventEmitterEx, ...args) {
                        expect(this).toBe(ee);
                        expect(args).toEqual(expectedArgs);
                        // eslint-disable-next-line prefer-rest-params
                        expect(arguments).toHaveLength(expectedArgs.length);
                    });

                    ee.on('test-argsN', listener);
                    // test#1 with single listener
                    ee.emit('test-argsN', ...expectedArgs);
                    ee.on('test-argsN', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-argsN', ...expectedArgs);

                    expect(listener).toHaveBeenCalledTimes(3);

                    {// cleanup
                        ee.removeAllListeners('test-argsN');
                        expect(ee.listenerCount('test-argsN')).toBe(0);
                    }
                });
            });
        });

        describe('events.errorMonitor', function() {
            // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-error-monitor.js

            it(`events.errorMonitor is a Symbol`, function() {
                expect(typeof errorMonitor).toBe('symbol');
            });

            describe(`without 'error' listener`, function() {
                // todo: На данный момент НЕ вызываем событие errorMonitor, если НЕТ подписок на событие 'error'.
                //  В текущей версии nodejs#v15.5.0, если нет подписки на 'error', то и errorMonitor НЕ вызывается, даже если подписка на errorMonitor есть.

                it(`single listener`, function() {
                    const theErr = new Error('MyError');
                    const monitorListener1 = jest.fn((/*err*/) => {
                        // {// main tests #1
                        //     expect(err).toBe(theErr);
                        // }
                    });
                    let err;

                    ee.on(errorMonitor, monitorListener1);

                    try {
                        ee.emit('error', theErr);
                    }
                    catch (error) {
                        err = error;
                    }

                    {// additional tests
                        expect(ee.listenerCount(errorMonitor)).toBe(1);
                    }

                    {// main tests
                        expect(err).toBe(theErr);

                        expect(monitorListener1).not.toHaveBeenCalled();
                        // expect(monitorListener1.mock.calls).toEqual([ [ theErr ] ]);
                    }

                    {// cleanup
                        ee.removeListener(errorMonitor, monitorListener1);
                        expect(ee.listenerCount(errorMonitor)).toBe(0);
                    }
                });

                it(`multiply listeners`, function() {
                    const theErr = new Error('MyError');
                    const monitorListener1 = jest.fn(() => {});
                    const monitorListener2 = jest.fn((/*err*/) => {
                        // {// main tests #1
                        //     expect(err).toBe(theErr);
                        // }
                    });
                    let err;

                    ee.on(errorMonitor, monitorListener1);
                    ee.on(errorMonitor, monitorListener2);

                    try {
                        ee.emit('error', theErr);
                    }
                    catch (error) {
                        err = error;
                    }

                    {// additional tests
                        expect(ee.listenerCount(errorMonitor)).toBe(2);
                    }

                    {// main tests
                        expect(err).toBe(theErr);

                        expect(monitorListener1).not.toHaveBeenCalled();
                        // expect(monitorListener1.mock.calls).toEqual([ [ theErr ] ]);

                        expect(monitorListener2).not.toHaveBeenCalled();
                        // expect(monitorListener2.mock.calls).toEqual([ [ theErr ] ]);
                    }

                    {// cleanup
                        ee.removeListener(errorMonitor, monitorListener1);
                        ee.removeListener(errorMonitor, monitorListener2);
                        expect(ee.listenerCount(errorMonitor)).toBe(0);
                    }
                });
            });

            describe(`with 'error' listener`, function() {
                it(`single listener`, function() {
                    const theErr = new Error('MyError');
                    const monitorListener1 = jest.fn((err) => {
                        {// main tests 1
                            expect(err).toBe(theErr);
                        }
                    });
                    const errorListener1 = jest.fn((err) => {
                        {// main tests #1
                            expect(err).toBe(theErr);
                        }
                    });

                    ee.on(errorMonitor, monitorListener1);
                    ee.on('error', errorListener1);

                    try {
                        ee.emit('error', theErr);
                    }
                    catch {
                        // This code should be unreachable
                        {// main tests #2
                            throw new Error('Unreachable code!!!');
                        }
                    }

                    {// additional tests
                        expect(ee.listenerCount(errorMonitor)).toBe(1);
                        expect(ee.listenerCount('error')).toBe(1);
                    }

                    {// main tests #3
                        expect(monitorListener1).toHaveBeenCalledTimes(1);
                        expect(monitorListener1).toHaveBeenCalledWith(theErr);

                        expect(errorListener1).toHaveBeenCalledTimes(1);
                        expect(errorListener1).toHaveBeenCalledWith(theErr);
                    }

                    {// cleanup
                        ee.removeListener(errorMonitor, monitorListener1);
                        ee.removeListener('error', errorListener1);
                        expect(ee.listenerCount(errorMonitor)).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                    }
                });

                it(`multiply listeners`, function() {
                    const theErr = new Error('MyError');
                    const monitorListener1 = jest.fn(() => {});
                    const monitorListener2 = jest.fn((err) => {
                        {// main tests #1
                            expect(err).toBe(theErr);
                        }
                    });
                    const errorListener1 = jest.fn(() => {});
                    const errorListener2 = jest.fn((err) => {
                        {// main tests #1
                            expect(err).toBe(theErr);
                        }
                    });

                    ee.on(errorMonitor, monitorListener1);
                    ee.on(errorMonitor, monitorListener2);
                    ee.on('error', errorListener1);
                    ee.on('error', errorListener2);

                    try {
                        ee.emit('error', theErr);
                    }
                    catch {
                        // This code should be unreachable
                        {// main tests #2
                            throw new Error('Unreachable code!!!');
                        }
                    }

                    {// additional tests
                        expect(ee.listenerCount(errorMonitor)).toBe(2);
                        expect(ee.listenerCount('error')).toBe(2);
                    }

                    {// main tests #3
                        expect(monitorListener1).toHaveBeenCalledTimes(1);
                        expect(monitorListener1).toHaveBeenCalledWith(theErr);
                        expect(monitorListener2).toHaveBeenCalledTimes(1);
                        expect(monitorListener2).toHaveBeenCalledWith(theErr);

                        expect(errorListener1).toHaveBeenCalledTimes(1);
                        expect(errorListener1).toHaveBeenCalledWith(theErr);
                        expect(errorListener2).toHaveBeenCalledTimes(1);
                        expect(errorListener2).toHaveBeenCalledWith(theErr);
                    }

                    {// cleanup
                        ee.removeListener(errorMonitor, monitorListener1);
                        ee.removeListener(errorMonitor, monitorListener2);
                        ee.removeListener('error', errorListener1);
                        ee.removeListener('error', errorListener2);
                        expect(ee.listenerCount(errorMonitor)).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                    }
                });

                it(`complex case`, function() {
                    const theErr1 = new Error('MyError1');
                    const theErr2 = new Error('MyError2');
                    const expectedArgs = randArr30.slice(0, 10);
                    const monitorListener1 = jest.fn(() => {});
                    const monitorListener2 = jest.fn((err1, err2, ...args) => {
                        {// main tests #1
                            expect(err1).toBe(theErr1);
                            expect(err2).toBe(theErr2);
                            expect(args).toEqual(expectedArgs);
                        }
                    });
                    const errorListener1 = jest.fn(() => {});
                    const errorListener2 = jest.fn((err1, err2, ...args) => {
                        {// main tests #1
                            expect(err1).toBe(theErr1);
                            expect(err2).toBe(theErr2);
                            expect(args).toEqual(expectedArgs);
                        }
                    });

                    ee.on(errorMonitor, monitorListener1);
                    ee.on(errorMonitor, monitorListener2);
                    ee.on('error', errorListener1);
                    ee.on('error', errorListener2);

                    try {
                        ee.emit('error', theErr1, theErr2, ...expectedArgs);
                    }
                    catch {
                        // This code should be unreachable
                        {// main tests #2
                            throw new Error('Unreachable code!!!');
                        }
                    }

                    {// additional tests
                        expect(ee.listenerCount(errorMonitor)).toBe(2);
                        expect(ee.listenerCount('error')).toBe(2);
                    }

                    {// main tests #3
                        const expectedCallArgs = [ theErr1, theErr2, ...expectedArgs ];

                        expect(monitorListener1).toHaveBeenCalledTimes(1);
                        expect(monitorListener1).toHaveBeenCalledWith(...expectedCallArgs);
                        expect(monitorListener2).toHaveBeenCalledTimes(1);
                        expect(monitorListener2).toHaveBeenCalledWith(...expectedCallArgs);

                        expect(errorListener1).toHaveBeenCalledTimes(1);
                        expect(errorListener1).toHaveBeenCalledWith(...expectedCallArgs);
                        expect(errorListener2).toHaveBeenCalledTimes(1);
                        expect(errorListener2).toHaveBeenCalledWith(...expectedCallArgs);
                    }

                    {// cleanup
                        ee.removeListener(errorMonitor, monitorListener1);
                        ee.removeListener(errorMonitor, monitorListener2);
                        ee.removeListener('error', errorListener1);
                        ee.removeListener('error', errorListener2);
                        expect(ee.listenerCount(errorMonitor)).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                    }
                });
            });
        });

        // todo: more tests here: https://github.com/nodejs/node/blob/master/test/parallel/test-events-once.js
        describe('#once', function() {
            it('should emit once', function() {
                // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-once.js
                let counter = 0;

                ee.once('test', () => {
                    counter++;
                });
                ee.emit('test');
                ee.emit('test');

                expect(counter).toBe(1);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('should not emit after removeListener', function() {
                let counter = 0;
                const listener = () => {
                    counter++;
                };

                ee.once('test', listener);
                ee.removeListener('test', listener);
                ee.emit('test');
                ee.emit('test');

                expect(counter).toBe(0);
                expect(ee.listenerCount('test')).toBe(0);
            });
        });

        describe('non-standard #hasListener', function() {
            it('should detect without handler', function() {
                const ee = new EventEmitterEx();

                const handler1 = () => {};

                ee.on('test_1', handler1);
                ee.once('test_2', handler1);
                ee.once('test_2', handler1);
                ee.prependListener('test_3', handler1);
                ee.prependListener('test_3', handler1);
                ee.prependOnceListener('test_4', handler1);

                expect(ee.hasListener('test_1')).toBe(true);
                expect(ee.hasListener('test_2')).toBe(true);
                expect(ee.hasListener('test_3')).toBe(true);
                expect(ee.hasListener('test_4')).toBe(true);
            });

            it('should detect with handler', function() {
                const ee = new EventEmitterEx();

                const handler1 = () => {};
                const handler2 = () => {};
                const handler3 = () => {};
                const handler4 = () => {};

                ee.on('test_1', handler1);
                ee.once('test_2', handler2);
                ee.once('test_2', handler2);
                ee.prependListener('test_3', handler3);
                ee.prependListener('test_3', handler3);
                ee.prependOnceListener('test_4', handler4);

                expect(ee.hasListener('test_1', handler1)).toBe(true);
                expect(ee.hasListener('test_2', handler2)).toBe(true);
                expect(ee.hasListener('test_3', handler3)).toBe(true);
                expect(ee.hasListener('test_4', handler4)).toBe(true);
            });
        });

        describe('error behaviour', function() {
            it('case try/catch', async function() {
                const ee = new EventEmitterEx;

                const promise = new Promise((resolve, reject) => {
                    try {
                        ee.on('test', function() {
                            throw new Error('test');
                        });

                        ee.emit('test');
                    }
                    catch (err) {
                        reject(err);
                    }
                });

                let isThrow = false;

                await promise.catch(error => {
                    isThrow = true;

                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(error).toBeDefined();
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(error.message).toContain('test');
                });

                expect(isThrow).toBe(true);
            });
        });

        describe('cases', function() {
            it('#on with asyncIterator and "for await ... of"', async function() {
                const ee = new EventEmitterEx();
                const ac = new AbortController();

                const createEventsAsyncIterator = function(ee: EventEmitterEx, event: EventName, signal: AbortSignal) {
                    let deferred: Deferred | void;
                    let isAborted = false;
                    const eventsPool: (unknown[])[] = [];
                    const onEvent = (...args: unknown[]) => {
                        if (isAborted) {
                            return;
                        }

                        eventsPool.push(args);

                        if (deferred) {
                            deferred.resolve(void 0);
                            deferred = void 0;
                        }
                    };
                    const onAbort = () => {
                        isAborted = true;
                        signal.removeEventListener('abort', onAbort);
                        ee.removeListener(event, onEvent);

                        if (deferred) {// Prevent Deferred(Promise) from being in 'pending' status forever
                            // using 'resolve' and not 'reject' due <asyncIterator>.next() has logic with isAborted check
                            deferred.resolve(void 0);
                            deferred = void 0;
                        }
                    };

                    ee.on(event, onEvent);

                    signal.addEventListener('abort', onAbort);

                    return {
                        [Symbol.asyncIterator]() {
                            return {
                                next(): Promise<{ value: any, done: boolean }> {
                                    if (isAborted) {
                                        return Promise.resolve({ value: void 0, done: true });
                                    }

                                    if (eventsPool.length > 0) {
                                        const eventArgs = eventsPool.shift();

                                        return Promise.resolve({
                                            value: eventArgs,
                                            done: false,
                                        });
                                    }

                                    deferred = new Deferred();

                                    return deferred.then(() => {
                                        return this.next();
                                    });
                                },
                                return() {
                                    onAbort();

                                    return this.next();
                                },
                            };
                        },
                    };
                };

                setImmediate(() => {
                    ee.emit('test', 1);
                    ee.emit('test', 2);
                });

                const events: (unknown[])[] = [];
                const onAsyncEventHandled = () => {
                    if (events.length === 2) {
                        setImmediate(() => {
                            ee.emit('test', 3);
                        });
                    }
                    if (events.length === 3) {
                        ac.abort();
                    }
                };
                const asyncIterator = createEventsAsyncIterator(ee, 'test', ac.signal);

                expect(listenerCount(ac.signal, 'abort')).toBe(1);

                for await (const event of asyncIterator) {
                    events.push(event);

                    onAsyncEventHandled();
                }

                expect(events).toEqual([
                    [ 1 ],
                    [ 2 ],
                    [ 3 ],
                ]);
                expect(ee.listenerCount('test')).toBe(0);
                expect(listenerCount(ac.signal, 'abort')).toBe(0);
            });
        });
    }) as EmptyFunction);

    {// https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-subclass.js
        class EventEmitterExSubClass extends EventEmitterEx {
            on(...args: unknown[]) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                return super.on(...args);
            }

            removeListener(...args: unknown[]) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                return super.removeListener(...args);
            }
        }

        describe('EventEmitter subclass', checkEventEmitter.bind(null, EventEmitterExSubClass));
    }

    describe('EventEmitterSimpleProxy', function() {
        it('instanceof', function() {
            const emitter = new EventEmitterEx();

            expect(new EventEmitterSimpleProxy({ emitter })).toBeInstanceOf(EventEmitterSimpleProxy);
            expect(new EventEmitterSimpleProxy({ emitter })).toBeInstanceOf(EventEmitterEx);
        });

        it('destructor', function() {
            const emitter = new EventEmitterEx();
            const proxy = new EventEmitterSimpleProxy({
                emitter,
            });

            proxy.on('test1', () => {});
            proxy.on('test2', () => {});
            emitter.on('test3', () => {});

            let wasDestroyed = false;

            proxy.on(kDestroyingEvent, () => { wasDestroyed = true; });

            expect(getEventListeners(proxy, 'test1').length + getEventListeners(proxy, 'test2').length)
                .toBe(2)
            ;
            expect(getEventListeners(emitter, 'test1')).toHaveLength(1);
            expect(getEventListeners(emitter, 'test2')).toHaveLength(1);

            proxy.destructor();

            expect(getEventListeners(proxy, 'test1').length + getEventListeners(proxy, 'test2').length)
                .toBe(0)
            ;
            expect(getEventListeners(emitter, 'test1')).toHaveLength(0);
            expect(getEventListeners(emitter, 'test2')).toHaveLength(0);
            expect(getEventListeners(emitter, 'test3')).toHaveLength(1);
            expect(wasDestroyed).toBe(true);
        });

        it('example', function() {
            const emitter = new EventEmitterEx();
            const proxy = new EventEmitterSimpleProxy({
                emitter,
            });
            let counter1 = 0;
            const handler1 = () => {
                counter1++;
            };
            let counter2 = 0;
            const handler2 = () => {
                counter2++;
            };

            emitter.on('test', handler1);
            proxy.on('test', handler2);

            // emit on emitter, handle on proxy and emitter
            emitter.emit('test');

            // on emitter, it should be proxyHandler and `() => { counter1++; }` handler
            expect(emitter.listenerCount('test')).toBe(2);
            expect(emitter.hasListener('test', handler1)).toBe(true);
            // on proxy, it should be `() => { counter2++; }` handler
            expect(proxy.listenerCount('test')).toBe(1);
            expect(proxy.hasListener('test', handler2)).toBe(true);

            // remove all listeners on proxy and remove only proxy handlers from emitter
            proxy.removeAllListeners();

            expect(emitter.listenerCount('test')).toBe(1);
            expect(proxy.listenerCount('test')).toBe(0);

            expect(counter1).toBe(1);
            expect(counter2).toBe(1);

            {
                counter1 = 0;
                counter2 = 0;

                proxy.on('test', handler2);
                emitter.emit('test');

                // destructor() will unlink emitter from proxy
                proxy.destructor();
                emitter.emit('test');

                expect(counter1).toBe(2);
                expect(counter2).toBe(1);
            }
        });

        it('two-way #emit', function() {
            const emitter = new EventEmitterEx();
            const proxy = new EventEmitterSimpleProxy({
                emitter,
            });
            let counter1 = 0;
            let counter2 = 0;

            emitter.on('test', () => { counter1++; });
            proxy.on('test', () => { counter2++; });

            // emit on emitter, handle on proxy and emitter
            emitter.emit('test');
            // also emit on proxy and emitter, handle on proxy and emitter
            proxy.emit('test');

            expect(counter1).toBe(2);
            expect(counter2).toBe(2);
        });

        it.todo('#removeAllListeners(void 0)');
        it.todo('#removeAllListeners(eventName)');
        it.todo('#removeAllListeners() with _proxyHook');
    });

    describe('EventEmitterProxy', function() {
        it('instanceof', function() {
            expect(new EventEmitterProxy()).toBeInstanceOf(EventEmitterProxy);
            expect(new EventEmitterProxy()).toBeInstanceOf(EventEmitterEx);
        });

        it('destructor', function() {
            const emitter = new EventEmitterEx();
            const proxy = new EventEmitterProxy({
                sourceEmitter: emitter,
            });

            proxy.on('test1', () => {});
            proxy.on('test2', () => {});
            emitter.on('test3', () => {});

            let wasDestroyed = false;

            proxy.on(kDestroyingEvent, () => { wasDestroyed = true; });

            expect(getEventListeners(proxy, 'test1').length + getEventListeners(proxy, 'test2').length)
                .toBe(2)
            ;
            expect(getEventListeners(emitter, 'test1')).toHaveLength(1);
            expect(getEventListeners(emitter, 'test2')).toHaveLength(1);

            proxy.destructor();

            expect(getEventListeners(proxy, 'test1').length + getEventListeners(proxy, 'test2').length)
                .toBe(0)
            ;
            expect(getEventListeners(emitter, 'test1')).toHaveLength(0);
            expect(getEventListeners(emitter, 'test2')).toHaveLength(0);
            expect(getEventListeners(emitter, 'test3')).toHaveLength(1);
            expect(wasDestroyed).toBe(true);
        });

        it('example', function() {
            const emitter = new EventEmitterEx();
            const proxy = new EventEmitterProxy({
                sourceEmitter: emitter,
                targetEmitter: emitter,
            });
            let counter1 = 0;
            const handler1 = () => {
                counter1++;
            };
            let counter2 = 0;
            const handler2 = () => {
                counter2++;
            };

            emitter.on('test', handler1);
            proxy.on('test', handler2);

            // emit on emitter, handle on proxy and emitter
            emitter.emit('test');

            // on emitter, it should be proxyHandler and `() => { counter1++; }` handler
            expect(emitter.listenerCount('test')).toBe(2);
            expect(emitter.hasListener('test', handler1)).toBe(true);
            // on proxy, it should be `() => { counter2++; }` handler
            expect(proxy.listenerCount('test')).toBe(1);
            expect(proxy.hasListener('test', handler2)).toBe(true);

            // remove all listeners on proxy and remove only proxy handlers from emitter
            proxy.removeAllListeners();

            expect(emitter.listenerCount('test')).toBe(1);
            expect(proxy.listenerCount('test')).toBe(0);

            expect(counter1).toBe(1);
            expect(counter2).toBe(1);

            {
                counter1 = 0;
                counter2 = 0;

                proxy.on('test', handler2);
                emitter.emit('test');

                // destructor() will unlink emitter from proxy
                proxy.destructor();
                emitter.emit('test');

                expect(counter1).toBe(2);
                expect(counter2).toBe(1);
            }
        });

        it('options.allowDirectEmitToTarget', function() {
            const emitter = new EventEmitterEx();
            const proxy = new EventEmitterProxy({
                sourceEmitter: emitter,
                targetEmitter: emitter,
                allowDirectEmitToTarget: true,
            });
            let emitter_counter = 0;
            const emitter_handler = () => {
                emitter_counter++;
            };
            let proxy_counter = 0;
            const proxy_handler = () => {
                proxy_counter++;
            };

            emitter.on('test', emitter_handler);
            proxy.on('test', proxy_handler);

            // emit on proxy, handle on proxy and emitter
            proxy.emit('test');

            // on emitter, it should be proxyHandler and `() => { counter1++; }` handler
            expect(emitter.listenerCount('test')).toBe(2);
            expect(emitter.hasListener('test', emitter_handler)).toBe(true);
            // on proxy, it should be `() => { counter2++; }` handler
            expect(proxy.listenerCount('test')).toBe(1);
            expect(proxy.hasListener('test', proxy_handler)).toBe(true);

            // remove all listeners on proxy and remove only proxy handlers from emitter
            proxy.removeAllListeners();

            expect(emitter.listenerCount('test')).toBe(1);
            expect(proxy.listenerCount('test')).toBe(0);

            expect(emitter_counter).toBe(1);
            expect(proxy_counter).toBe(1);
        });

        it('two-way #emit', function() {
            const ee = new EventEmitterEx();
            const proxy = new EventEmitterProxy({
                sourceEmitter: ee,
                targetEmitter: ee,
                allowDirectEmitToTarget: true,
            });
            let counter1 = 0;
            let counter2 = 0;

            ee.on('test', () => { counter1++; });
            proxy.on('test', () => { counter2++; });

            // emit on emitter, handle on proxy and emitter
            ee.emit('test');
            // also emit on proxy and emitter, handle on proxy and emitter
            proxy.emit('test');

            expect(counter1).toBe(2);
            expect(counter2).toBe(2);
        });

        it.todo('#removeAllListeners(void 0)');
        it.todo('#removeAllListeners(eventName)');
        it.todo('#removeAllListeners() with _proxyHook');
    });

    const _EventEmitterEx_once = once;

    // tags: EventEmitter.once, EventEmitterEx.once, static once
    describe('events.once', function _EventEmitter_once() {
        let EventEmitter = EventEmitterEx;
        let once = _EventEmitterEx_once;

        {
            // eslint-disable-next-line prefer-rest-params
            const eventEmitterConstructor = arguments[0] as Function;

            if (!eventEmitterConstructor) {
                describe('EventEmitter.once with NodeJS.EventEmitter', _EventEmitter_once.bind(null, NodeEventEmitter));
                // EventTarget Added in nodejs: v14.5.0
                describe('EventEmitter.once with EventTarget', _EventEmitter_once.bind(null, NodeEventTarget));
            }
            else {
                // Подменяем конструктор EventEmitter на другой (NodeEventEmitter или NodeEventTarget).
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                EventEmitter = eventEmitterConstructor;
            }
        }

        const ee = new EventEmitter();
        const isEventTarget = isEventTargetCompatible(ee);

        // Если EventEmitter - это ссылка на конструктор NodeEventTarget, то нужно его API немного "прокачать", чтобы
        //  у него были методы аналогичные EventEmitter.
        if (compatibleEventEmitter_from_EventTarget(ee)) {
            // Если это действительно экземпляр NodeEventTarget, то и функцию once нужно "прокачать", для того, чтобы
            //  она возвращала такой же результата, как версия once для EventEmitter.
            once = compatibleOnce_for_EventTarget(once);
        }

        it('should emit once', function() {
            const expectedError = null;
            let error: Error | string | null = null;
            const expectedArgs = [ 'test', 1, {} ];
            const argsArray: any[] = [];

            const promise = once(ee, 'test1')
                .then(actualArgs => {
                    argsArray.push(actualArgs as any[]);
                })
                .catch((err: Error | string) => {
                    error = err;
                })
                .then(() => {
                    expect(error).toBe(expectedError);
                    expect(argsArray).toEqual([ expectedArgs ]);
                    expect(ee.listenerCount('test1')).toBe(0);
                })
            ;

            expect(ee.listenerCount('test1')).toBe(1);

            ee.emit('test1', ...expectedArgs);

            return promise;
        });

        it('should emit once (async/await)', async function() {
            const expectedArgs = [ 'test', 1, {} ];
            const argsArray: any[] = [];

            setImmediate(() => {
                expect(ee.listenerCount('test2')).toBe(1);

                ee.emit('test2', ...expectedArgs);
            });

            const actualArgs = await once(ee, 'test2') as any[];

            argsArray.push(actualArgs);

            ee.emit('test2', ...expectedArgs);

            expect(argsArray).toEqual([ expectedArgs ]);
            expect(ee.listenerCount('test2')).toBe(0);
        });

        describe(`'error' handling`, function() {
            it(`should reject with error on 'error' event`, function() {
                const expectedError = new Error('REJECT PROMISE');
                let error = void 0;

                const promise = once(ee, 'test3', {
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(error).toBeDefined();
                        expect(error).toBe(expectedError);
                        expect(ee.listenerCount('test3')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                    })
                ;

                expect(ee.listenerCount('test3')).toBe(1);
                expect(ee.listenerCount('error')).toBe(1);

                ee.emit('error', expectedError);

                return promise;
            });

            it(`should reject with error on 'error' event (async/await)`, async function() {
                const expectedError = new Error('REJECT PROMISE');
                let error: unknown = null;

                setImmediate(() => {
                    expect(ee.listenerCount('test4')).toBe(1);

                    ee.emit('error', expectedError);
                });

                try {
                    const promise = once(ee, 'test4', {
                        // EventTarget does not have `error` event semantics like Node
                        errorEventName: isEventTarget ? 'error' : void 0,
                    });

                    expect(ee.listenerCount('test4')).toBe(1);
                    expect(ee.listenerCount('error')).toBe(1);

                    await promise;
                }
                catch (err) {
                    error = err;
                }

                expect(error).toBe(expectedError);
                expect(ee.listenerCount('test4')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);
            });

            it(`should not reject if 'error' event is main listener type`, function() {
                const err = new Error('test');

                const promise = once(ee, 'error', {
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                })
                    .then(args => {
                        expect(args).toEqual([ err, 1, 2, 3 ]);
                    })
                ;

                expect(ee.listenerCount('error')).toBe(1);

                ee.emit('error', err, 1, 2, 3);

                return promise;
            });

            it(`should not reject if 'error' event is main listener type (async/await)`, async function() {
                const err = new Error('test');

                setImmediate(() => {
                    ee.emit('error', err, 1, 2, 3);
                });

                const args = await once(ee, 'error', {
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                });

                expect(args).toEqual([ err, 1, 2, 3 ]);
                expect(ee.listenerCount('error')).toBe(0);
            });

            it(`should not reject if 'error' event is in main listeners types`, function() {
                const err = new Error('test');

                const promise = once(ee, [ 'test1', 'test2', 'error' ], {
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                })
                    .then(args => {
                        expect(args).toEqual([ err, 1, 2, 3 ]);
                        expect(ee.listenerCount('test1')).toBe(0);
                        expect(ee.listenerCount('test2')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                    })
                ;

                expect(ee.listenerCount('test1')).toBe(1);
                expect(ee.listenerCount('test2')).toBe(1);
                expect(ee.listenerCount('error')).toBe(1);

                ee.emit('error', err, 1, 2, 3);

                return promise;
            });

            it(`should not reject if 'error' event is in main listeners types (async/await)`, async function() {
                const err = new Error('test');

                setImmediate(() => {
                    ee.emit('error', err, 1, 2, 3);
                });

                const args = await once(ee, [ 'test1', 'test2', 'error' ], {
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                });

                expect(args).toEqual([ err, 1, 2, 3 ]);
                expect(ee.listenerCount('error')).toBe(0);
            });

            it(`should reject with error on custom error event`, function() {
                const expectedError = new Error('REJECT PROMISE');
                const customErrorEventName = 'custom_error1';
                let error = void 0;

                const promise = once(ee, 'test3', {
                    errorEventName: customErrorEventName,
                })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(error).toBeDefined();
                        expect(error).toBe(expectedError);
                        expect(ee.listenerCount('test3')).toBe(0);
                        expect(ee.listenerCount(customErrorEventName)).toBe(0);
                    })
                ;

                expect(ee.listenerCount('test3')).toBe(1);
                expect(ee.listenerCount(customErrorEventName)).toBe(1);

                ee.emit(customErrorEventName, expectedError);

                return promise;
            });

            it(`should reject with error on custom error event (async/await)`, async function() {
                const expectedError = new Error('REJECT PROMISE');
                const customErrorEventName = 'custom_error2';
                let error: unknown = null;

                setImmediate(() => {
                    ee.emit(customErrorEventName, expectedError);
                });

                try {
                    const promise = once(ee, 'test4', {
                        errorEventName: customErrorEventName,
                    });

                    expect(ee.listenerCount('test4')).toBe(1);
                    expect(ee.listenerCount(customErrorEventName)).toBe(1);

                    await promise;
                }
                catch (err) {
                    error = err;
                }

                expect(error).toBe(expectedError);
                expect(ee.listenerCount('test4')).toBe(0);
                expect(ee.listenerCount(customErrorEventName)).toBe(0);
            });

            it(`should not reject if custom error event is main listener type`, function() {
                const customErrorEventName = 'custom_error1-1';

                const promise = once(ee, customErrorEventName, {
                    errorEventName: customErrorEventName,
                })
                    .then(args => {
                        expect(args).toEqual([ 1, 2, 3 ]);
                        expect(ee.listenerCount(customErrorEventName)).toBe(0);
                    })
                ;

                expect(ee.listenerCount(customErrorEventName)).toBe(1);

                ee.emit(customErrorEventName, 1, 2, 3);

                return promise;
            });

            it(`should not reject if custom error event is main listener type (async/await)`, async function() {
                const customErrorEventName = 'custom_error1-2';

                setImmediate(() => {
                    ee.emit(customErrorEventName, 1, 2, 3);
                });

                const args = await once(ee, customErrorEventName, {
                    errorEventName: customErrorEventName,
                });

                expect(args).toEqual([ 1, 2, 3 ]);
                expect(ee.listenerCount(customErrorEventName)).toBe(0);
            });

            it(`should not reject if custom error event is in main listeners types`, function() {
                const customErrorEventName = 'custom_error1-1';

                const promise = once(ee, [ 'test1', 'test2', customErrorEventName ], {
                    errorEventName: customErrorEventName,
                })
                    .then(args => {
                        expect(args).toEqual([ 1, 2, 3 ]);
                        expect(ee.listenerCount('test1')).toBe(0);
                        expect(ee.listenerCount('test2')).toBe(0);
                        expect(ee.listenerCount(customErrorEventName)).toBe(0);
                    })
                ;

                expect(ee.listenerCount('test1')).toBe(1);
                expect(ee.listenerCount('test2')).toBe(1);
                expect(ee.listenerCount(customErrorEventName)).toBe(1);

                ee.emit(customErrorEventName, 1, 2, 3);

                return promise;
            });

            it(`should not reject if custom error event is in main listeners types (async/await)`, async function() {
                const customErrorEventName = 'custom_error1-2';

                setImmediate(() => {
                    ee.emit(customErrorEventName, 1, 2, 3);
                });

                const args = await once(ee, [ 'test1', 'test2', customErrorEventName ], {
                    errorEventName: customErrorEventName,
                });

                expect(args).toEqual([ 1, 2, 3 ]);
                expect(ee.listenerCount(customErrorEventName)).toBe(0);
            });

            it(`should not reject if custom error event is main listener and 'error' event emitted`, async function() {
                const err = new Error('test');
                const customErrorEventName = 'custom_error1-3';

                setImmediate(() => {
                    const noop = () => {};

                    ee.on('error', noop);

                    ee.emit('error', err);
                    ee.emit(customErrorEventName, 1);

                    ee.off('error', noop);
                });

                await Promise.all([
                    once(ee, customErrorEventName, {
                        errorEventName: customErrorEventName,
                    }),
                    once(ee, [ 'test1', 'test2', customErrorEventName ], {
                        errorEventName: customErrorEventName,
                    }),
                ]);

                expect(ee.listenerCount('error')).toBe(0);
                expect(ee.listenerCount(customErrorEventName)).toBe(0);
            });

            it(`should reject if 'error' event is main listener and custom error event emitted`, async function() {
                const customErrorEventName = 'custom_error1-3';
                const error = new Error('custom');

                setImmediate(() => {
                    ee.emit(customErrorEventName, error);
                });

                const [ r1, r2 ] = await Promise.allSettled([
                    once(ee, 'error', {
                        errorEventName: customErrorEventName,
                    }),
                    once(ee, [ 'test1', 'test2', 'error' ], {
                        errorEventName: customErrorEventName,
                    }),
                ]);

                expect(r1.status).toBe('rejected');
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                expect(r1.reason).toBe(error);
                expect(r2.status).toBe('rejected');
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                expect(r2.reason).toBe(error);
            });
        });

        describe(`(only for EventEmitter's) - EventTarget incompatible -`, function() {
            // The tests in this group is not compatible for EventTarget, so it will no be called then emitter is EventTarget.

            // https://github.com/facebook/jest/issues/7245#issuecomment-640262989
            const itSkip = it.skip;

            if (!isEventTargetCompatible(ee)) {
                // Для EventTarget - пропускаем, для EventEmitter - запускаем
                it.skip = it;
            }
            else {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                it.skip = function() {};
            }

            // eslint-disable-next-line jest/no-disabled-tests
            it.skip('with options.prepend', function() {
                type TestEvent = Event & { position: number };

                // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-prepend.js
                let counter = 0;
                const isEvent = Symbol('isEvent');
                const defaultListener = function(event: TestEvent) {
                    event.stopImmediatePropagation();

                    if (event.position === 4) {
                        event.position = 5;
                    }
                };

                ee.addListener('test5-1', defaultListener);

                // Если prepend работает правильно и обработчик события внутри once ставиться в начало всех обработчиков
                //  событий, то у event ещё не будет вызван stopImmediatePropagation, на момент попадания в filter.
                // eslint-disable-next-line jest/valid-expect-in-promise
                const promise1 = once(ee, 'test5-1', {
                    prepend: true,
                    filter(type, event) {
                        return !event.cancelBubble;
                    },
                })
                    .then(args => {
                        const event = args[0];

                        expect(event[isEvent]).toBe(true);
                        expect(event.position).toBe(1);

                        counter++;
                    })
                ;

                // Если prepend не указан, то сначала выполниться defaultListener, который создаст событие с position = 5.
                // eslint-disable-next-line jest/valid-expect-in-promise
                const promise2 = once(ee, 'test5-1', {
                    filter(type, event) {
                        return event.position === 5;
                    },
                })
                    .then(args => {
                        const event = args[0];

                        expect(event[isEvent]).toBe(true);
                        expect(event.position).toBe(5);

                        counter++;
                    })
                ;

                expect(listenerCount(ee, 'test5-1')).toBe(3);

                const promise = Promise.all([ promise1, promise2 ]).then(() => {
                    expect(counter).toBe(2);
                    expect(ee.listenerCount('test5-1')).toBe(0);
                    expect(ee.listenerCount('error')).toBe(0);
                });

                ee.emit('test5-1', createDomEventLike('test5-1', { position: 1, [isEvent]: true }));
                ee.emit('test5-1', createDomEventLike('test5-1', { position: 2, [isEvent]: true }));
                ee.emit('test5-1', createDomEventLike('test5-1', { position: 3, [isEvent]: true }));
                ee.emit('test5-1', createDomEventLike('test5-1', { position: 4, [isEvent]: true }));

                ee.removeListener('test5-1', defaultListener);

                return promise;
            });

            it.skip = itSkip;
        });

        describe(`(only for EventTarget's) - EventEmitter incompatible -`, function() {
            // The tests in this group is not compatible for EventEmitter, so it will no be called then emitter is EventEmitter.

            // https://github.com/facebook/jest/issues/7245#issuecomment-640262989
            const itSkip = it.skip;
            const eventTarget = ee as unknown as EventTarget;

            if (!isEventEmitterCompatible(eventTarget)) {
                // Для EventEmitter - пропускаем, для EventTarget - запускаем
                it.skip = it;
            }
            else {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                it.skip = function() {};
            }

            // eslint-disable-next-line jest/no-disabled-tests
            it.skip('should throw if "types" argument is Symbol', async function() {
                let error: null | Error & { code: number | string } = null;

                try {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    await once(eventTarget, Symbol('invalid-argument'), {
                        timeout: 10,
                    });
                }
                catch (err) {
                    error = err as (Error & { code: number | string });
                }

                expect_toBeDefined(error);
                expect(error?.code).toBe('ERR_INVALID_ARG_TYPE');
                expect(error?.name).toBe('TypeError');
                expect(error?.message).toContain(`The "symbol" value type of "types" argument is not supported for EventTarget emitter`);
            });

            // eslint-disable-next-line jest/no-disabled-tests
            it.skip('should throw if one of array "types" argument is Symbol', async function() {
                let error: null | Error & { code: number | string } = null;

                try {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    await once(eventTarget, [ 'test-123-qwerty', 321_132, 987_654_321n, Symbol('invalid-argument') ], {
                        timeout: 10,
                    });
                }
                catch (err) {
                    error = err as (Error & { code: number | string });
                }

                expect_toBeDefined(error);
                expect(error?.code).toBe('ERR_INVALID_ARG_TYPE');
                expect(error?.name).toBe('TypeError');
                expect(error?.message).toContain(`The "symbol" value type of "types" argument is not supported for EventTarget emitter`);
            });

            // eslint-disable-next-line jest/no-disabled-tests
            it.skip('should throw if "options.errorEventName" is Symbol', async function() {
                let error: null | Error & { code: number | string } = null;

                try {
                    await once(eventTarget, Math.random().toString(36), {
                        errorEventName: Symbol('invalid-argument'),
                        timeout: 10,
                    });
                }
                catch (err) {
                    error = err as (Error & { code: number | string });
                }

                expect_toBeDefined(error);
                expect(error?.code).toBe('ERR_INVALID_OPTION_TYPE');
                expect(error?.name).toBe('TypeError');
                expect(error?.message).toContain(`The "symbol" value type of "errorEventName" option is not supported for EventTarget emitter`);
            });

            // eslint-disable-next-line jest/no-disabled-tests
            it.skip('with options.capture', async function() {
                const data = {
                    test: true,
                };
                const event = new CustomEvent<typeof data>('test5-2', { detail: data });

                setImmediate(() => {
                    eventTarget.dispatchEvent(event);
                });

                await once(eventTarget, 'test5-2', {
                    capture: true,
                }).then(([ event ]) => {
                    expect((event as CustomEvent<typeof data>).detail).toBe(data);
                    expect(listenerCount(eventTarget, 'test5-2')).toBe(0);
                });
            });

            // eslint-disable-next-line jest/no-disabled-tests
            it.skip('with options.passive=true', async function() {
                const data = {
                    test: true,
                };
                const event = new CustomEvent<typeof data>('test5-2', { detail: data, cancelable: true });

                setImmediate(() => {
                    eventTarget.dispatchEvent(event);
                });

                await once(eventTarget, 'test5-2', {
                    passive: true,
                    filter(type, event) {
                        event.preventDefault();

                        return true;
                    },
                }).then(([ event ]) => {
                    expect((event as CustomEvent<typeof data>).detail).toBe(data);
                    expect(listenerCount(eventTarget, 'test5-2')).toBe(0);
                    expect(event.defaultPrevented).toBe(false);
                });
            });

            // eslint-disable-next-line jest/no-disabled-tests
            it.skip('with options.passive=false', async function() {
                const data = {
                    test: true,
                };
                const event = new CustomEvent<typeof data>('test5-2', { detail: data, cancelable: true });

                setImmediate(() => {
                    eventTarget.dispatchEvent(event);
                });

                await once(eventTarget, 'test5-2', {
                    passive: false,
                    filter(type, event) {
                        event.preventDefault();

                        return true;
                    },
                }).then(([ event ]) => {
                    expect((event as CustomEvent<typeof data>).detail).toBe(data);
                    expect(listenerCount(eventTarget, 'test5-2')).toBe(0);
                    expect(event.defaultPrevented).toBe(true);
                });
            });

            // eslint-disable-next-line jest/no-disabled-tests
            it.skip('with options.signal should pass signal to compatible addEventListener', async function() {
                const fakeEventTarget = new FakeEventTarget();
                const ac = new AbortController();
                const { signal } = ac;
                const type = 'test-options.signal';

                fakeEventTarget.initSupports({ signal: true });

                const promise = once(fakeEventTarget, type, {
                    passive: false,
                    signal,
                });

                expect(listenerCount(fakeEventTarget, type)).toBe(1);
                expect(listenerCount(signal, 'abort')).toBe(2);

                const addEventListenerOptions = fakeEventTarget.getListenersOptions(type)[0] as (AddEventListenerOptions & { signal?: AbortSignal });

                expect(addEventListenerOptions.signal).toBe(signal);

                ac.abort();

                let wasCatch = false;

                await promise.catch(error => {
                    wasCatch = true;

                    const errorString = String(error);

                    // eslint-disable-next-line jest/no-conditional-expect
                    expect([ errorString, errorString.includes('aborted') ]).toEqual([ errorString, true ]);
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(listenerCount(fakeEventTarget, type)).toBe(0);
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(listenerCount(signal, 'abort')).toBe(0);
                });

                expect(wasCatch).toBe(true);
            });

            // eslint-disable-next-line jest/no-disabled-tests
            it.skip('with options.signal should NOT pass signal to incompatible addEventListener', async function() {
                const fakeEventTarget = new FakeEventTarget();
                const ac = new AbortController();
                const { signal } = ac;
                const type = 'test-options.signal';

                fakeEventTarget.initSupports({ signal: false });

                const promise = once(fakeEventTarget, type, {
                    passive: false,
                    signal,
                });

                expect(listenerCount(fakeEventTarget, type)).toBe(1);
                expect(listenerCount(signal, 'abort')).toBe(1);

                const addEventListenerOptions = fakeEventTarget.getListenersOptions(type)[0] as (AddEventListenerOptions & { signal?: AbortSignal });

                expect(addEventListenerOptions.signal).not.toBe(signal);
                expect(addEventListenerOptions.signal).toBeUndefined();

                ac.abort();

                let wasCatch = false;

                await promise.catch(error => {
                    wasCatch = true;

                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(String(error)).toContain('aborted');
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(listenerCount(fakeEventTarget, type)).toBe(0);
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(listenerCount(signal, 'abort')).toBe(0);
                });

                expect(wasCatch).toBe(true);
            });

            it.skip = itSkip;
        });

        // todo: Написать простой очевидный пример использования
        it('with options.filter - simple example', function() {
            const expectedError = null;
            let error: Error | string | null = null;
            const expectedArgs = [
                [ 'test', 1, {} ],
                [ 'test', 5, {} ],
                [ 'test', 9, {} ],
            ];
            const argsArray: any[] = [];

            const promise = Promise.all([
                once(ee, 'test5', { filter: (type, ...args) => args[1] === 9 })
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch((err: Error | string) => (
                        error = err
                    )),
                once(ee, 'test5', { filter: (type, ...args) => args[1] === 5 })
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch((err: Error | string) => (
                        error = err
                    )),
                once(ee, 'test5', { filter: (type, ...args) => args[1] === 1 })
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch((err: Error | string) => (
                        error = err
                    )),
            ]).then(() => {
                expect(error).toBe(expectedError);
                expect(argsArray).toEqual(expectedArgs);
                expect(ee.listenerCount('test5')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);
            });

            expect(listenerCount(ee, 'test5')).toBe(3);

            ee.emit('test5', ...[ 'test', 0, {} ]);
            ee.emit('test5', ...[ 'test', 1, {} ]);
            ee.emit('test5', ...[ 'test', 3, {} ]);
            ee.emit('test5', ...[ 'test', 5, {} ]);
            ee.emit('test5', ...[ 'test', 7, {} ]);
            ee.emit('test5', ...[ 'test', 9, {} ]);

            return promise;
        });

        it('with options.filter', function() {
            const expectedError = null;
            let error: Error | string | null = null;
            const expectedArgs = [
                [ 'test', 1, {} ],
                [ 'test', 5, {} ],
                [ 'test', 9, {} ],
            ];
            const argsArray: any[] = [];

            const promise = Promise.all([
                once(ee, 'test5', {
                    filter(type, ...args) {
                        return args[1] === 9;
                    },
                })
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch((err: Error | string) => (
                        error = err
                    )),
                once(ee, 'test5', { filter: (type, ...args) => args[1] === 5 })
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch((err: Error | string) => (
                        error = err
                    )),
                once(ee, 'test5', { filter: (type, ...args) => args[1] === 1 })
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch((err: Error | string) => (
                        error = err
                    )),
            ]).then(() => {
                expect(error).toBe(expectedError);
                expect(argsArray).toEqual(expectedArgs);
                expect(ee.listenerCount('test5')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);
            });

            expect(listenerCount(ee, 'test5')).toBe(3);

            ee.emit('test5', ...[ 'test', 0, {} ]);
            ee.emit('test5', ...[ 'test', 1, {} ]);
            ee.emit('test5', ...[ 'test', 3, {} ]);
            ee.emit('test5', ...[ 'test', 5, {} ]);
            ee.emit('test5', ...[ 'test', 7, {} ]);
            ee.emit('test5', ...[ 'test', 9, {} ]);

            return promise;
        });

        it('with options.filter - this should be EventEmitter', async function() {
            let passedEventEmitter: typeof ee | null = null;

            setImmediate(() => {
                ee.emit('test-ee-this', 1, 2, 3);
            });

            const actualArgs = await once(ee, 'test-ee-this', {
                filter() {
                    // eslint-disable-next-line unicorn/no-this-assignment
                    passedEventEmitter = this;

                    return true;
                },
            });

            expect(passedEventEmitter).toBe(ee);
            expect(actualArgs).toEqual([ 1, 2, 3 ]);
            expect(ee.listenerCount('test-ee-this')).toBe(0);
            expect(ee.listenerCount('error')).toBe(0);
        });

        it('with options.filter and multi-names', function() {
            const expectedError = null;
            let error: Error | string | null = null;
            const expectedArgs = [
                [ 'test', 1, {} ],
                [ 'test', 5, {} ],
                [ 'test', 9, {} ],
            ];
            const argsArray: any[] = [];

            const promise = Promise.all([
                once(ee, [ 'test5-1', 'test5-2' ], { filter: (type, ...args) => args[1] === 9 })
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch((err: Error | string) => (
                        error = err
                    )),
                once(ee, [ 'test5-2', 'test5-1' ], { filter: (type, ...args) => args[1] === 5 })
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch((err: Error | string) => (
                        error = err
                    )),
                once(ee, [ 'test5-1', 'test5-2' ], { filter: (type, ...args) => args[1] === 1 })
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch((err: Error | string) => (
                        error = err
                    )),
            ]).then(() => {
                expect(error).toBe(expectedError);
                expect(argsArray).toEqual(expectedArgs);
                expect(ee.listenerCount('test5-1')).toBe(0);
                expect(ee.listenerCount('test5-2')).toBe(0);
            });

            expect(listenerCount(ee, 'test5-1')).toBe(3);
            expect(listenerCount(ee, 'test5-2')).toBe(3);

            ee.emit('test5-1', ...[ 'test', 0, {} ]);
            ee.emit('test5-2', ...[ 'test', 0, {} ]);
            ee.emit('test5-1', ...[ 'test', 1, {} ]);
            ee.emit('test5-2', ...[ 'test', 1, {} ]);
            ee.emit('test5-1', ...[ 'test', 3, {} ]);
            ee.emit('test5-2', ...[ 'test', 3, {} ]);
            ee.emit('test5-1', ...[ 'test', 5, {} ]);
            ee.emit('test5-2', ...[ 'test', 5, {} ]);
            ee.emit('test5-1', ...[ 'test', 7, {} ]);
            ee.emit('test5-2', ...[ 'test', 7, {} ]);
            ee.emit('test5-1', ...[ 'test', 9, {} ]);
            ee.emit('test5-2', ...[ 'test', 9, {} ]);

            return promise;
        });

        describe('abortable EventEmitterEx.once', function() {
            it('simple case', async function() {
                await EventEmitterEx.once(ee, 'myevent', {
                    signal: AbortSignal.abort(),
                }).then(() => {
                    throw new Error('test failed');
                }).catch(err => {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(err.code).toBe(ABORT_ERR);
                });
            });

            it('with AbortSignal', function() {
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac = new AbortController();

                const promise = once(ee, 'test6', { signal: ac.signal })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(counter).toBe(0);
                        expect_toBeDefined(error);
                        expect(error?.code).toBe(ABORT_ERR);
                        expect(error?.name).toBe('AbortError');
                        expect(ee.listenerCount('test6')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                        expect(listenerCount(ac.signal, 'abort')).toBe(0);
                    })
                ;

                expect(listenerCount(ac.signal, 'abort')).toBe(1);

                ac.abort();
                ee.emit('test6', ...[ 1, 2, 3 ]);

                return promise;
            });

            it('with AbortSignal (async/await)', async function() {
                let error1: DOMException|void = void 0;
                let error2: DOMException|void = void 0;
                let counter = 0;
                const ac1 = new AbortController();
                const ac2 = new NativeAbortController();

                setImmediate(() => {
                    ac1.abort();
                    ac2.abort();
                    ee.emit('test6', ...[ 1, 2, 3 ]);
                    ee.emit('test6', ...[ 1, 2, 3 ]);
                });

                try {
                    const promise = once(ee, 'test6', { signal: ac1.signal });

                    expect(listenerCount(ac1.signal, 'abort')).toBe(1);

                    await promise;

                    counter++;
                }
                catch (err) {
                    if (isTestError(err as DOMException)) {
                        throw err;
                    }

                    error1 = err as DOMException;
                }
                // at this line ac1 and ac2 already Aborted
                try {
                    await once(ee, 'test6', { signal: ac2.signal });

                    counter++;
                }
                catch (err) {
                    error2 = err as DOMException;
                }

                expect(counter).toBe(0);
                expect(error1).toBeDefined();
                expect(error2).toBeDefined();
                expect(error1?.code).toBe(ABORT_ERR);
                expect(error1?.name).toBe('AbortError');
                expect(error2?.code).toBe(ABORT_ERR);
                expect(error2?.name).toBe('AbortError');
                expect(ee.listenerCount('test6')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);
                expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                expect(listenerCount(ac2.signal, 'abort')).toBe(0);
            });

            it(`with AbortController's`, function() {
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac1 = new AbortController();
                const ac2 = new NativeAbortController();

                const promise = once(ee, 'test6', { abortControllers: [ ac1, ac2 ] })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(counter).toBe(0);
                        expect_toBeDefined(error);
                        expect(error?.code).toBe(ABORT_ERR);
                        expect(error?.name).toBe('AbortError');
                        expect(ee.listenerCount('test6')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                        expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                        expect(listenerCount(ac2.signal, 'abort')).toBe(0);
                    })
                ;

                expect(listenerCount(ac1.signal, 'abort')).toBe(1);
                expect(listenerCount(ac2.signal, 'abort')).toBe(1);

                ac1.abort();
                ee.emit('test6', ...[ 1, 2, 3 ]);

                return promise;
            });

            it(`with AbortController's - without abort()`, function() {
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac1 = new AbortController();
                const ac2 = new NativeAbortController();

                const promise = once(ee, 'test6', { abortControllers: [ ac1, ac2 ] })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(counter).toBe(1);
                        expect(error).toBeUndefined();
                        expect(ee.listenerCount('test6')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                        expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                        expect(listenerCount(ac2.signal, 'abort')).toBe(0);
                    })
                ;

                expect(listenerCount(ac1.signal, 'abort')).toBe(1);
                expect(listenerCount(ac2.signal, 'abort')).toBe(1);

                ee.emit('test6', ...[ 1, 2, 3 ]);

                return promise;
            });

            it(`with AbortController's (async/await)`, async function() {
                let error1: DOMException|void = void 0;
                let error2: DOMException|void = void 0;
                let counter = 0;
                const ac1 = new AbortController();
                const ac2 = new NativeAbortController();
                const acg = new AbortControllersGroup([ ac1, ac2 ]);

                setImmediate(() => {
                    ac1.abort();
                    ac2.abort();
                    ee.emit('test6', ...[ 1, 2, 3 ]);
                    ee.emit('test6', ...[ 1, 2, 3 ]);
                });

                try {
                    const promise = once(ee, 'test6', { abortControllers: [ acg ] });

                    expect(listenerCount(acg.signal, 'abort')).not.toBe(0);
                    expect(listenerCount(ac1.signal, 'abort')).toBe(1);
                    expect(listenerCount(ac2.signal, 'abort')).toBe(1);

                    await promise;

                    counter++;
                }
                catch (err) {
                    if (isTestError(err as DOMException)) {
                        throw err;
                    }

                    error1 = err as DOMException;
                }
                // at this line ac1 and ac2 already Aborted
                try {
                    await once(ee, 'test6', { abortControllers: [ ac1, ac2 ] });

                    counter++;
                }
                catch (err) {
                    if (isTestError(err as DOMException)) {
                        throw err;
                    }

                    error2 = err as DOMException;
                }

                acg.close();

                expect(counter).toBe(0);
                expect(error1).toBeDefined();
                expect(error2).toBeDefined();
                expect(error1?.code).toBe(ABORT_ERR);
                expect(error1?.name).toBe('AbortError');
                expect(error2?.code).toBe(ABORT_ERR);
                expect(error2?.name).toBe('AbortError');
                expect(ee.listenerCount('test6')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);
                expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                expect(listenerCount(ac2.signal, 'abort')).toBe(0);
                expect(listenerCount(acg.signal, 'abort')).toBe(0);
            });

            it(`with AbortController's (async/await) - without abort()`, async function() {
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac1 = new AbortController();
                const ac2 = new NativeAbortController();
                const acg = new AbortControllersGroup([ ac1, ac2 ]);

                setImmediate(() => {
                    ee.emit('test6', ...[ 1, 2, 3 ]);
                });

                try {
                    const promise = Promise.all([
                        once(ee, 'test6', { abortControllers: [ acg ] }),
                        once(ee, 'test6', { abortControllers: [ ac1, ac2 ] }),
                    ]);

                    expect(listenerCount(acg.signal, 'abort')).not.toBe(0);
                    expect(listenerCount(ac1.signal, 'abort')).toBe(2);
                    expect(listenerCount(ac2.signal, 'abort')).toBe(2);

                    await promise;

                    counter++;
                }
                catch (err) {
                    if (isTestError(err as DOMException)) {
                        throw err;
                    }

                    error = err as DOMException;
                }

                acg.close();

                expect(counter).toBe(1);
                expect(error).toBeUndefined();
                expect(ee.listenerCount('test6')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);
                expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                expect(listenerCount(ac2.signal, 'abort')).toBe(0);
                expect(listenerCount(acg.signal, 'abort')).toBe(0);
            });

            it(`with AbortSignal and AbortController's`, async function() {
                const promises: Promise<any>[] = [];

                {
                    let error: DOMException|void = void 0;
                    const ac1 = new AbortController();
                    const ac2 = new AbortController();
                    const ac3 = new AbortController();

                    // eslint-disable-next-line jest/valid-expect-in-promise
                    const promise = once(ee, 'test6', { abortControllers: [ ac1, ac2 ], signal: ac3.signal })
                        .catch(err => {
                            error = err;
                        })
                        .then(() => {
                            expect_toBeDefined(error);
                            expect(error?.code).toBe(ABORT_ERR);
                            expect(error?.name).toBe('AbortError');
                            expect(ee.listenerCount('test6')).toBe(0);
                            expect(ee.listenerCount('error')).toBe(0);
                            expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                            expect(listenerCount(ac2.signal, 'abort')).toBe(0);
                            expect(listenerCount(ac3.signal, 'abort')).toBe(0);
                        })
                    ;

                    promises.push(promise);

                    expect(listenerCount(ac1.signal, 'abort')).toBe(1);
                    expect(listenerCount(ac2.signal, 'abort')).toBe(1);
                    expect(listenerCount(ac3.signal, 'abort')).toBe(1);

                    ac3.abort();
                }
                {
                    let error: DOMException|void = void 0;
                    const ac1 = new AbortController();
                    const ac2 = new AbortController();
                    const ac3 = new AbortController();

                    // eslint-disable-next-line jest/valid-expect-in-promise
                    const promise = once(ee, 'test6', { abortControllers: [ ac1, ac2 ], signal: ac3.signal })
                        .catch(err => {
                            error = err;
                        })
                        .then(() => {
                            expect_toBeDefined(error);
                            expect(error?.code).toBe(ABORT_ERR);
                            expect(error?.name).toBe('AbortError');
                            expect(ee.listenerCount('test6')).toBe(0);
                            expect(ee.listenerCount('error')).toBe(0);
                            expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                            expect(listenerCount(ac2.signal, 'abort')).toBe(0);
                            expect(listenerCount(ac3.signal, 'abort')).toBe(0);
                        })
                    ;

                    promises.push(promise);

                    expect(listenerCount(ac1.signal, 'abort')).toBe(1);
                    expect(listenerCount(ac2.signal, 'abort')).toBe(1);
                    expect(listenerCount(ac3.signal, 'abort')).toBe(1);

                    ac1.abort();
                }

                await Promise.all(promises);
            });

            it('with AbortSignal and ServerTiming', function() {
                const st = new ServerTiming();
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac = new AbortController();

                const promise = once(ee, 'test10', { signal: ac.signal, timing: st })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(st).toHaveLength(1);
                        expect(counter).toBe(0);
                        expect_toBeDefined(error);
                        expect(error?.code).toBe(ABORT_ERR);
                        expect(error?.name).toBe('AbortError');
                        expect(ee.listenerCount('test10')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                        expect(listenerCount(ac.signal, 'abort')).toBe(0);
                    })
                ;

                expect(listenerCount(ac.signal, 'abort')).toBe(1);

                ac.abort();
                ee.emit('test10', ...[ 1, 2, 3 ]);

                return promise;
            });

            it('with AbortSignal and ServerTiming and multi-names', function() {
                const st = new ServerTiming();
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac = new AbortController();

                const promise = once(ee, [ 'test10', 'test11', 'test12' ], { signal: ac.signal, timing: st })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(st).toHaveLength(0);
                        expect(counter).toBe(0);
                        expect_toBeDefined(error);
                        expect(error?.code).toBe(ABORT_ERR);
                        expect(error?.name).toBe('AbortError');
                        expect(ee.listenerCount('test10')).toBe(0);
                        expect(ee.listenerCount('test11')).toBe(0);
                        expect(ee.listenerCount('test12')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                        expect(listenerCount(ac.signal, 'abort')).toBe(0);
                    })
                ;

                expect(listenerCount(ac.signal, 'abort')).toBe(1);

                ac.abort();
                ee.emit('test11', ...[ 1, 2, 3 ]);

                return promise;
            });
        });

        describe('with timeout', function() {
            beforeAll(() => {
                useFakeTimers();
            });

            afterAll(() => {
                useRealTimers();
            });

            // https://stackoverflow.com/a/60438234
            // do not using it.skip to avoid marking tests as "skipped" after running
            const itif = (condition: boolean) => condition ? it : () => {}/*it.skip*/;

            it('simple', async function() {
                let error: DOMException|void = void 0;
                let counter = 0;

                const promise = once(ee, 'test7', {
                    timeout: 10,
                })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(counter).toBe(0);
                        expect_toBeDefined(error);
                        expect(error?.name).toBe('TimeoutError');
                        expect(ee.listenerCount('test7')).toBe(0);

                        clearTimeout(timeout);
                    })
                ;

                const timeout = setTimeout(() => {
                    ee.emit('test7', ...[ 1, 2, 3 ]);
                }, 100);

                advanceTimersByTime(TIME.SECONDS);

                await promise;
            });

            it('check error message #1.1', function() {
                let error: DOMException|void = void 0;

                queueMicrotask(() => {
                    advanceTimersByTime(TIME.SECONDS);
                });

                return once(ee, 1, {
                    timeout: 1,
                })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect_toBeDefined(error);
                        expect(error?.name).toBe('TimeoutError');
                        expect(error?.message).toContain(' [1] ');
                        expect(ee.listenerCount('timeout-message')).toBe(0);
                    })
                ;
            });

            it('check error message #1.2', function() {
                let error: DOMException|void = void 0;

                queueMicrotask(() => {
                    advanceTimersByTime(TIME.SECONDS);
                });

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                return once(ee, 0n, {
                    timeout: 1,
                })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect_toBeDefined(error);
                        expect(error?.name).toBe('TimeoutError');
                        expect(error?.message).toContain(' ["0n"] ');
                        expect(ee.listenerCount('timeout-message')).toBe(0);
                    })
                ;
            });

            it('check error message #1.3', function() {
                let error: DOMException|void = void 0;

                queueMicrotask(() => {
                    advanceTimersByTime(TIME.SECONDS);
                });

                return once(ee, 0, {
                    timeout: 1,
                })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect_toBeDefined(error);
                        expect(error?.name).toBe('TimeoutError');
                        expect(error?.message).toContain(' [0] ');
                        expect(ee.listenerCount('timeout-message')).toBe(0);
                    })
                ;
            });

            // Symbol is not allowed as `once` second argument if `once` first argument is EventTarget
            itif(!isEventTarget)('check error message #1.4', function() {
                let error: DOMException|void = void 0;

                queueMicrotask(() => {
                    advanceTimersByTime(TIME.SECONDS);
                });

                return once(ee, Symbol('timeout-message'), {
                    timeout: 1,
                })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect_toBeDefined(error);
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect(error?.name).toBe('TimeoutError');
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect(error?.message).toContain(' ["Symbol(timeout-message)"] ');
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect(ee.listenerCount('timeout-message')).toBe(0);
                    })
                ;
            });

            // Symbol is not allowed as `once` second argument if `once` first argument is EventTarget
            itif(!isEventTarget)('check error message #2', function() {
                let error: DOMException|void = void 0;

                queueMicrotask(() => {
                    advanceTimersByTime(TIME.SECONDS);
                });

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                return once(ee, [ 'timeout-message1', 2, Symbol('timeout-message3'), 0n ], {
                    timeout: 1,
                })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect_toBeDefined(error);
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect(error?.name).toBe('TimeoutError');
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect(error?.message).toContain(' ["timeout-message1",2,"Symbol(timeout-message3)","0n"] ');
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect(ee.listenerCount('timeout-message')).toBe(0);
                    })
                ;
            });

            it('check error message #3', function() {
                let error: DOMException|void = void 0;

                queueMicrotask(() => {
                    advanceTimersByTime(TIME.SECONDS);
                });

                return once(ee, 'timeout-message', {
                    errorEventName: 'timeout-message-error',
                    timeout: 1,
                })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect_toBeDefined(error);
                        expect(error?.name).toBe('TimeoutError');
                        expect(error?.message).toContain(' ["timeout-message","timeout-message-error"] ');
                        expect(ee.listenerCount('timeout-message')).toBe(0);
                    })
                ;
            });

            // Symbol is not allowed as `once` second argument if `once` first argument is EventTarget
            itif(!isEventTarget)('check error message #4', function() {
                let error: DOMException|void = void 0;

                queueMicrotask(() => {
                    advanceTimersByTime(TIME.SECONDS);
                });

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                return once(ee, [ 'timeout-message1', 2, Symbol('timeout-message3'), 4n ], {
                    errorEventName: Symbol('timeout-message-error'),
                    timeout: 1,
                })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect_toBeDefined(error);
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect(error?.name).toBe('TimeoutError');
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect(error?.message).toContain(' ["timeout-message1",2,"Symbol(timeout-message3)","4n","Symbol(timeout-message-error)"] ');
                        // eslint-disable-next-line jest/no-standalone-expect
                        expect(ee.listenerCount('timeout-message')).toBe(0);
                    })
                ;
            });
        });

        it('with ServerTiming (async/await)', async function() {
            const ee = new EventEmitter();
            const err = new Error('test');

            compatibleEventEmitter_from_EventTarget(ee);

            {
                const st = new ServerTiming();

                setImmediate(() => {
                    ee.emit('test8', 1);
                });

                await once(ee, 'test8', {
                    timing: st,
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                });

                expect(st).toHaveLength(1);
                expect(ee.listenerCount('test8')).toBe(0);
            }
            {
                const st = new ServerTiming();

                setImmediate(() => {
                    ee.emit('error', err);
                });

                try {
                    await once(ee, 'test8', {
                        timing: st,
                        // EventTarget does not have `error` event semantics like Node
                        errorEventName: isEventTarget ? 'error' : void 0,
                    });
                }
                catch {
                    //
                }

                expect(st).toHaveLength(1);
                expect(ee.listenerCount('test8')).toBe(0);
            }
        });

        it('with ServerTiming and few events (async/await)', async function() {
            const ee = new EventEmitter();
            const st = new ServerTiming();
            let error: Error|void = void 0;

            compatibleEventEmitter_from_EventTarget(ee);

            setImmediate(() => {
                ee.emit('test9-1', 1);
                ee.emit('test9-2', 2);
                ee.emit('error', new Error('test'));
            });

            await Promise.all([
                once(ee, 'test9-1', {
                    timing: st,
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                }),
                once(ee, 'test9-2', {
                    timing: st,
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                }),
                once(ee, 'test9-3', {
                    timing: st,
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                }).catch(err => {
                    error = err;
                }),
            ]);

            expect(st).toHaveLength(3);
            expect(st.getTimings().map(a => a.description)).toEqual([ 'test9-1', 'test9-2', 'test9-3' ]);
            expect(error).toBeDefined();
            expect(ee.listenerCount('test9-1')).toBe(0);
            expect(ee.listenerCount('test9-2')).toBe(0);
            expect(ee.listenerCount('error')).toBe(0);
        });
    });

    // tags: EventEmitter.on, EventEmitterEx.on, static on
    describe('events.on', function() {// more tests in test file for cftools/modules/EventEmitterEx/eventsAsyncIterator.ts
        it('simple case', async function() {
            const emitter = new EventEmitterEx();
            const values: string[] = [];

            setImmediate(() => {
                emitter.emit('-invalid-', '-invalid-test1');
                emitter.emit('value', 'test1');
                emitter.emit('value', 'test2');
                emitter.emit('value', 'test3');
                emitter.emit('value', '-invalid-test2');
            });

            for await (const [ value ] of EventEmitterEx.on(emitter, 'value')) {
                values.push(value as string);

                if (values.length > 2) {
                    break;
                }
            }

            expect(values).toEqual([
                'test1',
                'test2',
                'test3',
            ]);
        });

        it('aborted by AbortSignal', async function() {
            const emitter = new EventEmitterEx();
            const ac = new AbortController();
            const values: string[] = [];

            setImmediate(() => {
                emitter.emit('-invalid-', '-invalid-test1');
                emitter.emit('value', 'test1');
                emitter.emit('value', 'test2');
                emitter.emit('value', 'test3');

                ac.abort();

                emitter.emit('value', '-invalid-test2');
            });

            try {
                for await (const [ value ] of EventEmitterEx.on(emitter, 'value', {
                    signal: ac.signal,
                })) {
                    values.push(value as string);
                }
            }
            catch {
                // ignore
            }

            expect(values).toEqual([
                'test1',
                'test2',
                'test3',
            ]);
        });

        it('stop by stopEventName', async function() {
            const emitter = new EventEmitterEx();
            const stopEventName = Symbol('stop-iterator');
            const values: string[] = [];

            setImmediate(() => {
                emitter.emit('-invalid-', '-invalid-test1');
                emitter.emit('value', 'test1');
                emitter.emit('value', 'test2');
                emitter.emit('value', 'test3');

                emitter.emit(stopEventName);

                emitter.emit('value', '-invalid-test2');
            });

            for await (const [ value ] of EventEmitterEx.on(emitter, 'value', {
                stopEventName,
            })) {
                values.push(value as string);
            }

            expect(values).toEqual([
                'test1',
                'test2',
                'test3',
            ]);
        });
    });

    describe('TypeScript tests', function() {
        it('types', function() {
            const ee = new EventEmitterEx<{
                'test1': (a: string, ...args: number[]) => void,
                'test2': (name: EventName, listener: Listener, a: string, b: number) => void,
            }>();

            {// default listeners
                ee.on('removeListener', (name, lister) => {
                    expect(typeof name).toBe('string');
                    expect(typeof lister).toBe('function');
                });
                ee.on('newListener', (name, lister) => {
                    expect([ 'string', 'number', 'symbol' ]).toContain(typeof name);
                    expect(typeof lister).toBe('function');
                });
                ee.on('error', (error) => {
                    expect((error as unknown) instanceof Error).toBe(true);
                });
                /*
                ee.on(EventEmitterEx.errorMonitor, (error) => {
                    expect(error instanceof Error).toBe(true);
                });
                */
            }

            // TypeScript should emit this type for listener: `(a: string, n1: number, n2: number, n3: number) => void`
            ee.on('test1', (a, n1, n2, n3) => {
                expect(typeof a).toBe('string');
                expect(typeof n1).toBe('number');
                expect(typeof n2).toBe('number');
                expect(typeof n3).toBe('number');
            });

            // TypeScript should emit this type for listener: `(eventName: EventName, listener: Listener, a: string, b: number) => void`
            ee.on('test2', (eventName, listener, a, b) => {
                expect(typeof eventName).toBe('string');
                expect(typeof listener).toBe('function');
                expect(typeof a).toBe('string');
                expect(typeof b).toBe('number');
            });

            // TypeScript should emit this names and types for arguments: `name: EventName, listener: Listener, a: string, b: number`
            ee.emit('test2', 'test', () => {}, 'test', 123);
        });
    });

    describe('type Guards', function() {
        it('isEventTargetCompatible', function() {
            {
                expect(isEventTargetCompatible({
                    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
                        console.info(type, callback, options);
                    },
                    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
                        console.info(type, callback, options);
                    },
                    dispatchEvent(event: Event): boolean {
                        console.info(event);

                        return false;
                    },
                } as EventTarget)).toBe(true);
            }
            {
                expect(isEventTargetCompatible({
                    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
                        console.info(type, callback, options);
                    },
                    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
                        console.info(type, callback, options);
                    },
                })).toBe(false);
            }
        });

        it('isEventEmitterCompatible', function() {
            const eventEmitterCompatible = {
                on(eventName: string | symbol, listener: (...args: any[]) => void) {
                    console.info(eventName, listener);

                    return this;
                },
                once(eventName: string | symbol, listener: (...args: any[]) => void) {
                    console.info(eventName, listener);

                    return this;
                },
                prependListener(eventName: string | symbol, listener: (...args: any[]) => void) {
                    console.info(eventName, listener);

                    return this;
                },
                removeListener(eventName: string | symbol, listener: (...args: any[]) => void) {
                    console.info(eventName, listener);

                    return this;
                },
                addListener(eventName: string | symbol, listener: (...args: any[]) => void) {
                    console.info(eventName, listener);

                    return this;
                },
                prependOnceListener(eventName: string | symbol, listener: (...args: any[]) => void) {
                    console.info(eventName, listener);

                    return this;
                },
                emit(eventName: string | symbol, ...args): boolean {
                    console.info(eventName, args);

                    return false;
                },
            } as NodeJS.EventEmitter;

            {
                expect(isEventEmitterCompatible(eventEmitterCompatible)).toBe(true);
            }
            {
                const not_eventEmitterCompatible = { ...eventEmitterCompatible };

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                delete not_eventEmitterCompatible.emit;

                expect(isEventEmitterCompatible(not_eventEmitterCompatible)).toBe(false);
            }
        });

        it('isEventEmitterEx from this context', function() {
            const eventEmitterEx = new EventEmitterEx();

            expect(isEventEmitterEx(eventEmitterEx)).toBe(true);

            const eventEmitterSimpleProxy = new EventEmitterSimpleProxy({ emitter: eventEmitterEx });

            expect(isEventEmitterEx(eventEmitterSimpleProxy)).toBe(true);

            const eventEmitterProxy = new EventEmitterProxy({ targetEmitter: eventEmitterEx });

            expect(isEventEmitterEx(eventEmitterProxy)).toBe(true);
        });

        it('isEventEmitterEx from another context', function() {
            // eslint-disable-next-line unicorn/no-console-spaces
            // console.info(' ---- ', require.resolve('../../modules/events'));
            const contextObject = {
                events_module_path: require.resolve('../../modules/events'),
                __filename,
                currentRequire: require,
                EventEmitterEx: void 0 as typeof EventEmitterEx | undefined,
            };

            // Нужно это вызвать, чтобы require который создасться функцией createRequire, не залезал в кеш уже
            //  выполненных модулей.
            jest.resetModules();

            // language=js
            runInNewContext(`
            const require = currentRequire('node:module').createRequire(__filename);
            const { EventEmitterEx } = require(globalThis.events_module_path);
            globalThis.EventEmitterEx = EventEmitterEx;
            `, contextObject);

            expect(contextObject.EventEmitterEx).toBeDefined();
            expect(contextObject.EventEmitterEx).not.toBe(EventEmitterEx);

            const eeex = new contextObject.EventEmitterEx!();

            expect(isEventEmitterCompatible(eeex)).toBe(true);
            expect(isEventEmitterEx(eeex)).toBe(true);
        });
    });
});

function expect_toBeDefined<T>(argument: T): asserts argument is NonNullable<T> {
    expect(argument).toBeDefined();
    // if (argument == null)  throw new Error("argument is null");
}
/*
function expect_not_toBeDefined<T>(argument: unknown): asserts argument is undefined | null {
    expect(argument).toBeUndefined();
    //if (argument == null)  throw new Error("argument is not null");
}
*/
