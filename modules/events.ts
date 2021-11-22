'use strict';
/// <reference types="node" />

// see: https://github.com/nodejs/node/blob/master/lib/events.js

// todo: Изучить [DOM-compatible EventTarget](https://github.com/yiminghe/ts-event-target/blob/main/src/index.ts)
// todo: Изучить [eventtargeter](https://github.com/brettz9/eventdispatcher.js/blob/master/EventTarget-es6.js)
// todo: Реализовать EventTarget (для старых версий nodejs):
//  копировать код из https://github.com/nodejs/node/blob/master/lib/internal/event_target.js
//  - тесты:
//    - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget.js

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

type Timeout = ReturnType<typeof setTimeout>;
type DOMEventTarget = EventTarget;
type INodeEventEmitter = NodeJS.EventEmitter;

// https://stackoverflow.com/a/50014868
type ReplaceReturnType<T extends (...a: any) => any, TNewReturn> = (...a: Parameters<T>) => TNewReturn;

/**
 * Это минимально совместимый с кодом {@link EventEmitterEx.once} emitter, отличающийся от EventEmitter:
 * * для ICompatibleEmitter нужны только некоторые методы из всех методов EventEmitter
 * * методы ICompatibleEmitter **могут** не возвращать this
 */
export interface ICompatibleEmitter {
    on: ReplaceReturnType<INodeEventEmitter["on"], any>;
    // on: (event: string | symbol, listener: (...args: any[]) => void) => any;
    once: ReplaceReturnType<INodeEventEmitter["once"], any>;
    // once: (event: string | symbol, listener: (...args: any[]) => void) => any;
    removeListener: ReplaceReturnType<INodeEventEmitter["removeListener"], any>;
    // removeListener: (event: string | symbol, listener: (...args: any[]) => void) => any;
    prependListener: ReplaceReturnType<INodeEventEmitter["prependListener"], any>;
    // prependListener: (event: string | symbol, listener: (...args: any[]) => void) => any;
    prependOnceListener: ReplaceReturnType<INodeEventEmitter["prependOnceListener"], any>;
    // prependOnceListener: (event: string | symbol, listener: (...args: any[]) => void) => any;
}
// type NodeEventEmitter = EventEmitter;
export declare type Listener = (...args: any[]) => Promise<any> | void;
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

interface ICounter {
    /**
     * Will be called on every [EventEmitterEx#emit]{@link EventEmitterEx.emit} call
     *
     * @see {Console.count}
     * @see [MDN console.count()]{@link https://developer.mozilla.org/en-US/docs/Web/API/Console/count}
     */
    count: (eventName: EventName) => void;
}

interface Options {
    maxListeners?: number;
    // listener can be registered at most once per event type
    listenerOncePerEventType?: boolean;
    captureRejections?: boolean;
    /* todo: add handleEvent support
    // support DOMEventTarget.handleEvent
    supportHandleEvent?: boolean;
     */
    /**
     * If passed, call `counter.count(eventName)` for every [EventEmitterEx#emit]{@link EventEmitterEx.emit} call.
     *
     * {@link global.console} is valid value for this option.
     */
    emitCounter?: ICounter|Console;
    /**
     * By default, `EventEmitterEx` calls listeners with a `this` value of the emitter instance.
     * Passing `true` to this parameter will cause to calls listener functions without any `this` value.
     */
    listenerWithoutThis?: boolean;
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
    abortControllers?: (AbortController|void)[];
    timing?: ServerTiming;
    /** the timeout in ms for resolving the promise before it is rejected with an
     * error [TimeoutError]{@link TimeoutError}: {name: 'TimeoutError', message: 'timeout', code: 'ETIMEDOUT'} */
    timeout?: number;
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
    /** Promise constructor to use */
    Promise?: PromiseConstructor;
    // [key: string]: any;
    debugInfo?: Object;
}
interface StaticOnceOptions<EE, E> extends StaticOnceOptionsDefault {
    /** @inheritdoc */
    filter?: (this: EE, emitEventName: E, ...amitArgs: any[]) => boolean;
    /** @inheritdoc
     * @deprecated */
    checkFn?: (this: EE, emitEventName: E, ...amitArgs: any[]) => boolean;
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
}

// type EventMapFrom<T> = T extends EventEmitterEx<infer X> ? X : never;
type EventNamesFrom<T> = T extends EventEmitterEx<infer X> ? keyof X : never;
// type EventNamesFrom2<T> = EventNamesFrom<T>|EventNamesFrom<T>[];
type EventNamesFrom3<T> = EventNamesFrom<T>|EventNamesFrom<T>[]|EventName|EventName[];

let _onceListenerIdCounter = 0;
// This symbol shall be used to install a listener for only monitoring 'error' events. Listeners installed using this symbol are called before the regular 'error' listeners are called.
// Installing a listener using this symbol does not change the behavior once an 'error' event is emitted, therefore the process will still crash if no regular 'error' listener is installed.

const ERR_INVALID_ARG_TYPE = 'ERR_INVALID_ARG_TYPE';
const ERR_INVALID_OPTION_TYPE = 'ERR_INVALID_OPTION_TYPE';
/**
 * AbortError code value like in native node.js implementation
 @example in node.js: error.code === 'ABORT_ERR'
 `events.once(new events(), 'test', { signal: AbortSignal.abort() }).catch(err => { console.info(err.code, err.name, err) })`
 @example in browser: error.code === 20
 `fetch(location.href, { signal: AbortSignal.abort() }).catch(err => { console.info(err.code, err.name, err) })`
 */
const ABORT_ERR = 'ABORT_ERR';
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
    errorMonitor,
    captureRejectionSymbol,
}: {
    readonly errorMonitor: typeof import("events").errorMonitor,
    readonly captureRejectionSymbol: typeof import("events").captureRejectionSymbol,
} = (function(): {
    readonly errorMonitor: typeof import("events").errorMonitor,
    readonly captureRejectionSymbol: typeof import("events").captureRejectionSymbol,
} {
    let errorMonitor: typeof import("events").errorMonitor | void;
    let captureRejectionSymbol: typeof import("events").captureRejectionSymbol | void;

    if (isNodeJS) {
        // this is nodejs
        try {
            const events = require('events');

            errorMonitor = events.errorMonitor;
            captureRejectionSymbol = events.captureRejectionSymbol;
        }
        catch {
            // ignore
        }
    }

    if (!errorMonitor || (errorMonitor as unknown as string) === 'error') {
        // Проверка на errorMonitor === 'error' добавлена для того, чтобы на 100% исключить возможность зацикливания
        //  EventEmitterEx#emit при отправки 'error'.
        errorMonitor = Symbol('events.errorMonitor') as typeof import("events").errorMonitor;
    }
    if (!captureRejectionSymbol) {
        captureRejectionSymbol = Symbol.for('nodejs.rejection') as typeof import("events").captureRejectionSymbol;
    }

    return {
        errorMonitor,
        captureRejectionSymbol,
    };
})();

