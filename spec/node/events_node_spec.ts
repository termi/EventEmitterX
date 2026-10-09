/** @jest-environment node */
'use strict';

import 'termi@polyfills';
import {
    EventEmitter,
    once as nodeOnce,
    on as nodeOn,
    captureRejectionSymbol as nodeRejectionSymbol,
    addAbortListener as nodeAddAbortListener,
    getEventListeners as nodeGetEventListeners,
} from 'node:events';
import { performance } from 'node:perf_hooks';
import { runInThisContext } from 'node:vm';
import {
    EventEmitterX,
    once,
    on,
    captureRejectionSymbol,
    errorMonitor,
    addAbortListener,
    getEventListeners,
} from '../../modules/events';

type Factory = () => EventEmitter;
const nativeFactory: Factory = () => new EventEmitter();
const customFactory: Factory = () => new EventEmitterX();
const factories: [ string, Factory ][] = [ [ 'Node', nativeFactory ], [ 'EventEmitterX', customFactory ] ];

describe('native Node emitter contracts', () => {
    it.each([
        [ 'Node', nodeAddAbortListener ], [ 'EventEmitterX', addAbortListener ],
    ] as const)('%s abort listener survives stopped propagation and removes itself', (_name, subscribe) => {
        const owner = new AbortController();
        owner.signal.addEventListener('abort', event => {
            event.stopImmediatePropagation();
        });
        const callback = jest.fn();
        using registration = subscribe(owner.signal, callback);
        owner.abort();
        owner.abort();
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it.each([
        [ 'Node', nodeAddAbortListener ], [ 'EventEmitterX', addAbortListener ],
    ] as const)('%s abort listener disposal prevents later delivery', (_name, subscribe) => {
        const owner = new AbortController();
        const callback = jest.fn();
        const registration = subscribe(owner.signal, callback);
        registration[Symbol.dispose]();
        registration[Symbol.dispose]();
        owner.abort();
        expect(callback).not.toHaveBeenCalled();
    });

    it.each([
        [ 'Node', nodeAddAbortListener ], [ 'EventEmitterX', addAbortListener ],
    ] as const)('%s pre-aborted subscription delivers asynchronously even after disposal', async (_name, subscribe) => {
        const owner = new AbortController();
        owner.abort();
        const callback = jest.fn();
        const registration = subscribe(owner.signal, callback);
        registration[Symbol.dispose]();
        expect(callback).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(callback).toHaveBeenCalledTimes(1);
    });
    it.each([ 0, 1, 2, 3, 5 ])('delivers errorMonitor before unhandled errors with %p extra arguments', count => {
        function sequence(make: Factory) {
            const emitter = make();
            // Native Node checks Error against its host realm, outside Jest's VM.
            const failure = make === nativeFactory
                ? runInThisContext('new Error("unhandled")') as Error
                : new Error('unhandled');
            const args = Array.from({ length: count }, (_, index) => index);
            const observed: unknown[][] = [];
            emitter.on(errorMonitor, (...payload) => {
                observed.push(payload);
            });
            expect(() => emitter.emit('error', failure, ...args)).toThrow(failure);
            expect(observed).toEqual([ [ failure, ...args ] ]);
            return observed.map(payload => payload.slice(1));
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it.each([ true, false ])('uses error listeners as modified by the monitor (add=%p)', add => {
        function sequence(make: Factory) {
            const emitter = make();
            const failure = make === nativeFactory
                ? runInThisContext('new Error("monitor mutation")') as Error
                : new Error('monitor mutation');
            const output: string[] = [];
            const handler = () => {
                output.push('handled');
            };
            if (!add) {
                emitter.on('error', handler);
            }
            emitter.on(errorMonitor, () => {
                output.push('monitor');
                if (add) {
                    emitter.on('error', handler);
                }
                else {
                    emitter.removeListener('error', handler);
                }
            });
            try {
                emitter.emit('error', failure);
            }
            catch (error) {
                expect(error).toBe(failure);
                output.push('thrown');
            }
            return output;
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it('removes symbols with removeListener lifecycle delivery in reverse order', () => {
        const symbol = Symbol('remove');

        function sequence(make: Factory) {
            const emitter = make();
            const first = () => {
            };
            const second = () => {
            };
            const output: unknown[][] = [];
            emitter.on('removeListener', (event, listener) => {
                output.push([ event, listener === first ? 'first' : 'second' ]);
            });
            emitter.on(symbol, first);
            emitter.once(symbol, second);
            emitter.removeAllListeners();
            return { output, names: emitter.eventNames(), raw: emitter.rawListeners(symbol) };
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it('ignores removal of an absent event while other once wrappers exist', () => {
        function sequence(make: Factory) {
            const emitter = make();
            emitter.on('removeListener', () => {
            });
            emitter.once('present', () => {
            });
            emitter.removeAllListeners('absent');
            emitter.emit('present');
            emitter.removeAllListeners('absent');
            return emitter.eventNames();
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it('returns an uncaptured once callback Promise to the caller of its raw wrapper', async () => {
        for (const [ _name, make ] of factories) {
            const emitter = make();
            const failure = new Error('uncaptured once');
            emitter.once('data', async () => {
                throw failure;
            });
            const raw = emitter.rawListeners('data')[0];
            expect(raw).toBeDefined();
            await expect(raw?.()).rejects.toBe(failure);
            expect(emitter.listenerCount('data')).toBe(0);
        }
    });

    it.each([ false, true ])('captures async once rejection through the configured path (hook=%p)', hook => {
        async function sequence(native: boolean) {
            const emitter: EventEmitter = native
                ? new EventEmitter({ captureRejections: true })
                : new EventEmitterX({ captureRejections: true });
            const failure = new Error('once rejection');
            const received = new Promise<unknown[]>(resolve => {
                if (hook) {
                    emitter[captureRejectionSymbol] = function(error, event, ...args) {
                        expect(this).toBe(emitter);
                        resolve([ error === failure, event, ...args ]);
                    };
                }
                else {
                    emitter.on('error', error => {
                        resolve([ error === failure ]);
                    });
                }
            });
            emitter.once('data', async () => {
                throw failure;
            });
            emitter.emit('data', 42);
            // Use a bounded assertion so a missing rejection delivery fails rather than hanging the suite.
            const limit = Promise.withResolvers<never>();
            using deadline = setTimeout(() => {
                limit.reject(new Error('rejection was not delivered'));
            }, 1000);
            using cleanup = {
                [Symbol.dispose]() {
                    emitter.removeAllListeners();
                },
            };
            return await Promise.race([ received, limit.promise ]);
        }

        return Promise.all([ sequence(false), sequence(true) ]).then(([ custom, native ]) => {
            expect(custom).toEqual(native);
        });
    });
    it('preserves synchronous ordering, this and duplicate listeners', () => {
        function sequence(make: Factory) {
            const emitter = make();
            const output: string[] = [];
            const listener = function(this: unknown, value: number) {
                expect(this).toBe(emitter);
                output.push(`ordinary:${value}`);
            };
            emitter.on('data', listener);
            emitter.on('data', listener);
            emitter.prependOnceListener('data', () => {
                output.push('first');
            });
            const first = emitter.emit('data', 1);
            output.push('after emit');
            emitter.removeListener('data', listener);
            const count = emitter.listenerCount('data');
            emitter.emit('data', 2);
            emitter.removeAllListeners();
            return { output, first, count, emptyEmit: emitter.emit('data', 3) };
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it('enumerates string, numeric and symbol keys in native order', () => {
        const key = Symbol('data');

        function names(make: Factory) {
            const emitter = make();
            emitter.on('ordinary', () => {
            });
            emitter.on(key, () => {
            });
            // Numeric names are an explicit EventEmitterX type extension, coerced to string at runtime.
            emitter.on(12 as unknown as string, () => {
            });
            const before = emitter.eventNames();
            emitter.removeAllListeners(key);
            return { before, after: emitter.eventNames() };
        }

        expect(names(customFactory)).toEqual(names(nativeFactory));
    });

    it.each(factories)('%s exposes raw once callbacks and removes by original identity', (_name, make) => {
        const emitter = make();
        const callback = jest.fn();
        emitter.once('data', callback);
        expect(emitter.listeners('data')).toEqual([ callback ]);
        const wrapper = emitter.rawListeners('data')[0];
        expect((wrapper as { listener?: Function } | undefined)?.listener).toBe(callback);
        emitter.removeListener('data', callback);
        expect(emitter.listenerCount('data')).toBe(0);
        emitter.once('data', callback);
        emitter.emit('data', 1);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(emitter.rawListeners('data')).toEqual([]);
    });

    it('preserves mutation during emit and nested once delivery', () => {
        function sequence(make: Factory) {
            const emitter = make();
            const output: string[] = [];
            const removed = () => {
                output.push('removed');
            };
            const late = () => {
                output.push('late');
            };
            emitter.on('data', () => {
                output.push('first');
                emitter.removeListener('data', removed);
                emitter.on('data', late);
            });
            emitter.on('data', removed);
            emitter.once('nested', () => {
                output.push('once');
                emitter.emit('nested');
            });
            emitter.emit('data');
            emitter.emit('data');
            emitter.emit('nested');
            return output;
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it('reports original once identity to lifecycle listeners', () => {
        function sequence(make: Factory) {
            const emitter = make();
            const callback = () => {
            };
            const output: string[] = [];
            emitter.on('newListener', (event, listener) => {
                if (event === 'data') {
                    output.push(`add:${listener === callback}`);
                }
            });
            emitter.on('removeListener', (event, listener) => {
                if (event === 'data') {
                    output.push(`remove:${listener === callback}`);
                }
            });
            emitter.once('data', callback);
            emitter.emit('data');
            return output;
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it.each(factories)('%s cleans once listeners on success, error and abort', async (_name, make) => {
        const emitter = make();
        const awaitEvent = (eventName: string, options?: { signal: AbortSignal }) => {
            return make === nativeFactory
                ? nodeOnce(emitter, eventName, options)
                : once(emitter, eventName, options)
            ;
        };
        const successful = awaitEvent('data');
        emitter.emit('data', 1, 'ready');
        expect(await successful).toEqual([ 1, 'ready' ]);
        expect(emitter.listenerCount('data')).toBe(0);
        expect(emitter.listenerCount('error')).toBe(0);
        const failure = new Error('event failure');
        const failing = awaitEvent('data');
        emitter.emit('error', failure);
        await expect(failing).rejects.toBe(failure);
        const owner = new AbortController();
        const aborted = awaitEvent('data', { signal: owner.signal });
        owner.abort();
        await expect(aborted).rejects.toMatchObject({ name: 'AbortError' });
        expect(emitter.listenerCount('data')).toBe(0);
        expect(emitter.listenerCount('error')).toBe(0);
    });

    it.each(factories)('%s cleans iterator listeners on return and throw', async (_name, make) => {
        const iterate = make === nativeFactory ? nodeOn : on;
        const emitter = make();
        const iterator = iterate(emitter, 'data');
        const next = iterator.next();
        emitter.emit('data', 7);
        expect(await next).toEqual({ value: [ 7 ], done: false });
        await iterator.return?.();
        expect(emitter.listenerCount('data')).toBe(0);
        expect(emitter.listenerCount('error')).toBe(0);
        const throwing = iterate(emitter, 'data');
        // Native events.on validates Error in its host realm, outside Jest's VM.
        const failure = make === nativeFactory
            ? runInThisContext('new Error("iterator stop")') as Error
            : new Error('iterator stop');
        // Implementations differ in throw's immediate Promise result; both must detach.
        await Promise.resolve(throwing.throw?.(failure)).catch(() => {
        });
        expect(emitter.listenerCount('data')).toBe(0);
        expect(emitter.listenerCount('error')).toBe(0);
    });

    it('shares the standard capture-rejection symbol and invokes its hook', async () => {
        expect(captureRejectionSymbol).toBe(nodeRejectionSymbol);
        const emitter = new EventEmitterX({ captureRejections: true });
        const failure = new Error('async listener failure');
        const received = new Promise<unknown[]>(resolve => {
            emitter[captureRejectionSymbol] = (error, eventName, ...args) => {
                resolve([ error, eventName, ...args ]);
            };
        });
        emitter.on('data', async () => {
            throw failure;
        });
        emitter.emit('data', 9);
        expect(await received).toEqual([ failure, 'data', 9 ]);
        emitter.destructor();
    });

    it('uses the native User Timing API and recent lifecycle primitives', () => {
        expect(typeof performance.mark).toBe('function');
        const owner = {};
        expect(new WeakRef(owner).deref()).toBe(owner);
        expect(typeof FinalizationRegistry).toBe('function');
        expect(typeof Symbol.dispose).toBe('symbol');
        expect(typeof Promise.withResolvers).toBe('function');
    });
});


describe('remaining emitter subscription contracts', () => {
    function withWarnings(make: Factory, action: (emitter: EventEmitter) => void) {
        const emitter = make();
        const warnings: { name?: string; emitter?: unknown; type?: unknown; count?: number }[] = [];
        const channel = make === nativeFactory ? runInThisContext('process') as NodeJS.Process : process;
        const intercept = jest.spyOn(channel, 'emitWarning').mockImplementation(warning => {
            warnings.push(warning as unknown as typeof warnings[number]);
        });
        using cleanup = {
            [Symbol.dispose]() {
                intercept.mockRestore();
                emitter.removeAllListeners();
            },
        };
        action(emitter);
        return warnings.map(warning => ({
            name: warning.name,
            owner: warning.emitter === emitter,
            type: warning.type,
            count: warning.count,
        }));
    }

    it.each([ 'data', '', Symbol('limited') ])('warns only after exceeding the limit and once per group (%p)', key => {
        const sequence = (make: Factory) => withWarnings(make, emitter => {
            emitter.setMaxListeners(2);
            for (let i = 0 ; i < 6 ; ++i) emitter.on(key, () => {
            });
            expect(emitter.listenerCount(key)).toBe(6);
        });
        const native = sequence(nativeFactory);
        expect(native).toEqual([ { name: 'MaxListenersExceededWarning', owner: true, type: key, count: 3 } ]);
        expect(sequence(customFactory)).toEqual(native);
    });

    it.each([ 0, Infinity ])('disables warnings with limit %p', limit => {
        for (const [ , make ] of factories) {
            expect(withWarnings(make, emitter => {
                expect(emitter.setMaxListeners(limit)).toBe(emitter);
                expect(emitter.getMaxListeners()).toBe(limit);
                for (let i = 0 ; i < 15 ; ++i) emitter.on('data', () => {
                });
            })).toEqual([]);
        }
    });

    it.each([
        'prepend', 'remove', 'recreate', 'once', 'fractional', 'collapse', 'limit-change',
    ])('preserves native warning lifetime (%s)', mode => {
        const sequence = (make: Factory) => withWarnings(make, emitter => {
            emitter.setMaxListeners(mode === 'fractional' ? 0.5 : 1);
            const a = () => {
            };
            const b = () => {
            };
            emitter.on('data', a).on('data', b).on('data', () => {
            });
            if (mode === 'prepend') {
                emitter.prependListener('data', () => {
                });
            }
            if (mode === 'collapse') {
                emitter.removeListener('data', a);
                emitter.removeListener('data', b);
                emitter.on('data', a);
            }
            if (mode === 'limit-change') {
                emitter.setMaxListeners(2);
                emitter.on('data', a);
            }
            if (mode === 'remove') {
                emitter.removeListener('data', a);
                emitter.on('data', a);
            }
            if (mode === 'recreate') {
                emitter.removeAllListeners('data');
                emitter.on('data', a).on('data', b);
            }
            if (mode === 'once') {
                emitter.once('data', a);
                emitter.emit('data');
                emitter.once('data', a);
            }
        });
        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it.each([
        -1, NaN, '2', null, undefined, {}, true,
    ])('rejects invalid listener limits (%p) without changing the value', value => {
        function sequence(make: Factory) {
            const emitter = make().setMaxListeners(3);
            using cleanup = {
                [Symbol.dispose]() {
                    emitter.removeAllListeners();
                },
            };
            try {
                emitter.setMaxListeners(value as number);
                throw new Error('invalid limit accepted');
            }
            catch (error) {
                const failure = error as { name: string; code?: string };
                return { name: failure.name, code: failure.code, limit: emitter.getMaxListeners() };
            }
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it('validates constructor limits and preserves the existing unlimited default', () => {
        using emitter = new EventEmitterX();
        expect(emitter.getMaxListeners()).toBe(Infinity);
        expect(() => new EventEmitterX({ maxListeners: -1 })).toThrow(RangeError);
        expect(() => new EventEmitterX({ maxListeners: NaN })).toThrow(RangeError);
        using zeroEmitter = new EventEmitterX({ maxListeners: 0 });
        expect(zeroEmitter.getMaxListeners()).toBe(0);
    });

    it.each([
        'insert', 'replace', 'clear', 'once', 'limit',
    ])('reloads subscription state after newListener (%s)', mode => {
        function sequence(make: Factory) {
            const emitter = make();
            const calls: string[] = [];
            const existing = () => {
                calls.push('existing');
            };
            const inserted = () => {
                calls.push('inserted');
            };
            emitter.on('data', existing);
            emitter.once('newListener', event => {
                if (event !== 'data') {
                    return;
                }
                if (mode === 'replace') {
                    emitter.removeAllListeners('data');
                }
                if (mode === 'clear') {
                    emitter.removeAllListeners();
                }
                if (mode === 'once') {
                    emitter.once('data', inserted);
                }
                else if (mode === 'limit') {
                    emitter.setMaxListeners(0);
                }
                else {
                    emitter.on('data', inserted);
                }
            });
            emitter.on('data', () => {
                calls.push('outer');
            });
            emitter.emit('data');
            emitter.emit('data');
            const count = emitter.listenerCount('data');
            emitter.removeAllListeners();
            return { calls, count };
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it('removes the most recently added duplicate even without any once wrapper', () => {
        function sequence(make: Factory) {
            const emitter = make();
            const calls: string[] = [];
            const a = () => {
                calls.push('a');
            };
            emitter.on('data', a).on('data', () => {
                calls.push('b');
            }).on('data', a);
            emitter.removeListener('data', a);
            emitter.emit('data');
            emitter.removeAllListeners();
            return calls;
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });

    it.each([
        'single', 'mixed', 'raw', 'absent',
    ])('counts a specified callback including once identity (%s)', mode => {
        function sequence(make: Factory) {
            const emitter = make();
            const callback = () => {
            };
            emitter.once('data', callback);
            if (mode === 'mixed') {
                emitter.on('data', callback).prependOnceListener('data', callback).on('data', () => {
                });
            }
            const selected = mode === 'raw' ? emitter.rawListeners('data')[0] : mode === 'absent' ? () => {
            } : callback;
            const before = emitter.listenerCount('data', selected);
            emitter.emit('data');
            const after = emitter.listenerCount('data', callback);
            emitter.removeAllListeners();
            return { before, after, absent: emitter.listenerCount('missing', callback) };
        }

        expect(sequence(customFactory)).toEqual(sequence(nativeFactory));
    });
});


describe('static listener inspection contracts', () => {
    it.each([ 'Node', 'custom', 'target' ])('returns detached original-listener snapshots (%s)', kind => {
        const first = () => {
        };
        const second = () => {
        };
        const emitter: EventTarget | EventEmitter = kind === 'target' ? new EventTarget() : kind === 'Node'
            ? new EventEmitter()
            : new EventEmitterX();
        if (emitter instanceof EventTarget) {
            emitter.addEventListener('data', first, { once: true });
        }
        else {
            emitter.once('data', first);
        }
        const nativeSnapshot = emitter instanceof EventTarget
            ? nodeGetEventListeners(emitter, 'data') : nodeGetEventListeners(emitter, 'data');
        expect(getEventListeners(emitter, 'data')).toEqual(nativeSnapshot);
        const snapshot = getEventListeners(emitter, 'data');
        snapshot.pop();
        expect(getEventListeners(emitter, 'data')).toEqual([ first ]);
        if (emitter instanceof EventTarget) {
            emitter.addEventListener('data', second);
            emitter.dispatchEvent(new Event('data'));
        }
        else {
            emitter.on('data', second);
            emitter.emit('data');
        }
        expect(getEventListeners(emitter, 'data')).toEqual([ second ]);
        if (emitter instanceof EventTarget) {
            emitter.removeEventListener('data', second);
        }
        else {
            emitter.removeAllListeners();
        }
    });
});


it('uses the current limit after newListener changes it', () => {
    for (const [ , make ] of factories) {
        const emitter = make().setMaxListeners(1);
        const channel = make === nativeFactory ? runInThisContext('process') as NodeJS.Process : process;
        const intercept = jest.spyOn(channel, 'emitWarning').mockImplementation(() => {
        });
        using cleanup = {
            [Symbol.dispose]() {
                intercept.mockRestore();
                emitter.removeAllListeners();
            },
        };
        emitter.on('data', () => {
        });
        emitter.once('newListener', event => {
            if (event === 'data') {
                emitter.setMaxListeners(0);
            }
        });
        emitter.on('data', () => {
        });
        expect(intercept).not.toHaveBeenCalled();
        expect(emitter.listenerCount('data')).toBe(2);
    }
});
