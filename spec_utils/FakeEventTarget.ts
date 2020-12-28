/* eslint-disable promise/prefer-await-to-callbacks */
// noinspection JSUnusedGlobalSymbols

'use strict';

// import './performancePolyfill';

import { isAbortSignal } from "termi@abortable";

const kPropagationStopped = Symbol('kPropagationStopped');
const kImmediatePropagationStopped = Symbol('kImmediatePropagationStopped');
const kDefaultPrevented = Symbol('kDefaultPrevented');

export class FakeEvent implements Event {
    public readonly isFakeEvent = true;

    constructor(public type: string, props?: Object) {
        if (props) {
            Object.assign(this, props);
        }
    }

    stopPropagation() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore `TS7053: Element implicitly has an any type because expression of type unique symbol can't be used to index type FakeEvent`
        this[kPropagationStopped] = true;
    }

    stopImmediatePropagation() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore `TS7053: Element implicitly has an any type because expression of type unique symbol can't be used to index type FakeEvent`
        this[kImmediatePropagationStopped] = true;
    }

    preventDefault() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore `TS7053: Element implicitly has an any type because expression of type unique symbol can't be used to index type FakeEvent`
        this[kDefaultPrevented] = true;
    }

    get defaultPrevented() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore `TS7053: Element implicitly has an any type because expression of type unique symbol can't be used to index type FakeEvent`
        return this[kDefaultPrevented] || false;
    }

    readonly NONE = 0;
    readonly CAPTURING_PHASE = 1;
    readonly AT_TARGET = 2;
    readonly BUBBLING_PHASE = 3;

    bubbles = false;
    /** @deprecated */
    readonly cancelBubble = false;
    cancelable = false;
    readonly composed = false;
    readonly eventPhase = FakeEvent.AT_TARGET;
    readonly isTrusted = false;
    returnValue: any | boolean;
    /** @deprecated */
    readonly srcElement = null;
    target: EventTarget | null = null;
    currentTarget: EventTarget | null = null;
    readonly timeStamp: DOMHighResTimeStamp = performance.now();

    setTarget(target: EventTarget | null = null, currentTarget: EventTarget | null = null) {
        this.target = target;
        this.currentTarget = currentTarget;
    }

    // eslint-disable-next-line class-methods-use-this
    composedPath(): EventTarget[] {
        return [];
    }

    initEvent(type: string, bubbles?: boolean, cancelable?: boolean): void {
        this.type = type;
        this.bubbles = !!bubbles;
        this.cancelable = !!cancelable;
    }

    static readonly NONE: number = 0;
    static readonly CAPTURING_PHASE: number = 1;
    static readonly AT_TARGET: number = 2;
    static readonly BUBBLING_PHASE: number = 3;
}

export class FakeEventTarget implements EventTarget {
    public readonly isFakeEventTarget = true;

    private readonly _listeners: {
        [key: string]: {
            callback: EventListenerOrEventListenerObject,
            once?: boolean,
            capture: boolean,
            unsubscribeSignalCallback: (() => void) | undefined,
            options: boolean | undefined | AddEventListenerOptions & { signal?: AbortSignal },
        }[],
    } = Object.create(null);

    private _supports = {
        capture: void 0,
        once: void 0,
        passive: void 0,
        signal: void 0,
    } as {
        capture?: boolean,
        once?: boolean,
        passive?: boolean,
        signal?: boolean,
    };

    constructor() {
        Object.defineProperty(this, 'listeners', { enumerable: false, writable: true, configurable: true });
    }

    initSupports(options: {
        capture?: boolean,
        once?: boolean,
        passive?: boolean,
        signal?: boolean,
    } = {}) {
        const {
            capture = void 0,
            once = void 0,
            passive = void 0,
            signal = void 0,
        } = options;

        // set default values if not provided
        this._supports = {
            capture,
            once,
            passive,
            signal,
        };
    }

    /**
     * We SHOULD read `options[key]`, to match we native EventTarget.addEventListener
     *  (for cftools/web/DOMTools.ts~eventTargetHasOnceSupport)
     * @param options
     */
    touchEventListenerOptions(options?: boolean | (AddEventListenerOptions | EventListenerOptions) & { signal?: AbortSignal }) {
        const has = {
            capture: false,
            once: false,
            passive: false,
            signal: false,
        };

        if (typeof options !== 'object' || !options) {
            return has;
        }

        for (const prop of (Object.keys(this._supports) as [ 'capture', 'once', 'passive', 'signal' ])) {
            if (this._supports[prop]) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore `TS7053: Element implicitly has an any type because expression of type "capture" | "once" | "passive" | "signal" can't be used to index type`
                const value = options[prop];

                has[prop] = value !== void 0;
            }
        }

