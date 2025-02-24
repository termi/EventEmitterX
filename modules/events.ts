/* eslint-disable @typescript-eslint/no-magic-numbers */
'use strict';
/// <reference types="node" />

// see: https://github.com/nodejs/node/blob/master/lib/events.js

// todo: Изучить [DOM-compatible EventTarget](https://github.com/yiminghe/ts-event-target/blob/main/src/index.ts)
// todo: Изучить [eventtargeter](https://github.com/brettz9/eventdispatcher.js/blob/master/EventTarget-es6.js)
// todo: Реализовать EventTarget (для старых версий nodejs):
//  копировать код из https://github.com/nodejs/node/blob/master/lib/internal/event_target.js
//  - тесты:
//    - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget.js

// also see: https://github.com/jonathanong/ee-first

import type ServerTiming from 'termi@ServerTiming';
import type {
    // default as TAbortController,
    AbortControllersGroup as TAbortControllersGroup,
} from 'termi@abortable';
import {
    createAbortError,
    isAbortSignal,
    AbortControllersGroup,
    AbortSignal,
} from 'termi@abortable';
import {
    eventsAsyncIterator,
} from "./EventEmitterEx/eventsAsyncIterator";

type Timeout = ReturnType<typeof setTimeout>;
type DOMEventTarget = EventTarget;
type INodeEventEmitter = NodeJS.EventEmitter;

/**
 * Это публичный минимально совместимый с кодом {@link EventEmitterEx.once} emitter, отличающийся от EventEmitter:
 * * для ICompatibleEmitter нужны только некоторые методы из всех методов EventEmitter
 * * методы ICompatibleEmitter **могут** не возвращать this
 */
export interface ICompatibleEmitter {
    on(eventName: number | string | symbol, listener: (...args: any[]) => void): any;
    once(eventName: number | string | symbol, listener: (...args: any[]) => void): any;
    removeListener(eventName: number | string | symbol, listener: (...args: any[]) => void): any;
    prependListener(eventName: number | string | symbol, listener: (...args: any[]) => void): any;
    prependOnceListener(eventName: number | string | symbol, listener: (...args: any[]) => void): any;

    addListener(eventName: number | string | symbol, listener: (...args: any[]) => void): any;
    emit: (eventName: any | string | symbol, ...args: any[]) => any | boolean;
}

/**
 Это минимально совместимый с кодом {@link EventEmitterEx.once} emitter, отличающийся от EventEmitter:
 * 1. для IMinimumCompatibleEmitter нужны только некоторые методы из всех методов EventEmitter
 * 2. для IMinimumCompatibleEmitter может отсутствовать метод `emit`
 * 3. методы IMinimumCompatibleEmitter **могут** не возвращать this
 */
export interface IMinimumCompatibleEmitter {
    on(eventName: number | string | symbol, listener: (...args: any[]) => void): any;
    once(eventName: number | string | symbol, listener: (...args: any[]) => void): any;
    removeListener(eventName: number | string | symbol, listener: (...args: any[]) => void): any;
    prependListener(eventName: number | string | symbol, listener: (...args: any[]) => void): any;
    prependOnceListener(eventName: number | string | symbol, listener: (...args: any[]) => void): any;
}

// type NodeEventEmitter = EventEmitter;
export declare type Listener = (this: EventEmitterEx | undefined, ...args: any[]) => Promise<any> | void;
/* todo: add handleEvent support
export interface EventListenerObject<EventMap, EventKey> {
    handleEvent(...args: Parameters<EventMap[EventKey]>): Promise<any> | void;
}
*/
export declare type NodeEventName = string | symbol;
export declare type EventName = number | string | symbol;
export declare type DefaultEventMap = {
    // [event in EventName]: Listener|EventListenerObject;
    [event in EventName]: Listener;
};

export interface ICounter {
    /**
     * Will be called on every [EventEmitterEx#emit]{@link EventEmitterEx.emit} call
     *
     * @see {Console.count}
     * @see [MDN console.count()]{@link https://developer.mozilla.org/en-US/docs/Web/API/Console/count}
     */
    count: (eventName: EventName, wasListener: boolean) => void;

    [key: string | symbol]: unknown;
}

interface _ConstructorOptions {
    maxListeners?: number;
    // listener can be registered at most once per event type
    listenerOncePerEventType?: boolean;
    captureRejections?: boolean;
    /**
     * support DOMEventTarget.handleEvent
     * @see {@link EventListenerObject}
     */
    supportEventListenerObject?: boolean;
    /**
     * If passed, call `counter.count(eventName)` for every [EventEmitterEx#emit]{@link EventEmitterEx.emit} call.
     *
     * {@link global.console} is valid value for this option.
     */
    emitCounter?: Console | ICounter;
    /**
     * By default, `EventEmitterEx` calls listeners with a `this` value of the emitter instance.
     * Passing `true` to this parameter will cause to calls listener functions without any `this` value.
     */
    listenerWithoutThis?: boolean;
    /**
     * For testing purpose.
     *
     * Attach call stack to listener when adding new listener for event.
     * Call stack will be attached to `listener.__debugTrace` property.
     */
    isDebugTraceListeners?: boolean;
}

// interface TEST<EventMap extends DefaultEventMap = DefaultEventMap, EventKey extends keyof EventMap = EventName> { }

interface StaticOnceOptionsDefault {
    /** Add listener in the beginning of listeners list */
    prepend?: boolean;
    /**
     * @see [nodejs AbortSignal]{@link https://nodejs.org/api/globals.html#globals_class_abortsignal}
     * @see [MDN AbortSignal]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal}
     */
    signal?: AbortSignal;
    /** A list of AbortController's to subscribe to it's signal's 'abort' event.
     * @see [nodejs AbortController]{@link https://nodejs.org/api/globals.html#globals_class_abortcontroller}
     * @see [MDN AbortController]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController}
     */
    abortControllers?: (AbortController | void)[];
    // todo: Подумать о переименовании в timings (так в NoSQL)
    timing?: ServerTiming;
    /** the timeout in ms for resolving the promise before it is rejected with an
     * error [TimeoutError]{@link TimeoutError}: {name: 'TimeoutError', message: 'timeout', code: 'ETIMEDOUT'} */
    timeout?: number;
    // todo: Если в EventsAsyncIterator_Options, свойство будет называться 'error' (для совместимости с nodejs), то и тут оно должно называться 'error'.
    /** Custom error event name. Default error event name is 'error'. */
    errorEventName?: EventName;
    /**
     * Filter function to determine acceptable values for resolving the promise.
     *
     * You can throw a Error inside filter to reject [once()]{@link EventEmitterEx.once} with your error.
     *
     * @see {@link https://github.com/EventEmitter2/EventEmitter2#emitterwaitforevent--eventns-filter}
     */
    filter?: (this: any, emitEventName: any, event: any) => boolean;
    /**
     * @extends filter
     * @deprecated @use {@link filter}
     */
    checkFn?: Function;
    /**
     * Callback before Promise resolved. If ended up with exception, promise will be rejected.
     */
    onDone?: (this: any, emitEventName: any, event: any) => void;
    // todo: onError?
    /** Promise constructor to use */
    Promise?: PromiseConstructor;
    /** @deprecated this is `true` by default now and replaced by {@link EventEmitterEx.staticOnceEnrichErrorStack} */
    isEnrichAbortStack?: boolean;
    // [key: string]: any;
    debugInfo?: Object;
}

interface StaticOnceOptions<EE, E> extends StaticOnceOptionsDefault {
    /** @inheritdoc */
    filter?: (this: EE, emitEventName: E, ...amitArgs: any[]) => boolean;
    /** @inheritdoc
     * @deprecated */
    checkFn?: (this: EE, emitEventName: E, ...amitArgs: any[]) => boolean;
    /** @inheritdoc */
    onDone?: (this: EE, emitEventName: E, ...amitArgs: any[]) => void;
}

interface StaticOnceOptionsEventTarget extends StaticOnceOptionsDefault {
    /** {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters}
     * A Boolean indicating that events of this type will be dispatched to the registered listener before being dispatched to any `EventTarget` beneath it in the DOM tree.
     * */
    capture?: boolean;
    /** {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters}
     * A Boolean that, if true, indicates that the function specified by listener will never call {@link https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault|preventDefault()}.
     * If a passive listener does call preventDefault(), the user agent will do nothing other than generate a console warning.
     * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#improving_scrolling_performance_with_passive_listeners|Improving scrolling performance with passive listeners} to learn more.
     * */
    passive?: boolean;
    /** prepend option is not supported for EventTarget emitter */
    prepend?: never;
    /** @inheritdoc */
    filter?: (this: DOMEventTarget, emitEventName: string, event: Event) => boolean;
    /** @inheritdoc
     * @deprecated */
    checkFn?: (this: DOMEventTarget, emitEventName: string, event: Event) => boolean;
    /** @inheritdoc */
    onDone?: (this: DOMEventTarget, emitEventName: string, event: Event) => void;
}

// type EventMapFrom<T> = T extends EventEmitterEx<infer X> ? X : never;
type EventNamesFrom<T> = T extends EventEmitterEx<infer X> ? keyof X : never;
// type EventNamesFrom2<T> = EventNamesFrom<T>|EventNamesFrom<T>[];
type EventNamesFrom3<T> = EventName | EventName[] | EventNamesFrom<T> | EventNamesFrom<T>[];

const ERR_INVALID_ARG_TYPE = 'ERR_INVALID_ARG_TYPE';
const ERR_INVALID_OPTION_TYPE = 'ERR_INVALID_OPTION_TYPE';
/**
 * AbortError code value like in native node.js implementation
 @example in node.js: error.code === 'ABORT_ERR'
 `events.once(new events(), 'test', { signal: AbortSignal.abort() }).catch(err => { console.info(err.code, err.name, err) })`
 @example in browser: error.code === 20
 `fetch(location.href, { signal: AbortSignal.abort() }).catch(err => { console.info(err.code, err.name, err) })`
 */
const ABORT_ERR = (function _getDefaultAbortErrorCode() {
    if (typeof DOMException !== 'undefined') {
        // In WEB `signal.reason.code == DOMException.ABORT_ERR`
        return /*DOMException.ABORT_ERR*/20;
    }
    else {
        // Mimic nodejs ABORT_ERR `signal.reason.code == 'ABORT_ERR'`
        return 'ABORT_ERR';
    }
})();
const _toString = Object.prototype.toString;

const isNodeJS = (function() {
    if (typeof process === 'object' && typeof require === 'function' && _toString.call(process) === "[object process]") {
        if (typeof window !== 'undefined') {
            // (jsdom is used automatically)[https://github.com/facebook/jest/issues/3692#issuecomment-304945928]
            // workaround for jest+JSDOM
            return !!window["__fake__"];
        }
        else {
            return !process["browser"];
        }
    }

    return false;
})();

const {
    /**
     * This symbol shall be used to install a listener for only monitoring 'error' events. Listeners installed using this symbol are called before the regular 'error' listeners are called.
     * Installing a listener using this symbol does not change the behavior once an 'error' event is emitted, therefore the process will still crash if no regular 'error' listener is installed.
     */
    errorMonitor,
    captureRejectionSymbol,

    getEventListeners: nodejs_events_getEventListeners,
}: {
    readonly errorMonitor: typeof import("node:events").errorMonitor,
    readonly captureRejectionSymbol: typeof import("node:events").captureRejectionSymbol,
    readonly getEventListeners: typeof import("node:events").getEventListeners | void,
} = (function(): {
    readonly errorMonitor: typeof import("node:events").errorMonitor,
    readonly captureRejectionSymbol: typeof import("node:events").captureRejectionSymbol,
    readonly getEventListeners: typeof import("node:events").getEventListeners | void,
} {
    let errorMonitor: typeof import("node:events").errorMonitor | void;
    let captureRejectionSymbol: typeof import("node:events").captureRejectionSymbol | void;
    let getEventListeners: typeof import("node:events").getEventListeners | void;

    if (isNodeJS) {
        // this is nodejs
        try {
            const events = require('events');

            errorMonitor = events.errorMonitor;
            captureRejectionSymbol = events.captureRejectionSymbol;
            getEventListeners = events.getEventListeners;
        }
        catch {
            // ignore
        }
    }

    if (!errorMonitor || (errorMonitor as unknown as string) === 'error') {
        // Проверка на errorMonitor === 'error' добавлена для того, чтобы на 100% исключить возможность зацикливания
        //  EventEmitterEx#emit при отправки 'error'.
        errorMonitor = Symbol('events.errorMonitor') as typeof import("node:events").errorMonitor;
    }
    if (!captureRejectionSymbol) {
        captureRejectionSymbol = Symbol.for('nodejs.rejection') as typeof import("node:events").captureRejectionSymbol;
    }

    return {
        errorMonitor,
        captureRejectionSymbol,
        getEventListeners,
    };
})();
const has_nodejs_events_getEventListeners = typeof nodejs_events_getEventListeners === 'function';

// todo: copy errorMonitor as EventEmitterLifecycle.errorEvent
// todo: rename to EventEmitterLifecycle.destroyingEvent
export const kDestroyingEvent = Symbol('kDestroyingEvent');

function _isLifecycleEvent(event: EventName) {
    return event === kDestroyingEvent
        || event === errorMonitor
        || event === 'newListener'
        || event === 'removeListener'
        || event === 'error'
    ;
}

type InnerListeners = {
    'newListener': (eventName: EventName, listener: Listener) => void,
    'removeListener': (eventName: EventName, listener: Listener) => void,
    'error': ((error: Error, ...args: any[]) => void) | ((...args: any[]) => void),
    [kDestroyingEvent]: () => void,
};

// todo: add handleEvent support
// interface EventListenerObject {
//     handleEvent(evt: Event): void;
// }
// declare type EventListenerOrEventListenerObject = Listener | EventListenerObject;

/** EventMap with default listeners */
type EMD<EventMap extends DefaultEventMap = DefaultEventMap> = EventMap & InnerListeners;
// /** EventMap any key */
// type EMK<EventMap extends DefaultEventMap=DefaultEventMap, _T= EMD<EventMap>> = _T[keyof _T];

export interface IEventEmitter<EventMap extends DefaultEventMap = DefaultEventMap> {
    emit<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: any[] | Parameters<EMD<EventMap>[EventKey]>): boolean;
    on<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    once<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    addListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    removeListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    prependListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    prependOnceListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    off<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    removeAllListeners<EventKey extends keyof EMD<EventMap> = EventName>(event?: EventKey): this;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    listeners<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey): EMD<EventMap>[EventKey][];
    rawListeners<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey): EMD<EventMap>[EventKey][];
    eventNames(): NodeEventName[];
    listenerCount<EventKey extends keyof EMD<EventMap> = EventName>(type: EventKey): number;
}
// noinspection JSUnusedGlobalSymbols
/** cast type of any event emitter to typed event emitter */
export declare function asTypedEventEmitter<EventMap extends DefaultEventMap, X extends INodeEventEmitter>(x: X): IEventEmitter<EventMap>;

// Symbol for EventEmitterEx.once
const sCleanAbortPromise = Symbol();
/**
 * This symbol should not be exportable
 * @private
 */
const kCapture = Symbol('kCapture');
/**
 * Non-public sign that this object is EventEmitterEx.
 *
 * This symbol should be visible only in this module or in modules with subclasses.
 * @private
 */
const kIsEventEmitterEx = Symbol();

