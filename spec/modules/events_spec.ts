// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
/* globals describe, xdescribe, it, xit, expect */
'use strict';

import 'jest-extended';

require('termi@polyfills');

const NativeAbortController = AbortController;

// also check AbortController polyfill
{
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete globalThis["AbortController"];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete globalThis["AbortSignal"];
}

import EmptyFunction = jest.EmptyFunction;
import {
    EventEmitter as NodeEventEmitter,
} from 'events';
import events, {
    EventEmitterEx,
    EventName,
    isEventEmitterCompatible,
    isEventTargetCompatible,
    Listener,
} from '../../modules/events';
import ServerTiming from 'termi@ServerTiming';
import {AbortControllersGroup} from 'termi@abortable';

const {
    compatibleEventEmitter_from_EventTarget,
    compatibleOnce_for_EventTarget,
    listenerCount,
    createDomEventLike,
} = require('../../spec_utils/EventTarget_helpers');

// The EventTarget comes from polyfill node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js
const NodeEventTarget = EventTarget;

let {EventEmitter} = events;
const {errorMonitor} = events;

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

        describe('constructor', function () {
            it('instanceof', function () {
                expect(new EventEmitterEx()).toBeInstanceOf(EventEmitterEx);
                expect(new EventEmitter()).toBeInstanceOf(EventEmitter);
                expect(new events()).toBeInstanceOf(events);
            });
        });

        describe('events is an alias for EventEmitter', function () {
            it('instanceof', function () {
                expect(new EventEmitter()).toBeInstanceOf(events);
            });
        });

        describe('EventEmitterEx is an alias for EventEmitter', function () {
            it('instanceof', function () {
                expect(new EventEmitter()).toBeInstanceOf(EventEmitterEx);
            });
        });

        describe('#on/#addListener + #once + #prependListener + #prependOnceListener', function () {
            it('should returns this', function () {
                const ee = new EventEmitter();

                expect(ee.on('foo', () => {})).toBe(ee);
                expect(ee.addListener('foo', () => {})).toBe(ee);
                expect(ee.once('foo', () => {})).toBe(ee);
                expect(ee.prependListener('foo', () => {})).toBe(ee);
                expect(ee.prependOnceListener('foo', () => {})).toBe(ee);
            });

            // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-add-listeners.js
            it('should call "newListener" for each new listeners', function () {
                let counter = 0;
                const listener1 = jest.fn(() => { counter++; });
                const listener2 = jest.fn(() => { counter += 2; });
                const events_newListener_emitted: (string|number|symbol)[] = [];
                const listeners_newListener_emitted: Function[] = [];

                ee.on('newListener', function(event, listener) {
                    // Don't track newListener listeners.
                    if (event === 'newListener') {
                        return;
                    }

                    events_newListener_emitted.push(event);
                    listeners_newListener_emitted.push(listener);
                });

                const onceNewListener = jest.fn(function(name, listener) {
                    {// additional tests
                        expect(name).toBe('hello_on');
                        expect(listener).toBe(listener1);

                        // 'newListener' should call be before `listener` is added in known listeners list
                        expect(this.listenerCount(name)).toBe(0);
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

                    expect(onceNewListener).toHaveBeenCalled();
                    expect(onceNewListener.mock.calls).toEqual([['hello_on', listener1]]);

                    expect(listener1).toHaveBeenCalled();
                    expect(listener1.mock.calls).toEqual([['a', 'b'], [1, 2], [sTest1, sTest2]]);
                    expect(listener2).toHaveBeenCalled();
                    expect(listener2.mock.calls).toEqual([[1], [2]]);

                    expect(events_newListener_emitted).toEqual(['hello_on', 'hello_addListener', 'hello_once', 'hello_prepend', 'hello_prependOnce']);
                    expect(listeners_newListener_emitted).toEqual([listener1, listener1, listener2, listener1, listener2]);
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

            it('"newListener" event with multiply listeners', function () {
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
                    expect(ee.listeners(eventName)).toEqual([listener, listener, listener, listener, listener]);
                }

                {// logic #2
                    ee.emit(eventName);
                }

                {// main tests #3
                    expect(counter).toBe(5);

                    expect(newListener).toHaveBeenCalled();
                    expect(newListener.mock.calls).toEqual([[eventName, listener], [eventName, listener], [eventName, listener], [eventName, listener], [eventName, listener]]);
                }

                {// cleanup
                    ee.removeListener('newListener', newListener);
                    expect(ee.listenerCount('newListener')).toBe(0);

                    ee.removeAllListeners(eventName);
                    expect(ee.listenerCount(eventName)).toBe(0);
                }
            });
        });

        describe('#removeListener/#off', function () {
            it('should returns this', function () {
                const ee = new EventEmitter();

                expect(ee.removeListener('foo', () => {})).toBe(ee);
                expect(ee.off('foo', () => {})).toBe(ee);
            });

            // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-remove-listeners.js
            it('should call "removeListener" for each removed listeners', function () {
                let counter = 0;
                const listener1 =() => { counter++; };
                const listener2 = () => { counter += 2; };
                const events_removeListener_emitted: (string|number|symbol)[] = [];
                const listeners_removeListener_emitted: Function[] = [];

                ee.on('removeListener', function(event, listener) {
                    // Don't track newListener listeners.
                    if (event === 'removeListener') {
                        return;
                    }

                    events_removeListener_emitted.push(event);
                    listeners_removeListener_emitted.push(listener);
                });

                const onceRemoveListener = jest.fn(function(name, listener) {
                    {// additional tests
                        expect(name).toBe('hello_on');
                        expect(listener).toBe(listener1);

                        // 'removeListener' should call after `listener` is removed from known listeners list
                        expect(this.listenerCount(name)).toBe(0);
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

                    expect(onceRemoveListener).toHaveBeenCalled();
                    expect(onceRemoveListener.mock.calls).toEqual([['hello_on', listener1]]);

                    expect(events_removeListener_emitted).toEqual(['hello_on', 'hello_addListener', 'hello_once']);
                    expect(listeners_removeListener_emitted).toEqual([listener1, listener1, listener2]);
                }

                {// finale check
                    ee.removeAllListeners('removeListener');
                    expect(ee.listenerCount('removeListener')).toBe(0);

                    expect(ee.listenerCount('hello_on')).toBe(0);
                    expect(ee.listenerCount('hello_addListener')).toBe(0);
                    expect(ee.listenerCount('hello_once')).toBe(0);
                }
            });

            it('"removeListener" event with multiply listeners', function () {
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
                    expect(ee.listeners(eventName)).toEqual([listener, listener, listener, listener, listener]);
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
                    expect(onceRemoveListener).toHaveBeenCalled();
                    expect(onceRemoveListener.mock.calls).toEqual([[eventName, listener], [eventName, listener], [eventName, listener], [eventName, listener], [eventName, listener]]);
                }

                {// cleanup
                    ee.removeListener('removeListener', onceRemoveListener);
                    expect(ee.listenerCount('removeListener')).toBe(0);

                    ee.removeAllListeners(eventName);
                    expect(ee.listenerCount(eventName)).toBe(0);
                }
            });

            it('call removeListener() in "removeListener" event', function () {
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

                    expect(onceRemoveListener).toHaveBeenCalled();
                    expect(onceRemoveListener.mock.calls).toEqual([[eventName, listener1]]);
                }

                {// finale check
                    expect(ee.listenerCount('removeListener')).toBe(0);
                    expect(ee.listenerCount(eventName)).toBe(0);
                }
            });

            it('call removeListener() in handler', function () {
                let counter = 0;
                const eventName = 'test12345';
                const listener1 = jest.fn(function (this: EventEmitterEx) {
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

                    expect(listener1).toHaveBeenCalled();
                }

                {// cleanup
                    ee.removeListener(eventName, listener1);
                    expect(ee.listenerCount(eventName)).toBe(0);
                }
            });
        });

        describe('[#on + #removeListener] logic', function () {
            it('should call listener multiple times', function () {
                let counter = 0;
                const listener = () => { counter++; };

                ee.on('test', listener);
                ee.emit('test');
                ee.emit('test');

                expect(counter).toBe(2);

                ee.removeListener('test', listener);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('should call listener multiple times for multiple listeners', function () {
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

            it('should not call listener after removeListener', function () {
                let counter = 0;
                const listener = () => { counter++ };

                ee.on('test', listener);
                ee.emit('test');
                ee.removeListener('test', listener);
                ee.emit('test');

                expect(counter).toBe(1);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('should not call listener after removeListener multiple times for multiple listeners', function () {
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

            it('event name as symbol', function () {
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

            it('event name as number', function () {
                // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-symbols.js
                const eventNameNumber = 123456789;
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

        describe('[#on + #removeListener] logic - use same listener multiple times', function () {
            it('should call listener multiple times', function () {
                let counter = 0;
                const listener = () => { counter++ };

                ee.on('test', listener);
                ee.on('test', listener);
                ee.emit('test');
                ee.emit('test');

                expect(counter).toBe(4);

                ee.removeListener('test', listener);
                ee.removeListener('test', listener);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('#removeListener should remove only one copy of listener', function () {
                let counter = 0;
                const listener = () => { counter++ };

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

            it('should call listener multiple times for multiple listeners', function () {
                let counter1 = 0;
                let counter2 = 0;
                let counter3 = 0;
                const listener1 = () => { counter1++ };
                const listener2 = () => { counter2++ };
                const listener3 = () => { counter3++ };

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

            it('removeListener should remove only first matched listener', function () {
                let counter = 0;
                const listener = () => { counter++ };

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

            it('removeListener should remove only first matched listener for multiple listeners', function () {
                let counter1 = 0;
                let counter2 = 0;
                let counter3 = 0;
                const listener1 = () => { counter1++ };
                const listener2 = () => { counter2++ };
                const listener3 = () => { counter3++ };

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

        describe('[#on + #removeListener] logic - use same listener multiple times - with listenerOncePerEventType=true', function () {
            const ee = new EventEmitter({ listenerOncePerEventType: true });

            it('should call listener multiple times', function () {
                let counter = 0;
                const listener = () => { counter++ };

                ee.on('test', listener);
                ee.on('test', listener);
                ee.emit('test');
                ee.emit('test');

                expect(counter).toBe(2);

                ee.removeListener('test', listener);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('should call listener multiple times for multiple listeners', function () {
                let counter1 = 0;
                let counter2 = 0;
                let counter3 = 0;
                const listener1 = () => { counter1++ };
                const listener2 = () => { counter2++ };
                const listener3 = () => { counter3++ };

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

            it('should not call listener after removeListener', function () {
                let counter = 0;
                const listener = () => { counter++ };

                ee.on('test', listener);
                ee.on('test', listener);
                ee.emit('test');
                ee.removeListener('test', listener);
                ee.emit('test');
                ee.emit('test');

                expect(counter).toBe(1);
                expect(ee.listenerCount('test')).toBe(0);
            });

            it('should not call listener after removeListener multiple times for multiple listeners', function () {
                let counter1 = 0;
                let counter2 = 0;
                let counter3 = 0;
                const listener1 = () => { counter1++ };
                const listener2 = () => { counter2++ };
                const listener3 = () => { counter3++ };

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

                expect(counter1).toBe(1);
                expect(counter2).toBe(2);
                expect(counter3).toBe(3);
                expect(ee.listenerCount('test1')).toBe(0);
                expect(ee.listenerCount('test2')).toBe(0);
                expect(ee.listenerCount('test3')).toBe(0);
            });
        });

        describe('#emit', function () {
            describe('simple case', function () {
                it('single listener', function () {
                    let counter = 0;
                    const listener = () => { counter++; };

                    ee.on('test', listener);
                    ee.emit('test');
                    ee.emit('test');

                    expect(counter).toBe(2);

                    ee.removeListener('test', listener);
                    expect(ee.listenerCount('test')).toBe(0);
                });

                it('multiply listeners', function () {
                    let counter = 0;
                    const listener = () => { counter++; };

                    ee.on('test', listener);
                    ee.on('test', listener);
                    ee.on('test', listener);
                    ee.emit('test');
                    ee.emit('test');

                    expect(counter).toBe(6);

                    ee.removeAllListeners('test');
                    expect(ee.listenerCount('test')).toBe(0);
                });
            });

            describe('should not call handler added in current called handler', function () {
                it('single listener', function () {
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

                    expect(counter1).toBe(1);
                    expect(counter2).toBe(0);
                    expect(counter3).toBe(0);

                    ee.removeListener('test', listener1);
                    ee.removeListener('test', listener2);
                    ee.removeListener('test', listener3);
                    expect(ee.listenerCount('test')).toBe(0);
                });

                it('multiply listeners', function () {
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

                    expect(counter1).toBe(3);
                    expect(counter2).toBe(0);
                    expect(counter3).toBe(0);

                    ee.removeAllListeners('test');
                    expect(ee.listenerCount('test')).toBe(0);
                });
            });

            describe('should call handler removed in current called handler', function () {
                it('single listener', function () {
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

                    expect(counter1).toBe(1);
                    expect(counter2).toBe(1);
                    expect(counter3).toBe(1);

                    ee.removeListener('test', listener1);
                    expect(ee.listenerCount('test')).toBe(0);
                });

                it('multiply listeners', function () {
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

                    expect(counter1).toBe(3);
                    expect(counter2).toBe(2);
                    expect(counter3).toBe(2);

                    ee.removeAllListeners('test');
                    expect(ee.listenerCount('test')).toBe(0);
                });
            });

            describe('arguments length test', function () {
                const ee = new EventEmitterEx<{
                    'test-args0': () => void,
                    'test-args1': (a: number) => void,
                    'test-args2': (a: number, b: string) => void,
                    'test-args3': (a: number, b: string, c: symbol) => void,
                    'test-args9': (n1: 1, n2: 2, n3: 3, n4: 4, n5: 5, n6: 6, n7: 7, n8: 8, n9: 9) => void,
                    'test-argsN': (...args: string[]) => void,
                }>();

                it('args.length = 0', function () {
                    const listener = jest.fn(function(this: EventEmitterEx, ...args) {
                        expect(this).toBe(ee);
                        expect(args.length).toBe(0);
                    });

                    ee.on('test-args0', listener);
                    // test#1 with single listener
                    ee.emit('test-args0');
                    ee.on('test-args0', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-args0');

                    expect(listener).toHaveBeenCalled();
                    expect(listener.mock.calls.length).toEqual(3);

                    {// cleanup
                        ee.removeAllListeners('test-args0');
                        expect(ee.listenerCount('test-args0')).toBe(0);
                    }
                });

                it('args.length = 1', function () {
                    const listener = jest.fn(function(this: EventEmitterEx, a) {
                        expect(this).toBe(ee);
                        expect(a).toBe(9);
                        expect(arguments.length).toBe(1);
                    });

                    ee.on('test-args1', listener);
                    // test#1 with single listener
                    ee.emit('test-args1', 9);
                    ee.on('test-args1', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-args1', 9);

                    expect(listener).toHaveBeenCalled();
                    expect(listener.mock.calls.length).toEqual(3);

                    {// cleanup
                        ee.removeAllListeners('test-args1');
                        expect(ee.listenerCount('test-args1')).toBe(0);
                    }
                });

                it('args.length = 2', function () {
                    const listener = jest.fn(function(this: EventEmitterEx, a, b) {
                        expect(this).toBe(ee);
                        expect(a).toBe(8);
                        expect(b).toBe('b2');
                        expect(arguments.length).toBe(2);
                    });

                    ee.on('test-args2', listener);
                    // test#1 with single listener
                    ee.emit('test-args2', 8, 'b2');
                    ee.on('test-args2', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-args2', 8, 'b2');

                    expect(listener).toHaveBeenCalled();
                    expect(listener.mock.calls.length).toEqual(3);

                    {// cleanup
                        ee.removeAllListeners('test-args2');
                        expect(ee.listenerCount('test-args2')).toBe(0);
                    }
                });

                it('args.length = 3', function () {
                    const listener = jest.fn(function(this: EventEmitterEx, a, b, c) {
                        expect(this).toBe(ee);
                        expect(a).toBe(7);
                        expect(b).toBe('b3');
                        expect(c).toBe(sTest1);
                        expect(arguments.length).toBe(3);
                    });

                    ee.on('test-args3', listener);
                    // test#1 with single listener
                    ee.emit('test-args3', 7, 'b3', sTest1);
                    ee.on('test-args3', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-args3', 7, 'b3', sTest1);

                    expect(listener).toHaveBeenCalled();
                    expect(listener.mock.calls.length).toEqual(3);

                    {// cleanup
                        ee.removeAllListeners('test-args3');
                        expect(ee.listenerCount('test-args3')).toBe(0);
                    }
                });

                it('args.length = 9', function () {
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
                        expect(arguments.length).toBe(9);
                    });

                    ee.on('test-args9', listener);
                    // test#1 with single listener
                    ee.emit('test-args9', 1, 2, 3, 4, 5, 6, 7, 8, 9);
                    ee.on('test-args9', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-args9', 1, 2, 3, 4, 5, 6, 7, 8, 9);

                    expect(listener).toHaveBeenCalled();
                    expect(listener.mock.calls.length).toEqual(3);

                    {// cleanup
                        ee.removeAllListeners('test-args9');
                        expect(ee.listenerCount('test-args9')).toBe(0);
                    }
                });

                it('args.length = N', function () {
                    const expectedArgs = randArr30;
                    const listener = jest.fn(function(this: EventEmitterEx, ...args) {
                        expect(this).toBe(ee);
                        expect(args).toEqual(expectedArgs);
                        expect(arguments.length).toBe(expectedArgs.length);
                    });

                    ee.on('test-argsN', listener);
                    // test#1 with single listener
                    ee.emit('test-argsN', ...expectedArgs);
                    ee.on('test-argsN', listener);
                    // test#2 with multiply listeners
                    ee.emit('test-argsN', ...expectedArgs);

                    expect(listener).toHaveBeenCalled();
                    expect(listener.mock.calls.length).toEqual(3);

                    {// cleanup
                        ee.removeAllListeners('test-argsN');
                        expect(ee.listenerCount('test-argsN')).toBe(0);
                    }
                });
            });
        });

        describe('events.errorMonitor', function () {
            // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-error-monitor.js

            it(`events.errorMonitor is a Symbol`, function () {
                expect(typeof errorMonitor).toBe('symbol');
            });

            describe(`without 'error' listener`, function () {
                // todo: На данный момент НЕ вызываем событие errorMonitor, если НЕТ подписок на событие 'error'.
                //  В текущей версии nodejs#v15.5.0, если нет подписки на 'error', то и errorMonitor НЕ вызывается, даже если подписка на errorMonitor есть.

                it(`single listener`, function () {
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
                    catch(e) {
                        err = e;
                    }

                    {// additional tests
                        expect(ee.listenerCount(errorMonitor)).toBe(1);
                    }

                    {// main tests
                        expect(err).toBe(theErr);

                        expect(monitorListener1).not.toHaveBeenCalled();
                        // expect(monitorListener1.mock.calls).toEqual([[theErr]]);
                    }

                    {// cleanup
                        ee.removeListener(errorMonitor, monitorListener1);
                        expect(ee.listenerCount(errorMonitor)).toBe(0);
                    }
                });

                it(`multiply listeners`, function () {
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
                    catch(e) {
                        err = e;
                    }

                    {// additional tests
                        expect(ee.listenerCount(errorMonitor)).toBe(2);
                    }

                    {// main tests
                        expect(err).toBe(theErr);

                        expect(monitorListener1).not.toHaveBeenCalled();
                        // expect(monitorListener1.mock.calls).toEqual([[theErr]]);

                        expect(monitorListener2).not.toHaveBeenCalled();
                        // expect(monitorListener2.mock.calls).toEqual([[theErr]]);
                    }

                    {// cleanup
                        ee.removeListener(errorMonitor, monitorListener1);
                        ee.removeListener(errorMonitor, monitorListener2);
                        expect(ee.listenerCount(errorMonitor)).toBe(0);
                    }
                });
            });

            describe(`with 'error' listener`, function () {

                it(`single listener`, function () {
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
                    catch(e) {
                        // This code should be unreachable
                        {// main tests #2
                            expect(false).toBe(true);
                        }
                    }

                    {// additional tests
                        expect(ee.listenerCount(errorMonitor)).toBe(1);
                        expect(ee.listenerCount('error')).toBe(1);
                    }

                    {// main tests #3
                        expect(monitorListener1).toHaveBeenCalled();
                        expect(monitorListener1.mock.calls).toEqual([[theErr]]);

                        expect(errorListener1).toHaveBeenCalled();
                        expect(errorListener1.mock.calls).toEqual([[theErr]]);
                    }

                    {// cleanup
                        ee.removeListener(errorMonitor, monitorListener1);
                        ee.removeListener('error', errorListener1);
                        expect(ee.listenerCount(errorMonitor)).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                    }
                });

                it(`multiply listeners`, function () {
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
                    catch(e) {
                        // This code should be unreachable
                        {// main tests #2
                            expect(false).toBe(true);
                        }
                    }

                    {// additional tests
                        expect(ee.listenerCount(errorMonitor)).toBe(2);
                        expect(ee.listenerCount('error')).toBe(2);
                    }

                    {// main tests #3
                        expect(monitorListener1).toHaveBeenCalled();
                        expect(monitorListener1.mock.calls).toEqual([[theErr]]);
                        expect(monitorListener2).toHaveBeenCalled();
                        expect(monitorListener2.mock.calls).toEqual([[theErr]]);

                        expect(errorListener1).toHaveBeenCalled();
                        expect(errorListener1.mock.calls).toEqual([[theErr]]);
                        expect(errorListener2).toHaveBeenCalled();
                        expect(errorListener2.mock.calls).toEqual([[theErr]]);
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

                it(`complex case`, function () {
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
                    catch(e) {
                        // This code should be unreachable
                        {// main tests #2
                            expect(false).toBe(true);
                        }
                    }

                    {// additional tests
                        expect(ee.listenerCount(errorMonitor)).toBe(2);
                        expect(ee.listenerCount('error')).toBe(2);
                    }

                    {// main tests #3
                        const expectedCallArgs = [theErr1, theErr2, ...expectedArgs];

                        expect(monitorListener1).toHaveBeenCalled();
                        expect(monitorListener1.mock.calls).toEqual([expectedCallArgs]);
                        expect(monitorListener2).toHaveBeenCalled();
                        expect(monitorListener2.mock.calls).toEqual([expectedCallArgs]);

                        expect(errorListener1).toHaveBeenCalled();
                        expect(errorListener1.mock.calls).toEqual([expectedCallArgs]);
                        expect(errorListener2).toHaveBeenCalled();
                        expect(errorListener2.mock.calls).toEqual([expectedCallArgs]);
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
        describe('#once', function () {
            it('should emit once', function () {
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

            it('should not emit after removeListener', function () {
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
    }) as EmptyFunction);

    {// https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-subclass.js
        class EventEmitterExSubClass extends EventEmitterEx {
            on(...args) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return super.on(...args);
            }

            removeListener(...args) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return super.removeListener(...args);
            }
        }

        describe('EventEmitter subclass', checkEventEmitter.bind(null, EventEmitterExSubClass));
    }

    describe('events.once', function _EventEmitter_once() {
        let EventEmitter = EventEmitterEx;
        let {once} = EventEmitterEx;

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
                // @ts-ignore
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

        it('should emit once', function (done) {
            const expectedError = null;
            let error = null;
            const expectedArgs = [ 'test', 1, {} ];
            const argsArray: any[] = [];

            once(ee, 'test1')
                .then(actualArgs => {
                    argsArray.push(actualArgs as any[]);
                })
                .catch(err => {
                    error = err;
                })
                .then(() => {
                    expect(error).toBe(expectedError);
                    expect(argsArray).toEqual([ expectedArgs ]);
                    expect(ee.listenerCount('test1')).toBe(0);

                    done();
                })
            ;

            expect(ee.listenerCount('test1')).toBe(1);

            ee.emit('test1', ...expectedArgs);
        });

        it('should emit once (async/await)', async function () {
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
            it(`should reject with error on 'error' event`, function (done) {
                const expectedError = new Error('REJECT PROMISE');
                let error = void 0;

                once(ee, 'test3', {
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

                        done();
                    })
                ;

                expect(ee.listenerCount('test3')).toBe(1);
                expect(ee.listenerCount('error')).toBe(1);

                ee.emit('error', expectedError);
            });

            it(`should reject with error on 'error' event (async/await)`, async function () {
                const expectedError = new Error('REJECT PROMISE');
                let error = null;

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
                catch(err) {
                    error = err;
                }

                expect(error).toBe(expectedError);
                expect(ee.listenerCount('test4')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);
            });

            it(`should not reject if 'error' event is main listener type`, function (done) {
                const err = new Error();

                once(ee, 'error', {
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                })
                    .then(args => {
                        expect(args).toEqual([err, 1, 2, 3]);

                        done();
                    })
                ;

                expect(ee.listenerCount('error')).toBe(1);

                ee.emit('error', err, 1, 2, 3);
            });

            it(`should not reject if 'error' event is main listener type (async/await)`, async function () {
                const err = new Error();

                setImmediate(() => {
                    ee.emit('error', err, 1, 2, 3);
                });

                const args = await once(ee, 'error', {
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                });

                expect(args).toEqual([err, 1, 2, 3]);
                expect(ee.listenerCount('error')).toBe(0);
            });

            it(`should not reject if 'error' event is in main listeners types`, function (done) {
                const err = new Error();

                once(ee, ['test1', 'test2', 'error'], {
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                })
                    .then(args => {
                        expect(args).toEqual([err, 1, 2, 3]);
                        expect(ee.listenerCount('test1')).toBe(0);
                        expect(ee.listenerCount('test2')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);

                        done();
                    })
                ;

                expect(ee.listenerCount('test1')).toBe(1);
                expect(ee.listenerCount('test2')).toBe(1);
                expect(ee.listenerCount('error')).toBe(1);

                ee.emit('error', err, 1, 2, 3);
            });

            it(`should not reject if 'error' event is in main listeners types (async/await)`, async function () {
                const err = new Error();

                setImmediate(() => {
                    ee.emit('error', err, 1, 2, 3);
                });

                const args = await once(ee, ['test1', 'test2', 'error'], {
                    // EventTarget does not have `error` event semantics like Node
                    errorEventName: isEventTarget ? 'error' : void 0,
                });

                expect(args).toEqual([err, 1, 2, 3]);
                expect(ee.listenerCount('error')).toBe(0);
            });

            it(`should reject with error on custom error event`, function (done) {
                const expectedError = new Error('REJECT PROMISE');
                const customErrorEventName = 'custom_error1';
                let error = void 0;

                once(ee, 'test3', {
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

                        done();
                    })
                ;

                expect(ee.listenerCount('test3')).toBe(1);
                expect(ee.listenerCount(customErrorEventName)).toBe(1);

                ee.emit(customErrorEventName, expectedError);
            });

            it(`should reject with error on custom error event (async/await)`, async function () {
                const expectedError = new Error('REJECT PROMISE');
                const customErrorEventName = 'custom_error2';
                let error = null;

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
                catch(err) {
                    error = err;
                }

                expect(error).toBe(expectedError);
                expect(ee.listenerCount('test4')).toBe(0);
                expect(ee.listenerCount(customErrorEventName)).toBe(0);
            });

            it(`should not reject if custom error event is main listener type`, function (done) {
                const customErrorEventName = 'custom_error1-1';

                once(ee, customErrorEventName, {
                    errorEventName: customErrorEventName,
                })
                    .then(args => {
                        expect(args).toEqual([1, 2, 3]);
                        expect(ee.listenerCount(customErrorEventName)).toBe(0);

                        done();
                    })
                ;

                expect(ee.listenerCount(customErrorEventName)).toBe(1);

                ee.emit(customErrorEventName, 1, 2, 3);
            });

            it(`should not reject if custom error event is main listener type (async/await)`, async function () {
                const customErrorEventName = 'custom_error1-2';

                setImmediate(() => {
                    ee.emit(customErrorEventName, 1, 2, 3);
                });

                const args = await once(ee, customErrorEventName, {
                    errorEventName: customErrorEventName,
                });

                expect(args).toEqual([1, 2, 3]);
                expect(ee.listenerCount(customErrorEventName)).toBe(0);
            });

            it(`should not reject if custom error event is in main listeners types`, function (done) {
                const customErrorEventName = 'custom_error1-1';

                once(ee, ['test1', 'test2', customErrorEventName], {
                    errorEventName: customErrorEventName,
                })
                    .then(args => {
                        expect(args).toEqual([1, 2, 3]);
                        expect(ee.listenerCount('test1')).toBe(0);
                        expect(ee.listenerCount('test2')).toBe(0);
                        expect(ee.listenerCount(customErrorEventName)).toBe(0);

                        done();
                    })
                ;

                expect(ee.listenerCount('test1')).toBe(1);
                expect(ee.listenerCount('test2')).toBe(1);
                expect(ee.listenerCount(customErrorEventName)).toBe(1);

                ee.emit(customErrorEventName, 1, 2, 3);
            });

            it(`should not reject if custom error event is in main listeners types (async/await)`, async function () {
                const customErrorEventName = 'custom_error1-2';

                setImmediate(() => {
                    ee.emit(customErrorEventName, 1, 2, 3);
                });

                const args = await once(ee, ['test1', 'test2', customErrorEventName], {
                    errorEventName: customErrorEventName,
                });

                expect(args).toEqual([1, 2, 3]);
                expect(ee.listenerCount(customErrorEventName)).toBe(0);
            });

            it(`should not reject if custom error event is main listener and 'error' event emitted`, async function () {
                const err = new Error();
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

            it(`should reject if 'error' event is main listener and custom error event emitted`, async function () {
                const customErrorEventName = 'custom_error1-3';
                const error = new Error('custom');

                setImmediate(() => {
                    ee.emit(customErrorEventName, error);
                });

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
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
                // @ts-ignore
                expect(r1.reason).toBe(error);
                expect(r2.status).toBe('rejected');
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
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
                // @ts-ignore
                it.skip = function(){};
            }

            it.skip('with options.prepend', function (done) {
                // https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-prepend.js
                let counter = 0;
                const isEvent = Symbol('isEvent');
                const defaultListener = function(event) {
                    event.stopImmediatePropagation();

                    if (event.position === 4) {
                        event.position = 5;
                    }
                };

                ee.addListener('test5-1', defaultListener);

                // Если prepend работает правильно и обработчик события внутри once ставиться в начало всех обработчиков
                //  событий, то у event ещё не будет вызван stopImmediatePropagation, на момент попадания в checkFn.
                const promise1 = once(ee, 'test5-1', {
                    prepend: true,
                    checkFn(type, event) {
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
                const promise2 = once(ee, 'test5-1', {
                    checkFn(type, event) {
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

                Promise.all([ promise1, promise2 ]).then(() => {
                    expect(counter).toBe(2);
                    expect(ee.listenerCount('test5-1')).toBe(0);
                    expect(ee.listenerCount('error')).toBe(0);

                    done();
                });

                ee.emit('test5-1', createDomEventLike('test5-1', {position: 1, [isEvent]: true}));
                ee.emit('test5-1', createDomEventLike('test5-1', {position: 2, [isEvent]: true}));
                ee.emit('test5-1', createDomEventLike('test5-1', {position: 3, [isEvent]: true}));
                ee.emit('test5-1', createDomEventLike('test5-1', {position: 4, [isEvent]: true}));

                ee.removeListener('test5-1', defaultListener);
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
                // @ts-ignore
                it.skip = function(){};
            }

            it.skip('with options.capture', async function () {
                const data = {
                    test: true,
                };
                const event = new CustomEvent<typeof data>('test5-2', { detail: data });

                setImmediate(() => {
                    eventTarget.dispatchEvent(event);
                });

                await once(eventTarget, 'test5-2', {
                    capture: true,
                }).then(([event]) => {
                    expect((event as CustomEvent<typeof data>).detail).toBe(data);
                    expect(listenerCount(eventTarget, 'test5-2')).toBe(0);
                });
            });

            it.skip('with options.passive=true', async function () {
                const data = {
                    test: true,
                };
                const event = new CustomEvent<typeof data>('test5-2', { detail: data, cancelable: true });

                setImmediate(() => {
                    eventTarget.dispatchEvent(event);
                });

                await once(eventTarget, 'test5-2', {
                    passive: true,
                    checkFn(type, event) {
                        event.preventDefault();

                        return true;
                    },
                }).then(([event]) => {
                    expect((event as CustomEvent<typeof data>).detail).toBe(data);
                    expect(listenerCount(eventTarget, 'test5-2')).toBe(0);
                    expect(event.defaultPrevented).toBe(false);
                });
            });


            it.skip('with options.passive=false', async function () {
                const data = {
                    test: true,
                };
                const event = new CustomEvent<typeof data>('test5-2', { detail: data, cancelable: true });

                setImmediate(() => {
                    eventTarget.dispatchEvent(event);
                });

                await once(eventTarget, 'test5-2', {
                    passive: false,
                    checkFn(type, event) {
                        event.preventDefault();

                        return true;
                    },
                }).then(([event]) => {
                    expect((event as CustomEvent<typeof data>).detail).toBe(data);
                    expect(listenerCount(eventTarget, 'test5-2')).toBe(0);
                    expect(event.defaultPrevented).toBe(true);
                });
            });

            it.skip = itSkip;
        });

        it('with options.checkFn', function (done) {
            const expectedError = null;
            let error = null;
            const expectedArgs = [
                [ 'test', 1, {} ],
                [ 'test', 5, {} ],
                [ 'test', 9, {} ],
            ];
            const argsArray: any[] = [];

            Promise.all([
                once(ee, 'test5', {checkFn: (type, ...args) => args[1] === 9})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
                once(ee, 'test5', {checkFn: (type, ...args) => args[1] === 5})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
                once(ee, 'test5', {checkFn: (type, ...args) => args[1] === 1})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
            ]).then(() => {
                expect(error).toBe(expectedError);
                expect(argsArray).toEqual(expectedArgs);
                expect(ee.listenerCount('test5')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);

                done();
            });
            expect(listenerCount(ee, 'test5')).toBe(3);

            ee.emit('test5', ...[ 'test', 0, {} ]);
            ee.emit('test5', ...[ 'test', 1, {} ]);
            ee.emit('test5', ...[ 'test', 3, {} ]);
            ee.emit('test5', ...[ 'test', 5, {} ]);
            ee.emit('test5', ...[ 'test', 7, {} ]);
            ee.emit('test5', ...[ 'test', 9, {} ]);
        });

        it('with options.checkFn - this should be EventEmitter', async function () {
            let passedEventEmitter: typeof ee | null = null;

            setImmediate(() => {
                ee.emit('test-ee-this', 1, 2, 3);
            });

            const actualArgs = await once(ee, 'test-ee-this', {
                checkFn() {
                    passedEventEmitter = this;

                    return true;
                },
            })

            expect(passedEventEmitter).toBe(ee);
            expect(actualArgs).toEqual([1, 2, 3]);
            expect(ee.listenerCount('test-ee-this')).toBe(0);
            expect(ee.listenerCount('error')).toBe(0);
        });

        it('with options.checkFn and multi-names', function (done) {
            const expectedError = null;
            let error = null;
            const expectedArgs = [
                [ 'test', 1, {} ],
                [ 'test', 5, {} ],
                [ 'test', 9, {} ],
            ];
            const argsArray: any[] = [];

            Promise.all([
                once(ee, ['test5-1', 'test5-2'], {checkFn: (type, ...args) => args[1] === 9})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
                once(ee, ['test5-2', 'test5-1'], {checkFn: (type, ...args) => args[1] === 5})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
                once(ee, ['test5-1', 'test5-2'], {checkFn: (type, ...args) => args[1] === 1})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
            ]).then(() => {
                expect(error).toBe(expectedError);
                expect(argsArray).toEqual(expectedArgs);
                expect(ee.listenerCount('test5-1')).toBe(0);
                expect(ee.listenerCount('test5-2')).toBe(0);

                done();
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
        });

        describe('abortable EventEmitter.once', function() {
            it('with AbortSignal', function (done) {
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac = new AbortController();

                once(ee, 'test6', { signal: ac.signal })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(counter).toBe(0);
                        expect(error).toBeDefined();
                        expect(error && error.code).toBe(/*DOMException.ABORT_ERR*/20);
                        expect(error && error.name).toBe('AbortError');
                        expect(ee.listenerCount('test6')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                        expect(listenerCount(ac.signal, 'abort')).toBe(0);

                        done();
                    })
                ;

                expect(listenerCount(ac.signal, 'abort')).toBe(1);

                ac.abort();
                ee.emit('test6', ...[1, 2, 3]);
            });

            it('with AbortSignal (async/await)', async function () {
                let error1: DOMException|void = void 0;
                let error2: DOMException|void = void 0;
                let counter = 0;
                const ac1 = new AbortController();
                const ac2 = new NativeAbortController();

                setImmediate(() => {
                    ac1.abort();
                    ac2.abort();
                    ee.emit('test6', ...[1, 2, 3]);
                    ee.emit('test6', ...[1, 2, 3]);
                });

                try {
                    const promise = once(ee, 'test6', { signal: ac1.signal });

                    expect(listenerCount(ac1.signal, 'abort')).toBe(1);

                    await promise;

                    counter++;
                }
                catch(err) {
                    if (isTestError(err)) {
                        throw err;
                    }

                    error1 = err;
                }
                // at this line ac1 and ac2 already Aborted
                try {
                    await once(ee, 'test6', { signal: ac2.signal });

                    counter++;
                }
                catch(err) {
                    error2 = err;
                }

                expect(counter).toBe(0);
                expect(error1).toBeDefined();
                expect(error2).toBeDefined();
                expect(error1 && error1.code).toBe(/*DOMException.ABORT_ERR*/20);
                expect(error1 && error1.name).toBe('AbortError');
                expect(error2 && error2.code).toBe(/*DOMException.ABORT_ERR*/20);
                expect(error2 && error2.name).toBe('AbortError');
                expect(ee.listenerCount('test6')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);
                expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                expect(listenerCount(ac2.signal, 'abort')).toBe(0);
            });

            it(`with AbortController's`, function (done) {
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac1 = new AbortController();
                const ac2 = new NativeAbortController();

                once(ee, 'test6', { abortControllers: [ ac1, ac2 ] })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(counter).toBe(0);
                        expect(error).toBeDefined();
                        expect(error && error.code).toBe(/*DOMException.ABORT_ERR*/20);
                        expect(error && error.name).toBe('AbortError');
                        expect(ee.listenerCount('test6')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                        expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                        expect(listenerCount(ac2.signal, 'abort')).toBe(0);

                        done();
                    })
                ;

                expect(listenerCount(ac1.signal, 'abort')).toBe(1);
                expect(listenerCount(ac2.signal, 'abort')).toBe(1);

                ac1.abort();
                ee.emit('test6', ...[1, 2, 3]);
            });

            it(`with AbortController's - without abort()`, function (done) {
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac1 = new AbortController();
                const ac2 = new NativeAbortController();

                once(ee, 'test6', { abortControllers: [ ac1, ac2 ] })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(counter).toBe(1);
                        expect(error).not.toBeDefined();
                        expect(ee.listenerCount('test6')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                        expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                        expect(listenerCount(ac2.signal, 'abort')).toBe(0);

                        done();
                    })
                ;

                expect(listenerCount(ac1.signal, 'abort')).toBe(1);
                expect(listenerCount(ac2.signal, 'abort')).toBe(1);

                ee.emit('test6', ...[1, 2, 3]);
            });

            it(`with AbortController's (async/await)`, async function () {
                let error1: DOMException|void = void 0;
                let error2: DOMException|void = void 0;
                let counter = 0;
                const ac1 = new AbortController();
                const ac2 = new NativeAbortController();
                const acg = new AbortControllersGroup([ ac1, ac2 ]);

                setImmediate(() => {
                    ac1.abort();
                    ac2.abort();
                    ee.emit('test6', ...[1, 2, 3]);
                    ee.emit('test6', ...[1, 2, 3]);
                });

                try {
                    const promise = once(ee, 'test6', { abortControllers: [ acg ] });

                    expect(listenerCount(acg.signal, 'abort')).not.toBe(0);
                    expect(listenerCount(ac1.signal, 'abort')).toBe(1);
                    expect(listenerCount(ac2.signal, 'abort')).toBe(1);

                    await promise;

                    counter++;
                }
                catch(err) {
                    if (isTestError(err)) {
                        throw err;
                    }

                    error1 = err;
                }
                // at this line ac1 and ac2 already Aborted
                try {
                    await once(ee, 'test6', { abortControllers: [ ac1, ac2 ] });

                    counter++;
                }
                catch(err) {
                    if (isTestError(err)) {
                        throw err;
                    }

                    error2 = err;
                }

                acg.close();

                expect(counter).toBe(0);
                expect(error1).toBeDefined();
                expect(error2).toBeDefined();
                expect(error1 && error1.code).toBe(/*DOMException.ABORT_ERR*/20);
                expect(error1 && error1.name).toBe('AbortError');
                expect(error2 && error2.code).toBe(/*DOMException.ABORT_ERR*/20);
                expect(error2 && error2.name).toBe('AbortError');
                expect(ee.listenerCount('test6')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);
                expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                expect(listenerCount(ac2.signal, 'abort')).toBe(0);
                expect(listenerCount(acg.signal, 'abort')).toBe(0);
            });

            it(`with AbortController's (async/await) - without abort()`, async function () {
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac1 = new AbortController();
                const ac2 = new NativeAbortController();
                const acg = new AbortControllersGroup([ ac1, ac2 ]);

                setImmediate(() => {
                    ee.emit('test6', ...[1, 2, 3]);
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
                catch(err) {
                    if (isTestError(err)) {
                        throw err;
                    }

                    error = err;
                }

                acg.close();

                expect(counter).toBe(1);
                expect(error).not.toBeDefined();
                expect(ee.listenerCount('test6')).toBe(0);
                expect(ee.listenerCount('error')).toBe(0);
                expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                expect(listenerCount(ac2.signal, 'abort')).toBe(0);
                expect(listenerCount(acg.signal, 'abort')).toBe(0);
            });

            it(`with AbortSignal and AbortController's`, function (done) {
                {
                    let error: DOMException|void = void 0;
                    const ac1 = new AbortController();
                    const ac2 = new AbortController();
                    const ac3 = new AbortController();

                    once(ee, 'test6', { abortControllers: [ ac1, ac2 ], signal: ac3.signal })
                        .catch(err => {
                            error = err;
                        })
                        .then(() => {
                            expect(error).toBeDefined();
                            expect(error && error.code).toBe(/*DOMException.ABORT_ERR*/20);
                            expect(error && error.name).toBe('AbortError');
                            expect(ee.listenerCount('test6')).toBe(0);
                            expect(ee.listenerCount('error')).toBe(0);
                            expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                            expect(listenerCount(ac2.signal, 'abort')).toBe(0);
                            expect(listenerCount(ac3.signal, 'abort')).toBe(0);

                            done();
                        })
                    ;

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

                    once(ee, 'test6', { abortControllers: [ ac1, ac2 ], signal: ac3.signal })
                        .catch(err => {
                            error = err;
                        })
                        .then(() => {
                            expect(error).toBeDefined();
                            expect(error && error.code).toBe(/*DOMException.ABORT_ERR*/20);
                            expect(error && error.name).toBe('AbortError');
                            expect(ee.listenerCount('test6')).toBe(0);
                            expect(ee.listenerCount('error')).toBe(0);
                            expect(listenerCount(ac1.signal, 'abort')).toBe(0);
                            expect(listenerCount(ac2.signal, 'abort')).toBe(0);
                            expect(listenerCount(ac3.signal, 'abort')).toBe(0);

                            done();
                        })
                    ;

                    expect(listenerCount(ac1.signal, 'abort')).toBe(1);
                    expect(listenerCount(ac2.signal, 'abort')).toBe(1);
                    expect(listenerCount(ac3.signal, 'abort')).toBe(1);

                    ac1.abort();
                }
            });

            it('with AbortSignal and ServerTiming', function (done) {
                const st = new ServerTiming();
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac = new AbortController();

                once(ee, 'test10', { signal: ac.signal, timing: st })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(st.length).toBe(1);
                        expect(counter).toBe(0);
                        expect(error).toBeDefined();
                        expect(error && error.code).toBe(/*DOMException.ABORT_ERR*/20);
                        expect(error && error.name).toBe('AbortError');
                        expect(ee.listenerCount('test10')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                        expect(listenerCount(ac.signal, 'abort')).toBe(0);

                        done();
                    })
                ;

                expect(listenerCount(ac.signal, 'abort')).toBe(1);

                ac.abort();
                ee.emit('test10', ...[1, 2, 3]);
            });

            it('with AbortSignal and ServerTiming and multi-names', function (done) {
                const st = new ServerTiming();
                let error: DOMException|void = void 0;
                let counter = 0;
                const ac = new AbortController();

                once(ee, ['test10', 'test11', 'test12'], { signal: ac.signal, timing: st })
                    .then(() => {
                        counter++;
                    })
                    .catch(err => {
                        error = err;
                    })
                    .then(() => {
                        expect(st.length).toBe(0);
                        expect(counter).toBe(0);
                        expect(error).toBeDefined();
                        expect(error && error.code).toBe(/*DOMException.ABORT_ERR*/20);
                        expect(error && error.name).toBe('AbortError');
                        expect(ee.listenerCount('test10') ).toBe(0);
                        expect(ee.listenerCount('test11')).toBe(0);
                        expect(ee.listenerCount('test12')).toBe(0);
                        expect(ee.listenerCount('error')).toBe(0);
                        expect(listenerCount(ac.signal, 'abort')).toBe(0);

                        done();
                    })
                ;

                expect(listenerCount(ac.signal, 'abort')).toBe(1);

                ac.abort();
                ee.emit('test11', ...[1, 2, 3]);
            });
        });

        it('with timeout', function (done) {
            let error: DOMException|void = void 0;
            let counter = 0;

            once(ee, 'test7', {
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
                    expect(error).toBeDefined();
                    expect(error && error.name).toBe('TimeoutError');
                    expect(ee.listenerCount('test7')).toBe(0);

                    clearTimeout(timeout);

                    done();
                })
            ;

            const timeout = setTimeout(() => {
                ee.emit('test7', ...[1, 2, 3]);
            }, 100);
        });

        it('with ServerTiming (async/await)', async function () {
            const ee = new EventEmitter();
            const err = new Error();

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

                expect(st.length).toBe(1);
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
                catch(err) {
                    //
                }

                expect(st.length).toBe(1);
                expect(ee.listenerCount('test8')).toBe(0);
            }
        });

        it('with ServerTiming and few events (async/await)', async function () {
            const ee = new EventEmitter();
            const st = new ServerTiming();
            let error: Error|void = void 0;

            compatibleEventEmitter_from_EventTarget(ee);

            setImmediate(() => {
                ee.emit('test9-1', 1);
                ee.emit('test9-2', 2);
                ee.emit('error', new Error());
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

            expect(st.length).toBe(3);
            expect(st.getTimings().map(a => a.description)).toEqual(['test9-1', 'test9-2', 'test9-3']);
            expect(error).toBeDefined();
            expect(ee.listenerCount('test9-1')).toBe(0);
            expect(ee.listenerCount('test9-2')).toBe(0);
            expect(ee.listenerCount('error')).toBe(0);
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
                    expect(typeof name).toBeOneOf(['string', 'number', 'symbol']);
                    expect(typeof lister).toBe('function');
                });
                ee.on('error', (error) => {
                    expect(error instanceof Error).toBe(true);
                });
                /*
                ee.on(EventEmitterEx.errorMonitor, (error) => {
                    expect(error instanceof Error).toBe(true);
                });
                */
            }

            ee.on('test1', (a, n1, n2, n3) => {
                expect(typeof a).toBe('string');
                expect(typeof n1).toBe('number');
                expect(typeof n2).toBe('number');
                expect(typeof n3).toBe('number');
            });

            ee.on('test2', (eventName, listener, a) => {
                expect(typeof eventName).toBe('string');
                expect(typeof listener).toBe('function');
                expect(typeof a).toBe('string');
            });

            ee.emit('test2', 'test', () => {}, 'test', 123);
        });
    });
});
