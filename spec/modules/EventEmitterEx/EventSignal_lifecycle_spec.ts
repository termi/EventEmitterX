'use strict';

import 'termi@polyfills';
import { EventEmitter } from 'node:events';
import { EventSignal, __test__get_signalEventsEmitter, __test__get_subscribersEventsEmitter } from '../../../modules/EventEmitterEx/EventSignal';

describe('EventSignal lifecycle ownership', () => {
    it('attempts every external removal even when emitter cleanup throws', () => {
        class ThrowingEmitter extends EventEmitter {
            override removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
                super.removeListener(eventName, listener);
                throw new Error(`cleanup ${String(eventName)}`);
            }
        }
        const source = new ThrowingEmitter();
        const trigger = new EventEmitter();
        const onDestroy = jest.fn();
        using signal$ = new EventSignal(0, () => 1, {
            sourceEmitter: source, sourceEvent: ['a', 'b'], onDestroy,
            trigger: { type: 'emitter', emitter: trigger, event: 'tick' },
        });
        expect(() => signal$.destructor()).toThrow(AggregateError);
        expect(source.listenerCount('a')).toBe(0);
        expect(source.listenerCount('b')).toBe(0);
        expect(trigger.listenerCount('tick')).toBe(0);
        expect(onDestroy).toHaveBeenCalledTimes(1);
        expect(() => signal$.destructor()).not.toThrow();
    });
    it('destroys immediately with an already aborted owner signal', () => {
        const owner = new AbortController();
        owner.abort();
        const emitter = new EventEmitter();
        const onDestroy = jest.fn();
        using signal$ = new EventSignal(0, { sourceEmitter: emitter, sourceEvent: 'data', signal: owner.signal, onDestroy });

        expect(signal$.destroyed).toBe(true);
        expect(emitter.listenerCount('data')).toBe(0);
        signal$[Symbol.dispose]();
        expect(onDestroy).toHaveBeenCalledTimes(1);
    });

    it('cleans source, dependencies, trigger and subscribers before reporting cleanup errors', () => {
        const source = new EventEmitter();
        const trigger = new EventEmitter();
        const owner = new AbortController();
        using parent$ = new EventSignal(1);
        const failure = new Error('destroy failure');
        const onDestroy = jest.fn(() => { throw failure; });
        using computed$ = new EventSignal(0, () => parent$.get() * 2, {
            sourceEmitter: source, sourceEvent: 'data', signal: owner.signal,
            trigger: { type: 'emitter', emitter: trigger, event: 'tick' }, onDestroy,
        });
        computed$.get();
        computed$.on(() => {});

        expect(() => computed$.destructor()).toThrow(AggregateError);
        expect(source.listenerCount('data')).toBe(0);
        expect(trigger.listenerCount('tick')).toBe(0);
        expect(__test__get_signalEventsEmitter().listenerCount(parent$.eventName)).toBe(0);
        expect(__test__get_subscribersEventsEmitter().listenerCount(computed$.eventName)).toBe(0);
        owner.abort();
        expect(() => computed$.destructor()).not.toThrow();
        expect(onDestroy).toHaveBeenCalledTimes(1);
    });

    it('cleans earlier resources when constructor setup fails', () => {
        const source = new EventEmitter();
        const target = new EventTarget();
        const onDestroy = jest.fn();
        expect(() => new EventSignal(0, (_prev, sourceValue) => sourceValue, {
            sourceEmitter: source, sourceEvent: 'data', onDestroy,
            trigger: { type: 'emitter', emitter: target, event: ['tick', Symbol('invalid EventTarget event')] },
        })).toThrow();
        expect(source.listenerCount('data')).toBe(0);
        expect(onDestroy).toHaveBeenCalledTimes(1);
    });

    it('does not resume a closed subscription or a destroyed signal', () => {
        using signal$ = new EventSignal(0);
        const subscription = signal$.on(() => {});
        expect(subscription.suspend()).toBe(true);
        expect(subscription.resume()).toBe(true);
        subscription.unsubscribe();
        subscription.unsubscribe();
        expect(subscription.closed).toBe(true);
        expect(subscription.suspend()).toBe(false);
        expect(subscription.resume()).toBe(false);
        const second = signal$.on(() => {});
        second.suspend();
        signal$[Symbol.dispose]();
        expect(second.closed).toBe(true);
        expect(second.resume()).toBe(false);
    });

    it('preserves identity, once and prepend across weak registration', async () => {
        using signal$ = new EventSignal(0);
        const received: string[] = [];
        const listener = () => { received.push('ordinary'); };
        signal$.on('change', listener);
        signal$.on('change', listener);
        signal$.prependOnceListener('change', () => { received.push('first'); });
        signal$.set(1);
        await Promise.resolve();
        expect(received).toEqual(['first', 'ordinary']);
        signal$.removeListener('change', listener);
        signal$.set(2);
        await Promise.resolve();
        expect(received).toEqual(['first', 'ordinary']);
        expect(__test__get_subscribersEventsEmitter().listenerCount(signal$.eventName)).toBe(0);
    });
});