// listenerOncePerEventType, listener can be registered at most once per event type
const EventEmitterEx_Flags_listenerOncePerEventType = 1 << 1;
const EventEmitterEx_Flags_captureRejections = 1 << 2;
/**
 * By default, `EventEmitterEx` calls listeners with a `this` value of the emitter instance.
 * This flag will cause to calls listener functions without any `this` value.
 */
const EventEmitterEx_Flags_listenerWithoutThis = 1 << 3;
// TODO:
// /**
//  * Disable 'error' event. Any error in listener will break listeners calls and throw error.
//  */
// const EventEmitterEx_Flags_noErrorCatch = 1 << 4;
// /**
//  * Disable 'newListener' and 'removeListener' events.
//  */
// const EventEmitterEx_Flags_noListenersChangeHandling = 1 << 5;
const EventEmitterEx_Flags_has_error_listener = 1 << 10;
const EventEmitterEx_Flags_has_newListener_listener = 1 << 11;
const EventEmitterEx_Flags_has_removeListener_listener = 1 << 12;
const EventEmitterEx_Flags_has_errorMonitor_listener = 1 << 13;
const EventEmitterEx_Flags_has_duplicatedListener_listener = 1 << 16;
const EventEmitterEx_Flags_supportEventListenerObject = 1 << 20;
const EventEmitterEx_Flags_emitCounter_isConsole = 1 << 21;
const EventEmitterEx_Flags_emitCounter_isDebugTraceListeners = 1 << 25;
const EventEmitterEx_Flags_destroyed = 1 << 30;

// todo: rename to EventEmitterX
/** Implemented event emitter */
export class EventEmitterEx<EventMap extends DefaultEventMap = DefaultEventMap> implements IEventEmitter<EventMap> {
    public readonly isEventEmitterEx = true;
    // noinspection JSUnusedGlobalSymbols
    public readonly isEventEmitterX = true;
    // noinspection JSUnusedGlobalSymbols
    public readonly isEventEmitter = true;
    protected readonly [kIsEventEmitterEx] = true;

    // todo: Использовать Map/WeakMap? Возможно, через класс-наследник.
    private _events: {
        [eventName in keyof EMD<EventMap>]?: (Listener | Listener[]);
    } = Object.create(null);

    _maxListeners = Number.POSITIVE_INFINITY;

    private _f = 0;
    private _emitCounter: Console | ICounter | void;

    /**
     * Private list of local once listeners.
     * @private
     */
    __onceWrappers = new Set();

    constructor(options?: _ConstructorOptions) {
        if (options) {
            const {
                maxListeners,
                listenerOncePerEventType,
                supportEventListenerObject,
                captureRejections,
                emitCounter,
                listenerWithoutThis,
                isDebugTraceListeners,
            } = options;

            if (maxListeners !== void 0) {
                this._maxListeners = maxListeners;
            }
            if (listenerOncePerEventType !== void 0) {
                this._f |= EventEmitterEx_Flags_listenerOncePerEventType;
            }
            if (captureRejections) {
                if (typeof (captureRejections as any) !== 'boolean') {
                    // throw new ERR_INVALID_ARG_TYPE()
                    throw new TypeError(`options.captureRejections should be of type "boolean" but has "${typeof captureRejections}" type`);
                }

                this._f |= EventEmitterEx_Flags_captureRejections;
            }
            if (listenerWithoutThis) {
                this._f |= EventEmitterEx_Flags_listenerWithoutThis;
            }
            if (supportEventListenerObject) {
                this._f |= EventEmitterEx_Flags_supportEventListenerObject;
            }
            if (emitCounter) {
                this._emitCounter = emitCounter;

                if (emitCounter === console
                    // emitCounter could be console instance from another environment
                    || _objectIsConsole(emitCounter)
                ) {
                    this._f |= EventEmitterEx_Flags_emitCounter_isConsole;
                }
            }
            if (isDebugTraceListeners) {
                this._f |= EventEmitterEx_Flags_emitCounter_isDebugTraceListeners;
            }
        }
    }

    destructor() {
        this._f |= EventEmitterEx_Flags_destroyed;
        this._emitCounter = void 0;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore
        this.emit(kDestroyingEvent);

        this.removeAllListeners();

        this._addListener = function _addListener<EventKey extends keyof EMD<EventMap> = EventName>(
            event: EventKey,
            listener: EMD<EventMap>[EventKey],
            prepend: boolean,
            once: boolean,
        ) {
            // todo: this._count(statisticKeys.kAddListenerAfterDestroying)
            // todo: replace console.warn with:
            //  const kAddListenerAfterDestroyingCallback = Symbol('kAddListenerAfterDestroyingCallback');
            //  this[kAddListenerAfterDestroyingCallback]({ event, listener, once, prepend });
            console.warn('Attempt to add listener on destroyed emitter', this, { event, once, prepend });

            return false;
        };
    }

    [Symbol.dispose]() {
        this.destructor();
    }

    get [kCapture]() {
        return _checkBit(this._f, EventEmitterEx_Flags_captureRejections);
    }

    set [kCapture](value: boolean) {
        if (value) {
            this._f |= EventEmitterEx_Flags_captureRejections;
        }
        else {
            this._f = _unsetBit(this._f, EventEmitterEx_Flags_captureRejections);
        }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    emit<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>): boolean;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    emit<EventKey extends keyof EMD<EventMap>>(event: EventKey, a1, a2, a3) {
        const isErrorEvent = event === 'error';
        const emitCounter = this._emitCounter;
        let handler = this._events[event];
        const argumentsLength = arguments.length;
        let hasEnyListener = false;

        // todo: Вопрос: Если (isErrorEvent == true) нужно ли вызывать событие errorMonitor, если НЕТ подписок на событие 'error'.
        //  В текущей версии nodejs#v15.5.0, если нет подписки на 'error', то и errorMonitor НЕ вызывается, даже если подписка на errorMonitor есть.
        if (handler) {
            const { _f } = this;
            // const has_error_listener = _checkBit(_flags, EventEmitterEx_Flags_has_error_listener);
            const captureRejections = _checkBit(_f, EventEmitterEx_Flags_captureRejections);
            const listenerWithoutThis = _checkBit(_f, EventEmitterEx_Flags_listenerWithoutThis);

            if (isErrorEvent) {
                // eslint-disable-next-line unicorn/no-lonely-if
                if (_checkBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener)) {
                    switch (argumentsLength) {
                        case 1:
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                            // @ts-ignore
                            this.emit(errorMonitor);

                            break;
                        case 2:
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                            // @ts-ignore
                            this.emit(errorMonitor, a1);

                            break;
                        case 3:
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                            // @ts-ignore
                            this.emit(errorMonitor, a1, a2);

                            break;
                        case 4:
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                            // @ts-ignore
                            this.emit(errorMonitor, a1, a2, a3);

                            break;
                        // slower
                        default: {
                            const args = _argumentsClone2(arguments, 0);// eslint-disable-line prefer-rest-params

                            args[0] = errorMonitor;

                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                            // @ts-ignore
                            this.emit.apply(this, args);// eslint-disable-line prefer-spread,unicorn/consistent-destructuring
                        }
                    }
                }
            }

            let isFn = typeof handler === 'function';
            let context = listenerWithoutThis ? void 0 : this;

            if (_checkBit(_f, EventEmitterEx_Flags_supportEventListenerObject)
                && !isFn
                && 'handleEvent' in (handler as unknown as EventListenerObject)
            ) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore ignore `TS2322: Type EventListenerObject is not assignable to type this`
                context = handler as unknown as EventListenerObject;
                handler = (handler as unknown as EventListenerObject).handleEvent;
                isFn = true;

                if (!handler) {
                    return;
                }
            }

