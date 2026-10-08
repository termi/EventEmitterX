/** @jest-environment node */
'use strict';

import 'termi@polyfills';
import {
    EventEmitter,
    once as nodeOnce,
    on as nodeOn,
    captureRejectionSymbol as nodeRejectionSymbol,
} from 'node:events';
import { performance } from 'node:perf_hooks';
import { runInThisContext } from 'node:vm';
import { EventEmitterX, once, on, captureRejectionSymbol } from '../../modules/events';

type Factory = () => EventEmitter;
const nativeFactory: Factory = () => new EventEmitter();
const customFactory: Factory = () => new EventEmitterX();
const factories: [ string, Factory ][] = [ [ 'Node', nativeFactory ], [ 'EventEmitterX', customFactory ] ];

describe('native Node emitter contracts', () => {
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
        const awaitEvent = make === nativeFactory ? nodeOnce : once;
        const emitter = make();
        const successful = awaitEvent(emitter, 'data');
        emitter.emit('data', 1, 'ready');
        expect(await successful).toEqual([ 1, 'ready' ]);
        expect(emitter.listenerCount('data')).toBe(0);
        expect(emitter.listenerCount('error')).toBe(0);
        const failure = new Error('event failure');
        const failing = awaitEvent(emitter, 'data');
        emitter.emit('error', failure);
        await expect(failing).rejects.toBe(failure);
        const owner = new AbortController();
        const aborted = awaitEvent(emitter, 'data', { signal: owner.signal });
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