        return has;
    }

    addEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options: boolean | (AddEventListenerOptions & { signal?: AbortSignal }) = {},
    ) {
        this.touchEventListenerOptions(options);

        const {
            once: onceSupported = true,
            signal: signalSupported = true,
            capture: captureSupported = true,
        } = this._supports;

        const { signal } = signalSupported
            ? typeof options === 'object' && !!options ? options : {} as { signal?: AbortSignal }
            : {} as { signal?: AbortSignal }
        ;

        if (signal !== void 0) {
            if (!isAbortSignal(signal)) {
                throw new TypeError(`Failed to execute 'addEventListener' on 'EventTarget': member signal is not of type AbortSignal.`);
            }
        }

        if (!callback) {
            return;
        }

        const capture = captureSupported && (typeof options === 'object' && !!options ? !!options.capture : Boolean(options));
        let listeners = this._listeners[type] as NonNullable<typeof this._listeners['']>;

        if (!this._listeners[type]) {
            listeners = [];

            this._listeners[type] = listeners;
        }
        else if (listeners.some(listener => listener.callback === callback && listener.capture === capture)) {
            // already has this listener
            return;
        }

        let unsubscribeSignalCallback: (() => void) | undefined;

        if (signal) {
            if (signal.aborted) {
                return;
            }

            const abortListener = () => {
                this.removeEventListener(type, callback);
            };

            unsubscribeSignalCallback = function() {
                signal.removeEventListener('abort', abortListener);
            };

            signal.addEventListener('abort', abortListener, { once: true });
        }

        const once = onceSupported
            && (typeof options === 'object' && !!options ? !!(options.once as unknown) : void 0)
            || void 0
        ;

        listeners.push({
            callback,
            once,
            capture,
            unsubscribeSignalCallback,
            // Сохраняем ссылку на options, для получения options в методе getListenerOptions
            options,
        });
    }

    removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean,
    ) {
        this.touchEventListenerOptions(options);

        const listeners = this._listeners[type];

        if (!listeners) {
            return;
        }

        const {
            capture: captureSupported = true,
        } = this._supports;
        const capture = captureSupported && (typeof options === 'object' && !!options ? !!options.capture : !!options);
        const index = listeners.findIndex(listener => listener.callback === callback && listener.capture === capture);

        if (index !== -1) {
            const listener = listeners[index] as NonNullable<typeof listeners[0]>;
            const {
                unsubscribeSignalCallback,
            } = listener;

            if (unsubscribeSignalCallback) {
                unsubscribeSignalCallback();
                listener.unsubscribeSignalCallback = void 0;
            }

            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            delete this._listeners[type];
        }
    }

    dispatchEvent(event: Event) {
        const { type } = event;
        const typeWithLeadingOn = `on${type}` as const;
        const target = this as unknown as FakeEventTarget & { [key: `on${string}`]: Function };

        if (typeof target[typeWithLeadingOn] === 'function') {
            target[typeWithLeadingOn](event);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore TS7053: Element implicitly has an any type because expression of type unique symbol can't be used to index type Event
            if (event[kImmediatePropagationStopped]) {
                // ПОКАЗАТЕЛЬНЫЙ СЛУЧАЙ, когда правило "unicorn/consistent-destructuring", после авто-фикса СЛОМАЕТ КОД.
                // Т.к. свойство `defaultPrevented` изменяется в обработчике события `this[typeWithLeadingOn](event)`.
                // eslint-disable-next-line unicorn/consistent-destructuring
                return !event.defaultPrevented;
            }
        }

        // do not copy listeners array (!)
        const listeners = this._listeners[type];

        if (!listeners) {
            return false;
        }

        const isFakeEvent = event instanceof FakeEvent;

        if (isFakeEvent) {
            (event as FakeEvent).setTarget(this, this);
        }

        for (let i = 0, len = listeners.length ; i < len ; i++) {
            const listener = listeners[i] as NonNullable<typeof listeners[0]>;
            const { callback, once } = listener;

            try {
                if (typeof callback === 'object') {
                    if (callback) {
                        const { handleEvent } = callback as EventListenerObject;

                        if (typeof handleEvent === 'function') {
                            handleEvent.call(callback, event);
                        }
                    }
                }
                else if (typeof callback === 'function') {
                    callback.call(this, event);
                }
            }
            catch (err) {
                setImmediate(() => {
                    throw err;
                });
            }

            if (once) {
                const { unsubscribeSignalCallback } = listener;

                if (unsubscribeSignalCallback) {
                    unsubscribeSignalCallback();
                    listener.unsubscribeSignalCallback = void 0;
                }

                listeners.splice(i, 1);
                i--;
                len--;

                if (len === 0) {
                    delete this._listeners[type];
                }
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore TS7053: Element implicitly has an any type because expression of type unique symbol can't be used to index type Event
            if (event[kImmediatePropagationStopped]) {
                break;
            }
        }

        if (isFakeEvent) {
            (event as FakeEvent).setTarget();
        }

        // через вызов event.preventDefault() нельзя отменить abort.
        // eslint-disable-next-line unicorn/consistent-destructuring
        return !event.defaultPrevented;
    }

    listenerCount(type: string) {
        const listeners = this._listeners[type];

        if (listeners) {
            return listeners.length;
        }

        return 0;
    }

    getListenerOptions(type: string, callback: EventListenerOrEventListenerObject) {
        const listeners = this._listeners[type];

        if (!listeners) {
            return;
        }

        const index = listeners.findIndex(({ callback: existedCallback }) => existedCallback === callback);

        if (index !== -1) {
            const listener = listeners[index] as NonNullable<typeof listeners[0]>;
            const {
                options,
            } = listener;

            return options;
        }
    }

    getListenersOptions(type: string) {
        return (this._listeners[type] || []).map(listener => listener.options);
    }
}