            if (isFn) {
                const func_handler = handler as Function;
                let result;

                switch (argumentsLength) {
                    case 1:
                        result = func_handler.call(context);

                        break;
                    case 2:
                        result = func_handler.call(context, a1);

                        break;
                    case 3:
                        result = func_handler.call(context, a1, a2);

                        break;
                    case 4:
                        result = func_handler.call(context, a1, a2, a3);

                        break;
                    // slower
                    default: {
                        const args = _argumentsClone2(arguments, 1);// eslint-disable-line prefer-rest-params

                        result = func_handler.apply(context, args);
                    }
                }

                if (captureRejections) {
                    // We check if result is undefined first because that
                    // is the most common case so we do not pay any perf
                    // penalty
                    // eslint-disable-next-line unicorn/no-lonely-if
                    if (result !== undefined && result !== null) {
                        const args = _argumentsClone2(arguments, 1);// eslint-disable-line prefer-rest-params

                        _addCatch(this, result, event, args);
                    }
                }

                hasEnyListener = true;
            }
            else {
                // Do not clone listeners here: we do it in removeListener and prependListener.
                const listeners = handler as Function[];

                if (listeners.length > 0) {
                    switch (argumentsLength) {
                        // fast cases
                        case 1:
                            if (captureRejections) {
                                /*@__NOINLINE__*/
                                emitNone_array_catch.call(this, listeners, context, event);
                            }
                            else {
                                /*@__NOINLINE__*/
                                emitNone_array(listeners, context);
                            }

                            break;
                        case 2:
                            if (captureRejections) {
                                /*@__NOINLINE__*/
                                emitOne_array_catch.call(this, listeners, context, a1, event);
                            }
                            else {
                                /*@__NOINLINE__*/
                                emitOne_array(listeners, context, a1);
                            }

                            break;
                        case 3:
                            if (captureRejections) {
                                /*@__NOINLINE__*/
                                emitTwo_array_catch.call(this, listeners, context, a1, a2, event);
                            }
                            else {
                                /*@__NOINLINE__*/
                                emitTwo_array(listeners, context, a1, a2);
                            }

                            break;
                        case 4:
                            if (captureRejections) {
                                /*@__NOINLINE__*/
                                emitThree_array_catch.call(this, listeners, context, a1, a2, a3, event);
                            }
                            else {
                                /*@__NOINLINE__*/
                                emitThree_array(listeners, context, a1, a2, a3);
                            }

                            break;
                        // slower
                        default: {
                            const args = _argumentsClone2(arguments, 1);// eslint-disable-line prefer-rest-params

                            if (captureRejections) {
                                /*@__NOINLINE__*/
                                emitMany_array_catch.call(this, listeners, context, args, event);
                            }
                            else {
                                /*@__NOINLINE__*/
                                emitMany_array(listeners, context, args);
                            }
                        }
                    }

                    hasEnyListener = true;
                }
            }
        }
        else if (isErrorEvent) {
            // If there is no 'error' event listener then throw.
            const err = arguments[1];// eslint-disable-line prefer-rest-params

            /*if (domain) {
                if (!err) { err = new Error('Uncaught, unspecified "error" event'); }
                er.domainEmitter = this;
                er.domain = domain;
                er.domainThrown = false;
                domain.emit('error', err);
            }
            else*/
            if (err instanceof Error) {
                // Unhandled 'error' event
                throw err;
            }
            else {
                // At least give some kind of context to the user
                const error = new Error(`Uncaught, unspecified "error" event. (${ err })`);

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                error.context = err;

                throw error;
            }
        }

        if (!!emitCounter && typeof emitCounter.count === 'function') {
            if (_checkBit(this._f, EventEmitterEx_Flags_emitCounter_isConsole)) {
                (emitCounter as Console).count(String(event));
            }
            else {
                (emitCounter as ICounter).count(event, hasEnyListener);
            }
        }

        return hasEnyListener;
    }

    // on<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EventListenerOrEventListenerObject): this;
    on<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this {
        this._addListener(event, listener, false, false);

        return this;
    }

    once<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this {
        this._addListener(event, listener, false, true);

        return this;
    }

    // private _addListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EventListenerOrEventListenerObject, prepend: boolean): this;
    protected _addListener<EventKey extends keyof EMD<EventMap> = EventName>(
        event: EventKey,
        listener: EMD<EventMap>[EventKey],
        prepend: boolean,
        once: boolean,
    ): boolean {
        const {
            _events,
            _maxListeners,
            _f,
            __onceWrappers,
        } = this;

        _checkListener(listener, _checkBit(_f, EventEmitterEx_Flags_supportEventListenerObject));

        const has_newListener_listener = _checkBit(_f, EventEmitterEx_Flags_has_newListener_listener);
        const isDebugTraceListeners = _checkBit(_f, EventEmitterEx_Flags_emitCounter_isDebugTraceListeners);
        const hasAnyOnceListener = __onceWrappers.size > 0;
        // todo: add handleEvent support
        const listenerAs_objectWith_handleEvent = false;// supportHandleEvent && typeof listener === 'object';
        const handler = _events[event];
        const existedHandlerIsFunction = typeof handler === 'function';
        let newLen: number;

        if (has_newListener_listener) {
            // todo: Разобраться, почему тут TypeScript ругается, хотя описание для 'newListener' в DefaultEventMap есть.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            this.emit('newListener', event, listener);
        }

        if (_checkBit(_f, EventEmitterEx_Flags_listenerOncePerEventType) && handler) {
            // todo: Для полноценной работы флага listenerOncePerEventType, нужно запоминать с какими опциями был
            //  добавлен listener (prepend/once) и если происходит добавление listener с другими опциями, то нужно считать,
            //  что это новый listener
            let isListenerAlreadyExisted = false;

            if (existedHandlerIsFunction) {
                if (handler === listener) {
                    isListenerAlreadyExisted = true;
                }
                else if (hasAnyOnceListener
                    && handler[kOnceListenerWrappedHandler] === listener
                ) {
                    isListenerAlreadyExisted = true;
                }
            }
            else {
                const listeners = (handler as Function[]);

                for (let i = listeners.length ; i-- > 0 ;) {
                    const handler = listeners[i] as Function;

                    if (handler === listener) {
                        isListenerAlreadyExisted = true;

                        break;
                    }
                    else if (hasAnyOnceListener
                        && handler[kOnceListenerWrappedHandler] === listener
                    ) {
                        isListenerAlreadyExisted = true;

                        break;
                    }
                }
            }

            if (isListenerAlreadyExisted) {
                if (_checkBit(_f, EventEmitterEx_Flags_has_duplicatedListener_listener)) {
                    // todo: Добавить 'duplicatedListener' в DefaultEventMap и убрать "@ts-ignore"
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    this.emit('duplicatedListener', event, listener);
                }

                return false;
            }
        }

        if (event === 'error') {
            this._f |= EventEmitterEx_Flags_has_error_listener;
        }
        else if (event === errorMonitor) {
            this._f |= EventEmitterEx_Flags_has_errorMonitor_listener;
        }
        else if (event === 'newListener') {
            this._f |= EventEmitterEx_Flags_has_newListener_listener;
        }
        else if (event === 'removeListener') {
            this._f |= EventEmitterEx_Flags_has_removeListener_listener;
        }
        else if (event === 'duplicatedListener') {
            this._f |= EventEmitterEx_Flags_has_duplicatedListener_listener;
        }

        if (once) {
            listener = _onceWrap<EMD<EventMap>, EventKey>(this, event, listener);
        }

        if (isDebugTraceListeners) {
            // note: https://stackoverflow.com/a/42860910
            // if (isIE || isEdge || isPhantom) { // Untested in Edge
            //     try { // Stack not yet defined until thrown per https://learn.microsoft.com/en-us/scripting/javascript/reference/stack-property-error-javascript
            //         throw err;
            //     } catch (e) {
            //         err = e;
            //     }
            //     stackPos = isPhantom ? 1 : 2;
            // }
            listener["__debugTrace"] = String(new Error('-get-debug-trace-').stack || '').split('\n');
        }

        if (!handler) {
            if (listenerAs_objectWith_handleEvent) {
                // IMPORTANT!!!: Object.{handleEvent: void|Function} IS NOT SUPPORTED as single listener in _events[event].
                _events[event] = [ listener/* as EventListenerObject*/ ];
                newLen = 1;
            }
            else {
                _events[event] = listener;
                newLen = 1;
            }
        }
        else if (existedHandlerIsFunction) {
            if (prepend) {
                _events[event] = [ listener, handler as Listener ];
            }
            else {
                _events[event] = [ handler as Listener, listener ];
            }

            newLen = 2;
        }
        else {
            if (prepend) {
                const newArray = _arrayClone3(handler, listener) as Listener[];

                newLen = newArray.length;

                _events[event] = newArray;
            }
            else {
                newLen = (handler as Listener[]).push(listener);
            }
        }

        if (_maxListeners !== Number.POSITIVE_INFINITY && _maxListeners <= newLen) {
            // todo: EventEmitterEx.sOnMaxListeners = Symbol('sOnMaxListeners');
            //  emit(EventEmitterEx.sOnMaxListeners, newLen, event, `Maximum event listeners for "${event}" event!`);
            console.warn(`Maximum event listeners for "${String(event)}" event!`);
        }

        return true;
    }

    addListener<EventKey extends keyof EMD<EventMap> = EventName>(
        event: EventKey,
        listener: EMD<EventMap>[EventKey],
    ): this {
        this._addListener(event, listener, false, false);

        return this;
    }

    removeListener<EventKey extends keyof EMD<EventMap> = EventName>(
        event: EventKey,
        listener: EMD<EventMap>[EventKey],
    ): this {
        // todo: this._count(statisticKeys.kRemoveListener)
        const {
            _events,
            _f,
            __onceWrappers,
        } = this;

        // todo: Поддержка supportEventListenerObject не доделана для:
        //  1. removeListener
        //  1. once (__onceWrappers)
        _checkListener(listener, _checkBit(_f, EventEmitterEx_Flags_supportEventListenerObject));

        // const listenerOncePerEventType = _checkBit(_f, EventEmitterEx_Flags_listenerOncePerEventType);
        const handler = _events[event];

        if (handler === void 0) {
            return this;
        }

        let has_removeListener_listener = _checkBit(_f, EventEmitterEx_Flags_has_removeListener_listener);

        const hasAnyOnceListener = __onceWrappers.size > 0;
        let newListenersCount: number | void = void 0;
        // let originalListener: void|Function = void 0;

        if (typeof handler === 'function') {
            if (handler === listener) {
                delete _events[event];
                newListenersCount = 0;
            }
            else if (hasAnyOnceListener
                && handler[kOnceListenerWrappedHandler] === listener
            ) {
                __onceWrappers.delete(handler);

                delete _events[event];
                newListenersCount = 0;
            }
            else {
                // Listener is not found, exit function
                return this;
            }
        }
        else {// remove only first link to listener
            const listeners = handler as Listener[];
            let index = -1;

            newListenersCount = listeners.length;

            if (hasAnyOnceListener) {
                for (let i = listeners.length ; i-- > 0 ;) {
                    const handler = listeners[i] as Listener;

                    if (handler === listener) {
                        index = i;

                        // note: Даже если режим "listenerOncePerEventType" выключен и в listeners может быть несколько
                        //  одинаковых listener, которые мы в данный момент удаляем, то УДАЛИТЬСЯ ТОЛЬКО ПЕРВЫЙ С КОНЦА.
                        //  Так работает EventEmitter в nodejs. Можно ввести специальный режим, когда доходить до конца
                        //  listeners и удалять все копии listener.
                        break;
                    }
                    else if (handler[kOnceListenerWrappedHandler] === listener) {
                        __onceWrappers.delete(handler);

                        index = i;

                        // note: Даже если режим "listenerOncePerEventType" выключен и в listeners может быть несколько
                        //  одинаковых listener, которые мы в данный момент удаляем, то УДАЛИТЬСЯ ТОЛЬКО ПЕРВЫЙ С КОНЦА.
                        //  Так работает EventEmitter в nodejs. Можно ввести специальный режим, когда доходить до конца
                        //  listeners и удалять все копии listener.
                        break;
                    }
                }
            }
            else {
                index = listeners.indexOf(listener);
            }

            if (index !== -1) {
                newListenersCount--;

                if (newListenersCount === 0) {
                    // if (--this._eventsCount === 0) {
                    // this._events = Object.create(null);
                    // }
                    delete _events[event];
                }
                else if (newListenersCount === 1 && index < 2) {
                    _events[event] = listeners[index === 0 ? 1 : 0];
                }
                else {
                    if (index === 0) {
                        _events[event] = _arrayClone2(listeners, 1) as Listener[];
                    }
                    else {
                        _events[event] = listeners.toSpliced(index, 1);
                    }
                }
            }
            else {
                // Listener is not found, exit function
                return this;
            }
        }

        if (newListenersCount !== void 0) {
            if (newListenersCount === 0) {
                if (event === 'error') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_error_listener);
                }
                else if (event === errorMonitor) {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener);
                }
                else if (event === 'newListener') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_newListener_listener);
                }
                else if (event === 'removeListener') {
                    if (has_removeListener_listener) {
                        this._f = _unsetBit(_f, EventEmitterEx_Flags_has_removeListener_listener);
                        // Если мы удаляем последний 'removeListener', то и кидать событие некому.
                        // Именно так работает нативный nodejs 'events' - 'removeListener' не вызывается, когда мы удаляем сам 'removeListener'.
                        has_removeListener_listener = false;
                    }
                }
                else if (event === 'duplicatedListener') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_duplicatedListener_listener);
                }
            }
        }
        else {
            // this code should be unreachable
            throw new Error('Normally unreachable error');
        }

        if (has_removeListener_listener) {
            if (listener[kOnceListenerWrappedHandler] !== void 0) {
                listener = listener[kOnceListenerWrappedHandler] || listener;
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            this.emit('removeListener', event, listener);
        }

        return this;
    }

    hasListeners<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey) {
        const handlers = this._events[event];

        if (!handlers) {
            return false;
        }

        if (typeof handlers === 'function') {
            return true;
        }

        return (handlers as Function[]).length > 0;
    }

    prependListener<EventKey extends keyof EMD<EventMap> = EventName>(
        event: EventKey,
        listener: EMD<EventMap>[EventKey],
    ): this {
        this._addListener(event, listener, true, false);

        return this;
    }

    prependOnceListener<EventKey extends keyof EMD<EventMap> = EventName>(
        event: EventKey,
        listener: EMD<EventMap>[EventKey],
    ): this {
        this._addListener(event, listener, true, true);

        return this;
    }

    off<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this {
        return this.removeListener(event, listener);
    }

    removeAllListeners<EventKey extends keyof EMD<EventMap> = EventName>(event?: EventKey): this {
        const {
            _f,
            _events,
            __onceWrappers,
        } = this;
        const removeSpecificEvent = event !== void 0;
        const has_removeListener_listener = _checkBit(_f, EventEmitterEx_Flags_has_removeListener_listener);

        if (has_removeListener_listener && event !== 'removeListener') {
            if (!removeSpecificEvent) {
                // Emit removeListener for all listeners on all events
                for (const key of Object.keys(_events)) {
                    if (key === 'removeListener') {
                        continue;
                    }

                    this.removeAllListeners(key);
                }

                this.removeAllListeners('removeListener');
            }
            else {
                const hasOnceListeners = __onceWrappers.size > 0;
                // current handler(s)
                const handler = _events[event];

                // first remove current handler(s)
                delete _events[event];

                const listeners = typeof handler === 'function'
                    ? [ handler as Listener ]
                    // copy handler's due of 'removeListener' handler
                    : _arrayClone1(handler as Listener[])
                ;

                for (let i = listeners.length ; i-- > 0 ;) {
                    const listener = listeners[i] as Listener;
                    const onceListener = hasOnceListeners
                        ? listener[kOnceListenerWrappedHandler] as unknown as (EMD<EventMap>[EventKey] | undefined)
                        : void 0
                    ;

                    if (onceListener !== void 0) {
                        __onceWrappers.delete(listener);

                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error ignore: `TS2345: Argument of type '[EventKey, EMD [EventKey]]' is not assignable to parameter of type 'Parameters  ["removeListener"]>'.`
                        this.emit('removeListener', event, onceListener);
                    }
                    else {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error ignore: `TS2345: Argument of type '[EventKey, Listener]' is not assignable to parameter of type 'Parameters  ["removeListener"]>'.`
                        this.emit('removeListener', event, listener);
                    }
                }
            }
        }
        else {// Not listening for removeListener, no need to emit
            if (removeSpecificEvent) {
                if (__onceWrappers.size > 0) {
                    const handler = _events[event];

                    if (typeof handler === 'function') {
                        if (handler[kOnceListenerWrappedHandler] !== void 0) {
                            __onceWrappers.delete(handler);
                        }
                    }
                    else {
                        const listeners = (handler as Function[]);

                        for (let i = listeners.length ; i-- > 0 ;) {
                            const handler = listeners[i] as Listener;

                            if (handler[kOnceListenerWrappedHandler] !== void 0) {
                                __onceWrappers.delete(handler);
                            }
                        }
                    }
                }

                delete _events[event];
            }
        }

        if (removeSpecificEvent) {
            if (event === 'error') {
                this._f = _unsetBit(_f, EventEmitterEx_Flags_has_error_listener);
            }
            else if (event === errorMonitor) {
                this._f = _unsetBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener);
            }
            else if (event === 'newListener') {
                this._f = _unsetBit(_f, EventEmitterEx_Flags_has_newListener_listener);
            }
            else if (event === 'removeListener') {
                if (has_removeListener_listener) {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_removeListener_listener);
                }
            }
            else if (event === 'duplicatedListener') {
                this._f = _unsetBit(_f, EventEmitterEx_Flags_has_duplicatedListener_listener);
            }
        }
        else {
            // remove all once wrappers
            __onceWrappers.clear();
            // remove all handlers
            this._events = Object.create(null);
            this._f = _unsetBit(_f,
                EventEmitterEx_Flags_has_error_listener
                | EventEmitterEx_Flags_has_errorMonitor_listener
                | EventEmitterEx_Flags_has_newListener_listener
                | EventEmitterEx_Flags_has_removeListener_listener
                | EventEmitterEx_Flags_has_duplicatedListener_listener
            );
        }

        return this;
    }

    setMaxListeners(n: number): this {
        this._maxListeners = n;

        return this;
    }

    getMaxListeners(): number {
        return this._maxListeners;
    }

    /**
     * Non-standard EventEmitter method!
     *
     * Check if has any listener for given `event` name and optional `listenerToCheck` handler function.
     */
    hasListener<EventKey extends keyof EMD<EventMap> = EventName>(
        event: EventKey,
        listenerToCheck?: EMD<EventMap>[EventKey],
    ) {
        type _TEventMap = EMD<EventMap>;

        const handler = this._events[event];

        if (!handler) {
            return false;
        }
        if (!listenerToCheck) {
            return true;
        }

        const hasAnyOnceListener = this.__onceWrappers.size > 0;

        if (typeof handler === 'function') {
            const onceListener = hasAnyOnceListener
                ? handler[kOnceListenerWrappedHandler] as unknown as (EMD<EventMap>[EventKey] | undefined)
                : void 0
            ;

            if (onceListener === void 0) {
                return listenerToCheck === handler;
            }

            return listenerToCheck === onceListener;
        }

        if (!hasAnyOnceListener) {
            for (const _handler of (handler as Function[])) {
                if (listenerToCheck === _handler) {
                    return true;
                }
            }
        }
        else {
            for (const _handler of (handler as Function[])) {
                const onceListener = _handler[kOnceListenerWrappedHandler] as unknown as (EMD<EventMap>[EventKey] | undefined);

                if (onceListener !== void 0) {
                    if (listenerToCheck === onceListener as _TEventMap[EventKey]) {
                        return true;
                    }
                }
                else {
                    if (listenerToCheck === _handler) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Returns a copy of the array of listeners for the event named eventName.
     */
    listeners<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey) {
        type _TEventMap = EMD<EventMap>;

        const handler = this._events[event];

        if (!handler) {
            return [];
        }

        const hasAnyOnceListener = this.__onceWrappers.size > 0;

        if (typeof handler === 'function') {
            const onceListener = hasAnyOnceListener
                ? handler[kOnceListenerWrappedHandler] as unknown as (EMD<EventMap>[EventKey] | undefined)
                : void 0
            ;

            if (onceListener === void 0) {
                return [ handler as _TEventMap[EventKey] ];
            }

            return [ onceListener as _TEventMap[EventKey] ];
        }

        if (!hasAnyOnceListener) {
            return [ ...(handler as _TEventMap[EventKey][]) ];
        }

        return handler.map<_TEventMap[EventKey]>(handler => {
            const onceListener = handler[kOnceListenerWrappedHandler] as unknown as (EMD<EventMap>[EventKey] | undefined);

            if (onceListener !== void 0) {
                return onceListener as _TEventMap[EventKey];
            }

            return handler as _TEventMap[EventKey];
        });
    }

    /**
     * Returns a copy of the array of listeners for the event named eventName, including any wrappers (such as those created by .once()).
     */
    rawListeners<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey) {
        type _TEventMap = EMD<EventMap>;

        const handler = this._events[event];

        if (!handler) {
            return [];
        }

        if (typeof handler === 'function') {
            return [ handler as _TEventMap[EventKey] ];
        }

        return [ ...(handler as _TEventMap[EventKey][]) ];
    }

    eventNames(): NodeEventName[] {
        // todo:
        //  1. return number key as number
        //  2. return Symbol's keys: `[ ...Object.keys(this._events), ...Object.getOwnPropertySymbols(this._events) ]`
        return Object.keys(this._events);
    }

    listenerCount<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey): number {
        const handler = this._events[event];

        if (!handler) {
            return 0;
        }

        if (typeof handler === 'function') {
            return 1;
        }

        return (handler as EMD<EventMap>[EventKey][]).length;
    }

    // todo:
    //   captureRejectionSymbol: Symbol(nodejs.rejection),
    //   captureRejections: [Getter/Setter],
    //   defaultMaxListeners: [Getter/Setter],
    //   init: [Function (anonymous)],

    // todo:
    //     - tests: https://github.com/nodejs/node/blob/master/test/parallel/test-events-static-geteventlisteners.js
    static getEventListeners(
        emitter: DOMEventTarget | EventEmitterEx | ICompatibleEmitter | INodeEventEmitter,
        eventName: EventName,
    ) {
        if (isEventEmitterEx(emitter)) {
            return emitter.listeners(eventName);
        }
        else if (has_nodejs_events_getEventListeners) {
            // todo: write new function isNodeEventEmitter and use it here
            // this is node env, maybe emitter is native node EventEmitter or DOMEventTarget
            if (isEventEmitterCompatible(emitter)) {
                if (typeof (emitter as INodeEventEmitter).listeners === 'function') {
                    return (emitter as INodeEventEmitter).listeners(eventName as string | symbol);
                }

                // if emitter is compatible, but not native node EventEmitter, node getEventListeners will throw a error:
                //  `The "emitter" argument must be an instance of EventEmitter or EventTarget. Received an instance of {tag of emitter}`
                return nodejs_events_getEventListeners(emitter as INodeEventEmitter, eventName as string | symbol);
            }
            else if (isEventTargetCompatible(emitter)) {
                if (isNodeJS) {
                    // if emitter is compatible, but not native node EventEmitter, node getEventListeners will throw a error:
                    //  `The "emitter" argument must be an instance of EventEmitter or EventTarget. Received an instance of {tag of emitter}`
                    return nodejs_events_getEventListeners(emitter, eventName as string | symbol);
                }
                else {
                    // Most likely, events module and events.getEventListeners function was polyfilled.
                    const errorMessage = 'EventEmitterEx.getEventListeners: (node=false)[UNSUPPORTED_EMITTER] The "emitter" argument must be an instance of EventEmitter or EventTarget. This EventTarget is unsupported';
                    const error = new TypeError(errorMessage);

                    error["code"] = 'ERR_INVALID_ARG_TYPE';

                    throw error;
                }
            }
        }

        const errorMessage = isNodeJS
            ? 'EventEmitterEx.getEventListeners: (node=true)[UNSUPPORTED_EMITTER] The "emitter" argument must be an instance of EventEmitter or EventTarget'
            : 'EventEmitterEx.getEventListeners: (node=false)[UNSUPPORTED_EMITTER] The "emitter" argument must be an instance of EventEmitter'
        ;
        const error = new TypeError(errorMessage);

        error["code"] = 'ERR_INVALID_ARG_TYPE';

        throw error;
    }

    /**
     * Returns an `AsyncIterator` that iterates `event` events.
     *
     * @see [Node.js documentation / Events / events.on(emitter, eventName): AsyncIterator]{@link https://nodejs.org/api/events.html#eventsonemitter-eventname-options}
     * @see [nodejs / Pull requests / lib: performance improvement on readline async iterator]{@link https://github.com/nodejs/node/pull/41276}
     * @see [Asynchronous Iterators for JavaScript]{@link https://github.com/tc39/proposal-async-iteration}
     */
    static on = eventsAsyncIterator;

    static staticOnceEnrichErrorStack = true;

    // todo: Вынести `static once` в отдельный файл: eventAwaitFor (это нужно сделать с сохранением истории, поэтому
    //  нужно сделать два бранча - в отдном переименовать этот файлы в eventAwaitFor.ts и оставить только код `static once`,
    //  а в другом переименовать этот файл в EventEmitterX и удалить сесь код `static once`. Таким образом, после merge
    //  история сохраниться).
    // note: consider to rename 'type' -> 'eventName', 'types' -> 'eventNames'
    /** Creates a Promise that is fulfilled when the EventEmitter emits the given event or that is rejected if the EventEmitter emits 'error' while waiting. The Promise will resolve with an array of all the arguments emitted to the given event.
     *
     * This method is intentionally generic and works with the web platform EventTarget interface, which has no special 'error' event semantics and does not listen to the 'error' event.
     *
     * @see {@link https://nodejs.org/api/events.html#events_events_once_emitter_name_options nodejs events.once(emitter, name, options)}
     */
    static once<EE extends EventEmitterEx = EventEmitterEx>(
        emitter: EventEmitterEx,
        types: EventNamesFrom3<EE>,
        options?: StaticOnceOptions<EE, EventNamesFrom<EE>>,
    ): Promise<any[]>;
    static once(
        nodeEmitter: INodeEventEmitter,
        types: (string | symbol)[] | string | symbol,
        options?: StaticOnceOptions<INodeEventEmitter, string | symbol>,
    ): Promise<any[]>;
    static once(
        eventTarget: DOMEventTarget,
        types: string[] | string,
        options?: StaticOnceOptionsEventTarget,
    ): Promise<[ Event ]>;
    static once(
        compatibleEmitter: IMinimumCompatibleEmitter,
        types: (string | symbol)[] | string | symbol,
        options?: StaticOnceOptions<IMinimumCompatibleEmitter, string | symbol>,
    ): Promise<any[]>;
    /** Creates a Promise that is fulfilled when the EventEmitter emits the given event or that is rejected if the EventEmitter emits 'error' while waiting. The Promise will resolve with an array of all the arguments emitted to the given event.
     *
     * This method is intentionally generic and works with the web platform EventTarget interface, which has no special 'error' event semantics and does not listen to the 'error' event.
     *
     * @see {@link https://nodejs.org/api/events.html#events_events_once_emitter_name_options nodejs events.once(emitter, name, options)}
     */
    static once(// EventEmitterX.once
        emitter: DOMEventTarget | EventEmitterEx | IMinimumCompatibleEmitter | INodeEventEmitter,
        types: EventName | EventName[],
        // options?: StaticOnceOptionsEventTarget|StaticOnceOptions<typeof emitter, typeof types extends Array<infer T> ? T : typeof types>
        options?: StaticOnceOptionsDefault,
    ): Promise<any[] | Event> {
        const staticOnceOptions = (options || {}) as StaticOnceOptions<EventEmitterEx | INodeEventEmitter, EventName>;
        const _Promise = staticOnceOptions.Promise || Promise;
        let isEventTarget = false;

        if (!(emitter instanceof EventEmitterEx) && !_isEventEmitterCompatible(emitter as EventEmitterEx | INodeEventEmitter)) {
            isEventTarget = _isEventTargetCompatible(emitter as DOMEventTarget);

            if (!isEventTarget) {
                return _Promise.reject(new EventsTypeError('The "emitter" argument must be an instance of EventEmitter or EventTarget.', ERR_INVALID_ARG_TYPE));
            }
        }

        const _emitter = (emitter as EventEmitterEx | INodeEventEmitter);
        const staticOnceEventTargetOptions = isEventTarget && options
            ? options as StaticOnceOptionsEventTarget
            : void 0
        ;
        const eventTargetListenerOptions = isEventTarget && staticOnceEventTargetOptions && (staticOnceEventTargetOptions.passive !== void 0 || staticOnceEventTargetOptions.capture !== void 0)
            ? {
                passive: staticOnceEventTargetOptions.passive,
                capture: staticOnceEventTargetOptions.capture,
            } as (AddEventListenerOptions & { signal?: AbortSignal })
            : void 0
        ;
        const usePrependListener = !!staticOnceOptions.prepend;
        /**
         * Is ['errorEventName']{@link StaticOnceOptionsDefault.errorEventName} is defined in [options]{@link StaticOnceOptionsDefault}
         */
        const errorEventNameIsDefined = _isDefined(staticOnceOptions.errorEventName);
        /**
         * - For node/WEB EventEmitter: 'error' is default value.
         * - For WEB EventTarget: there is no default value for error event.
         */
        const errorEventName = (errorEventNameIsDefined ? staticOnceOptions.errorEventName : 'error') as string | symbol;
        const timeout = staticOnceOptions.timeout || void 0;
        /** @borrows StaticOnceOptionsDefault.filter */
        const filter = (typeof staticOnceOptions.filter === 'function' ? staticOnceOptions.filter : void 0)
            || (typeof staticOnceOptions.checkFn === 'function' ? staticOnceOptions.checkFn : void 0)
        ;
        const onDone = typeof staticOnceOptions.onDone === 'function' ? staticOnceOptions.onDone : void 0;
        const abortControllers = (staticOnceOptions as StaticOnceOptionsDefault).abortControllers || void 0;
        let signal = staticOnceOptions.signal || void 0;
        let timing = staticOnceOptions.timing || void 0;
        // todo: check `_isTiming(value: ServerTiming | ITiming | Console | unknown): value is ITiming;`
        let hasTiming = _isDefined(timing);
        const isEnrichErrorStack = EventEmitterEx.staticOnceEnrichErrorStack;
        const enrichErrorStackBy = isEnrichErrorStack
            ? _sanitizeErrorStack(new Error('-enrichStaticOnceErrorsStackBy-(ignore this)-'), true).stack
            : void 0
        ;
        const debugInfo = staticOnceOptions.debugInfo || void 0;
        const hasDebugInfo = _isObject(debugInfo);
        let abortControllersGroup: TAbortControllersGroup | void;
        let listenersCleanUp: Function | void = void 0;

        if (isEventTarget) {
            if (usePrependListener) {
                return _Promise.reject(new EventsTypeError('The "prepend" option is not supported for EventTarget emitter.', ERR_INVALID_OPTION_TYPE));
            }

            {
                let invalidTypeValue;

                if (Array.isArray(types)) {
                    for (const type of types) {
                        if (typeof type === 'symbol') {
                            invalidTypeValue = type;

                            break;
                        }
                    }
                }
                else if (typeof types === 'symbol') {
                    invalidTypeValue = types;
                }

                if (invalidTypeValue !== void 0) {
                    return _Promise.reject(new EventsTypeError(`The "${typeof invalidTypeValue}" value type of "types" argument is not supported for EventTarget emitter.`, ERR_INVALID_ARG_TYPE));
                }
            }

            if (typeof errorEventName === 'symbol') {
                return _Promise.reject(new EventsTypeError(`The "${typeof errorEventName}" value type of "errorEventName" option is not supported for EventTarget emitter.`, ERR_INVALID_OPTION_TYPE));
            }
        }

        {
            if (signal) {
                // eslint-disable-next-line unicorn/no-lonely-if
                if (!isAbortSignal(signal)) {
                    return _Promise.reject(new EventsTypeError(`Failed to execute 'once' on emitter: member signal is not of type AbortSignal.`, ERR_INVALID_OPTION_TYPE));
                }
            }

            if (abortControllers && Array.isArray(abortControllers) && abortControllers.length > 0) {
                abortControllersGroup = new AbortControllersGroup(abortControllers, signal ? [ signal ] : []);
                signal = abortControllersGroup.signal;
            }

            if (signal) {
                // Return early if already aborted.
                if (signal.aborted) {
                    // todo: Сделать отдельный класс ошибок EventsAbortError (аналогично EventsTypeError)?
                    return _Promise.reject(createAbortError(ABORT_ERR, signal.reason));
                }

                if (eventTargetListenerOptions && isEventTarget && _eventTargetHasSignalSupport(emitter as DOMEventTarget)) {
                    eventTargetListenerOptions.signal = signal;
                }
            }
        }

        if (hasTiming) {
            _assertIsDefined(timing);

            timing.time(types);
        }

        let promise;

        if (Array.isArray(types)) {
            let winnerEventType: (typeof types extends (infer T)[] ? T : typeof types) | void;

            promise = new _Promise<any[]>((resolve, reject) => {
                const eventListenersByType: [
                    type: typeof types extends (infer T)[] ? T : never,
                    listener: Listener,
                ][] = [];
                let needErrorListener = true;

                listenersCleanUp = function() {
                    for (const { 0: type, 1: listener } of eventListenersByType) {
                        if (isEventTarget) {
                            _eventTargetRemoveListener((emitter as DOMEventTarget), type, listener, eventTargetListenerOptions);
                        }
                        else {
                            _emitter.removeListener(type as string | symbol, listener);
                        }

                        if (hasTiming && type !== winnerEventType) {
                            _assertIsDefined(timing);

                            if (typeof timing.timeClear === 'function') {
                                timing.timeClear(type as string, true);
                            }
                            else {
                                timing.timeEnd(type as string, true);
                            }
                        }
                    }

                    if (needErrorListener) {
                        if (isEventTarget) {
                            if (errorEventNameIsDefined) {
                                // EventTarget does not have `error` event semantics like Node, so check if errorEventName is defined
                                _eventTargetRemoveListener((emitter as DOMEventTarget), errorEventName, errorListener, eventTargetListenerOptions);
                            }
                        }
                        else {
                            _emitter.removeListener(errorEventName, errorListener);
                        }
                    }

                    eventListenersByType.length = 0;
                    listenersCleanUp = void 0;

                    if (hasTiming) {
                        // cleanup
                        timing = void 0;
                        hasTiming = false;
                    }
                };

                for (const type of types) {
                    if (type === errorEventName) {
                        // https://nodejs.org/api/events.html#events_events_once_emitter_name_options
                        // ...
                        // The special handling of the 'error' event is only used when events.once() is used to wait for another event.
                        // If events.once() is used to wait for the 'error' event itself, then it is treated as any other kind of event without special handling.
                        needErrorListener = false;
                    }

                    const eventListener = (...args: unknown[]) => {
                        const callbacksArgs = (filter || onDone)
                            ? [ type, ...args ] as [ emitEventName: EventName, ...amitArgs: any[] ]
                            : void 0
                        ;

                        if (filter) {
                            try {
                                if (!filter.apply(_emitter, callbacksArgs as NonNullable<typeof callbacksArgs>)) {
                                    return;
                                }
                            }
                            catch (err) {
                                reject(err);
                            }
                        }

                        if (onDone) {
                            try {
                                onDone.apply(_emitter, callbacksArgs as NonNullable<typeof callbacksArgs>);
                            }
                            catch (err) {
                                reject(err);
                            }
                        }

                        winnerEventType = type;

                        if (hasTiming) {
                            _assertIsDefined(timing);

                            timing.timeEnd(type as string, true);
                        }

                        if (listenersCleanUp) {
                            listenersCleanUp();
                        }

                        resolve(args);
                    };

                    eventListenersByType.push([ type, eventListener ]);

                    if (isEventTarget) {
                        _eventTargetAddListener((emitter as DOMEventTarget), type, eventListener, eventTargetListenerOptions);
                    }
                    else if (usePrependListener) {
                        _emitter.prependListener(type as string | symbol, eventListener);
                    }
                    else {
                        _emitter.on(type as string | symbol, eventListener);
                    }
                }

                const errorListener = (error: unknown) => {
                    if (hasTiming) {
                        _assertIsDefined(timing);

                        // В случае ошибки, удаляем все метки времени.
                        // todo: Создавать метку времени для 'error' и закрывать её в случае ошибки. Если ошибки не было - удалять метку времени для 'error' из timing.
                        if (typeof timing.timeClear === 'function') {
                            timing.timeClear(types, true);
                        }
                        else {
                            timing.timeEnd(types, true);
                        }

                        // cleanup
                        timing = void 0;
                        hasTiming = false;
                    }

                    if (listenersCleanUp) {
                        listenersCleanUp();
                    }

                    reject(error);
                };

                if (!needErrorListener) {
                    // No need to add errorEventName('error') handler due it already added by one of `types`;
                    return;
                }

                if (isEventTarget) {
                    if (errorEventNameIsDefined) {
                        // EventTarget does not have `error` event semantics like Node, so check if errorEventName is defined
                        _eventTargetAddListener((emitter as DOMEventTarget), errorEventName, errorListener, eventTargetListenerOptions);
                    }
                }
                else if (usePrependListener) {
                    _emitter.prependListener(errorEventName, errorListener);
                }
                else {
                    _emitter.on(errorEventName, errorListener);
                }
            });
        }
        else {
            const type = types;
            // https://nodejs.org/api/events.html#events_events_once_emitter_name_options
            // ...
            // The special handling of the 'error' event is only used when events.once() is used to wait for another event.
            // If events.once() is used to wait for the 'error' event itself, then it is treated as any other kind of event without special handling.
            const needErrorListener = type !== errorEventName;

            promise = new _Promise<any[]>((resolve, reject) => {
                const eventListener = (...args: unknown[]) => {
                    const callbacksArgs = (filter || onDone)
                        ? [ type, ...args ] as [ emitEventName: EventName, ...amitArgs: any[] ]
                        : void 0
                    ;

                    if (filter) {
                        try {
                            if (!filter.apply(_emitter, callbacksArgs as NonNullable<typeof callbacksArgs>)) {
                                return;
                            }
                        }
                        catch (err) {
                            reject(err);
                        }
                    }

                    if (onDone) {
                        try {
                            onDone.apply(_emitter, callbacksArgs as NonNullable<typeof callbacksArgs>);
                        }
                        catch (err) {
                            reject(err);
                        }
                    }

                    if (hasTiming) {
                        _assertIsDefined(timing);

                        timing.timeEnd(type, true);
                        // cleanup
                        timing = void 0;
                        hasTiming = false;
                    }

                    if (listenersCleanUp) {
                        listenersCleanUp();
                    }

                    resolve(args);
                };
                const errorListener = (error: unknown) => {
                    if (hasTiming) {
                        _assertIsDefined(timing);

                        // В случае ошибки, удаляем все метки времени.
                        // todo: Создавать метку времени для 'error' и закрывать её в случае ошибки. Если ошибки не было - удалять метку времени для 'error' из timing.
                        //   if (typeof timing!.timeClear === 'function') {
                        //       timing!.timeClear(type as string, true);
                        //   } else { timing!.timeEnd(type as string, true); }
                        timing.timeEnd(type, true);
                        // cleanup
                        timing = void 0;
                        hasTiming = false;
                    }

                    if (listenersCleanUp) {
                        listenersCleanUp();
                    }

                    reject(error);
                };

                listenersCleanUp = function() {
                    if (isEventTarget) {
                        _eventTargetRemoveListener((emitter as DOMEventTarget), type, eventListener, eventTargetListenerOptions);

                        if (errorEventNameIsDefined && needErrorListener) {
                            // EventTarget does not have `error` event semantics like Node, so check if errorEventName is defined
                            _eventTargetRemoveListener((emitter as DOMEventTarget), errorEventName, errorListener, eventTargetListenerOptions);
                        }
                    }
                    else {
                        _emitter.removeListener(type as string | symbol, eventListener);

                        if (needErrorListener) {
                            _emitter.removeListener(errorEventName, errorListener);
                        }
                    }

                    listenersCleanUp = void 0;
                };

                if (isEventTarget) {
                    _eventTargetAddListener((emitter as DOMEventTarget), type, eventListener, eventTargetListenerOptions);

                    if (errorEventNameIsDefined && needErrorListener) {
                        // EventTarget does not have `error` event semantics like Node, so check if errorEventName is defined
                        _eventTargetAddListener((emitter as DOMEventTarget), errorEventName, errorListener, eventTargetListenerOptions);
                    }
                }
                else if (usePrependListener) {
                    _emitter.prependListener(type as string | symbol, eventListener);

                    if (needErrorListener) {
                        _emitter.prependListener(errorEventName, errorListener);
                    }
                }
                else {
                    _emitter.on(type as string | symbol, eventListener);

                    if (needErrorListener) {
                        _emitter.on(errorEventName, errorListener);
                    }
                }
            });
        }

        if (signal || timeout) {
            let abortCallback: ((this: AbortSignal | void, event_: AbortSignalEventMap["abort"] | typeof sCleanAbortPromise) => void) | void;
            let cleanTimeoutCallback: Function | void;

            // Turn an event into a promise, reject it once `abort` is dispatched
            const cancelPromise = signal ? new _Promise<void>((resolve, reject) => {
                abortCallback = function(clearPromiseSymbol) {
                    if (abortCallback) {
                        _assertIsDefined(signal);

                        signal.removeEventListener('abort', abortCallback);
                    }

                    if (clearPromiseSymbol === sCleanAbortPromise) {
                        // Call resolve only in cleanup purpose. It should be called when it cannot affect Promise.race!
                        // Очищаем Promise, чтобы он не висел нереализованным. resolve должен вызываться когда уже не может повлиять на Promise.race!
                        resolve();
                    }
                    else {
                        if (listenersCleanUp) {
                            listenersCleanUp();
                        }

                        if (hasDebugInfo) {
                            console.error('once#Aborted:', debugInfo, { types, errorEventName });
                        }

                        const signalReason = signal?.reason;
                        // Тут всегда должна создаваться новая AbortError (НЕ DOMException),
                        //  даже если `isAbortError(signalReason) === true`, а "signalReason" - это DOMException ABORT_ERR
                        // todo: Вызывать ErrorTools.createAbortError
                        // todo: Сделать отдельный класс ошибок EventsAbortError (аналогично EventsTypeError)?
                        const abortError = createAbortError(ABORT_ERR, signalReason);

                        _sanitizeErrorStack(abortError);

                        if (enrichErrorStackBy) {
                            // подмешиваем в "abortError.stack" стек созданные выше, по время вызова `static once`.
                            _enrichErrorStackToOnceTimeoutError(abortError, enrichErrorStackBy, types, errorEventName);
                        }

                        reject(abortError);
                    }

                    abortCallback = void 0;
                };

                _assertIsDefined(signal);

                signal.addEventListener('abort', abortCallback);
            }) : void 0;
            const timeoutPromise = timeout ? new _Promise<void>((resolve, reject) => {
                let timeoutId: Timeout | void = setTimeout(() => {
                    if (hasTiming) {
                        _assertIsDefined(timing);

                        // todo: Создавать метку времени для 'timeout' и закрывать её в случае таймаута. Если ошибки не было - удалять метку времени для 'timeout' из timing.
                        //   if (typeof timing!.timeClear === 'function') {
                        //       timing!.timeClear(type as string, true);
                        //   } else { timing!.timeEnd(type as string, true); }
                        timing.timeEnd(types, true);
                        // cleanup
                        timing = void 0;
                        hasTiming = false;
                    }

                    if (listenersCleanUp) {
                        listenersCleanUp();
                    }

                    if (hasDebugInfo) {
                        console.error('once#Timeout:', debugInfo, { types, errorEventName });
                    }

                    timeoutId = void 0;

                    // todo:
                    //  1. Сделать отдельный класс ошибок EventsOnceError (аналогично EventsTypeError), в котором будут
                    //   свойства error.types и error.errorType.
                    //  2. Если types - это массив с количеством элементов большим разумного числа (например, больше 30),
                    //   то не выводить его в сообщении ошибки, а прикреплять его как error.types).
                    reject(_createOnceTimeoutError({
                        eventNames: types,
                        errorEventNames: errorEventNameIsDefined ? errorEventName : void 0,
                    }, enrichErrorStackBy));
                }, timeout);

                cleanTimeoutCallback = function() {
                    /*
                    if (hasDebugInfo) {
                        console.info('once#cleanTimeout:', debugInfo, { timeoutId });
                    }
                    */

                    if (timeoutId) {
                        clearTimeout(timeoutId);

                        timeoutId = void 0;
                    }

                    // Call resolve only in cleanup purpose. It should be called when it cannot affect Promise.race!
                    // Очищаем Promise, чтобы он не висел нереализованным. resolve должен вызываться когда уже не может повлиять на Promise.race!
                    resolve();

                    cleanTimeoutCallback = void 0;
                };
            }) : void 0;

            const promises: Promise<any[] | void>[] = [ promise ];

            if (cancelPromise) {
                promises.push(cancelPromise);
            }
            if (timeoutPromise) {
                promises.push(timeoutPromise);
            }

            // Return the fastest promise (don't need to wait for request to finish)
            // eslint-disable-next-line promise/prefer-await-to-then
            return _Promise.race(promises).then(result => {
                if (listenersCleanUp) {
                    listenersCleanUp();
                }
                if (abortCallback) {
                    // Вызываем abortCallback передавая в неё sClearPromiseSymbol, чтобы она сама за собой подчистила
                    abortCallback(sCleanAbortPromise);
                }
                if (cleanTimeoutCallback) {
                    cleanTimeoutCallback();
                }
                if (abortControllersGroup) {
                    abortControllersGroup.close();
                    abortControllersGroup = void 0;
                }

                if (hasTiming) {
                    _assertIsDefined(timing);

                    timing.timeEnd(types, true);
                    // cleanup
                    timing = void 0;
                    hasTiming = false;
                }

                return result as any[];
                // eslint-disable-next-line promise/prefer-await-to-then,promise/prefer-await-to-callbacks
            }).catch(error => {
                if (listenersCleanUp) {
                    listenersCleanUp();
                }
                if (abortCallback) {
                    // Вызываем abortCallback передавая в неё sClearPromiseSymbol, чтобы она сама за собой подчистила
                    abortCallback(sCleanAbortPromise);
                }
                if (cleanTimeoutCallback) {
                    cleanTimeoutCallback();
                }
                if (abortControllersGroup) {
                    abortControllersGroup.close();
                    abortControllersGroup = void 0;
                }

                if (hasTiming) {
                    _assertIsDefined(timing);

                    timing.timeEnd(types, true);
                    // cleanup
                    timing = void 0;
                    hasTiming = false;
                }

                throw error;
            });
        }

        return promise;
    }

    on2<EventKey extends keyof EMD<EventMap> = EventName>(
        _event: EventKey,
        listener: EMD<EventMap>[EventKey],
        options?: { isRaw?: boolean },
    ) {
        const event = options?.isRaw
            ? EventEmitterEx._eventToEventRaw(_event)
            : _event
        ;

        return this.on(event as EventKey, listener);
    }

    emit2<EventKey extends keyof EMD<EventMap>>(
        _event: EventKey,
        options?: { isRaw?: boolean },
        ...args: Parameters<EMD<EventMap>[EventKey]>
    ) {
        const event = options?.isRaw
            ? EventEmitterEx._eventToEventRaw(_event)
            : _event
        ;

        return this.emit(event as EventKey, ...args);
    }

    removeListener2<EventKey extends keyof EMD<EventMap> = EventName>(
        _event: EventKey,
        listener: EMD<EventMap>[EventKey],
        options?: { isRaw?: boolean },
    ) {
        const event = options?.isRaw
            ? EventEmitterEx._eventToEventRaw(_event)
            : _event
        ;

        return this.removeListener(event as EventKey, listener);
    }

    listenerCount2<EventKey extends keyof EMD<EventMap> = EventName>(
        _event: EventKey,
        options?: { isRaw?: boolean },
    ): number {
        const event = options?.isRaw
            ? EventEmitterEx._eventToEventRaw(_event)
            : _event
        ;

        return this.listenerCount(event as EventKey);
    }

    private static _eventToEventRaw(event: EventName): EventName {
        const numericalOffset = 1;
        const stringOffset = "-raw";

        switch (typeof event) {
            case "string": {
                return event + stringOffset;
            }
            case "number": {
                return (event as number) << numericalOffset;
            }
            default: {
                return event;
            }
        }
    }

    static readonly errorMonitor = errorMonitor as typeof import("node:events").errorMonitor;
    static readonly captureRejectionSymbol = captureRejectionSymbol as typeof import("node:events").captureRejectionSymbol;
    // domain is not supported
    static readonly usingDomains = false;

    static EventEmitter = EventEmitterEx;
    static EventEmitterEx = EventEmitterEx;
    static EventEmitterX = EventEmitterEx;

    /** alias for global AbortController */
    static AbortController = AbortController;
}

