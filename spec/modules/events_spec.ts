// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
/* globals describe, xdescribe, it, xit, expect */
'use strict';

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

import {EventEmitter as NodeEventEmitter} from 'events';
import events, {EventEmitterEx} from '../../modules/events';
import ServerTiming from 'termi@ServerTiming';

const {EventEmitter} = events;
const {once} = EventEmitterEx;

// todo: тесты можно взять тут:
//  EventEmitter:
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-add-listeners.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-check-listener-leaks.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-error-monitor.js
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
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-once.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-prepend.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-remove-all-listeners.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-remove-listeners.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-set-max-listeners-side-effects.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-special-event-names.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-subclass.js
//  - https://github.com/nodejs/node/blob/master/test/parallel/test-event-emitter-symbols.js
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

describe('EventEmitter', function() {
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
            expect(new events()).toBeInstanceOf(EventEmitter);
        });
    });

    describe('EventEmitterEx is an alias for EventEmitter', function () {
        it('instanceof', function () {
            expect(new EventEmitter()).toBeInstanceOf(EventEmitterEx);
            expect(new EventEmitterEx()).toBeInstanceOf(EventEmitter);
        });
    });

    describe('#on/#removeListener', function () {
        it('should call listener multiple times', function () {
            let counter = 0;
            const listener = () => { counter++ };

            ee.on('test', listener);
            ee.emit('test');
            ee.emit('test');

            expect(counter).toBe(2);

            ee.removeListener('test', listener);
        });

        it('should call listener multiple times for multiple listeners', function () {
            let counter1 = 0;
            let counter2 = 0;
            let counter3 = 0;
            const listener1 = () => { counter1++ };
            const listener2 = () => { counter2++ };
            const listener3 = () => { counter3++ };

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
        });

        it('should not call listener after removeListener', function () {
            let counter = 0;
            const listener = () => { counter++ };

            ee.on('test', listener);
            ee.emit('test');
            ee.removeListener('test', listener);
            ee.emit('test');

            expect(counter).toBe(1);
        });

        it('should not call listener after removeListener multiple times for multiple listeners', function () {
            let counter1 = 0;
            let counter2 = 0;
            let counter3 = 0;
            const listener1 = () => { counter1++ };
            const listener2 = () => { counter2++ };
            const listener3 = () => { counter3++ };

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
        });
    });

    describe('#on/#removeListener - use same listener multiple times', function () {
        it('should call listener multiple times', function () {
            let counter = 0;
            const listener = () => { counter++ };

            ee.on('test', listener);
            ee.on('test', listener);
            ee.emit('test');
            ee.emit('test');

            expect(counter).toBe(4);

            ee.removeListener('test', listener);
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
            ee.emit('test1');
            ee.emit('test2');
            ee.emit('test2');
            ee.emit('test3');
            ee.emit('test3');
            ee.emit('test3');

            expect(counter1).toBe(2);
            expect(counter2).toBe(4);
            expect(counter3).toBe(6);

            ee.removeListener('test1', listener1);
            ee.removeListener('test2', listener2);
            ee.removeListener('test3', listener3);
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

            expect(counter).toBe(2);
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

            expect(counter1).toBe(2);
            expect(counter2).toBe(4);
            expect(counter3).toBe(6);
        });
    });

    describe('#on/#removeListener - use same listener multiple times - with listenerOncePerEventType=true', function () {
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
        });
    });

    // todo: more tests here: https://github.com/nodejs/node/blob/master/test/parallel/test-events-once.js
    describe('#once', function () {
        it('should emit once', function () {
            let counter = 0;

            ee.once('test', () => {
                counter++;
            });
            ee.emit('test');
            ee.emit('test');

            expect(counter).toBe(1);
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
        });
    });

    describe('EventEmitter.once', function _EventEmitter_once() {
        let EventEmitter = EventEmitterEx;

        {
            // eslint-disable-next-line prefer-rest-params
            const eventEmitterConstructor = arguments[0] as Function;

            if (!eventEmitterConstructor) {
                describe('EventEmitter.once with NodeJS.EventEmitter', _EventEmitter_once.bind(null, NodeEventEmitter));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                EventEmitter = eventEmitterConstructor;
            }
        }

        const ee = new EventEmitter();

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

                    done();
                })
            ;

            ee.emit('test1', ...expectedArgs);
        });

        it('should emit once (async/await)', async function () {
            const expectedArgs = [ 'test', 1, {} ];
            const argsArray: any[] = [];

            process.nextTick(() => {
                ee.emit('test2', ...expectedArgs);
            });

            const actualArgs = await once(ee, 'test2') as any[];

            argsArray.push(actualArgs);

            ee.emit('test2', ...expectedArgs);

            expect(argsArray).toEqual([ expectedArgs ]);
        });

        it(`should reject with error on 'error' event`, function (done) {
            const expectedError = new Error('REJECT PROMISE');
            let error = null;

            once(ee, 'test3')
                .catch(err => {
                    error = err;
                })
                .then(() => {
                    expect(error).toBe(expectedError);

                    done();
                })
            ;

            ee.emit('error', expectedError);
        });

        it(`should reject with error on 'error' event (async/await)`, async function () {
            const expectedError = new Error('REJECT PROMISE');
            let error = null;

            process.nextTick(() => {
                ee.emit('error', expectedError);
            });

            try {
                await once(ee, 'test4');
            }
            catch(err) {
                error = err;
            }

            expect(error).toBe(expectedError);
        });

        it('once with options.checkFn', function (done) {
            const expectedError = null;
            let error = null;
            const expectedArgs = [
                [ 'test', 1, {} ],
                [ 'test', 5, {} ],
                [ 'test', 9, {} ],
            ];
            const argsArray: any[] = [];

            Promise.all([
                once(ee, 'test5', {checkFn: (type, ee, args) => args[1] === 9})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
                once(ee, 'test5', {checkFn: (type, ee, args) => args[1] === 5})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
                once(ee, 'test5', {checkFn: (type, ee, args) => args[1] === 1})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
            ]).then(() => {
                expect(error).toBe(expectedError);
                expect(argsArray).toEqual(expectedArgs);

                done();
            });

            ee.emit('test5', ...[ 'test', 0, {} ]);
            ee.emit('test5', ...[ 'test', 1, {} ]);
            ee.emit('test5', ...[ 'test', 3, {} ]);
            ee.emit('test5', ...[ 'test', 5, {} ]);
            ee.emit('test5', ...[ 'test', 7, {} ]);
            ee.emit('test5', ...[ 'test', 9, {} ]);
        });

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

                    done();
                })
            ;

            ac.abort();
            ee.emit('test6', ...[1, 2, 3]);
        });

        it('with AbortSignal 2', async function () {
            let error1: DOMException|void = void 0;
            let error2: DOMException|void = void 0;
            let counter = 0;
            const ac1 = new AbortController();
            const ac2 = new NativeAbortController();

            process.nextTick(() => {
                ac1.abort();
                ac2.abort();
                ee.emit('test6', ...[1, 2, 3]);
                ee.emit('test6', ...[1, 2, 3]);
            });

            try {
                await once(ee, 'test6', { signal: ac1.signal });

                counter++;
            }
            catch(err) {
                error1 = err;
            }
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


        });

        it('with timeout', function (done) {
            let error: DOMException|void = void 0;
            let counter = 0;

            once(ee, 'test7', { timeout: 10 })
                .then(() => {
                    counter++;
                })
                .catch(err => {
                    error = err;
                })
                .then(() => {
                    expect(counter).toBe(0);
                    expect(error).toBeDefined();
                    expect(error && error.name).toBe('Error');

                    done();
                })
            ;

            setTimeout(() => {
                ee.emit('test7', ...[1, 2, 3]);
            }, 100);
        });

        it('with ServerTiming', async function () {
            const ee = new EventEmitter();

            {
                const st = new ServerTiming();

                process.nextTick(() => {
                    ee.emit('test8', 1);
                });

                await once(ee, 'test8', { timing: st });

                expect(st.length).toBe(1);
            }
            {
                const st = new ServerTiming();

                process.nextTick(() => {
                    ee.emit('error', 1);
                });

                try {
                    await once(ee, 'test8', { timing: st });
                }
                catch(err) {
                    //
                }

                expect(st.length).toBe(1);
            }
        });

        it('with ServerTiming and few events', async function () {
            const ee = new EventEmitter();
            const st = new ServerTiming();
            let error: Error|void = void 0;

            process.nextTick(() => {
                ee.emit('test9-1', 1);
                ee.emit('test9-2', 2);
                ee.emit('error', 3);
            });

            await Promise.all([
                once(ee, 'test9-1', { timing: st }),
                once(ee, 'test9-2', { timing: st }),
                once(ee, 'test9-3', { timing: st }).catch(err => {
                    error = err;
                }),
            ]);

            expect(st.length).toBe(3);
            expect(st.getTimings().map(a => a.description)).toEqual(['test9-1', 'test9-2', 'test9-3']);
            expect(error).toBeDefined();
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

                    done();
                })
            ;

            ac.abort();
            ee.emit('test10', ...[1, 2, 3]);
        });
    });
});
