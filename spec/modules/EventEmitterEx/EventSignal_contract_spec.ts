'use strict';

/** @jest-environment jsdom */
import 'termi@polyfills';

import { EventEmitter } from 'node:events';

import { EventSignal } from '../../../modules/EventEmitterEx/EventSignal';

// Queue tests use real microtasks and controlled Promises, not timing delays.
describe('EventSignal ordered writes', () => {
    it('keeps Promise reads after disposing an async signal', async () => {
        for (const computation of [
            async (_prev: number, source: number) => source,
            (_prev: number, source: number) => Promise.resolve(source),
        ]) {
            using signal$ = new EventSignal(0, computation, { initialSourceValue: 1 });
            const reading = signal$.get();
            expect(reading).toBeInstanceOf(Promise);
            expect(await reading).toBe(1);
            signal$[Symbol.dispose]();
            const last = signal$.get();
            expect(last).toBeInstanceOf(Promise);
            expect(await last).toBe(1);
        }
    });

    it('keeps Promise reads when an async function is disposed before its first computation', async () => {
        using signal$ = new EventSignal(5, async (_prev, source) => source * 10, { initialSourceValue: 1 });
        signal$[Symbol.dispose]();
        const last = signal$.get();
        expect(last).toBeInstanceOf(Promise);
        expect(await last).toBe(5);
        expect(signal$.computationsCount).toBe(0);
        const pending = Promise.withResolvers<number>();
        using initiallyPending$ = new EventSignal(pending.promise);
        initiallyPending$[Symbol.dispose]();
        const pendingLast = initiallyPending$.get();
        expect(pendingLast).toBeInstanceOf(Promise);
        expect(await pendingLast).toBeUndefined();
        pending.resolve(9);
        const preview = Promise.withResolvers<number>();
        using queued$ = new EventSignal(0, () => preview.promise, { initialSourceValue: 0 });
        queued$.set(1);
        const write = queued$.set(prev => prev + 1);
        queued$[Symbol.dispose]();
        await expect(write).rejects.toThrow('destroyed');
        const previewLast = queued$.get();
        expect(previewLast).toBeInstanceOf(Promise);
        expect(await previewLast).toBe(0);
        preview.resolve(9);
    });

    it('tracks a projection dependency while its source is waiting for queued writes', async () => {
        const pending = Promise.withResolvers<number>();
        using source$ = new EventSignal(pending.promise);
        const write = source$.set(prev => prev + 1);
        using mapped$ = source$.map(value => value * 10);
        const reading = mapped$.get();
        pending.resolve(1);
        await write;
        expect(await reading).toBe(20);
        source$.set(5);
        expect(await mapped$.get()).toBe(50);
    });

    it('maps resolved async output as an independently disposed read-only projection', async () => {
        using source$ = new EventSignal('initial', async (_prev, source) => `item:${source}`, { initialSourceValue: 0 });
        using mapped$ = source$.map(value => value.length);
        expect(mapped$.getLast()).toBeUndefined();
        expect(await mapped$.get()).toBe(6);
        source$.set(10);
        expect(await mapped$.get()).toBe(7);
        expect(() => Reflect.apply(mapped$.set, mapped$, [99])).toThrow('read-only');
        expect(() => Reflect.apply(mapped$.mutate, mapped$, [99])).toThrow('read-only');
        mapped$[Symbol.dispose]();
        expect(source$.destroyed).toBe(false);
    });

    it('routes generated methods through ordered computed reducers', () => {
        using signal$ = new EventSignal(0, (_prev, source) => source * 10, { initialSourceValue: 0 });
        signal$.get();
        const increment = signal$.createMethod<number>((prev, increment) => prev + increment);
        increment(1);
        increment(1);
        expect(signal$.getSourceValue()).toBe(11);
        expect(signal$.get()).toBe(110);
    });

    it('does not let synchronous mutation bypass pending reducer writes', async () => {
        const pending = Promise.withResolvers<number>();
        using signal$ = new EventSignal(pending.promise);
        expect(() => signal$.mutate(9)).toThrow('initial value resolves');
        const write = signal$.set(prev => prev + 1);
        expect(() => signal$.mutate(9)).toThrow('writes are pending');
        pending.resolve(2);
        await write;
        expect(signal$.get()).toBe(3);
    });

    it('rejects queued writes when an already running computation fails', async () => {
        const pending = Promise.withResolvers<number>();
        using signal$ = new EventSignal(0, () => pending.promise);
        const reading = signal$.get();
        const write = signal$.set(prev => prev + 1);
        const failure = new Error('in-flight failure');
        pending.reject(failure);
        expect(await reading).toBe(0);
        await expect(write).rejects.toBe(failure);
        expect(signal$.getSourceValue()).toBeUndefined();
    });

    it('keeps literal source writes lazy', () => {
        using signal$ = new EventSignal(0, (_prev, source) => source * 10, { initialSourceValue: 0 });
        expect(signal$.get()).toBe(0);
        expect(signal$.computationsCount).toBe(1);
        signal$.set(1);
        signal$.set(2);
        signal$.set(3);
        expect(signal$.computationsCount).toBe(1);
        expect(signal$.get()).toBe(30);
        expect(signal$.computationsCount).toBe(2);
    });

    it('feeds transformed intermediate output to each reducer without publishing it', () => {
        using signal$ = new EventSignal(0, (_prev, source) => source * 10, { initialSourceValue: 0 });
        expect(signal$.get()).toBe(0);
        signal$.set(prev => prev + 1);
        signal$.set(prev => prev + 1);
        signal$.set(prev => prev + 1);
        expect(signal$.getSourceValue()).toBe(111);
        expect(signal$.getLast()).toBe(0);
        expect(signal$.computationsCount).toBe(3);
        expect(signal$.get()).toBe(1110);
        expect(signal$.computationsCount).toBe(4);
    });

    it('publishes a cached preview even if the next reducer keeps source unchanged', () => {
        using signal$ = new EventSignal(0, (_prev, source) => source * 10, { initialSourceValue: 0 });
        expect(signal$.get()).toBe(0);
        signal$.set(1);
        signal$.set((prev, source) => {
            expect(prev).toBe(10);
            return source;
        });
        expect(signal$.getLast()).toBe(0);
        expect(signal$.get()).toBe(10);
        expect(signal$.computationsCount).toBe(2);
    });

    it('preserves null preview output', () => {
        using signal$ = new EventSignal<number | null, number>(5, (_prev, source) => source === 1 ? null : source, { initialSourceValue: 0 });
        signal$.get();
        signal$.set(1);
        signal$.set(prev => {
            expect(prev).toBeNull();
            return 2;
        });
        expect(signal$.get()).toBe(2);
    });

    it('treats undefined preview as no update', () => {
        using signal$ = new EventSignal(5, (_prev, source) => source === 1 ? undefined : source, { initialSourceValue: 5 });
        signal$.get();
        signal$.set(1);
        signal$.set(prev => {
            expect(prev).toBe(5);
            return prev + 1;
        });
        expect(signal$.get()).toBe(6);
    });

    it('coalesces subscriber delivery despite intermediate computation', async () => {
        using signal$ = new EventSignal(0, (_prev, source) => source, { initialSourceValue: 0 });
        signal$.get();
        const listener = jest.fn();
        signal$.addListener(listener);
        listener.mockClear();
        signal$.set(prev => prev + 1);
        signal$.set(prev => prev + 1);
        signal$.set(prev => prev + 1);
        expect(listener).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(listener.mock.calls.map(([value]) => value)).toEqual([3]);
    });

    it('does not release throttled output during intermediate computation', () => {
        const emitter = new EventEmitter();
        {
            using signal$ = new EventSignal(0, (_prev, source) => source * 10, {
                initialSourceValue: 0,
                throttle: { type: 'emitter', emitter, event: 'release' },
            });
            expect(signal$.get()).toBe(0);
            const listener = jest.fn();
            signal$.addListener(listener);
            listener.mockClear();
            signal$.set(prev => prev + 1);
            signal$.set(prev => prev + 1);
            signal$.set(prev => prev + 1);
            expect(signal$.get()).toBe(0);
            expect(listener).not.toHaveBeenCalled();
            emitter.emit('release');
            expect(signal$.get()).toBe(1110);
            expect(listener.mock.calls.map(([value]) => value)).toEqual([1110]);
        }
        expect(emitter.listenerCount('release')).toBe(0);
    });

    it('orders async reducers and literal writes in the same queue', async () => {
        using signal$ = new EventSignal(0, async (_prev, source) => source * 10, { initialSourceValue: 0 });
        expect(await signal$.get()).toBe(0);
        const writes = [
            signal$.set(prev => prev + 1),
            signal$.set(prev => prev + 1),
            signal$.set(5),
            signal$.set(prev => prev + 1),
        ];
        expect(await signal$.get()).toBe(510);
        await Promise.all(writes);
        expect(signal$.getSourceValue()).toBe(51);
    });

    it('waits for a pending initial value before reducing a writable signal', async () => {
        const initial = Promise.withResolvers<number>();
        using signal$ = new EventSignal(initial.promise);
        const write = signal$.set(prev => prev + 1);
        initial.resolve(10);
        await write;
        expect(await signal$.get()).toBe(11);
    });

    it('rejects pending writes on dispose and ignores a late initial completion', async () => {
        const initial = Promise.withResolvers<number>();
        using signal$ = new EventSignal(initial.promise);
        const write = signal$.set(prev => prev + 1);
        const reading = signal$.get();
        signal$[Symbol.dispose]();
        await expect(write).rejects.toThrow('destroyed');
        await expect(reading).rejects.toThrow('destroyed');
        const version = signal$.version;
        initial.resolve(10);
        await Promise.resolve();
        await Promise.resolve();
        expect(signal$.version).toBe(version);
        expect(signal$.getSourceValue()).toBeUndefined();
    });

    it('cancels queued reducers through AbortSignal', async () => {
        const pending = Promise.withResolvers<number>();
        const controller = new AbortController();
        using signal$ = new EventSignal(0, (_prev, source) => source ? pending.promise : Promise.resolve(0), {
            initialSourceValue: 0, signal: controller.signal,
        });
        await signal$.get();
        signal$.set(1);
        const reducer = jest.fn((prev: number) => prev + 1);
        const write = signal$.set(reducer);
        controller.abort();
        await expect(write).rejects.toThrow('destroyed');
        pending.resolve(10);
        await Promise.resolve();
        await Promise.resolve();
        expect(reducer).not.toHaveBeenCalled();
        expect(signal$.destroyed).toBe(true);
    });

    it('rejects the batch on a preview error and accepts a later independent write', async () => {
        const failure = new Error('preview failed');
        using signal$ = new EventSignal(0, async (_prev, source) => {
            if (source === 1) throw failure;
            return source;
        }, { initialSourceValue: 0 });
        await signal$.get();
        signal$.set(1);
        const first = signal$.set(prev => prev + 1);
        const second = signal$.set(5);
        await expect(first).rejects.toBe(failure);
        await expect(second).rejects.toBe(failure);
        expect(signal$.lastError).toBe(failure);
        expect(signal$.getLast()).toBe(0);
        signal$.set(10);
        await signal$.set(prev => prev + 1);
        expect(await signal$.get()).toBe(11);
    });

    it('rejects a queued reducer error and drops subsequent writes', async () => {
        const pending = Promise.withResolvers<number>();
        using signal$ = new EventSignal(pending.promise);
        const failure = new Error('reducer failed');
        const first = signal$.set(() => { throw failure; });
        const second = signal$.set(9);
        pending.resolve(2);
        await expect(first).rejects.toBe(failure);
        await expect(second).rejects.toBe(failure);
        expect(signal$.getSourceValue()).toBeUndefined();
    });

    it('rejects Promise-returning reducers instead of storing Promise as source', () => {
        using signal$ = new EventSignal(0);
        expect(() => signal$.set((() => Promise.resolve(1)) as unknown as (prev: number) => number))
            .toThrow('synchronous source');
        expect(signal$.get()).toBe(0);
    });

    it('keeps late async resolve and reject from notifying a destroyed signal', async () => {
        for (const reject of [false, true]) {
            const pending = Promise.withResolvers<number>();
            using signal$ = new EventSignal(0, () => pending.promise);
            const reading = signal$.get();
            const listener = jest.fn();
            signal$.addListener(listener);
            signal$[Symbol.dispose]();
            await expect(reading).rejects.toThrow('destroyed');
            listener.mockClear();
            if (reject) pending.reject(new Error('late'));
            else pending.resolve(42);
            await Promise.resolve();
            await Promise.resolve();
            expect(signal$.getLast()).toBe(0);
            expect(listener).not.toHaveBeenCalled();
        }
    });
});