export const kDestroyingEvent = Symbol('kDestroyingEvent');

type InnerListeners = {
    'newListener': (eventName: EventName, listener: Listener) => void;
    'removeListener': (eventName: EventName, listener: Listener) => void;
    'error': (error: Error, ...args: any[]) => void;
    [kDestroyingEvent]: () => void;
};

// todo: add handleEvent support
// interface EventListenerObject {
//     handleEvent(evt: Event): void;
// }
// declare type EventListenerOrEventListenerObject = Listener | EventListenerObject;

/** EventMap with default listeners */
type EMD<EventMap extends DefaultEventMap=DefaultEventMap> = EventMap & InnerListeners;
// /** EventMap any key */
// type EMK<EventMap extends DefaultEventMap=DefaultEventMap, _T= EMD<EventMap>> = _T[keyof _T];

export interface IEventEmitter<EventMap extends DefaultEventMap = DefaultEventMap> {
    emit<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]> | any[]): boolean;
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
    eventNames(): Array<NodeEventName>;
    listenerCount<EventKey extends keyof EMD<EventMap> = EventName>(type: EventKey): number;
}
/** cast type of any event emitter to typed event emitter */
export declare function asTypedEventEmitter<EventMap extends DefaultEventMap, X extends INodeEventEmitter>(x: X): IEventEmitter<EventMap>;

// Symbol for EventEmitterEx.once
const sCleanAbortPromise = Symbol();
/**
 * This symbol should not be exportable
 * @private
 */
const kCapture = Symbol('kCapture');

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
const EventEmitterEx_Flags_emitCounter_isConsole = 1 << 21;
const EventEmitterEx_Flags_destroyed = 1 << 30;

/** Implemented event emitter */
export default class EventEmitterEx<EventMap extends DefaultEventMap = DefaultEventMap> implements IEventEmitter<EventMap> {
    public readonly isEventEmitterEx = true;
    public readonly isEventEmitter = true;

    private _events: {
        [eventName in keyof EMD<EventMap>]?: Function|Function[];
    } = Object.create(null);

    _maxListeners = Infinity;

    private _f = 0;
    private _emitCounter: ICounter|Console|void;

    /* todo: add handleEvent support
    // supportHandleEvent, support DOMEventTarget.handleEvent
    private _she = false;
    */
    // list of local id's for once listeners
    _onceIds: number[] = [];