const tagEventEmitterEx = 'EventEmitterEx';

if (EventEmitterEx.constructor.name !== tagEventEmitterEx) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(EventEmitterEx.constructor, 'name', { value: tagEventEmitterEx, configurable: true });
}

type EventEmitterX_Listener = Listener;

// todo: rename to EventEmitterX, `export { EventEmitterX as EventEmitterEx }` for backward compatibility
export namespace EventEmitterEx {
    export type ConstructorOptions = _ConstructorOptions;
    export type Listener = EventEmitterX_Listener;

    /**
     * @see {@link EventListenerObject}
     */
    export type ListenerAsObject = {
        handleEvent?: (this: ListenerAsObject, ...args: unknown[]) => void,
    };
}

export {
    EventEmitterEx as EventEmitter,
    EventEmitterEx as EventEmitterX,
    EventEmitterEx as default,
};

function _sanitizeErrorStack(error: Error, autoRemoveErrorMessageFromStach = false) {
    let { stack = '' } = error;

    if (!error["originalStack"]) {
        Object.defineProperty(error, "originalStack", {
            value: stack,
            configurable: true,
            writable: true,
            enumerable: false,
        });
    }

    if (autoRemoveErrorMessageFromStach) {
        const startOfStack = stack.search(/\s*at\s/);

        if (startOfStack !== -1) {
            stack = stack.substring(startOfStack);
        }
    }

    error.stack = stack.split(/\n/).filter(stackLine => {
        if (/[/\\]AbortController\./.test(stackLine)) {
            // note: Сейчас файл называется AbortController.ts, но в будущем может называться abortable.ts или abortUtils.ts
            return false;
        }
        if (/[/\\]events\./.test(stackLine)) {
            // events.ts or EventEmitterX/events.ts
            return false;
        }

        if (/[/\\]node_modules[/\\]/.test(stackLine)) {
            if (/[/\\]jest-circus[/\\]/.test(stackLine)) {
                return false;
            }
            if (/[/\\]jest-runner[/\\]/.test(stackLine)) {
                return false;
            }
            if (/[/\\]jest-cli[/\\]/.test(stackLine)) {
                return false;
            }
            if (/[/\\]@jest[/\\]core[/\\]/.test(stackLine)) {
                return false;
            }
            if (/[/\\]@sinonjs[/\\]fake-timers[/\\]/.test(stackLine)) {
                return false;
            }
            if (/[/\\]jsdom[/\\]lib[/\\]jsdom[/\\]/.test(stackLine)) {
                return false;
            }
        }

        if (stackLine.includes('node:internal/process/task_queues:')
            || stackLine.includes('node:async_hooks:')
        ) {
            // nodejs lines
            return false;
        }

        // noinspection RedundantIfStatementJS
        if (stackLine.trim() === 'at new Promise (<anonymous>)') {
            return false;
        }

        return true;
    }).join('\n');

    return error;
}

