/** @jest-environment jsdom */
'use strict';

require('termi@polyfills');

import { EventEmitter as NativeEmitter } from 'node:events';

import {
    EventEmitterX,
    EventEmitterProxy,
    getEventListeners,
    kDestroyingEvent,
    isEventEmitterX,
} from '../../../modules/events';

import { checkProxySubscriptionOwnership } from './EventEmitterProxy/test__proxySubscriptionOwnership';

describe('EventEmitterProxy', function() {
    describe('common usage', function() {
        it('instanceof', function() {
            expect(new EventEmitterProxy()).toBeInstanceOf(EventEmitterProxy);
            expect(new EventEmitterProxy()).toBeInstanceOf(EventEmitterX);
            const eventEmitterEx = new EventEmitterX();

            const eventEmitterProxy = new EventEmitterProxy({ targetEmitter: eventEmitterEx });

            expect(isEventEmitterX(eventEmitterProxy)).toBe(true);
        });

        it('destructor', function() {
            const emitter = new EventEmitterX();
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
            const emitter = new EventEmitterX();
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
            const emitter = new EventEmitterX();
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
            const ee = new EventEmitterX();
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
    });

    // Subscription ownership regression coverage.
    describe('routed proxy subscription ownership', () => {
        checkProxySubscriptionOwnership(source => {
            return new EventEmitterProxy({ sourceEmitter: source });
        });
    });

    describe('routed proxy hooks and target failures', () => {
        it('cleans recorded sources without recomputing a changed hook', () => {
            using first = new EventEmitterX();
            using second = new EventEmitterX();
            let selected = first;
            const hook = jest.fn(() => selected);
            using proxy = new EventEmitterProxy({ getSourceEmitter: hook });
            const key = Symbol('routed');
            proxy.on(key, () => {});
            selected = second;
            proxy.on(key, () => {});
            expect(first.listenerCount(key)).toBe(1);
            expect(second.listenerCount(key)).toBe(1);
            const calls = hook.mock.calls.length;
            proxy.removeAllListeners();
            expect(hook).toHaveBeenCalledTimes(calls);
            expect(first.listenerCount(key)).toBe(0);
            expect(second.listenerCount(key)).toBe(0);
            proxy.on(key, () => {});
            expect(second.listenerCount(key)).toBe(1);
        });

        it('restores anti-loop state after a target listener throws', () => {
            using source = new EventEmitterX();
            using proxy = new EventEmitterProxy({ sourceEmitter: source, targetEmitter: source, allowDirectEmitToTarget: true });
            const failure = new Error('target failed');
            const throwing = () => { throw failure; };
            const received = jest.fn();
            proxy.on('data', received);
            source.on('data', throwing);
            expect(() => proxy.emit('data', 1)).toThrow(failure);
            source.removeListener('data', throwing);
            source.emit('data', 2);
            proxy.emit('data', 3);
            expect(received.mock.calls).toEqual([[2], [3]]);
        });

        it('does not attach a source selected by a hook after destruction', () => {
            using source = new EventEmitterX();
            using proxy = new EventEmitterProxy({ getSourceEmitter: () => source });
            proxy.destructor();
            proxy.setGetSourceEmitter(() => source);
            proxy.on('data', () => {});
            expect(proxy.listenerCount('data')).toBe(0);
            expect(source.listenerCount('data')).toBe(0);
        });

        it('cleans symbol bridges on a native Node source', () => {
            const source = new NativeEmitter();
            using proxy = new EventEmitterProxy({ sourceEmitter: source });
            const key = Symbol('native');
            const external = () => {};
            source.on(key, external);
            proxy.on(key, () => {});
            proxy.removeAllListeners(key);
            expect(source.listeners(key)).toEqual([external]);
        });
    });
});
