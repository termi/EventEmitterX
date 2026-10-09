/** @jest-environment jsdom */
'use strict';

require('termi@polyfills');

import { EventEmitterX, EventEmitterSimpleProxy, getEventListeners, kDestroyingEvent, isEventEmitterX } from '../../../modules/events';

import { checkProxySubscriptionOwnership } from './EventEmitterProxy/test__proxySubscriptionOwnership';

describe('EventEmitterSimpleProxy', function() {
    describe('common usage', function() {
        it('instanceof', function() {
            const emitter = new EventEmitterX();

            expect(new EventEmitterSimpleProxy({ emitter })).toBeInstanceOf(EventEmitterSimpleProxy);
            expect(new EventEmitterSimpleProxy({ emitter })).toBeInstanceOf(EventEmitterX);
            const eventEmitterEx = new EventEmitterX();

            const eventEmitterSimpleProxy = new EventEmitterSimpleProxy({ emitter: eventEmitterEx });

            expect(isEventEmitterX(eventEmitterSimpleProxy)).toBe(true);
        });

        it('destructor', function() {
            const emitter = new EventEmitterX();
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
            const emitter = new EventEmitterX();
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
            const emitter = new EventEmitterX();
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
    });

    // Subscription ownership regression coverage.
    describe('simple proxy subscription ownership', () => {
        checkProxySubscriptionOwnership(source => {
            return new EventEmitterSimpleProxy({ emitter: source });
        });
    });
});