interface EventEmitterSimpleProxy_Options extends _ConstructorOptions {
    emitter: EventEmitterEx | INodeEventEmitter/* | DOMEventTarget*/;
}

export class EventEmitterSimpleProxy<EventMap extends DefaultEventMap = DefaultEventMap> extends EventEmitterEx<EventMap> {
    private _eventEmitter: EventEmitterEx | INodeEventEmitter | void;
    // private _eventTarget: DOMEventTarget|void;
    private _proxyHandlers: Partial<Record<EventName, (...args: any[]) => void>> = Object.create(null);

    // private _isEventTarget = false;

    /**
     * Этот класс предназначен для того, чтобы подключится к экземпляру EventEmitter, запоминать все подписки на него
     *  а при вызове removeAllListeners, удалять все подписки, которые прошли через экземпляр этого класса.
     *
     * Например, мы можем создать экземпляр этого класса передав в конструктор userActionMonitor (который кидает события 'mouse_click').
     *  Передаём этот экземпляр на стороннюю страницу, там подписываются на события 'mouse_click', а когда страница выгружается, при
     *  вызове removeAllListeners, мы удалим все подписки, которые были сделаны на этой странице, не затрагивая подписки с других страниц
     */
    constructor(options?: EventEmitterSimpleProxy_Options) {
        super(options);

        const {
            emitter,
        } = options || {};

        if (_isEventEmitterCompatible(emitter as ICompatibleEmitter)) {
            this._eventEmitter = emitter as EventEmitterEx | INodeEventEmitter;
        }
        /* todo: add EventTarget support
        else if (_isEventTargetCompatible(emitter)) {
            this._eventTarget = emitter as DOMEventTarget;
            this._isEventTarget = true;
        }
         */
        else {
            throw new TypeError('compatible "emitter" required');
        }
    }

    destructor() {
        super.destructor();

        this._eventEmitter = void 0;
    }

