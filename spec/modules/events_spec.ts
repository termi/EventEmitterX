// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
/* globals describe, xdescribe, it, xit, expect */
'use strict';

require('termi@polyfills');

import events from '../../modules/events';
import ServerTiming from 'termi@ServerTiming';

const {EventEmitter} = events;

describe('EventEmitter', function() {
    const ee = new EventEmitter();

    describe('constructor', function () {
        it('instanceof', function () {
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

    describe('#once', function () {
        it('should emit once', function () {
            let counter = 0;

            ee.once('test', () => {
                counter++;
            });
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

            expect(counter).toBe(0);
        });
    });

    describe('EventEmitter.once', function () {
        it('should emit once', function (done) {
            const expectedError = null;
            let error = null;
            const expectedArgs = [ 'test', 1, {} ];
            const argsArray: any[] = [];

            EventEmitter.once(ee, 'test')
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

            ee.emit('test', ...expectedArgs);
        });

        it('should emit once (async/await)', async function () {
            const expectedArgs = [ 'test', 1, {} ];
            const argsArray: any[] = [];

            process.nextTick(() => {
                ee.emit('test', ...expectedArgs);
            });

            const actualArgs = await EventEmitter.once(ee, 'test') as any[];

            argsArray.push(actualArgs);

            ee.emit('test', ...expectedArgs);

            expect(argsArray).toEqual([ expectedArgs ]);
        });

        it(`should reject with error on 'error' event`, function (done) {
            const expectedError = new Error('REJECT PROMISE');
            let error = null;

            EventEmitter.once(ee, 'test')
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
                await EventEmitter.once(ee, 'test');
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
                EventEmitter.once(ee, 'test', {checkFn: (type, ee, args) => args[1] === 9})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
                EventEmitter.once(ee, 'test', {checkFn: (type, ee, args) => args[1] === 5})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
                EventEmitter.once(ee, 'test', {checkFn: (type, ee, args) => args[1] === 1})
                    .then(actualArgs => argsArray.push(actualArgs as any[]))
                    .catch(err => (error = err)),
            ]).then(() => {
                expect(error).toBe(expectedError);
                expect(argsArray).toEqual(expectedArgs);

                done();
            });

            ee.emit('test', ...[ 'test', 0, {} ]);
            ee.emit('test', ...[ 'test', 1, {} ]);
            ee.emit('test', ...[ 'test', 3, {} ]);
            ee.emit('test', ...[ 'test', 5, {} ]);
            ee.emit('test', ...[ 'test', 7, {} ]);
            ee.emit('test', ...[ 'test', 9, {} ]);
        });

        it('with AbortSignal', function (done) {
            let error: DOMException|void = void 0;
            let counter = 0;
            const ac = new AbortController();

            EventEmitter.once(ee, 'test', { signal: ac.signal })
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
            ee.emit('test', ...[1, 2, 3]);
        });

        it('with ServerTiming', async function () {
            {
                const st = new ServerTiming();

                process.nextTick(() => {
                    ee.emit('test', 1);
                });

                await EventEmitter.once(ee, 'test', { timing: st });

                expect(st.length).toBe(1);
            }
            {
                const st = new ServerTiming();

                process.nextTick(() => {
                    ee.emit('error', 1);
                });

                try {
                    await EventEmitter.once(ee, 'test', { timing: st });
                }
                catch(err) {
                    //
                }

                expect(st.length).toBe(1);
            }
        });

        it('with ServerTiming and few events', async function () {
            const st = new ServerTiming();
            let error: Error|void = void 0;

            process.nextTick(() => {
                ee.emit('test1', 1);
                ee.emit('test2', 2);
                ee.emit('error', 3);
            });

            await Promise.all([
                EventEmitter.once(ee, 'test1', { timing: st }),
                EventEmitter.once(ee, 'test2', { timing: st }),
                EventEmitter.once(ee, 'test3', { timing: st }).catch(err => {
                    error = err;
                }),
            ]);

            expect(st.length).toBe(3);
            expect(st.getTimings().map(a => a.description)).toEqual(['test1', 'test2', 'test3']);
            expect(error).toBeDefined();
        });

        it('with AbortSignal and ServerTiming', function (done) {
            const st = new ServerTiming();
            let error: DOMException|void = void 0;
            let counter = 0;
            const ac = new AbortController();

            EventEmitter.once(ee, 'test', { signal: ac.signal, timing: st })
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
            ee.emit('test', ...[1, 2, 3]);
        });
    });
});
