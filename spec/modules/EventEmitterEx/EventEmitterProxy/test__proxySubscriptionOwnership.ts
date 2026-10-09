'use strict';

import { EventEmitterX } from '../../../../modules/events';

/** Register the shared ownership contract in each proxy's dedicated specification. */
export function checkProxySubscriptionOwnership(createProxy: (source: EventEmitterX) => EventEmitterX): void {
    it('removeAllListeners(void 0) removes owned bridges and preserves unrelated listeners', () => {
        using source = new EventEmitterX();
        using proxy = createProxy(source);
        const symbol = Symbol('owned');
        const external = jest.fn();
        source.on(symbol, external);
        for (const key of ['data', '', 0, symbol]) proxy.on(key, () => {});
        expect(proxy.removeAllListeners(void 0)).toBe(proxy);
        expect(proxy.eventNames()).toEqual([]);
        expect(source.eventNames()).toEqual([symbol]);
        expect(source.listeners(symbol)).toEqual([external]);
        source.emit(symbol);
        expect(external).toHaveBeenCalledTimes(1);
    });

    it.each(['data', '', 0, Symbol('selected')])('removeAllListeners(%p) removes only the selected bridges', key => {
        using source = new EventEmitterX();
        using proxy = createProxy(source);
        const retained = jest.fn();
        const external = jest.fn();
        source.on(key, external);
        proxy.on(key, () => {});
        proxy.on('retained', retained);
        expect(proxy.removeAllListeners(key)).toBe(proxy);
        expect(source.listeners(key)).toEqual([external]);
        expect(source.listenerCount('retained')).toBe(1);
        source.emit('retained');
        expect(retained).toHaveBeenCalledTimes(1);
        proxy.on(key, () => {});
        expect(source.listenerCount(key)).toBe(2);
    });

    it.each([false, true])('keeps persistent delivery when a final once listener is added (prepend=%p)', prepend => {
        using source = new EventEmitterX();
        using proxy = createProxy(source);
        const persistent = jest.fn();
        const once = jest.fn();
        proxy.on('data', persistent);
        if (prepend) proxy.prependOnceListener('data', once);
        else proxy.once('data', once);
        source.emit('data', 1);
        source.emit('data', 2);
        expect(persistent.mock.calls).toEqual([[1], [2]]);
        expect(once.mock.calls).toEqual([[1]]);
        expect(source.listenerCount('data')).toBe(1);
        proxy.removeListener('data', persistent);
        expect(source.listenerCount('data')).toBe(0);
    });

    it('detaches the final once bridge and allows a new subscription afterward', () => {
        using source = new EventEmitterX();
        using proxy = createProxy(source);
        const listener = jest.fn();
        proxy.once('data', listener);
        source.emit('data', 1);
        expect(source.listenerCount('data')).toBe(0);
        proxy.on('data', listener);
        source.emit('data', 2);
        expect(listener.mock.calls).toEqual([[1], [2]]);
    });

    it('does not remove the shared bridge until the last local listener is removed', () => {
        using source = new EventEmitterX();
        using proxy = createProxy(source);
        const first = () => {};
        const second = () => {};
        proxy.on('data', first);
        proxy.on('data', second);
        expect(source.listenerCount('data')).toBe(1);
        proxy.removeListener('data', first);
        expect(source.listenerCount('data')).toBe(1);
        proxy.removeListener('data', second);
        expect(source.listenerCount('data')).toBe(0);
    });

    it.each([0, '0'])('shares a bridge for equivalent numeric/string keys and removes it through %p', removed => {
        using source = new EventEmitterX();
        using proxy = createProxy(source);
        const callback = jest.fn();
        proxy.on(0, callback);
        proxy.on('0', callback);
        expect(source.listenerCount('0')).toBe(1);
        source.emit(0);
        expect(callback).toHaveBeenCalledTimes(2);
        proxy.removeAllListeners(removed);
        expect(source.listenerCount('0')).toBe(0);
        expect(proxy.listenerCount(0)).toBe(0);
    });

    it('cleans nested proxy forwarding without touching a sibling owner', () => {
        using source = new EventEmitterX();
        using parent = createProxy(source);
        using child = createProxy(parent);
        const sibling = jest.fn();
        parent.on('data', sibling);
        child.on('data', () => {});
        child.removeAllListeners();
        expect(parent.listeners('data')).toEqual([sibling]);
        expect(source.listenerCount('data')).toBe(1);
        source.emit('data');
        expect(sibling).toHaveBeenCalledTimes(1);
    });
}