    private _onEventEmitterEvent(event: EventName, ...args: unknown[]) {
        switch (args.length) {
            case 0:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore ignore `Argument of type '[]' is not assignable to parameter of type 'Parameters<EMD<EventMap>[EventName]>'.`
                super.emit(event);

                break;
            case 1:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore ignore `Argument of type '[unknown]' is not assignable to parameter of type 'Parameters<EMD<EventMap>[EventName]>'.`
                super.emit(event, args[0]);

                break;
            case 2:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore ignore `Argument of type '[unknown, unknown]' is not assignable to parameter of type 'Parameters<EMD<EventMap>[EventName]>'.`
                super.emit(event, args[0], args[1]);

                break;
            case 3:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore ignore `Argument of type '[unknown, unknown, unknown]' is not assignable to parameter of type 'Parameters<EMD<EventMap>[EventName]>'.`
                super.emit(event, args[0], args[1], args[2]);

                break;
            default:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore ignore `Argument of type 'unknown[]' is not assignable to parameter of type 'Parameters<EMD<EventMap>[EventName]>'.`
                super.emit(event, ...args);
        }
    }

    /*
    // EventListenerObject["handleEvent"]
    public handleEvent(evt: Event) {
        const {type} = evt;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        super.emit(type, evt);
    }
    */

    emit<EventKey extends keyof EMD<EventMap> = keyof EMD<EventMap>>(
        event: EventKey,
        ...args: Parameters<EMD<EventMap>[EventKey]>
    ) {
        if (_isLifecycleEvent(event)) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error `TS2345: Argument of type '[...Parameters  [EventKey]>]' is not assignable to parameter of type 'Parameters  [NodeEventName]>'.`
            return super.emit(event as NodeEventName, ...args);
        }
        // todo: super.emit(event as NodeEventName, ...args);

        if (!this._eventEmitter) {
            return false;
        }

        return this._eventEmitter.emit(event as NodeEventName, ...args);
    }

    emitSelf<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>) {
        return super.emit(event, ...args);
    }

    protected _addListener<EventKey extends keyof EMD<EventMap> = EventName>(
        event: EventKey,
        listener: EMD<EventMap>[EventKey],
        prepend: boolean,
        once: boolean,
    ) {
        const result = super._addListener(event, listener, prepend, once);

        if (_isLifecycleEvent(event)) {
            return result;
        }

        const {
            _eventEmitter,
            _proxyHandlers,
        } = this;

        if (!_eventEmitter) {
            return result;
        }

        let eventProxy = _proxyHandlers[event];

        if (eventProxy) {
            // Нам нужно быть уверенным, что обработчик будет подписан на этот type, но только один раз
            // Если он ещё не был подписан, то removeListener ничего не сделает
            (_eventEmitter as EventEmitterEx).removeListener(event as NodeEventName, eventProxy);
        }
        else {
            // eslint-disable-next-line unicorn/consistent-destructuring
            eventProxy = this._onEventEmitterEvent.bind(this, event);
            _proxyHandlers[event] = eventProxy;
        }

        _assertIsDefined(eventProxy);

        if (prepend) {
            if (once) {
                (_eventEmitter as EventEmitterEx).prependOnceListener(event as NodeEventName, eventProxy);
            }
            else {
                (_eventEmitter as EventEmitterEx).prependListener(event as NodeEventName, eventProxy);
            }
        }
        else {
            if (once) {
                (_eventEmitter as EventEmitterEx).once(event as NodeEventName, eventProxy);
            }
            else {
                (_eventEmitter as EventEmitterEx).on(event as NodeEventName, eventProxy);
            }
        }

        return result;
    }

    removeListener<EventKey extends keyof EMD<EventMap> = EventName>(
        event: EventKey,
        listener: EMD<EventMap>[EventKey],
    ) {
        const result = super.removeListener(event, listener);

        if (this.listenerCount(event) === 0) {
            const {
                _eventEmitter,
                _proxyHandlers,
            } = this;
            const proxyHandler = _proxyHandlers[event];

            delete _proxyHandlers[event];

            if (_eventEmitter && proxyHandler) {
                // eslint-disable-next-line unicorn/no-lonely-if
                if (proxyHandler) {
                    try {
                        (_eventEmitter as ICompatibleEmitter).removeListener(event as NodeEventName, proxyHandler);
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }

        return result;
    }

    removeAllListeners<EventKey extends keyof EMD<EventMap> = EventName>(event?: EventKey) {
        const {
            _eventEmitter,
            _proxyHandlers,
        } = this;

        for (const type of Object.keys(_proxyHandlers)) {
            if (event && event !== type) {
                continue;
            }

            const proxyHandler = _proxyHandlers[type];

            delete _proxyHandlers[type];

            if (_eventEmitter && proxyHandler) {
                // eslint-disable-next-line unicorn/no-lonely-if
                if (proxyHandler) {
                    try {
                        (_eventEmitter as ICompatibleEmitter).removeListener(type as NodeEventName, proxyHandler);
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }

        if (!event) {
            this._proxyHandlers = Object.create(null);
        }

        return super.removeAllListeners(event);
    }
}

const tagEventEmitterSimpleProxy = 'EventEmitterSimpleProxy';

if (EventEmitterSimpleProxy.constructor.name !== tagEventEmitterSimpleProxy) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(EventEmitterSimpleProxy.constructor, 'name', { value: tagEventEmitterSimpleProxy, configurable: true });
}

type EventEmitterProxy_SourceProxyHook = (
    defaultEventEmitter: ICompatibleEmitter | void,
    eventType: EventName,
) => ICompatibleEmitter | null | void;

type EventEmitterProxy_TargetProxyHook = (
    defaultEventEmitter: ICompatibleEmitter | void,
    eventType: EventName,
    eventArgs: unknown[] | null,
) => ICompatibleEmitter | null | void;

interface EventEmitterProxy_Options extends _ConstructorOptions {
    sourceEmitter?: ICompatibleEmitter/* | DOMEventTarget*/;
    targetEmitter?: ICompatibleEmitter/* | DOMEventTarget*/;
    /**
     * Функция, вычисляющая нужный экземпляр eventEmitter, который относиться к конкретному событию для **прослушивания**
     *  событий (для вызова [emitter.addListener]{@link ICompatibleEmitter.addListener})
     */
    getSourceEmitter?: EventEmitterProxy_SourceProxyHook;
    /**
     * Функция, вычисляющая нужный экземпляр eventEmitter, который относиться к конкретному событию для **отправки**
     *  событий (для вызова [emitter.emit]{@link ICompatibleEmitter.emit})
     */
    getTargetEmitter?: EventEmitterProxy_TargetProxyHook;
    /**
     * Можно ли вызвать [EventEmitterProxy#emit]{@link EventEmitterProxy.emit} для отправки события в `targetEmitter`?
     *
     * Default: `false`
     */
    allowDirectEmitToTarget?: boolean;
}

export class EventEmitterProxy<EventMap extends DefaultEventMap = DefaultEventMap> extends EventEmitterEx<EventMap> {
    private _getSourceEmitter: EventEmitterProxy_SourceProxyHook | void = void 0;
    private _getTargetEmitter: EventEmitterProxy_TargetProxyHook | void = void 0;
    private _sourceEmitter: ICompatibleEmitter/* | DOMEventTarget*/ | void;
    private _targetEmitter: ICompatibleEmitter/* | DOMEventTarget*/ | void;
    // private _eventTarget: DOMEventTarget|void;
    private _allowDirectEmitToTarget: Required<EventEmitterProxy_Options["allowDirectEmitToTarget"]>;
    private _hasProxyHandlers: Partial<Record<EventName, true>> = Object.create(null);
    private _antiLoopingInfoMap: Partial<Record<EventName, { args: unknown[] }>> = Object.create(null);
    private _knownSubscriptions: [
        eventType: EventName,
        eventEmitter: ICompatibleEmitter,
        proxyEventHandler: (...args: unknown[]) => void,
    ][] = [];

    // private _isEventTarget = false;

    /**
     * Этот класс предназначен для того, чтобы подключится к экземпляру EventEmitter, запоминать все подписки на него.
     *
     * А при вызове removeAllListeners, удалять все подписки, которые прошли через экземпляр этого класса.
     *
     * Например, мы можем создать экземпляр этого класса передав в конструктор userActionMonitor (который кидает события 'mouse_click').
     *  Передаём этот экземпляр на стороннюю страницу, там подписываются на события 'mouse_click', а когда страница выгружается, при
     *  вызове removeAllListeners, мы удалим все подписки, которые были сделаны на этой странице, не затрагивая подписки с других страниц
     */
    constructor(options?: EventEmitterProxy_Options) {
        super(options);

        const {
            getSourceEmitter,
            getTargetEmitter,
            sourceEmitter,
            targetEmitter,
            allowDirectEmitToTarget = false,
        } = options || {};

        this.setGetSourceEmitter(getSourceEmitter);
        this.setGetTargetEmitter(getTargetEmitter);

        this._sourceEmitter = _isEventEmitterCompatible(sourceEmitter) ? sourceEmitter : void 0;
        this._targetEmitter = isEventEmitterCompatible(targetEmitter) ? targetEmitter : void 0;
        this._allowDirectEmitToTarget = allowDirectEmitToTarget;

        /* todo: add EventTarget support
        else if (_isEventTargetCompatible(emitter)) {
            this._eventTarget = emitter as DOMEventTarget;
            this._isEventTarget = true;
        }

         */
    }

    destructor() {
        // Внутри есть вызов `this.removeAllListeners()`
        super.destructor();

        this._sourceEmitter = void 0;
        this._targetEmitter = void 0;
        this._getSourceEmitter = void 0;
        this._getTargetEmitter = void 0;
    }

    setGetSourceEmitter(getSourceEmitter?: EventEmitterProxy_SourceProxyHook) {
        if (typeof getSourceEmitter === 'function') {
            this._getSourceEmitter = getSourceEmitter;
        }
        else {
            this._getSourceEmitter = void 0;
        }
    }

    setGetTargetEmitter(getTargetEmitter?: EventEmitterProxy_TargetProxyHook) {
        if (typeof getTargetEmitter === 'function') {
            this._getTargetEmitter = getTargetEmitter;
        }
        else {
            this._getTargetEmitter = void 0;
        }
    }

    private _detectSourceEmitter(event: EventName) {
        const defaultSourceEmitter = this._sourceEmitter || void 0;
        const selectedSourceEmitter = this._getSourceEmitter
            ? this._getSourceEmitter(defaultSourceEmitter, event)
            : void 0
        ;

        if (selectedSourceEmitter === null) {
            // `null` - специальный результат работы EventEmitterProxy_ProxyHook, который говорит о том, что не нужно
            //  прослушивать данное событие.
            return null;
        }

        const sourceEmitter = selectedSourceEmitter || defaultSourceEmitter;

        if (!sourceEmitter) {
            // Не найден targetEmitter
            return;
        }

        return sourceEmitter;
    }

    private _detectTargetEmitter(event: EventName, args: unknown[] | null) {
        const defaultTargetEmitter = this._targetEmitter || void 0;
        const selectedTargetEmitter = this._getTargetEmitter
            ? this._getTargetEmitter(defaultTargetEmitter, event, args)
            : void 0
        ;

        if (selectedTargetEmitter === null) {
            // `null` - специальный результат работы EventEmitterProxy_ProxyHook, который говорит о том, что не нужно
            //  отправлять данное событие.
            return null;
        }

        const targetEmitter = selectedTargetEmitter || defaultTargetEmitter;

        if (!targetEmitter) {
            // Не найден targetEmitter
            return;
        }

        return targetEmitter;
    }

    private _emitToTarget(event: EventName, args: unknown[], targetEmitter: ICompatibleEmitter) {
        const has_sourceEmitter_subscription = !!this._hasProxyHandlers[event];

        if (has_sourceEmitter_subscription) {
            /**
             * Есть подписка на такое же событие у sourceEmitter. Это может привести к "зацикливанию" переадресации
             *  события, если:
             *  1. sourceEmitter === targetEmitter
             *  2. sourceEmitter связан с targetEmitter по ещё одному EventEmitterProxy
             *
             * Для исключения циклической пересылки события, выставляем флаг, который будет проверяться в
             *  {@link EventEmitterProxy._onEventEmitterEvent}. Также, сохраним аргументы, чтобы проверить их соответствие.
             */
            const antiLoopingInfo = {
                args,
            };

            if (this._antiLoopingInfoMap[event]) {
                throw new Error(`[EventEmitterProxy][#emit]: potentially multiply synchronously nested emit for event "${String(event)}"`);
            }

            this._antiLoopingInfoMap[event] = antiLoopingInfo;
        }

        const targetEmitResult = targetEmitter.emit(event as NodeEventName, ...args);

        if (has_sourceEmitter_subscription) {
            delete this._antiLoopingInfoMap[event];
        }

        return targetEmitResult;
    }

    private _onEventEmitterEvent(sourceEmitter: ICompatibleEmitter, event: EventName, ...args: unknown[]) {
        const antiLoopingInfo = this._antiLoopingInfoMap[event];

        if (antiLoopingInfo) {
            // todo: Сравнивать antiLoopingInfo.args == args
            /**
             * Получили событие, которое сами же и отправили в {@link EventEmitterProxy.emit}.
             * Значение {@link EventEmitterProxy._antiLoopingInfoMap} выставляется в функции {@link EventEmitterProxy._emitToTarget}
             */
            return;
        }

        const targetEmitter = this._detectTargetEmitter(event, args);

        if (targetEmitter === null) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error `TS2345: Argument of type 'unknown[]' is not assignable to parameter of type 'Parameters  [EventName]>'.`
        super.emit(event, ...args);

        if (targetEmitter) {
            if (sourceEmitter === targetEmitter) {
                // Если отправитель и получатель одинаковые и событие отправил отправитель, то не нужно на него же ещё раз направлять это событие.
                return;
            }

            this._emitToTarget(event, args, targetEmitter);
        }
    }

/*

    // EventListenerObject["handleEvent"]
    public handleEvent(evt: Event) {
        const {type} = evt;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        super.emit(type, evt);
    }
*/

    emit<EventKey extends keyof EMD<EventMap> = keyof EMD<EventMap>>(
        event: EventKey,
        ...args: Parameters<EMD<EventMap>[EventKey]>
    ) {
        if (_isLifecycleEvent(event)) {
            return super.emit(event, ...args);
        }

        if (!this._allowDirectEmitToTarget) {
            throw new Error('[EventEmitterProxy][emit]: emitting events to targetEmitter is not allowed');
        }

        const targetEmitter = this._detectTargetEmitter(event, args);
        let targetEmitResult = false;

        if (targetEmitter) {
            targetEmitResult = this._emitToTarget(event, args, targetEmitter);
        }

        const localEmitResult = super.emit(event, ...args);

        return targetEmitResult || localEmitResult;
    }

    emitSelf<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>) {
        return super.emit(event, ...args);
    }

    protected _addListener<EventKey extends keyof EMD<EventMap> = EventName>(
        event: EventKey,
        listener: EMD<EventMap>[EventKey],
        prepend: boolean,
        once: boolean,
    ) {
        const result = super._addListener(event, listener, prepend, once);

        if (_isLifecycleEvent(event)) {
            return result;
        }

        const sourceEmitter = this._detectSourceEmitter(event);

        if (!sourceEmitter) {
            return result;
        }

        const {
            _knownSubscriptions,
        } = this;
        const knownSubscription = this._knownSubscriptions.find(([ eventType, eventsEmitter ]) => {
            return event === eventType
                && eventsEmitter === sourceEmitter
            ;
        });
        let eventProxyHandler: typeof _knownSubscriptions[number][2];

        if (knownSubscription) {
            eventProxyHandler = knownSubscription[2];

            // Нам нужно быть уверенным, что обработчик будет подписан на этот type, но только один раз
            // Если он ещё не был подписан, то removeListener ничего не сделает
            (sourceEmitter as EventEmitterEx).removeListener(event as NodeEventName, eventProxyHandler);
        }
        else {
            eventProxyHandler = this._onEventEmitterEvent.bind(this, sourceEmitter, event);
        }

        _assertIsDefined(eventProxyHandler);

        if (prepend) {
            if (once) {
                (sourceEmitter as EventEmitterEx).prependOnceListener(event as NodeEventName, eventProxyHandler);
            }
            else {
                (sourceEmitter as EventEmitterEx).prependListener(event as NodeEventName, eventProxyHandler);
            }
        }
        else {
            if (once) {
                (sourceEmitter as EventEmitterEx).once(event as NodeEventName, eventProxyHandler);
            }
            else {
                (sourceEmitter as EventEmitterEx).on(event as NodeEventName, eventProxyHandler);
            }
        }

        if (!knownSubscription) {
            this._hasProxyHandlers[event] = true;

            this._knownSubscriptions.push([
                event,
                sourceEmitter,
                eventProxyHandler,
            ]);
        }

        return result;
    }

    private _removeListenerFromTargets(event: EventName | void, targetEmitter: ICompatibleEmitter | void) {
        const has_event = event !== void 0;
        const has_targetEmitter = targetEmitter !== void 0;
        const subscriptionsCounters: Record<EventName, number> = Object.create(null);
        const {
            _knownSubscriptions,
        } = this;

        for (let i = 0, len = _knownSubscriptions.length ; i < len ; i++) {
            const knownSubscription = _knownSubscriptions[i] as NonNullable<typeof _knownSubscriptions[0]>;
            const {
                0: eventType,
                1: eventEmitter,
                2: eventProxyHandler,
            } = knownSubscription;
            let counter = (subscriptionsCounters[eventType] || 0) + 1;

            if ((has_event ? eventType === event : true)
                && (has_targetEmitter ? targetEmitter === eventEmitter : true)
            ) {
                counter--;

                try {
                    eventEmitter.removeListener(eventType as NodeEventName, eventProxyHandler);
                }
                catch {
                    // ignore
                }

                _knownSubscriptions.splice(i, 1);
                i--;
                len--;
            }

            subscriptionsCounters[eventType] = counter;
        }

        for (const eventType of Object.keys(subscriptionsCounters)) {
            const counter = subscriptionsCounters[eventType];

            if (counter === 0) {
                // All subscriptions for this eventType was removed
                delete this._hasProxyHandlers[eventType];
            }
        }
    }

    removeListener<EventKey extends keyof EMD<EventMap> = EventName>(
        event: EventKey,
        listener: EMD<EventMap>[EventKey],
    ) {
        const result = super.removeListener(event, listener);

        if (this.listenerCount(event) === 0) {
            this._removeListenerFromTargets(event, void 0);
        }

        return result;
    }

    removeAllListeners<EventKey extends keyof EMD<EventMap> = EventName>(event?: EventKey) {
        this._removeListenerFromTargets(event, void 0);

        return super.removeAllListeners(event);
    }

    static ABORT_ERR = ABORT_ERR;
}

const tagEventEmitterProxy = 'EventEmitterProxy';

if (EventEmitterProxy.constructor.name !== tagEventEmitterProxy) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(EventEmitterProxy.constructor, 'name', { value: tagEventEmitterProxy, configurable: true });
}

// noinspection JSUnusedGlobalSymbols
export type NodeEventEmitter = INodeEventEmitter;

export { errorMonitor, captureRejectionSymbol, ABORT_ERR };
export const { once, on, getEventListeners } = EventEmitterEx;

/**
 * @private
 */
class EventsTypeError extends TypeError {
    code: string | void;

    constructor(message = '', code?: string) {
        message = String(message || '');

        super(message && code ? `[${code}]: ${message}` : message ? message : (code || ''));

        // this.name = 'TypeError';
        this.code = code ? String(code) : void 0;
        this.message = message;
    }

    toString() {
        const { code, message } = this;

        if (code) {
            return `TypeError [${code}]: ${message}`;
        }

        return `TypeError: ${message}`;
    }

    static fromObject(error: Error | { code?: string | undefined, message: string }) {
        if (error instanceof EventsTypeError) {
            return error;
        }
        else {
            const { code, message } = error as { code?: string | undefined, message: string };

            return new EventsTypeError(message, code);
        }
    }
}

const tagEventsTypeError = 'EventsTypeError';

if (EventsTypeError.constructor.name !== tagEventsTypeError) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(EventsTypeError.constructor, 'name', { value: tagEventsTypeError, configurable: true });
}

// see: https://github.com/bjyoungblood/es6-error/blob/master/src/index.js
export class TimeoutError extends Error {
    name = 'TimeoutError';
    code = 'ETIMEDOUT';

    constructor(...args: any[]) {
        super(...args);

        if (!this.stack) {
            // es5 environment
            this.stack = (new Error('-get-stack-')).stack;
        }
    }

    static ETIMEDOUT = 'ETIMEDOUT';
}

const tagTimeoutError = 'TimeoutError';

if (TimeoutError.constructor.name !== tagTimeoutError) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(TimeoutError.constructor, 'name', { value: tagTimeoutError, configurable: true });
}

