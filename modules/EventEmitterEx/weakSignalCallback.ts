'use strict';

export type SignalCallback = (...args: any[]) => any;
export type SignalListener = (...args: any[]) => void;

/** A signal owns original callbacks; channels receive their weak wrappers. */
export type OwnedWeakCallbacks = Map<SignalCallback, SignalCallback>;

export interface WeakListenerRecord {
    dispatch: SignalListener;
    weak: SignalListener;
}

export type WeakListenerCallbacks = Map<SignalListener, WeakListenerRecord>;

export const enum SignalSubscriptionFlags {
    None = 0,
    Once = 1 << 1,
    Prepend = 1 << 2,
    Direct = 1 << 3,
}

/** Create outside the signal's lexical scope; hold only the weak callback reference. */
export function weakCallback<F extends SignalCallback>(reference: WeakRef<F>): F {
    return function(this: unknown, ...args: Parameters<F>) {
        return reference.deref()?.apply(this, args);
    } as F;
}

/** Reuse registration identity and release a once listener before invoking user code. */
export function getWeakListener(
    records: WeakListenerCallbacks,
    listener: SignalListener,
    flags: SignalSubscriptionFlags,
    makeReference: (callback: SignalListener) => WeakRef<SignalListener>,
): SignalListener {
    const existing = records.get(listener);

    if (existing) {
        return existing.weak;
    }

    const dispatch = function(this: unknown, ...args: any[]) {
        if ((flags & SignalSubscriptionFlags.Once) !== 0) {
            records.delete(listener);
        }

        return listener.apply(this, args);
    };
    const weak = weakCallback(makeReference(dispatch));

    records.set(listener, { dispatch, weak });

    return weak;
}