    constructor(options?: Options) {
        if (options) {
            const {
                maxListeners,
                listenerOncePerEventType,
                // supportHandleEvent,
                captureRejections,
                emitCounter,
                listenerWithoutThis,
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
                    throw new Error(`options.captureRejections should be of type "boolean" but has "${typeof captureRejections}" type`);
                }
                this._f |= EventEmitterEx_Flags_captureRejections;
            }
            if (listenerWithoutThis) {
                this._f |= EventEmitterEx_Flags_listenerWithoutThis;
            }
            /*
            if (supportHandleEvent !== void 0) {
                this._she = supportHandleEvent;
            }
            */
            if (emitCounter) {
                this._emitCounter = emitCounter;

                if (emitCounter === console
                    // emitCounter could be console instance from another environment
                    || _objectIsConsole(emitCounter)
                ) {
                    this._f |= EventEmitterEx_Flags_emitCounter_isConsole;
                }
            }
        }
    }

    destructor() {
        this._f |= EventEmitterEx_Flags_destroyed;
        this._emitCounter = void 0;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.emit(kDestroyingEvent);

        this.removeAllListeners();

        this._addListener = function _addListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey], prepend: boolean, once: boolean) {
            // todo: replace console.warn with:
            //  const kAddListenerAfterDestroyingCallback = Symbol('kAddListenerAfterDestroyingCallback');
            //  this[kAddListenerAfterDestroyingCallback]({ event, listener, once, prepend });
            console.warn('Attempt to add listener on destroyed emitter', this, { event, once, prepend });

            return false;
        };
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
    // @ts-ignore
    emit<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>): boolean;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    emit<EventKey extends keyof EMD<EventMap>>(event: EventKey, a1, a2, a3) {
        const isErrorEvent = event === 'error';
        const emitCounter = this._emitCounter;
        const handler = this._events[event];
        const argumentsLength = arguments.length;
        let hasEnyListener = false;

        // todo: Вопрос: Если (isErrorEvent == true) нужно ли вызывать событие errorMonitor, если НЕТ подписок на событие 'error'.
        //  В текущей версии nodejs#v15.5.0, если нет подписки на 'error', то и errorMonitor НЕ вызывается, даже если подписка на errorMonitor есть.
        if (handler) {
            const {_f} = this;
            // const has_error_listener = _checkBit(_flags, EventEmitterEx_Flags_has_error_listener);
            const captureRejections = _checkBit(_f, EventEmitterEx_Flags_captureRejections);
            const listenerWithoutThis = _checkBit(_f, EventEmitterEx_Flags_listenerWithoutThis);

            if (isErrorEvent) {
                if (_checkBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener)) {
                    switch (argumentsLength) {
                        case 1:
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.emit(errorMonitor);
                            break;
                        case 2:
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.emit(errorMonitor, a1);
                            break;
                        case 3:
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.emit(errorMonitor, a1, a2);
                            break;
                        case 4:
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.emit(errorMonitor, a1, a2, a3);
                            break;
                        // slower
                        default: {
                            const args = [ ...arguments ];// eslint-disable-line prefer-rest-params

                            args[0] = errorMonitor;

                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.emit.apply(this, args);// eslint-disable-line prefer-spread
                        }
                    }
                }
            }

            const isFn = typeof handler === 'function';
            const context = listenerWithoutThis ? void 0 : this;

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
                        const [, ...args] = arguments;// eslint-disable-line prefer-rest-params

                        result = func_handler.apply(context, args);
                    }
                }

                if (captureRejections) {
                    // We check if result is undefined first because that
                    // is the most common case so we do not pay any perf
                    // penalty
                    if (result !== undefined && result !== null) {
                        const [, ...args] = arguments;// eslint-disable-line prefer-rest-params

                        _addCatch(this, result, event, args);
                    }
                }

                hasEnyListener = true;
            }
            else {
                const array_handler = handler as Function[];

                if (array_handler.length) {
                    // arrayClone
                    const listeners = array_handler.slice();

                    switch (argumentsLength) {
                        // fast cases
                        case 1:
                            if (captureRejections) {
                                /*@__NOINLINE__*/
                                emitNone_array_catch(listeners, context, event);
                            }
                            else {
                                /*@__NOINLINE__*/
                                emitNone_array(listeners, context);
                            }
                            break;
                        case 2:
                            if (captureRejections) {
                                /*@__NOINLINE__*/
                                emitOne_array_catch(listeners, context, a1, event);
                            }
                            else {
                                /*@__NOINLINE__*/
                                emitOne_array(listeners, context, a1);
                            }
                            break;
                        case 3:
                            if (captureRejections) {
                                /*@__NOINLINE__*/
                                emitTwo_array_catch(listeners, context, a1, a2, event);
                            }
                            else {
                                /*@__NOINLINE__*/
                                emitTwo_array(listeners, context, a1, a2);
                            }
                            break;
                        case 4:
                            if (captureRejections) {
                                /*@__NOINLINE__*/
                                emitThree_array_catch(listeners, context, a1, a2, a3, event);
                            }
                            else {
                                /*@__NOINLINE__*/
                                emitThree_array(listeners, context, a1, a2, a3);
                            }
                            break;
                        // slower
                        default: {
                            const [, ...args] = arguments;// eslint-disable-line prefer-rest-params

                            if (captureRejections) {
                                /*@__NOINLINE__*/
                                emitMany_array_catch(listeners, context, args, event);
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
                const error = new Error('Uncaught, unspecified "error" event. (' + err + ')');
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                error.context = err;
                throw error;
            }
        }

        if (!!emitCounter && typeof emitCounter.count === 'function') {
            if (_checkBit(this._f, EventEmitterEx_Flags_emitCounter_isConsole)) {
                (emitCounter as Console).count(String(event));
            }
            else {
                (emitCounter as ICounter).count(event);
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
    protected _addListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey], prepend: boolean, once: boolean): boolean {
        // const {_she: supportHandleEvent} = this;
        // if (typeof listener === 'object') {
        //     console.log(listener);
        // }

        checkListener(listener, /*supportHandleEvent*/false);

        const {
            _events,
            _maxListeners,
            _f,
            _onceIds,
        } = this;
        const has_newListener_listener = _checkBit(_f, EventEmitterEx_Flags_has_newListener_listener);
        const hasAnyOnceListener = _onceIds.length > 0;
        // todo: add handleEvent support
        const listenerAs_objectWith_handleEvent = false;//supportHandleEvent && typeof listener === 'object';
        const handler = _events[event];
        const existedHandlerIsFunction = typeof handler === 'function';
        let newLen: number;

        if (has_newListener_listener) {
            // todo: Разобраться, почему тут TypeScript ругается, хотя описание для 'newListener' в DefaultEventMap есть.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
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
                    && (handler[sOnceListenerWrapperId] !== void 0)
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    && handler.listener === listener
                ) {
                    isListenerAlreadyExisted = true;
                }
            }
            else {
                const listeners = (handler as Function[]);

                for (let i = listeners.length ; i-- > 0 ; ) {
                    const handler = listeners[i];

                    if (handler === listener) {
                        isListenerAlreadyExisted = true;
                        break;
                    }
                    else if (
                        (handler[sOnceListenerWrapperId] !== void 0)
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        && handler.listener === listener
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
                    // @ts-ignore
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
                _events[event] = [ listener, handler as Function ];
            }
            else {
                _events[event] = [ handler as Function, listener ];
            }

            newLen = 2;
        }
        else {
            if (prepend) {
                newLen = (handler as Function[]).unshift(listener);
            }
            else {
                newLen = (handler as Function[]).push(listener);
            }
        }

        if (_maxListeners !== Infinity && _maxListeners <= newLen) {
            // todo: EventEmitterEx.sOnMaxListeners = Symbol('sOnMaxListeners');
            //  emit(EventEmitterEx.sOnMaxListeners, newLen, event, `Maximum event listeners for "${event}" event!`);
            console.warn(`Maximum event listeners for "${event}" event!`);
        }

        return true;
    }

    addListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this {
        this._addListener(event, listener, false, false);

        return this;
    }

    removeListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this {
        checkListener(listener);

        const {
            _events,
            _f,
            _onceIds,
        } = this;
        // const listenerOncePerEventType = _checkBit(_f, EventEmitterEx_Flags_listenerOncePerEventType);
        const handler = _events[event];

        if (handler === void 0) {
            return this;
        }

        let has_removeListener_listener = _checkBit(_f, EventEmitterEx_Flags_has_removeListener_listener);

        const hasAnyOnceListener = _onceIds.length > 0;
        let newListenersCount: void|number = void 0;
        // let originalListener: void|Function = void 0;

        if (typeof handler === 'function') {
            if (handler === listener) {
                delete _events[event];
                newListenersCount = 0;
            }
            else if (hasAnyOnceListener
                && (handler[sOnceListenerWrapperId] !== void 0)
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                && handler.listener === listener
            ) {
                const onceWrapperId = handler[sOnceListenerWrapperId];
                const idIndex = _onceIds.indexOf(onceWrapperId);

                if (idIndex !== -1) {
                    _onceIds.splice(idIndex, 1);
                }

                delete _events[event];
                newListenersCount = 0;
            }
            else {
                // Listener is not found, exit function
                return this;
            }
        }
        else if (hasAnyOnceListener) {
            // remove only first link to once listener
            const listeners = (handler as Function[]);
            let index = -1;

            newListenersCount = listeners.length;

            for (let i = listeners.length ; i-- > 0 ; ) {
                const handler = listeners[i];

                if (handler === listener) {
                    index = i;
                    break;
                }
                else if (
                    (handler[sOnceListenerWrapperId] !== void 0)
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    && handler.listener === listener
                ) {
                    const onceWrapperId = handler[sOnceListenerWrapperId];
                    const idIndex = _onceIds.indexOf(onceWrapperId);

                    if (idIndex !== -1) {
                        _onceIds.splice(idIndex, 1);
                    }

                    // originalListener = listeners[i].listener;
                    index = i;
                    break;
                }
            }

            if (index !== -1) {
                newListenersCount--;

                if (newListenersCount === 0) {
                    listeners.length = 0;
                    // if (--this._eventsCount === 0) {
                    // this._events = Object.create(null);
                    // return this;
                    // } else { delete _events[event]; }
                    delete _events[event];
                }
                else {
                    if (index === 0) {
                        listeners.shift();
                    }
                    else {
                        listeners.splice(index, 1);
                    }

                    if (newListenersCount === 1) {
                        _events[event] = listeners[0];
                    }
                }
            }
            else {
                // Listener is not found, exit function
                return this;
            }
        }
        else {
            // remove only first link to listener
            const listeners = (handler as Function[]);
            const index = listeners.indexOf(listener);

            newListenersCount = listeners.length;

            if (index !== -1) {
                newListenersCount--;

                if (newListenersCount === 0) {
                    listeners.length = 0;
                    delete _events[event];
                }
                else {
                    if (index === 0) {
                        listeners.shift();
                    }
                    else {
                        listeners.splice(index, 1);
                    }

                    if (newListenersCount === 1) {
                        _events[event] = listeners[0];
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
            if (listener[sOnceListenerWrapperId] !== void 0) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                listener = listener.listener || listener;
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
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

    prependListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this {
        this._addListener(event, listener, true, false);

        return this;
    }

    prependOnceListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this {
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
            _onceIds,
        } = this;
        const has_removeListener_listener = _checkBit(_f, EventEmitterEx_Flags_has_removeListener_listener);

        if (has_removeListener_listener && event !== 'removeListener') {
            if (!event) {
                // Emit removeListener for all listeners on all events
                for (const key of Object.keys(_events)) {
                    if (key === 'removeListener') {
                        continue;
                    }

                    this.removeAllListeners(key);
                }

                this.removeAllListeners('removeListener');

                _onceIds.length = 0;
                this._events = Object.create(null);
                this._f = _unsetBit(_f,
                    EventEmitterEx_Flags_has_error_listener
                    | EventEmitterEx_Flags_has_newListener_listener
                    | EventEmitterEx_Flags_has_removeListener_listener
                    | EventEmitterEx_Flags_has_errorMonitor_listener
                );
            }
            else {
                if (_onceIds.length > 0) {
                    const handler = _events[event];

                    if (typeof handler === 'function') {
                        const listener = handler as Listener;
                        const onceWrapperId = listener[sOnceListenerWrapperId];

                        if (onceWrapperId !== void 0) {
                            const idIndex = _onceIds.indexOf(onceWrapperId);

                            if (idIndex !== -1) {
                                _onceIds.splice(idIndex, 1);
                            }

                            const onceListener = listener as unknown as OnceListenerState<EMD<EventMap>, EventKey>;
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.emit('removeListener', event, onceListener.listener);
                        }
                        else {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.emit('removeListener', event, listener);
                        }
                    }
                    else {
                        const listeners = (handler as Listener[]);

                        for (let i = listeners.length ; i-- > 0 ; ) {
                            const listener = listeners[i];

                            const onceWrapperId = listener[sOnceListenerWrapperId];
                            const idIndex = _onceIds.indexOf(onceWrapperId);

                            if (idIndex !== -1) {
                                _onceIds.splice(idIndex, 1);
                            }

                            if (onceWrapperId !== void 0) {
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                this.emit('removeListener', event, (listener as unknown as OnceListenerState<EMD<EventMap>, EventKey>).listener);
                            }
                            else {
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                this.emit('removeListener', event, listener);
                            }
                        }
                    }
                }

                delete _events[event];

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
        }
        else {
            // Not listening for removeListener, no need to emit
            if (!event) {
                _onceIds.length = 0;
                this._events = Object.create(null);
                this._f = _unsetBit(_f,
                    EventEmitterEx_Flags_has_error_listener
                    | EventEmitterEx_Flags_has_newListener_listener
                    | EventEmitterEx_Flags_has_removeListener_listener
                    | EventEmitterEx_Flags_has_errorMonitor_listener
                );
            }
            else {
                if (_onceIds.length > 0) {
                    const handler = _events[event];

                    if (typeof handler === 'function') {
                        const onceWrapperId = handler[sOnceListenerWrapperId];

                        if (onceWrapperId !== void 0) {
                            const idIndex = _onceIds.indexOf(onceWrapperId);

                            if (idIndex !== -1) {
                                _onceIds.splice(idIndex, 1);
                            }
                        }
                    }
                    else {
                        const listeners = (handler as Function[]);

                        for (let i = listeners.length ; i-- > 0 ; ) {
                            const handler = listeners[i];

                            const onceWrapperId = handler[sOnceListenerWrapperId];
                            const idIndex = _onceIds.indexOf(onceWrapperId);

                            if (idIndex !== -1) {
                                _onceIds.splice(idIndex, 1);
                            }
                        }
                    }
                }

                delete _events[event];

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
    hasListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listenerToCheck?: EMD<EventMap>[EventKey]) {
        type _TEventMap = EMD<EventMap>;
        const handler = this._events[event];

        if (!handler) {
            return false;
        }
        if (!listenerToCheck) {
            return true;
        }

        const hasAnyOnceListener = this._onceIds.length > 0;

        if (typeof handler === 'function') {
            if (!hasAnyOnceListener || !handler[sOnceListenerWrapperId]) {
                return listenerToCheck === handler;
            }

            return listenerToCheck === (handler as unknown as OnceListenerState<EMD<EventMap>, EventKey>).listener as _TEventMap[EventKey];
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
                if (_handler[sOnceListenerWrapperId]) {
                    if (listenerToCheck === (_handler as unknown as OnceListenerState<EMD<EventMap>, EventKey>).listener as _TEventMap[EventKey]) {
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

        const hasAnyOnceListener = this._onceIds.length > 0;

        if (typeof handler === 'function') {
            if (!hasAnyOnceListener || !handler[sOnceListenerWrapperId]) {
                return [ handler as _TEventMap[EventKey] ];
            }

            return [ (handler as unknown as OnceListenerState<EMD<EventMap>, EventKey>).listener as _TEventMap[EventKey] ];
        }

        if (!hasAnyOnceListener) {
            return [ ...(handler as _TEventMap[EventKey][]) ];
        }

        return handler.map<_TEventMap[EventKey]>(handler => {
            if (handler[sOnceListenerWrapperId]) {
                return (handler as unknown as OnceListenerState<EMD<EventMap>, EventKey>).listener as _TEventMap[EventKey];
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

    eventNames(): Array<NodeEventName> {
        // todo: return number key as number
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
    //   static on(emitter: EventEmitter|DOMEventTarget, event: string): AsyncIterableIterator<any>;
    //     - tests: https://github.com/nodejs/node/blob/master/test/parallel/test-event-on-async-iterator.js
    //     - [Asynchronous Iterators for JavaScript](https://github.com/tc39/proposal-async-iteration)
    //   captureRejectionSymbol: Symbol(nodejs.rejection),
    //   captureRejections: [Getter/Setter],
    //   defaultMaxListeners: [Getter/Setter],
    //   init: [Function (anonymous)],
    //   static getEventListeners(emitter: EventEmitter|DOMEventTarget, type: string)
    //     - tests: https://github.com/nodejs/node/blob/master/test/parallel/test-events-static-geteventlisteners.js

    static once<EE extends EventEmitterEx=EventEmitterEx>(emitter: EventEmitterEx, types: EventNamesFrom3<EE>, options?: StaticOnceOptions<EE, EventNamesFrom<EE>>): Promise<any[]>;
    static once(nodeEmitter: INodeEventEmitter, events: string|symbol|(string|symbol)[], options?: StaticOnceOptions<INodeEventEmitter, string|symbol>): Promise<any[]>;
    static once(eventTarget: DOMEventTarget, types: string|string[], options?: StaticOnceOptionsEventTarget): Promise<[Event]>;
    static once(compatibleEmitter: ICompatibleEmitter, events: string|symbol|(string|symbol)[], options?: StaticOnceOptions<ICompatibleEmitter, string|symbol>): Promise<any[]>;
    /** Creates a Promise that is fulfilled when the EventEmitter emits the given event or that is rejected if the EventEmitter emits 'error' while waiting. The Promise will resolve with an array of all the arguments emitted to the given event.
     *
     * This method is intentionally generic and works with the web platform EventTarget interface, which has no special 'error' event semantics and does not listen to the 'error' event.
     *
     * @see {@link https://nodejs.org/api/events.html#events_events_once_emitter_name_options nodejs events.once(emitter, name, options)}
     *
     * @param emitter
     * @param types
     * @param {StaticOnceOptions=} options
     * @param {AbortSignal=} options.signal - {@link https://nodejs.org/api/globals.html#globals_class_abortsignal AbortSignal}
     * @param {(AbortController|void)[]=} options.abortControllers
     * @param {ServerTiming=} options.timing - todo: Принимать в качестве timing, в том числе, ConsoleLike-объекты и оборачивать их в совместимый с ServerTiming враппер.
     * @param {number=} options.timeout
     * @param {Function=} options.filter
     * @param {Function=} options.checkFn - deprecated @use {options.filter}
     */
    static once(
        emitter: DOMEventTarget|EventEmitterEx|INodeEventEmitter|ICompatibleEmitter,
        types: EventName|EventName[],
        // options?: StaticOnceOptionsEventTarget|StaticOnceOptions<typeof emitter, typeof types extends Array<infer T> ? T : typeof types>
        options?: StaticOnceOptionsDefault,
    ): Promise<any[]|Event> {
        const staticOnceOptions = (options || {}) as StaticOnceOptions<INodeEventEmitter|EventEmitterEx, EventName>;
        const _Promise = staticOnceOptions.Promise || Promise;
        let isEventTarget = false;

        if (!(emitter instanceof EventEmitterEx) && !_isEventEmitterCompatible(emitter as EventEmitterEx|INodeEventEmitter)) {
            isEventTarget = _isEventTargetCompatible(emitter as DOMEventTarget);

            if (!isEventTarget) {
                return _Promise.reject(new EventsTypeError('The "emitter" argument must be an instance of EventEmitter or EventTarget.', ERR_INVALID_ARG_TYPE));
            }
        }

        const _emitter = (emitter as INodeEventEmitter|EventEmitterEx);
        const staticOnceEventTargetOptions = isEventTarget && options ? options as StaticOnceOptionsEventTarget : void 0;
        const eventTargetListenerOptions = isEventTarget && staticOnceEventTargetOptions && (staticOnceEventTargetOptions.passive !== void 0 || staticOnceEventTargetOptions.capture !== void 0)
            ? {
                passive: staticOnceEventTargetOptions.passive,
                capture: staticOnceEventTargetOptions.capture,
            } as (AddEventListenerOptions & { signal?: AbortSignal })
            : void 0
        ;
        const usePrependListener = !!staticOnceOptions.prepend;
        const errorEventNameIsDefined = !!staticOnceOptions.errorEventName;
        const errorEventName = (staticOnceOptions.errorEventName || 'error') as string|symbol;
        const timeout = staticOnceOptions.timeout || void 0;
        /** @borrows StaticOnceOptionsDefault.filter */
        const filter = (typeof staticOnceOptions.filter === 'function' ? staticOnceOptions.filter : void 0)
            || (typeof staticOnceOptions.checkFn === 'function' ? staticOnceOptions.checkFn : void 0)
        ;
        const abortControllers = (staticOnceOptions as StaticOnceOptionsDefault).abortControllers || void 0;
        let signal = staticOnceOptions.signal || void 0;
        let timing = staticOnceOptions.timing || void 0;
        let hasTiming = !!timing;
        const debugInfo = staticOnceOptions.debugInfo || void 0;
        const hasDebugInfo = !!debugInfo;
        let abortControllersGroup: TAbortControllersGroup|void;
        let listenersCleanUp: Function|void = void 0;

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
                    return _Promise.reject(createAbortError(ABORT_ERR));
                }

                if (eventTargetListenerOptions && isEventTarget && _eventTargetHasSignalSupport(emitter as DOMEventTarget)) {
                    eventTargetListenerOptions.signal = signal;
                }
            }
        }

        if (hasTiming) {
            timing!.time(types);
        }

        let promise;

        if (Array.isArray(types)) {
            let winnerEventType: void|(typeof types extends Array<infer T> ? T : typeof types);

            promise = new _Promise<any[]>((resolve, reject) => {
                const eventListenersByType: [ type: typeof types extends Array<infer T> ? T : never, listener: Listener ][] = [];
                let needErrorListener = true;

                listenersCleanUp = function() {
                    for (const [ type, listener ] of eventListenersByType) {
                        if (isEventTarget) {
                            (emitter as DOMEventTarget).removeEventListener(type as string, listener, eventTargetListenerOptions);
                        }
                        else {
                            _emitter.removeListener(type as string|symbol, listener);
                        }

                        if (hasTiming && type !== winnerEventType) {
                            if (typeof timing!.timeClear === 'function') {
                                timing!.timeClear(type as string, true);
                            }
                            else {
                                timing!.timeEnd(type as string, true);
                            }
                        }
                    }

                    if (needErrorListener) {
                        if (isEventTarget) {
                            if (errorEventNameIsDefined) {
                                // EventTarget does not have `error` event semantics like Node, so check if errorEventName is defined
                                (emitter as DOMEventTarget).removeEventListener(errorEventName as string, errorListener, eventTargetListenerOptions);
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

                    const eventListener = (...args) => {
                        if (filter) {
                            try {
                                if (!filter.apply(_emitter, [type, ...args])) {
                                    return;
                                }
                            }
                            catch (err) {
                                reject(err);
                            }
                        }

                        winnerEventType = type;

                        if (hasTiming) {
                            timing!.timeEnd(type as string, true);
                        }

                        if (listenersCleanUp) {
                            listenersCleanUp();
                        }

                        resolve(args);
                    };

                    eventListenersByType.push([ type, eventListener ]);

                    if (isEventTarget) {
                        (emitter as DOMEventTarget).addEventListener(type as string, eventListener, eventTargetListenerOptions);
                    }
                    else if (usePrependListener) {
                        _emitter.prependListener(type as string|symbol, eventListener);
                    }
                    else {
                        _emitter.on(type as string|symbol, eventListener);
                    }
                }

                const errorListener = error => {
                    if (hasTiming) {
                        // В случае ошибки, удаляем все метки времени.
                        // todo: Создавать метку времени для 'error' и закрывать её в случае ошибки. Если ошибки не было - удалять метку времени для 'error' из timing.
                        if (typeof timing!.timeClear === 'function') {
                            timing!.timeClear(types, true);
                        }
                        else {
                            timing!.timeEnd(types, true);
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
                        (emitter as DOMEventTarget).addEventListener(errorEventName as string, errorListener, eventTargetListenerOptions);
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
                const eventListener = (...args) => {
                    if (filter) {
                        try {
                            if (!filter.apply(_emitter, [ type, ...args ])) {
                                return;
                            }
                        }
                        catch (err) {
                            reject(err);
                        }
                    }

                    if (hasTiming) {
                        timing!.timeEnd(type, true);
                        // cleanup
                        timing = void 0;
                        hasTiming = false;
                    }

                    if (listenersCleanUp) {
                        listenersCleanUp();
                    }

                    resolve(args);
                };
                const errorListener = error => {
                    if (hasTiming) {
                        // В случае ошибки, удаляем все метки времени.
                        // todo: Создавать метку времени для 'error' и закрывать её в случае ошибки. Если ошибки не было - удалять метку времени для 'error' из timing.
                        //   if (typeof timing!.timeClear === 'function') {
                        //       timing!.timeClear(type as string, true);
                        //   } else { timing!.timeEnd(type as string, true); }
                        timing!.timeEnd(type, true);
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
                        (emitter as DOMEventTarget).removeEventListener(type as string, eventListener, eventTargetListenerOptions);
                        if (errorEventNameIsDefined && needErrorListener) {
                            // EventTarget does not have `error` event semantics like Node, so check if errorEventName is defined
                            (emitter as DOMEventTarget).removeEventListener(errorEventName as string, errorListener, eventTargetListenerOptions);
                        }
                    }
                    else {
                        _emitter.removeListener(type as string|symbol, eventListener);
                        if (needErrorListener) {
                            _emitter.removeListener(errorEventName, errorListener);
                        }
                    }

                    listenersCleanUp = void 0;
                };

                if (isEventTarget) {
                    (emitter as DOMEventTarget).addEventListener(type as string, eventListener, eventTargetListenerOptions);
                    if (errorEventNameIsDefined && needErrorListener) {
                        // EventTarget does not have `error` event semantics like Node, so check if errorEventName is defined
                        (emitter as DOMEventTarget).addEventListener(errorEventName as string, errorListener, eventTargetListenerOptions);
                    }
                }
                else if (usePrependListener) {
                    _emitter.prependListener(type as string|symbol, eventListener);
                    if (needErrorListener) {
                        _emitter.prependListener(errorEventName, errorListener);
                    }
                }
                else {
                    _emitter.on(type as string|symbol, eventListener);
                    if (needErrorListener) {
                        _emitter.on(errorEventName, errorListener);
                    }
                }
            });
        }

        if (signal || timeout) {
            let abortCallback: ((this: AbortSignal|void, ev: typeof sCleanAbortPromise|AbortSignalEventMap["abort"]) => void)|void;
            let cleanTimeoutCallback: Function|void;

            // Turn an event into a promise, reject it once `abort` is dispatched
            const cancelPromise = signal ? new _Promise<void>((resolve, reject) => {
                abortCallback = function(clearPromiseSymbol) {
                    if (abortCallback) {
                        signal!.removeEventListener('abort', abortCallback);
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

                        // todo: Сделать отдельный класс ошибок EventsAbortError (аналогично EventsTypeError)?
                        reject(createAbortError(ABORT_ERR));
                    }

                    abortCallback = void 0;
                };

                signal!.addEventListener('abort', abortCallback);
            }) : void 0;
            const timeoutPromise = timeout ? new _Promise<void>((resolve, reject) => {
                let timeoutId: Timeout|void = setTimeout(() => {
                    if (hasTiming) {
                        // todo: Создавать метку времени для 'timeout' и закрывать её в случае таймаута. Если ошибки не было - удалять метку времени для 'timeout' из timing.
                        //   if (typeof timing!.timeClear === 'function') {
                        //       timing!.timeClear(type as string, true);
                        //   } else { timing!.timeEnd(type as string, true); }
                        timing!.timeEnd(types, true);
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
                    reject(createTimeoutError(`waiting of ${_typesToArrayStringTag(types, errorEventNameIsDefined ? errorEventName : void 0)} timeout`));
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

            const promises: Promise<any[]|void>[] = [ promise ];

            if (cancelPromise) {
                promises.push(cancelPromise);
            }
            if (timeoutPromise) {
                promises.push(timeoutPromise);
            }

            // Return the fastest promise (don't need to wait for request to finish)
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
                    timing!.timeEnd(types, true);
                    // cleanup
                    timing = void 0;
                    hasTiming = false;
                }

                return result as any[];
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
                    timing!.timeEnd(types, true);
                    // cleanup
                    timing = void 0;
                    hasTiming = false;
                }

                throw error;
            });
        }

        return promise;
    }

    static readonly errorMonitor = errorMonitor as typeof import("events").errorMonitor;
    static readonly captureRejectionSymbol = captureRejectionSymbol as typeof import("events").captureRejectionSymbol;
    // domain is not supported
    static readonly usingDomains = false;

    static EventEmitter = EventEmitterEx;
    static EventEmitterEx = EventEmitterEx;

    /** alias for global AbortController */
    static AbortController = AbortController;
}

const tagEventEmitterEx = 'EventEmitterEx';

if (EventEmitterEx.constructor.name !== tagEventEmitterEx) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(EventEmitterEx.constructor, 'name', { value: tagEventEmitterEx, configurable: true });
}

export {
    EventEmitterEx as EventEmitter,
    EventEmitterEx,
};

type EventEmitterProxy_ProxyHook = (type, eventEmitter) => NodeEventEmitter|EventEmitterEx;
interface EventEmitterProxy_Options extends Options {
    /** Функция, которая вычисляет нужный экземпляр eventEmitter, который относиться к конкретному событию */
    proxyHook?: EventEmitterProxy_ProxyHook;
}

export class EventEmitterProxy<EventMap extends DefaultEventMap = DefaultEventMap> extends EventEmitterEx<EventMap> {
    private _proxyHook: EventEmitterProxy_ProxyHook|void;
    private _eventEmitter: INodeEventEmitter|EventEmitterEx|void;
    // private _eventTarget: DOMEventTarget|void;
    private _proxyHandlers: Record<EventName, (...args: any[]) => void> = {};
    // private _isEventTarget = false;

    /**
     * Этот класс предназначен для того, чтобы подключится к экземпляру EventEmitter, запоминать все подписки на него
     *  а при вызове removeAllListeners, удалять все подписки, которые прошли через экземпляр этого класса.
     *
     * Например, мы можем создать экземпляр этого класса передав в конструктор userActionMonitor (который кидает события 'mouse_click').
     *  Передаём этот экземпляр на стороннюю страницу, там подписываются на события 'mouse_click', а когда страница выгружается, при
     *  вызове removeAllListeners, мы удалим все подписки, которые были сделаны на этой странице, не затрагивая подписки с других страниц
     *
     * @param emitter
     * @param options
     * @param options.proxyHook -
     */
    constructor(emitter?: INodeEventEmitter|EventEmitterEx/*|DOMEventTarget*/, options?: EventEmitterProxy_Options) {
        super(options);

        const {
            proxyHook,
        } = options || {};

        if (typeof proxyHook === 'function') {
            this._proxyHook = proxyHook;
        }
        else {
            this._proxyHook = void 0;
        }

        if (!emitter) {
            // nothing to do
        }
        else if (_isEventEmitterCompatible(emitter as ICompatibleEmitter)) {
            this._eventEmitter = emitter as INodeEventEmitter|EventEmitterEx;
        }
        /* todo: add EventTarget support
        else if (_isEventTargetCompatible(emitter)) {
            this._eventTarget = emitter as DOMEventTarget;
            this._isEventTarget = true;
        }

         */
    }

    destructor() {
        this.removeAllListeners();

        this._eventEmitter = void 0;
        this._proxyHook = void 0;
    }

    setProxyHook(proxyHook: EventEmitterProxy_ProxyHook) {
        if (typeof proxyHook === 'function') {
            this._proxyHook = proxyHook;
        }
        else {
            this._proxyHook = void 0;
        }
    }

    private _onEventEmitterEvent(event: EventName, ...args) {
        switch (args.length) {
            case 0:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                super.emit(event);
                break;
            case 1:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                super.emit(event, args[0]);
                break;
            case 2:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                super.emit(event, args[0], args[1]);
                break;
            case 3:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                super.emit(event, args[0], args[1], args[2]);
                break;
            default:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
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

    emit(event, ...args) {
        const {
            _proxyHook,
            _eventEmitter,
        } = this;
        const eventEmitter = _proxyHook ? _proxyHook(event, _eventEmitter) : _eventEmitter;

        if (!eventEmitter) {
            return false;
        }

        return eventEmitter.emit(event, ...args);
    }

    emitSelf<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>) {
        return super.emit(event, ...args);
    }

    protected _addListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey], prepend: boolean, once: boolean) {
        const result = super._addListener(event, listener, prepend, once);
        const {
            _proxyHook,
            _eventEmitter,
            _proxyHandlers,
        } = this;
        const eventEmitter = _proxyHook ? _proxyHook(event, _eventEmitter) : _eventEmitter;

        if (!eventEmitter) {
            return result;
        }

        let eventProxy = _proxyHandlers[event];

        if (eventProxy) {
            // Нам нужно быть уверенным, что обработчик будет подписан на этот type, но только один раз
            // Если он ещё не был подписан, то removeListener ничего не сделает
            (eventEmitter as EventEmitterEx).removeListener(event as NodeEventName, eventProxy);
        }
        else {
            eventProxy = this._onEventEmitterEvent.bind(this, event);
            _proxyHandlers[event] = eventProxy;
        }

        if (prepend) {
            if (once) {
                (eventEmitter as EventEmitterEx).prependOnceListener(event as NodeEventName, eventProxy);
            }
            else {
                (eventEmitter as EventEmitterEx).prependListener(event as NodeEventName, eventProxy);
            }
        }
        else {
            if (once) {
                (eventEmitter as EventEmitterEx).once(event as NodeEventName, eventProxy);
            }
            else {
                (eventEmitter as EventEmitterEx).on(event as NodeEventName, eventProxy);
            }
        }

        return result;
    }

    removeListener(event, listener) {
        const result = super.removeListener(event, listener);

        if (this.listenerCount(event) === 0) {
            const {
                _proxyHook,
                _eventEmitter,
                _proxyHandlers,
            } = this;
            const eventEmitter = _proxyHook ? _proxyHook(event, _eventEmitter) : _eventEmitter;
            const proxyHandler = _proxyHandlers[event];

            delete _proxyHandlers[event];

            if (eventEmitter && proxyHandler) {
                if (proxyHandler) {
                    try {
                        eventEmitter.removeListener(event, proxyHandler);
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }

        return result;
    }

    removeAllListeners(event?) {
        const {
            _proxyHook,
            _eventEmitter,
            _proxyHandlers,
        } = this;

        for (const type of Object.keys(_proxyHandlers)) {
            if (event && event !== type) {
                continue;
            }

            const eventEmitter = _proxyHook ? _proxyHook(event, _eventEmitter) : _eventEmitter;
            const proxyHandler = _proxyHandlers[type];

            delete _proxyHandlers[type];

            if (eventEmitter && proxyHandler) {
                if (proxyHandler) {
                    try {
                        eventEmitter.removeListener(type, proxyHandler);
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }

        if (!event) {
            this._proxyHandlers = {};
        }

        return super.removeAllListeners(event);
    }

    static ABORT_ERR = ABORT_ERR;
}

const tagEventEmitterProxy = 'EventEmitterProxy';

if (EventEmitterProxy.constructor.name !== tagEventEmitterProxy) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(EventEmitterProxy.constructor, 'name', { value: tagEventEmitterProxy, configurable: true });
}

export type NodeEventEmitter = INodeEventEmitter;

export {errorMonitor, captureRejectionSymbol, ABORT_ERR};
export const once = EventEmitterEx.once;

/**
 * @private
 */
class EventsTypeError extends TypeError {
    code: string|void;

    constructor(message = '', code?: string) {
        message = String(message || '');

        super(message && code ? `[${code}]: ${message}` : message ? message : (code || ''));

        // this.name = 'TypeError';
        this.code = code ? String(code) : void 0;
        this.message = message;
    }

    toString() {
        const {code, message} = this;

        if (code) {
            return `TypeError [${code}]: ${message}`;
        }

        return `TypeError: ${message}`;
    }

    static fromObject(error) {
        if (error instanceof EventsTypeError) {
            return error;
        }
        else {
            const { code, message } = error;

            return new EventsTypeError(message, code);
        }
    }
}

const tagEventsTypeError = 'EventsTypeError';

if (EventsTypeError.constructor.name !== tagEventsTypeError) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(EventsTypeError.constructor, 'name', { value: tagEventsTypeError, configurable: true });
}

export class TimeoutError extends Error {
    name = 'TimeoutError';
    code = 'ETIMEDOUT';

    constructor(...args) {
        super(...args);

        if (!this.stack) {
            // es5 environment
            this.stack = (new Error()).stack;
        }
    }

    static ETIMEDOUT = 'ETIMEDOUT'
}

const tagTimeoutError = 'TimeoutError';

if (TimeoutError.constructor.name !== tagTimeoutError) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(TimeoutError.constructor, 'name', { value: tagTimeoutError, configurable: true });
}

export function createTimeoutError(message: string) {
    return new TimeoutError(message);
}

// https://nodejs.org/api/events.html#events_events_defaultmaxlisteners
// todo: export function defaultMaxListeners(n: number){}

function checkListener(listener: Function, supportHandleEvent = false) {
    if (typeof listener !== 'function') {
        if (supportHandleEvent) {
            if (typeof listener !== 'object' || !listener) {
                throw new TypeError('"listener" argument must be a function or Object.{handleEvent: Function|void}');
            }
        }
        else {
            throw new TypeError('"listener" argument must be a function');
        }
    }
}

/**
 * Check only 'on', 'once', 'prependListener' and 'removeListener', but not 'emit'.
 * Reason: we dont use 'emit' method in {@link EventEmitterEx.once}
 * @param emitter
 * @private
 */
function _isEventEmitterCompatible(emitter: EventEmitterEx|INodeEventEmitter|ICompatibleEmitter|Object) {
    return !!emitter
        && typeof (emitter as INodeEventEmitter).on === 'function'
        && typeof (emitter as INodeEventEmitter).prependListener === 'function'
        && typeof (emitter as INodeEventEmitter).removeListener === 'function'
    ;
}

export function isEventEmitterCompatible(emitter: EventEmitterEx|INodeEventEmitter|Object) {
    return _isEventEmitterCompatible(emitter)
        && typeof (emitter as INodeEventEmitter).addListener === 'function'
        && typeof (emitter as INodeEventEmitter).once === 'function'
        && typeof (emitter as INodeEventEmitter).prependOnceListener === 'function'
        && typeof (emitter as INodeEventEmitter).emit === 'function'
    ;
}

/**
 * Check only 'addEventListener' and 'removeEventListener', but not 'dispatchEvent'.
 * Reason: in 'ws' nodule, in file `node_modules/ws/lib/websocket.js` class WebSocket implements only 'addEventListener' and 'removeEventListener'.
 * @param maybeDOMEventTarget
 * @private
 */
function _isEventTargetCompatible(maybeDOMEventTarget: DOMEventTarget|Object) {
    return !!maybeDOMEventTarget
        && typeof (maybeDOMEventTarget as DOMEventTarget).addEventListener === 'function'
        && typeof (maybeDOMEventTarget as DOMEventTarget).removeEventListener === 'function'
    ;
}

export function isEventTargetCompatible(maybeDOMEventTarget: DOMEventTarget|Object) {
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
function _eventTargetIsDOMNode(eventTarget: EventTarget) {
    return typeof (eventTarget as (Node | {nodeType?: any})).nodeType === 'number'
        && typeof (eventTarget as (Node | {nodeName?: any})).nodeName === 'string'
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
    const preValue = eventTarget[_kEventTargetSignalSupport] as boolean|void;

    if (preValue !== void 0) {
        return preValue;
    }

    // assume the feature isn't supported
    let supportsFeature: true|false = false;
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

function _typesToArrayStringTag(types: EventName|EventName[]|void, errorEventName?: EventName) {
    if (!types && types !== 0 && (n0 === void 0 || (types as EventName & bigint) !== n0)) {
        types = [];
    }

    if (errorEventName || errorEventName === 0 || (n0 !== void 0 && (errorEventName as EventName & bigint) === n0)) {
        if (!Array.isArray(types)) {
            types = [ (types! as EventName), errorEventName! ];
        }
        else {
            types = [ ...types, errorEventName! ];
        }
    }

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
    id: number;
    type: EventKey;
    fired: boolean;
    wrapFn: EMD<EventMap>[EventKey];
    listener: Listener;
    target: EventEmitterEx;
}
const sOnceListenerWrapperId = Symbol('');

/** @private */
function _onceWrapper(this: OnceListenerState, ...args) {
    const idIndex = this.target._onceIds.indexOf(this.id);

    if (idIndex !== -1) {
        this.target._onceIds.splice(idIndex, 1);
    }

    this.target.removeListener(this.type, this.wrapFn);

    if (!this.fired) {
        this.fired = true;
        this.listener.apply(this.target, args);
    }
}

/** @private */
function _onceWrap<EventMap extends DefaultEventMap = DefaultEventMap, EventKey extends keyof EventMap = EventName>(target: EventEmitterEx, type: EventKey, listener: EMD<EventMap>[EventKey]) {
    const id = ++_onceListenerIdCounter;
    const state: OnceListenerState<EMD<EventMap>, EventKey> = {
        id,
        type,
        fired: false,
        wrapFn: void 0 as any as EMD<EventMap>[EventKey],
        listener,
        target,
    };
    const wrapped = _onceWrapper.bind(state) as EMD<EventMap>[EventKey];

    target._onceIds.push(state.id);

    wrapped[sOnceListenerWrapperId] = id;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    wrapped.listener = listener;
    state.wrapFn = wrapped;

    return wrapped as EMD<EventMap>[EventKey];
}

/** @private */
function emitNone_array(listeners: Function[], self: EventEmitterEx|undefined) {
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        listeners[i].call(self);
    }
}

/** @private */
function emitNone_array_catch(listeners: Function[], self: EventEmitterEx|undefined, event: EventName) {
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        const result = listeners[i].call(self);

        if (result !== undefined && result !== null) {
            _addCatch(this, result, event, []);
        }
    }
}

/** @private */
function emitOne_array(listeners: Function[], self: EventEmitterEx|undefined, arg1: any) {
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        listeners[i].call(self, arg1);
    }
}

/** @private */
function emitOne_array_catch(listeners: Function[], self: EventEmitterEx|undefined, arg1: any, event: EventName) {
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        const result = listeners[i].call(self, arg1);

        if (result !== undefined && result !== null) {
            _addCatch(this, result, event, [ arg1 ]);
        }
    }
}

/** @private */
function emitTwo_array(listeners: Function[], self: EventEmitterEx|undefined, arg1: any, arg2: any) {
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        listeners[i].call(self, arg1, arg2);
    }
}

/** @private */
function emitTwo_array_catch(listeners: Function[], self: EventEmitterEx|undefined, arg1: any, arg2: any, event: EventName) {
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        const result = listeners[i].call(self, arg1, arg2);

        if (result !== undefined && result !== null) {
            _addCatch(this, result, event, [ arg1, arg2 ]);
        }
    }
}

/** @private */
function emitThree_array(listeners: Function[], self: EventEmitterEx|undefined, arg1: any, arg2: any, arg3: any) {
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        listeners[i].call(self, arg1, arg2, arg3);
    }
}

/** @private */
function emitThree_array_catch(listeners: Function[], self: EventEmitterEx|undefined, arg1: any, arg2: any, arg3: any, event: EventName) {
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        const result = listeners[i].call(self, arg1, arg2, arg3);

        if (result !== undefined && result !== null) {
            _addCatch(this, result, event, [ arg1, arg2, arg3 ]);
        }
    }
}

/** @private */
function emitMany_array(listeners: Function[], self: EventEmitterEx|undefined, args: any[]) {
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        listeners[i].apply(self, args);
    }
}

/** @private */
function emitMany_array_catch(listeners: Function[], self: EventEmitterEx|undefined, args: any[], event: EventName) {
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        const result = listeners[i].apply(self, args);

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
        const then = promise.then;

        if (typeof then === 'function') {
            then.call(promise, undefined, function(err) {
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
function _emitUnhandledRejectionOrErr(ee: EventEmitterEx, err: any, type: EventName, args: any[]) {
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
            ee.emit('error', err);
        }
        finally {
            ee[kCapture] = prev;
        }
    }
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
type _NodeConsole = typeof import('node:console');

/** @private */
function _objectIsConsole(object: Console|any) {
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

    // in nodejs console.toString() === '[object console]' (in browser console.toString() === '[object Object]')
    if (_toString.call(mayBeConsole) === '[object console]') {
        isNodeJSConsole = typeof (mayBeConsole as _NodeConsole).Console === 'function';
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

/** @private */
function _checkBit(mask: number, bit: number): boolean {
    return (mask & bit) !== 0;
}
/** @private */
function _unsetBit(mask: number, bit: number): number {
    return mask & ~bit;
}