function _createOnceTimeoutError({
    eventNames,
    errorEventNames,
    cause,
}: {
    eventNames: EventName | EventName[],
    errorEventNames: EventName | EventName[] | undefined,
    cause?: any,
}, enrichErrorStackBy?: string) {
    const message = `EventEmitterX.once: Waiting of ${_typesToArrayStringTag(eventNames, errorEventNames)} timeout`;
    const error = new TimeoutError(message, cause !== void 0 ? { cause } : void 0);

    _sanitizeErrorStack(error);

    if (enrichErrorStackBy) {
        _enrichErrorStackToOnceTimeoutError(error, enrichErrorStackBy, eventNames, errorEventNames);
    }

    return error;
}

function _enrichErrorStackToOnceTimeoutError(
    error: Error,
    enrichErrorStackBy: string,
    eventNames: EventName | EventName[],
    errorEventNames: EventName | EventName[] | undefined,
) {
    const onceOptionsString = `{ signal${errorEventNames ? `, errorEventName: ${_typesToArrayStringTag(errorEventNames)}` : ''} }`;

    // подмешиваем в "abortError.stack" стек созданные выше, по время вызова `static once`.
    error.stack += `\n    (emulated async stack) (EventEmitterX.once(emitter, ${_typesToArrayStringTag(eventNames)}, ${onceOptionsString}))`;
    error.stack += enrichErrorStackBy;
}

// https://nodejs.org/api/events.html#events_events_defaultmaxlisteners
// todo: export function defaultMaxListeners(n: number){}

/**
 * @param listener
 * @param supportEventListenerObject - see {@link EventListenerObject}
 * @private
 */
function _checkListener(listener: Listener/* | EventListenerObject*/, supportEventListenerObject = false): asserts listener is Listener/* | EventListenerObject*/ {
    if (typeof listener !== 'function') {
        if (supportEventListenerObject) {
            if (typeof listener !== 'object' || !listener) {
                throw new TypeError('"listener" argument must be a function or Object.{handleEvent: Function|void}');
            }
        }
        else {
            throw new TypeError('"listener" argument must be a function');
        }
    }
}

/** @private */
function _eventTargetAddListener(
    eventTarget: EventTarget,
    type: EventName | bigint,
    handler: EventListenerOrEventListenerObject,
    options?: EventListenerOptions | boolean,
) {
    let _type = type;

    if (typeof _type === 'symbol' && !_isDOMEventTargetSupportSymbolAsType(eventTarget)) {
        _type = String(_type);
    }

    eventTarget.addEventListener(_type as string, handler, options);
}

/** @private */
function _eventTargetRemoveListener(
    eventTarget: EventTarget,
    type: EventName | bigint,
    handler: EventListenerOrEventListenerObject,
    options?: EventListenerOptions | boolean,
) {
    let _type = type;

    if (typeof _type === 'symbol' && !_isDOMEventTargetSupportSymbolAsType(eventTarget)) {
        _type = String(_type);
    }

    eventTarget.removeEventListener(_type as string, handler, options);
}

const kEventTargetSupportSymbolAsType = Symbol('kEventTargetSupportSymbolAsType');

/** @private */
function _isDOMEventTargetSupportSymbolAsType(eventTarget: DOMEventTarget) {
    if (eventTarget[kEventTargetSupportSymbolAsType] !== void 0) {
        return eventTarget[kEventTargetSupportSymbolAsType];
    }

    let eventTargetSupportSymbolAsType = false;
    const listener = () => {};

    try {
        eventTarget.addEventListener(kEventTargetSupportSymbolAsType as unknown as string, listener);
        eventTarget.removeEventListener(kEventTargetSupportSymbolAsType as unknown as string, listener);

        eventTargetSupportSymbolAsType = true;
    }
    catch {
        // catched error should be `TypeError: can't convert symbol to string`
    }

    eventTarget[kEventTargetSupportSymbolAsType] = eventTargetSupportSymbolAsType;

    return eventTargetSupportSymbolAsType;
}

/**
 * Check only 'on', 'once', 'prependListener' and 'removeListener', but not 'emit'.
 * Reason: we don't use 'emit' method in {@link EventEmitterEx.once}
 * @param emitter
 * @private
 */
function _isEventEmitterCompatible(emitter: EventEmitterEx | ICompatibleEmitter | IMinimumCompatibleEmitter | INodeEventEmitter | Object | null | void): emitter is IMinimumCompatibleEmitter {
    return !!emitter
        && typeof (emitter as INodeEventEmitter).on === 'function'
        && typeof (emitter as INodeEventEmitter).prependListener === 'function'
        && typeof (emitter as INodeEventEmitter).removeListener === 'function'
    ;
}

export function isEventEmitterCompatible(emitter: EventEmitterEx | INodeEventEmitter | Object | null | void): emitter is ICompatibleEmitter {
    return _isEventEmitterCompatible(emitter)
        && typeof (emitter as INodeEventEmitter).addListener === 'function'
        && typeof (emitter as INodeEventEmitter).once === 'function'
        && typeof (emitter as INodeEventEmitter).prependOnceListener === 'function'
        && typeof (emitter as INodeEventEmitter).emit === 'function'
    ;
}

// todo: isNodeEventEmitter - check emitter is EventEmitter from 'node:events' module or from 'events' module polyfill.

/**
 * Check if emitter is instance of EventEmitterEx from current running context/environment.
 *
 * Note: if emitter is instance of EventEmitterEx from another context/environment, this method returns false.
 * @param emitter
 */
export function isEventEmitterEx<EventMap extends DefaultEventMap = DefaultEventMap>(emitter: EventEmitterEx | Object): emitter is EventEmitterEx<EventMap> {
    // fast pre-check of public property "isEventEmitterEx"
    if (!emitter || !(emitter as EventEmitterEx).isEventEmitterX) {
        return false;
    }

    if (emitter[kIsEventEmitterEx] === true) {
        // this is EventEmitterEx from this context/environment
        return true;
    }

    // check if emitter is EventEmitterEx from another context/environment
    return _findConstructorName(emitter, 'EventEmitterEx');
}

// todo: isNodeEventTarget - check emitter is EventTarget(NodeEventTarget) from 'node:events' module or from 'events' module polyfill, but not browser EventTarget.

/**
 * Check only 'addEventListener' and 'removeEventListener', but not 'dispatchEvent'.
 * Reason: in 'ws' nodule, in file `node_modules/ws/lib/websocket.js` class WebSocket implements only 'addEventListener' and 'removeEventListener'.
 * @param maybeDOMEventTarget
 * @private
 */
function _isEventTargetCompatible(maybeDOMEventTarget: DOMEventTarget | Object): maybeDOMEventTarget is DOMEventTarget {
    return !!maybeDOMEventTarget
        && typeof (maybeDOMEventTarget as DOMEventTarget).addEventListener === 'function'
        && typeof (maybeDOMEventTarget as DOMEventTarget).removeEventListener === 'function'
    ;
}

export function isEventTargetCompatible(maybeDOMEventTarget: DOMEventTarget | Object): maybeDOMEventTarget is DOMEventTarget {
    return _isEventTargetCompatible(maybeDOMEventTarget)
        && typeof (maybeDOMEventTarget as DOMEventTarget).dispatchEvent === 'function'
    ;
}

const _kEventTargetSignalSupport = Symbol('kEventTargetSignalSupport');
const _abortedSignal = AbortSignal.abort();
const _noop = function() {};
const _hasDocument = typeof document !== 'undefined' && !!document;
let domHasSignalSupport: boolean;

/**
 * @param eventTarget
 * @private
 */
function _eventTargetIsDOMNode(eventTarget: EventTarget): eventTarget is Node {
    return typeof (eventTarget as (Node | { nodeType?: any })).nodeType === 'number'
        && typeof (eventTarget as (Node | { nodeName?: any })).nodeName === 'string'
        && 'outerHTML' in eventTarget
    ;
}

/**
 * @param eventTarget
 * @private
 */
function _eventTargetHasSignalSupport(eventTarget: EventTarget) {
    if (!isNodeJS && _hasDocument && _eventTargetIsDOMNode(eventTarget)) {
        return domHasSignalSupport ??= _eventTargetHasSignalSupport_inner(document.documentElement || document);
    }

    return _eventTargetHasSignalSupport_inner(eventTarget);
}

/**
 * // a copy of cftools/web/DOMTools.ts~eventTargetHasSupport rewritten to test only options.signal
 * @param eventTarget
 * @private
 */
function _eventTargetHasSignalSupport_inner(eventTarget: EventTarget) {
    const preValue = eventTarget[_kEventTargetSignalSupport] as boolean | void;

    if (preValue !== void 0) {
        return preValue;
    }

    // assume the feature isn't supported
    let supportsFeature: false | true = false;
    // create options object with a getter to see if its once property is accessed
    // see `Let capture, passive, once, and signal be the result of flattening more options.` at [DOM Spec#addEventListener](https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener)
    const options = Object.defineProperty({ _v: void 0 }, 'signal', {
        get() {
            supportsFeature = true;

            // should return previously saved value if passed, for compatible with some libraries
            return this._v !== void 0 ? this._v : _abortedSignal;
        },
        set(value) {
            // should save passed value for compatible with some libraries
            this._v = value;
        },
    }) as AddEventListenerOptions;

    const testEventType = `signalTest`;

    // Another option for this code would be adding try/catch around addEventListener/removeEventListener, but
    //  it will hide the problem with incorrect eventTarget arguments, therefore, you need a good reason to add try/catch.

    // Synchronously test out our options
    eventTarget.addEventListener(testEventType, _noop, options);
    eventTarget.removeEventListener(testEventType, _noop, options);

    /*
    // Another variant without any listener
    // https://github.com/Modernizr/Modernizr/issues/1894#issuecomment-254199728
    // See `If listener’s callback is null, then return.` at [DOM Spec#add-an-event-listener](https://dom.spec.whatwg.org/#add-an-event-listener)
    eventTarget.addEventListener(testEventType, null, opts);
    */

    eventTarget[_kEventTargetSignalSupport] = supportsFeature;

    return supportsFeature;
}

