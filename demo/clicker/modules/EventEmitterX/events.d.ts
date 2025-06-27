/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-function-type,@typescript-eslint/no-wrapper-object-types,@typescript-eslint/no-unused-vars */
/// <reference types="node" />
import type ServerTiming from './ServerTiming';
import { eventsAsyncIterator } from "./eventsAsyncIterator";
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
export declare type Listener = (this: EventEmitterEx | undefined, ...args: any[]) => Promise<any> | undefined | void;
export declare type NodeEventName = string | symbol;
export declare type EventName = number | string | symbol;
export declare type DefaultEventMap = {
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
    abortControllers?: (AbortController | undefined)[];
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
    /**
     * Callback before Promise resolved. If ended up with exception, promise will be rejected.
     */
    onDone?: (this: any, emitEventName: any, event: any) => void;
    /** Promise constructor to use */
    Promise?: PromiseConstructor;
    /** @deprecated this is `true` by default now and replaced by {@link EventEmitterEx.staticOnceEnrichErrorStack} */
    isEnrichAbortStack?: boolean;
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
type EventNamesFrom<T> = T extends EventEmitterEx<infer X> ? keyof X : never;
type EventNamesFrom3<T> = EventName | EventName[] | EventNamesFrom<T> | EventNamesFrom<T>[];
/**
 * AbortError code value like in native node.js implementation
 @example in node.js: error.code === 'ABORT_ERR'
 `events.once(new events(), 'test', { signal: AbortSignal.abort() }).catch(err => { console.info(err.code, err.name, err) })`
 @example in browser: error.code === 20
 `fetch(location.href, { signal: AbortSignal.abort() }).catch(err => { console.info(err.code, err.name, err) })`
 */
declare const ABORT_ERR: string | number;
declare const
/**
 * This symbol shall be used to install a listener for only monitoring 'error' events. Listeners installed using this symbol are called before the regular 'error' listeners are called.
 * Installing a listener using this symbol does not change the behavior once an 'error' event is emitted, therefore the process will still crash if no regular 'error' listener is installed.
 */
errorMonitor: symbol, captureRejectionSymbol: symbol;
export declare const kDestroyingEvent: unique symbol;
declare function _isLifecycleEvent(event: EventName): boolean;
type InnerListeners = {
    'newListener': (eventName: EventName, listener: Listener) => void;
    'removeListener': (eventName: EventName, listener: Listener) => void;
    'error': ((error: Error, ...args: any[]) => void) | ((...args: any[]) => void);
    [kDestroyingEvent]: () => void;
};
/** EventMap with default listeners */
type EMD<EventMap extends DefaultEventMap = DefaultEventMap> = EventMap & InnerListeners;
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
/** cast type of any event emitter to typed event emitter */
export declare function asTypedEventEmitter<EventMap extends DefaultEventMap, X extends INodeEventEmitter>(x: X): IEventEmitter<EventMap>;
/**
 * This symbol should not be exportable
 * @private
 */
declare const kCapture: unique symbol;
/**
 * Non-public sign that this object is EventEmitterEx.
 *
 * This symbol should be visible only in this module or in modules with subclasses.
 * @private
 */
declare const kIsEventEmitterEx: unique symbol;
/** Implemented event emitter */
export declare class EventEmitterEx<EventMap extends DefaultEventMap = DefaultEventMap> implements IEventEmitter<EventMap> {
    readonly isEventEmitterEx = true;
    readonly isEventEmitterX = true;
    readonly isEventEmitter = true;
    protected readonly [kIsEventEmitterEx] = true;
    private _events;
    _maxListeners: number;
    private _f;
    private _emitCounter;
    /**
     * Private list of local once listeners.
     * @private
     */
    __onceWrappers: Set<unknown>;
    constructor(options?: _ConstructorOptions);
    destructor(): void;
    [Symbol.dispose](): void;
    get isDestroyed(): boolean;
    get [kCapture](): boolean;
    set [kCapture](value: boolean);
    protected _emitWithListenersHook: (<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>) => void) | undefined;
    protected _emitWithNoListenersHook: (<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>) => void) | undefined;
    emit<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>): boolean;
    on<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    once<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    protected _addListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey], prepend: boolean, once: boolean): boolean;
    addListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    removeListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    hasListeners<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey): boolean;
    prependListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    prependOnceListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    off<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    removeAllListeners<EventKey extends keyof EMD<EventMap> = EventName>(event?: EventKey): this;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    /**
     * Non-standard EventEmitter method!
     *
     * Check if has any listener for given `event` name and optional `listenerToCheck` handler function.
     */
    hasListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listenerToCheck?: EMD<EventMap>[EventKey]): boolean;
    /**
     * Returns a copy of the array of listeners for the event named eventName.
     */
    listeners<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey): EMD<EventMap>[EventKey][];
    /**
     * Returns a copy of the array of listeners for the event named eventName, including any wrappers (such as those created by .once()).
     */
    rawListeners<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey): EMD<EventMap>[EventKey][];
    eventNames(): NodeEventName[];
    listenerCount<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey): number;
    static getEventListeners(emitter: DOMEventTarget | EventEmitterEx | ICompatibleEmitter | INodeEventEmitter, eventName: EventName): Function[];
    /**
     * Returns an `AsyncIterator` that iterates `event` events.
     *
     * @see [Node.js documentation / Events / events.on(emitter, eventName): AsyncIterator]{@link https://nodejs.org/api/events.html#eventsonemitter-eventname-options}
     * @see [nodejs / Pull requests / lib: performance improvement on readline async iterator]{@link https://github.com/nodejs/node/pull/41276}
     * @see [Asynchronous Iterators for JavaScript]{@link https://github.com/tc39/proposal-async-iteration}
     */
    static on: typeof eventsAsyncIterator;
    static staticOnceEnrichErrorStack: boolean;
    /** Creates a Promise that is fulfilled when the EventEmitter emits the given event or that is rejected if the EventEmitter emits 'error' while waiting. The Promise will resolve with an array of all the arguments emitted to the given event.
     *
     * This method is intentionally generic and works with the web platform EventTarget interface, which has no special 'error' event semantics and does not listen to the 'error' event.
     *
     * @see {@link https://nodejs.org/api/events.html#events_events_once_emitter_name_options nodejs events.once(emitter, name, options)}
     */
    static once<EE extends EventEmitterEx = EventEmitterEx>(emitter: EventEmitterEx, types: EventNamesFrom3<EE>, options?: StaticOnceOptions<EE, EventNamesFrom<EE>>): Promise<any[]>;
    static once(nodeEmitter: INodeEventEmitter, types: (string | symbol)[] | string | symbol, options?: StaticOnceOptions<INodeEventEmitter, string | symbol>): Promise<any[]>;
    static once(eventTarget: DOMEventTarget, types: string[] | string, options?: StaticOnceOptionsEventTarget): Promise<[Event]>;
    static once(compatibleEmitter: IMinimumCompatibleEmitter, types: (string | symbol)[] | string | symbol, options?: StaticOnceOptions<IMinimumCompatibleEmitter, string | symbol>): Promise<any[]>;
    on2<EventKey extends keyof EMD<EventMap> = EventName>(_event: EventKey, listener: EMD<EventMap>[EventKey], options?: {
        isRaw?: boolean;
    }): this;
    emit2<EventKey extends keyof EMD<EventMap>>(_event: EventKey, options?: {
        isRaw?: boolean;
    }, ...args: Parameters<EMD<EventMap>[EventKey]>): boolean;
    removeListener2<EventKey extends keyof EMD<EventMap> = EventName>(_event: EventKey, listener: EMD<EventMap>[EventKey], options?: {
        isRaw?: boolean;
    }): this;
    listenerCount2<EventKey extends keyof EMD<EventMap> = EventName>(_event: EventKey, options?: {
        isRaw?: boolean;
    }): number;
    private static _eventToEventRaw;
    static readonly errorMonitor: symbol;
    static readonly captureRejectionSymbol: symbol;
    static readonly usingDomains = false;
    static EventEmitter: typeof EventEmitterEx;
    static EventEmitterEx: typeof EventEmitterEx;
    static EventEmitterX: typeof EventEmitterEx;
    /** alias for global AbortController */
    static AbortController: {
        new (): AbortController;
        prototype: AbortController;
    };
}
type EventEmitterX_Listener = Listener;
export declare namespace EventEmitterEx {
    type ConstructorOptions = _ConstructorOptions;
    type Listener = EventEmitterX_Listener;
    /**
     * @see {@link EventListenerObject}
     */
    type ListenerAsObject = {
        handleEvent?: (this: ListenerAsObject, ...args: unknown[]) => void;
    };
}
export { EventEmitterEx as EventEmitter, EventEmitterEx as EventEmitterX, EventEmitterEx as default, };
interface EventEmitterSimpleProxy_Options extends _ConstructorOptions {
    emitter: EventEmitterEx | INodeEventEmitter;
}
export declare class EventEmitterSimpleProxy<EventMap extends DefaultEventMap = DefaultEventMap> extends EventEmitterEx<EventMap> {
    private _eventEmitter;
    private _proxyHandlers;
    private _paused;
    /**
     * Этот класс предназначен для того, чтобы подключится к экземпляру EventEmitter, запоминать все подписки на него
     *  а при вызове removeAllListeners, удалять все подписки, которые прошли через экземпляр этого класса.
     *
     * Например, мы можем создать экземпляр этого класса передав в конструктор userActionMonitor (который кидает события 'mouse_click').
     *  Передаём этот экземпляр на стороннюю страницу, там подписываются на события 'mouse_click', а когда страница выгружается, при
     *  вызове removeAllListeners, мы удалим все подписки, которые были сделаны на этой странице, не затрагивая подписки с других страниц
     */
    constructor(options?: EventEmitterSimpleProxy_Options);
    destructor(): void;
    pause(): void;
    unpause(): void;
    private _onEventEmitterEvent;
    emit<EventKey extends keyof EMD<EventMap> = keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>): boolean;
    emitSelf<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>): boolean;
    protected _addListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey], prepend: boolean, once: boolean): boolean;
    removeListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    removeAllListeners<EventKey extends keyof EMD<EventMap> = EventName>(event?: EventKey): this;
}
type EventEmitterProxy_SourceProxyHook = (defaultEventEmitter: ICompatibleEmitter | undefined, eventType: EventName) => ICompatibleEmitter | null | undefined;
type EventEmitterProxy_TargetProxyHook = (defaultEventEmitter: ICompatibleEmitter | undefined, eventType: EventName, eventArgs: unknown[] | null) => ICompatibleEmitter | null | undefined;
interface EventEmitterProxy_Options extends _ConstructorOptions {
    sourceEmitter?: ICompatibleEmitter;
    targetEmitter?: ICompatibleEmitter;
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
export declare class EventEmitterProxy<EventMap extends DefaultEventMap = DefaultEventMap> extends EventEmitterEx<EventMap> {
    private _getSourceEmitter;
    private _getTargetEmitter;
    private _sourceEmitter;
    private _targetEmitter;
    private _allowDirectEmitToTarget;
    private _hasProxyHandlers;
    private _antiLoopingInfoMap;
    private _knownSubscriptions;
    /**
     * Этот класс предназначен для того, чтобы подключится к экземпляру EventEmitter, запоминать все подписки на него.
     *
     * А при вызове removeAllListeners, удалять все подписки, которые прошли через экземпляр этого класса.
     *
     * Например, мы можем создать экземпляр этого класса передав в конструктор userActionMonitor (который кидает события 'mouse_click').
     *  Передаём этот экземпляр на стороннюю страницу, там подписываются на события 'mouse_click', а когда страница выгружается, при
     *  вызове removeAllListeners, мы удалим все подписки, которые были сделаны на этой странице, не затрагивая подписки с других страниц
     */
    constructor(options?: EventEmitterProxy_Options);
    destructor(): void;
    setGetSourceEmitter(getSourceEmitter?: EventEmitterProxy_SourceProxyHook): void;
    setGetTargetEmitter(getTargetEmitter?: EventEmitterProxy_TargetProxyHook): void;
    private _detectSourceEmitter;
    private _detectTargetEmitter;
    private _emitToTarget;
    private _onEventEmitterEvent;
    emit<EventKey extends keyof EMD<EventMap> = keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>): boolean;
    emitSelf<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: Parameters<EMD<EventMap>[EventKey]>): boolean;
    protected _addListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey], prepend: boolean, once: boolean): boolean;
    private _removeListenerFromTargets;
    removeListener<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey, listener: EMD<EventMap>[EventKey]): this;
    removeAllListeners<EventKey extends keyof EMD<EventMap> = EventName>(event?: EventKey): this;
    static ABORT_ERR: string | number;
}
export type NodeEventEmitter = INodeEventEmitter;
export { errorMonitor, captureRejectionSymbol, ABORT_ERR };
export declare const once: typeof EventEmitterEx.once, on: typeof eventsAsyncIterator, getEventListeners: typeof EventEmitterEx.getEventListeners;
export declare class TimeoutError extends Error {
    name: string;
    code: string;
    constructor(...args: any[]);
    static ETIMEDOUT: string;
}
export declare function isEventEmitterCompatible(emitter: EventEmitterEx | INodeEventEmitter | Object | null | undefined): emitter is ICompatibleEmitter;
/**
 * Check if emitter is instance of EventEmitterEx from current running context/environment.
 *
 * Note: if emitter is instance of EventEmitterEx from another context/environment, this method returns false.
 * @param emitter
 */
export declare function isEventEmitterEx<EventMap extends DefaultEventMap = DefaultEventMap>(emitter: EventEmitterEx | Object): emitter is EventEmitterEx<EventMap>;
export declare function isEventTargetCompatible(maybeDOMEventTarget: DOMEventTarget | Object): maybeDOMEventTarget is DOMEventTarget;
export declare const isEventEmitterLifecycleEvent: typeof _isLifecycleEvent;
