/** @jest-environment jsdom */
'use strict';

import 'termi@polyfills';

import { performance as nodePerformance } from 'node:perf_hooks';

import ServerTiming from 'termi@ServerTiming';

import { once, addAbortListener } from '../../modules/events';

describe('DOM event waits with explicit timing capability', () => {
    it('uses a once-only disposable browser abort registration', () => {
        const owner = new AbortController();
        const callback = jest.fn();
        using registration = addAbortListener(owner.signal, callback);
        owner.signal.dispatchEvent(new Event('abort'));
        owner.signal.dispatchEvent(new Event('abort'));
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(Event);
    });

    it('disposes a browser abort listener before delivery', () => {
        const owner = new AbortController();
        const callback = jest.fn();
        const registration = addAbortListener(owner.signal, callback);
        registration[Symbol.dispose]();
        registration[Symbol.dispose]();
        owner.abort();
        expect(callback).not.toHaveBeenCalled();
    });

    it('delivers browser pre-aborted registration asynchronously', async () => {
        const owner = new AbortController();
        owner.abort();
        const callback = jest.fn();
        using registration = addAbortListener(owner.signal, callback);
        expect(callback).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0]?.[0].type).toBe('abort');
    });

    it('documents the browser stopImmediatePropagation limitation', () => {
        const owner = new AbortController();
        owner.signal.addEventListener('abort', event => { event.stopImmediatePropagation(); });
        const callback = jest.fn();
        using registration = addAbortListener(owner.signal, callback);
        owner.abort();
        expect(callback).not.toHaveBeenCalled();
    });

    it('rejects invalid browser abort registration arguments', () => {
        expect(() => addAbortListener(null as unknown as AbortSignal, () => {})).toThrow();
        expect(() => addAbortListener(new AbortController().signal, null as unknown as (event: Event) => void)).toThrow();
    });

    it('keeps DOM performance intact and measures success through the injected backend', async () => {
        const domPerformance = globalThis.performance;
        const target = new EventTarget();
        const timing = new ServerTiming({ customPerformance: nodePerformance });
        const pending = once(target, 'data', { timing });
        const event = new Event('data');
        target.dispatchEvent(event);
        expect(await pending).toEqual([ event ]);
        expect(timing).toHaveLength(1);
        expect(globalThis.performance).toBe(domPerformance);
        expect(timing.getTimings()[0]?.duration).toBeGreaterThanOrEqual(0);
    });

    it('cleans DOM listeners on abort and supports a structural timing implementation', async () => {
        const target = new EventTarget();
        const owner = new AbortController();
        const timing = { time: jest.fn(), timeEnd: jest.fn(), timeClear: jest.fn() };
        const add = jest.spyOn(target, 'addEventListener');
        const remove = jest.spyOn(target, 'removeEventListener');
        const pending = once(target, 'data', { signal: owner.signal, timing });
        owner.abort();
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        expect(timing.time).toHaveBeenCalledWith('data');
        const dataCallback = add.mock.calls.find(([ name ]) => name === 'data')?.[1];
        expect(dataCallback).toBeDefined();
        expect(remove.mock.calls.some(([ name, listener ]) => name === 'data' && listener === dataCallback)).toBe(true);
        add.mockRestore();
        remove.mockRestore();
    });
});