const n0 = typeof BigInt !== 'undefined' ? BigInt(0) : void 0;

/** @private */
function _isObject<T extends {}>(value: T | unknown): value is NonNullable<T> {
    return value !== void 0
        && value !== null
        && typeof value === 'object'
    ;
}

/** @private */
function _isDefined<T>(value: T): value is NonNullable<T> {
    return value !== void 0 && value !== null;
}

/** @private */
function _assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
    if (value === void 0 || value === null) {
        throw new Error('value should be defined');
    }
}

/** @private */
function _typesToArrayStringTag(types: EventName | EventName[] | void, errorEventName?: EventName | EventName[] | void) {
    if (!types && types !== 0 && (n0 === void 0 || (types as EventName & bigint) !== n0)) {
        types = [];
    }

    if (errorEventName || errorEventName === 0 || (n0 !== void 0 && (errorEventName as EventName & bigint) === n0)) {
        const errorEventNameList = Array.isArray(errorEventName) ? errorEventName : [ errorEventName as EventName ];

        // noinspection JSDeprecatedSymbols
        if (!Array.isArray(types)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            types = [ (types! as EventName), ...errorEventNameList ];
        }
        else {
            types = [ ...types, ...errorEventNameList ];
        }
    }

    // noinspection JSDeprecatedSymbols
    if (Array.isArray(types)) {
        return JSON.stringify(types.map(value => {
            const type = typeof value;

            if (type === 'bigint') {
                // Принудительно приводим к строке BigInt и добавляем 'n' суффикс.
                return `${String(value)}n`;
            }

            if (type === 'symbol') {
                // Принудительно приводим к строке Symbol.
                return String(value);
            }

            return value;
        }));
    }

    const value = types;
    const type = typeof (value as EventName & bigint);
    const singleStringValue =
        // Принудительно приводим к строке BigInt и добавляем 'n' суффикс.
        type === 'bigint' ? `${String(value)}n`
        // It should be explicit String() conversion of `this.name` (`${this.name}` <-- this is wrong if `this.name` is `Symbol`).
        : type === 'symbol' ? String(value)
        // number and other leave without toString conversion - JSON.stringify will do the job.
        : value
    ;

    return JSON.stringify([ singleStringValue ]);
}

type OnceListenerState<EventMap extends DefaultEventMap = DefaultEventMap, EventKey extends keyof EMD<EventMap> = EventName> = {
    type: EventKey,
    fired: boolean,
    wrapped: EMD<EventMap>[EventKey],
    listener: Listener,
    target: EventEmitterEx,
};

const kOnceListenerWrappedHandler = Symbol('kOnceListenerWrappedHandler');

/** @private */
function _onceWrapper(this: OnceListenerState, ...args: unknown[]) {
    // `this.wrapped` is `_onceWrapper.bind(state)`
    this.target.__onceWrappers.delete(this.wrapped);

    // note: Можно проверять, что этот once-listener был уже удалён в случае, если удаление происходило в одном из предыдущих обработчиков этого же события.
    this.target.removeListener(this.type, this.wrapped);

    if (!this.fired) {
        this.fired = true;

        const maybePromise = this.listener.apply(this.target, args);

        // eslint-disable-next-line promise/prefer-await-to-then
        if (!!maybePromise && typeof maybePromise.catch === 'function') {
            // eslint-disable-next-line promise/prefer-await-to-callbacks,promise/prefer-await-to-then
            maybePromise.catch((error: Error | unknown) => {
                // todo: Передавать эту ошибку в специальный обработчик для асинхронных ошибок eventHandler'ов
                //  Сюда _emitUnhandledRejectionOrErr ?
                console.error(error);
            });
        }
    }
}

/** @private */
function _onceWrap<EventMap extends DefaultEventMap = DefaultEventMap, EventKey extends keyof EventMap = EventName>(
    target: EventEmitterEx,
    type: EventKey,
    listener: EMD<EventMap>[EventKey],
) {
    const state: OnceListenerState<EMD<EventMap>, EventKey> = {
        type,
        fired: false,
        wrapped: void 0 as any as EMD<EventMap>[EventKey],
        listener,
        target,
    };
    const wrapped = _onceWrapper.bind(state) as EMD<EventMap>[EventKey];

    state.wrapped = wrapped;
    target.__onceWrappers.add(wrapped);

    wrapped[kOnceListenerWrappedHandler] = listener;

    return wrapped as EMD<EventMap>[EventKey];
}

/** @private */
function emitNone_array(listeners: Function[], self: EventEmitterEx | undefined) {
    const len = listeners.length;

    for (let i = 0 ; i < len ; ++i) {
        (listeners[i] as NonNullable<typeof listeners[0]>).call(self);
    }
}

/** @private */
function emitNone_array_catch(
    this: EventEmitterEx,
    listeners: Function[],
    self: EventEmitterEx | undefined,
    event: EventName,
) {
    const len = listeners.length;

    for (let i = 0 ; i < len ; ++i) {
        const result = (listeners[i] as NonNullable<typeof listeners[0]>).call(self);

        if (result !== undefined && result !== null) {
            _addCatch(this, result, event, []);
        }
    }
}

/** @private */
function emitOne_array(listeners: Function[], self: EventEmitterEx | undefined, arg1: any) {
    const len = listeners.length;

    for (let i = 0 ; i < len ; ++i) {
        (listeners[i] as NonNullable<typeof listeners[0]>).call(self, arg1);
    }
}

/** @private */
function emitOne_array_catch(
    this: EventEmitterEx,
    listeners: Function[],
    self: EventEmitterEx | undefined,
    arg1: any,
    event: EventName,
) {
    const len = listeners.length;

    for (let i = 0 ; i < len ; ++i) {
        const result = (listeners[i] as NonNullable<typeof listeners[0]>).call(self, arg1);

        if (result !== undefined && result !== null) {
            _addCatch(this, result, event, [ arg1 ]);
        }
    }
}

/** @private */
function emitTwo_array(listeners: Function[], self: EventEmitterEx | undefined, arg1: any, arg2: any) {
    const len = listeners.length;

    for (let i = 0 ; i < len ; ++i) {
        (listeners[i] as NonNullable<typeof listeners[0]>).call(self, arg1, arg2);
    }
}

/** @private */
function emitTwo_array_catch(
    this: EventEmitterEx,
    listeners: Function[],
    self: EventEmitterEx | undefined,
    arg1: any,
    arg2: any,
    event: EventName,
) {
    const len = listeners.length;

    for (let i = 0 ; i < len ; ++i) {
        const result = (listeners[i] as NonNullable<typeof listeners[0]>).call(self, arg1, arg2);

        if (result !== undefined && result !== null) {
            _addCatch(this, result, event, [ arg1, arg2 ]);
        }
    }
}

/** @private */
function emitThree_array(listeners: Function[], self: EventEmitterEx | undefined, arg1: any, arg2: any, arg3: any) {
    const len = listeners.length;

    for (let i = 0 ; i < len ; ++i) {
        (listeners[i] as NonNullable<typeof listeners[0]>).call(self, arg1, arg2, arg3);
    }
}

/** @private */
function emitThree_array_catch(
    this: EventEmitterEx,
    listeners: Function[],
    self: EventEmitterEx | undefined,
    arg1: any,
    arg2: any,
    arg3: any,
    event: EventName,
) {
    const len = listeners.length;

    for (let i = 0 ; i < len ; ++i) {
        const result = (listeners[i] as NonNullable<typeof listeners[0]>).call(self, arg1, arg2, arg3);

        if (result !== undefined && result !== null) {
            _addCatch(this, result, event, [ arg1, arg2, arg3 ]);
        }
    }
}

/** @private */
function emitMany_array(listeners: Function[], self: EventEmitterEx | undefined, args: any[]) {
    const len = listeners.length;

    for (let i = 0 ; i < len ; ++i) {
        (listeners[i] as NonNullable<typeof listeners[0]>).apply(self, args);
    }
}

/** @private */
function emitMany_array_catch(
    this: EventEmitterEx,
    listeners: Function[],
    self: EventEmitterEx | undefined,
    args: any[],
    event: EventName,
) {
    const len = listeners.length;

    for (let i = 0 ; i < len ; ++i) {
        const result = (listeners[i] as NonNullable<typeof listeners[0]>).apply(self, args);

        if (result !== undefined && result !== null) {
            _addCatch(this, result, event, args);
        }
    }
}

/** @private */
function _addCatch(that: EventEmitterEx, promise: PromiseLike<any>, type: EventName, args: any[]) {
    // Handle Promises/A+ spec, then could be a getter
    // that throws on second use.
    try {
        const { then } = promise;

        if (typeof then === 'function') {
            // Нужно ли тут перехватывать ошибку через catch?
            // eslint-disable-next-line promise/prefer-await-to-callbacks
            void then.call(promise, undefined, function(err: Error | unknown) {
                // The callback is called with nextTick to avoid a follow-up
                // rejection from this promise.
                setImmediate(_emitUnhandledRejectionOrErr, that, err, type, args);
            });
        }
    }
    catch (err) {
        that.emit('error', err as Error);
    }
}

/** @private */
function _emitUnhandledRejectionOrErr(ee: EventEmitterEx, err: Error | unknown, type: EventName, args: any[]) {
    const captureRejectionHandler = ee[captureRejectionSymbol];

    if (typeof captureRejectionHandler === 'function') {
        captureRejectionHandler(err, type, ...args);
    }
    else {
        // We have to disable the capture rejections mechanism, otherwise
        // we might end up in an infinite loop.
        const prev = ee[kCapture];

        // If the error handler throws, it is not catcheable and it
        // will end up in 'uncaughtException'. We restore the previous
        // value of kCapture in case the uncaughtException is present
        // and the exception is handled.
        try {
            ee[kCapture] = false;
            ee.emit('error', err as Error);
        }
        finally {
            ee[kCapture] = prev;
        }
    }
}

/** @private */
function _objectIsConsole(object: Console | any) {
    if (!object || typeof object !== 'object') {
        return false;
    }

    const mayBeConsole = object as Console;
    const isConsoleLike = typeof mayBeConsole.assert === 'function'
        && typeof mayBeConsole.clear === 'function'
        && typeof mayBeConsole.info === 'function'
        && typeof mayBeConsole.groupCollapsed === 'function'
        && typeof mayBeConsole.table === 'function'
        && typeof mayBeConsole.dirxml === 'function'
    ;

    let isNodeJSConsole = false;
    let isBrowserConsole = false;

    // * in nodejs console.toString() === '[object console]'
    // * in browser console.toString() === '[object Object]'
    if (_toString.call(mayBeConsole) === '[object console]') {
        isNodeJSConsole = typeof ((mayBeConsole as typeof import('node:console')).Console) === 'function';
    }
    else {
        // in Web there is only one console
        isBrowserConsole = globalThis["console"] === mayBeConsole;
        // not needed, but interesting checks:
        // (mayBeConsole.time + '').includes('[native code]')
        // (console.memory + '') === '[object MemoryInfo]'
    }

    return isConsoleLike
        && (isNodeJSConsole || isBrowserConsole)
    ;
}

/**
 * Important warning: tools such as UglifyJS/Terser will minify class name and therefore proto.constructor.name
 *
 * @example Workaround for this case:
 if (ClassName.prototype.constructor.name !== 'ClassName') {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(ClassName.prototype.constructor, 'name', { value: 'ClassName', configurable: true });
}
 *
 * @param object
 * @param constructorName
 * @private
 */
function _findConstructorName(object: Object, constructorName: string) {
    let proto = object && typeof object === 'object' && Object.getPrototypeOf(object) || void 0;

    while (proto) {
        if (proto.constructor.name === constructorName) {
            return true;
        }

        proto = Object.getPrototypeOf(proto);
    }

    return false;
}

/** @private */
function _checkBit(mask: number, bit: number): boolean {
    return (mask & bit) !== 0;
}

/** @private */
function _unsetBit(mask: number, bit: number): number {
    return mask & ~bit;
}

/**
 * @private
 */
function _arrayClone1<T>(array: T[]) {
    // At least since V8 8.3, this implementation is faster than the previous
    // which always used a simple for-loop
    switch (array.length) {
        case 1:
            return [ array[0] ];
        case 2:
            return [ array[0], array[1] ];
        case 3:
            return [ array[0], array[1], array[2] ];
        case 4:
            return [ array[0], array[1], array[2], array[3] ];
        case 5:
            return [ array[0], array[1], array[2], array[3], array[4] ];
        case 6:
            return [ array[0], array[1], array[2], array[3], array[4], array[5] ];
    }

    return array.slice();
}

/**
 * @private
 */
function _arrayClone2<T>(array: T[], fromIndex = 0) {
    // At least since V8 8.3, this implementation is faster than the previous
    // which always used a simple for-loop
    switch (array.length - fromIndex) {
        case 1:
            return [ array[fromIndex] ];
        case 2:
            return [ array[fromIndex], array[1 + fromIndex] ];
        case 3:
            return [ array[fromIndex], array[1 + fromIndex], array[2 + fromIndex] ];
        case 4:
            return [ array[fromIndex], array[1 + fromIndex], array[2 + fromIndex], array[3 + fromIndex] ];
        case 5:
            return [
                array[fromIndex], array[1 + fromIndex], array[2 + fromIndex], array[3 + fromIndex], array[4 + fromIndex],
            ];
        case 6:
            return [
                array[fromIndex],
                array[1 + fromIndex],
                array[2 + fromIndex],
                array[3 + fromIndex],
                array[4 + fromIndex],
                array[5 + fromIndex],
            ];
    }

    return array.slice(fromIndex);
}

/**
 * @private
 */
function _arrayClone3<T>(array: T[], newFirst: T) {
    // At least since V8 8.3, this implementation is faster than the previous
    // which always used a simple for-loop
    switch (array.length) {
        case 1:
            return [ newFirst, array[0] ];
        case 2:
            return [ newFirst, array[0], array[1] ];
        case 3:
            return [ newFirst, array[0], array[1], array[2] ];
        case 4:
            return [ newFirst, array[0], array[1], array[2], array[3] ];
        case 5:
            return [ newFirst, array[0], array[1], array[2], array[3], array[4] ];
        case 6:
            return [ newFirst, array[0], array[1], array[2], array[3], array[4], array[5] ];
    }

    const newArray = array.slice();

    newArray.unshift(newFirst);

    return newArray;
}

/**
 * @private
 */
function _argumentsClone2(_arguments: IArguments, fromIndex = 0) {
    // At least since V8 8.3, this implementation is faster than the previous
    // which always used a simple for-loop
    switch (_arguments.length - fromIndex) {
        case 5:
            return [
                _arguments[fromIndex], _arguments[1 + fromIndex], _arguments[2 + fromIndex], _arguments[3 + fromIndex], _arguments[4 + fromIndex],
            ];
        case 6:
            return [
                _arguments[fromIndex],
                _arguments[1 + fromIndex],
                _arguments[2 + fromIndex],
                _arguments[3 + fromIndex],
                _arguments[4 + fromIndex],
                _arguments[5 + fromIndex],
            ];
        case 7:
            return [
                _arguments[fromIndex],
                _arguments[1 + fromIndex],
                _arguments[2 + fromIndex],
                _arguments[3 + fromIndex],
                _arguments[4 + fromIndex],
                _arguments[5 + fromIndex],
                _arguments[6 + fromIndex],
            ];
    }

    return Array.prototype.slice.call(_arguments, fromIndex);
}
