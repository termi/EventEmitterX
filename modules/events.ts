/// <reference types="node" />

import type ServerTiming from 'termi@ServerTiming';
import AbortController, {errorFabric} from 'termi@abortable';

export declare type Listener = (...args: any[]) => Promise<any> | void;
/* todo: add handleEvent support
export interface EventListenerObject<EventMap, EventKey> {
    handleEvent(...args: Parameters<EventMap[EventKey]>): Promise<any> | void;
}
*/
export declare type EventName = number | string | symbol;
export declare type DefaultEventMap = {
    // [event in EventName]: Listener|EventListenerObject;
    [event in EventName]: Listener;
};

// todo: add handleEvent support
// interface EventListenerObject {
//     handleEvent(evt: Event): void;
// }
// declare type EventListenerOrEventListenerObject = Listener | EventListenerObject;

export interface IEventEmitter<EventMap extends DefaultEventMap = DefaultEventMap> {
    emit<EventKey extends keyof EventMap>(event: EventKey, ...args: Parameters<EventMap[EventKey]> | any[]): boolean;
    on<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this;
    once<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this;
    addListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this;
    removeListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this;
    prependListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this;
    prependOnceListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this;
    off<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this;
    removeAllListeners<EventKey extends keyof EventMap = EventName>(event?: EventKey): this;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    listeners<EventKey extends keyof EventMap = EventName>(event: EventKey): EventMap[EventKey][];
    rawListeners<EventKey extends keyof EventMap = EventName>(event: EventKey): EventMap[EventKey][];
    eventNames(): Array<string | symbol>;
    listenerCount<EventKey extends keyof EventMap = EventName>(type: EventKey): number;
}
/** cast type of any event emitter to typed event emitter */
export declare function asTypedEventEmitter<EventMap extends DefaultEventMap, X extends NodeJS.EventEmitter>(x: X): IEventEmitter<EventMap>;

interface IEventEmitter_Options {
    maxListeners?: number;
    // listener can be registered at most once per event type
    listenerOncePerEventType?: boolean;
    /* todo: add handleEvent support
    // support EventTarget.handleEvent
    supportHandleEvent?: boolean;
     */
}

// interface TEST<EventMap extends DefaultEventMap = DefaultEventMap, EventKey extends keyof EventMap = EventName> { }

interface IEventEmitter_StaticOnceOptions {
    /** [AbortSignal](https://nodejs.org/api/globals.html#globals_class_abortsignal) */
    signal?: AbortSignal;
    timing?: ServerTiming;
    checkFn?: (number: EventName, eventEmitter: EventEmitterEx, args: any[]) => boolean;
    // todo: support options.timeout as non-standard promise rejecter. Wile on timeout, promise will reject with `new TimeoutError`
    [key: string]: any;
}

let _onceListenerIdCounter = 0;
// This symbol shall be used to install a listener for only monitoring 'error' events. Listeners installed using this symbol are called before the regular 'error' listeners are called.
// Installing a listener using this symbol does not change the behavior once an 'error' event is emitted, therefore the process will still crash if no regular 'error' listener is installed.
const errorMonitor = Symbol('events.errorMonitor');
// const captureRejectionSymbol = Symbol('nodejs.rejection');
const sListenerOptions = Symbol('events.listenerOptions');
// Symbol for EventEmitterEx.once
const sClearPromiseSymbol = Symbol();

/** Implemented event emitter */
export class EventEmitterEx<EventMap extends DefaultEventMap = DefaultEventMap> implements IEventEmitter<EventMap> {
    private _events: {
        [eventName in keyof EventMap]?: Function|Function[]
    } = Object.create(null);
    /** listeners with attached IEventEmitter_ListenerOptions object by symbol listenerOptions */
    private _lsWOpts: Function[] = [];

    maxListeners = Infinity;

    // listenerOncePerEventType, listener can be registered at most once per event type
    private _lopet = false;
    // hasAnyListenerWithOptions
    private _halwo = false;
    /* todo: add handleEvent support
    // supportHandleEvent, support EventTarget.handleEvent
    private _she = false;
    */
    // list of local id's for once listeners
    _onceIds: number[] = [];

    constructor(options?: IEventEmitter_Options) {
        if (options) {
            const {
                maxListeners,
                listenerOncePerEventType,
                // supportHandleEvent,
            } = options;

            if (maxListeners !== void 0) {
                this.maxListeners = maxListeners;
            }
            if (listenerOncePerEventType !== void 0) {
                this._lopet = listenerOncePerEventType;
            }
            /*
            if (supportHandleEvent !== void 0) {
                this._she = supportHandleEvent;
            }
            */
        }
    }

    emit<EventKey extends keyof EventMap>(event: EventKey, ...args: Parameters<EventMap[EventKey]>) {
        const {_events} = this;
        const hasAnyListenerWithOptions = this._halwo;
        const isErrorEvent = event === 'error';
        const handler = _events[event];

        if (handler) {
            if (isErrorEvent) {
                /** todo: check errorMonitor was set in {@link this._addListener} */
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.emit(errorMonitor, ...args);
            }

            const isFn = typeof handler === 'function';

            if (isFn) {
                const func_handler = handler as Function;
                const options: IEventEmitter_StaticOnceOptions = hasAnyListenerWithOptions && func_handler[sListenerOptions];

                if (options && options.checkFn) {
                    if (!options.checkFn(event, this, args)) {
                        return false;
                    }
                }

                switch (args.length) {
                    case 0:
                        func_handler.call(this);
                        break;
                    case 1:
                        func_handler.call(this, args[0]);
                        break;
                    case 2:
                        func_handler.call(this, args[0], args[1]);
                        break;
                    case 3:
                        func_handler.call(this, args[0], args[1], args[2]);
                        break;
                    // slower
                    default:
                        func_handler.apply(this, args);
                }

                return true;
            }

            const array_handler = handler as Function[];

            if (array_handler.length) {
                switch (args.length) {
                    // fast cases
                    case 0:
                        emitNone_array(array_handler, this, hasAnyListenerWithOptions, hasAnyListenerWithOptions ? event : 0);
                        break;
                    case 1:
                        emitOne_array(array_handler, this, args[0], hasAnyListenerWithOptions, hasAnyListenerWithOptions ? event : 0);
                        break;
                    case 2:
                        emitTwo_array(array_handler, this, args[0], args[1], hasAnyListenerWithOptions, hasAnyListenerWithOptions ? event : 0);
                        break;
                    case 3:
                        emitThree_array(array_handler, this, args[0], args[1], args[2], hasAnyListenerWithOptions, hasAnyListenerWithOptions ? event : 0);
                        break;
                    // slower
                    default:
                        emitMany_array(array_handler, this, args, hasAnyListenerWithOptions, hasAnyListenerWithOptions ? event : 0);
                }

                return true;
            }
        }
        else if (isErrorEvent) {
            // If there is no 'error' event listener then throw.
            const err = args[0];
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

        return false;
    }

    // on<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventListenerOrEventListenerObject): this;
    on<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this {
        return this._addListener(event, listener, false, false);
    }

    once<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this {
        return this._addListener(event, listener, false, true);
    }

    // private _addListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventListenerOrEventListenerObject, prepend: boolean): this;
    private _addListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey], prepend: boolean, once: boolean, options?: IEventEmitter_StaticOnceOptions): this {
        // const {_she: supportHandleEvent} = this;
        // if (typeof listener === 'object') {
        //     console.log(listener);
        // }

        checkListener(listener, /*supportHandleEvent*/false);

        if (once) {
            listener = _onceWrap<EventMap, EventKey>(this, event, listener);
        }

        if (options) {
            // hasAnyListenerWithOptions
            this._halwo = true;

            listener[sListenerOptions] = options;

            this._lsWOpts.push(listener);
        }

        const {
            _events,
            maxListeners,
            _lopet: listenerOncePerEventType,
        } = this;
        // todo: add handleEvent support
        const listenerAs_objectWith_handleEvent = false;//supportHandleEvent && typeof listener === 'object';
        const handler = _events[event];
        let newLen: number;

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
        else if (typeof handler === 'function') {
            if (listenerOncePerEventType && handler === listener) {
                return this;
            }

            if (prepend) {
                _events[event] = [ listener, handler ];
            }
            else {
                _events[event] = [ handler, listener ];
            }

            newLen = 2;
        }
        else {
            if (listenerOncePerEventType && (handler as Function[]).includes(listener)) {
                return this;
            }

            if (prepend) {
                newLen = (handler as Function[]).unshift(listener);
            }
            else {
                newLen = (handler as Function[]).push(listener);
            }
        }

        if (maxListeners !== Infinity && maxListeners <= newLen) {
            // todo: EventEmitterEx.sOnMaxListeners = Symbol('sOnMaxListeners');
            //  emit(EventEmitterEx.sOnMaxListeners, newLen, event, `Maximum event listeners for "${event}" event!`);
            console.warn(`Maximum event listeners for "${event}" event!`);
        }

        return this;
    }

    addListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this {
        return this._addListener(event, listener, false, false);
    }

    removeListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this {
        checkListener(listener);

        const {_events} = this;
        const hasAnyListenerWithOptions = this._halwo;
        const handler = _events[event];

        if (handler === void 0) {
            return this;
        }

        const hasAnyOnceListener = this._onceIds.length > 0;

        if (typeof handler === 'function') {
            if (handler === listener) {
                delete _events[event];
            }
            else if (hasAnyOnceListener
                && (handler[sOnceListenerWrapperId] !== void 0)
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                && handler.listener === listener
            ) {
                const onceWrapperId = handler[sOnceListenerWrapperId];
                const idIndex = this._onceIds.indexOf(onceWrapperId);

                if (idIndex !== -1) {
                    this._onceIds.splice(idIndex, 1);
                }

                delete _events[event];
            }
        }
        else if (hasAnyOnceListener) {
            const listeners = (handler as Function[]);
            let position = -1;

            for (let i = listeners.length ; i-- > 0 ; ) {
                const handler = listeners[i];

                if (handler === listener) {
                    position = i;
                    break;
                }
                else if (
                    (handler[sOnceListenerWrapperId] !== void 0)
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    && handler.listener === listener
                ) {
                    const onceWrapperId = handler[sOnceListenerWrapperId];
                    const idIndex = this._onceIds.indexOf(onceWrapperId);

                    if (idIndex !== -1) {
                        this._onceIds.splice(idIndex, 1);
                    }

                    // originalListener = listeners[i].listener;
                    position = i;
                    break;
                }
            }

            if (position >= 0) {
                if (listeners.length === 1) {
                    listeners.length = 0;
                    // if (--this._eventsCount === 0) {
                    // this._events = Object.create(null);
                    // return this;
                    // } else { delete _events[event]; }
                    delete _events[event];
                }
                else {
                    if (position === 0) {
                        listeners.shift();
                    }
                    else {
                        // spliceOne(listeners, position);
                        listeners.splice(position, 1);
                    }

                    if (listeners.length === 1) {
                        _events[event] = listeners[0];
                    }
                }
            }
        }
        else {
            const listeners = (handler as Function[]);
            const index = listeners.indexOf(listener);

            if (index !== -1) {
                if (index == 0) {
                    listeners.shift();
                }
                else {
                    // spliceOne(listeners, index);
                    listeners.splice(index, 1);
                }

                if (listeners.length === 1) {
                    _events[event] = listeners[0];
                }
            }
        }

        if (hasAnyListenerWithOptions && listener[sListenerOptions] !== void 0) {
            delete listener[sListenerOptions];

            const index = this._lsWOpts.indexOf(listener);

            if (index !== -1) {
                this._lsWOpts.splice(index, 1);
            }

            if (this._lsWOpts.length === 0) {
                this._halwo = false;
            }
        }

        // if (_events.removeListener) this.emit('removeListener', type, originalListener || listener);

        return this;
    }

    hasListeners<EventKey extends keyof EventMap = EventName>(event: EventKey) {
        const {_events} = this;
        const handlers = _events[event];

        if (!handlers) {
            return false;
        }

        if (typeof handlers === 'function') {
            return true;
        }

        return (handlers as Function[]).length > 0;
    }

    prependListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this {
        return this._addListener(event, listener, true, false);
    }

    prependOnceListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this {
        return this._addListener(event, listener, true, true);
    }

    off<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey]): this {
        return this.removeListener(event, listener);
    }

    removeAllListeners<EventKey extends keyof EventMap = EventName>(event?: EventKey): this {
        const hasAnyListenerWithOptions = this._halwo;

        if (!event) {
            if (hasAnyListenerWithOptions) {
                for (const handler of this._lsWOpts) {
                    delete handler[sListenerOptions];
                }

                this._lsWOpts.length = 0;
                this._halwo = false;
            }

            this._onceIds.length = 0;
            this._events = Object.create(null);
        }
        else {
            if (hasAnyListenerWithOptions || this._onceIds.length > 0) {
                const handler = this._events[event];

                if (typeof handler === 'function') {
                    if (handler[sListenerOptions] !== void 0) {
                        delete handler[sListenerOptions];

                        const index = this._lsWOpts.indexOf(handler);

                        if (index !== -1) {
                            this._lsWOpts.splice(index, 1);
                        }

                        if (this._lsWOpts.length === 0) {
                            this._halwo = false;
                        }
                    }

                    const onceWrapperId = handler[sOnceListenerWrapperId];
                    const idIndex = this._onceIds.indexOf(onceWrapperId);

                    if (idIndex !== -1) {
                        this._onceIds.splice(idIndex, 1);
                    }
                }
                else {
                    const listeners = (handler as Function[]);

                    for (let i = listeners.length ; i-- > 0 ; ) {
                        const handler = listeners[i];

                        if (handler[sListenerOptions] !== void 0) {
                            delete handler[sListenerOptions];

                            const index = this._lsWOpts.indexOf(handler);

                            if (index !== -1) {
                                this._lsWOpts.splice(index, 1);
                            }
                        }

                        const onceWrapperId = handler[sOnceListenerWrapperId];
                        const idIndex = this._onceIds.indexOf(onceWrapperId);

                        if (idIndex !== -1) {
                            this._onceIds.splice(idIndex, 1);
                        }
                    }

                    if (this._lsWOpts.length === 0) {
                        this._halwo = false;
                    }
                }
            }

            delete this._events[event];
        }

        return this;
    }

    setMaxListeners(n: number): this {
        this.maxListeners = n;
        return this;
    }

    getMaxListeners(): number {
        return this.maxListeners;
    }

    /**
     * Returns a copy of the array of listeners for the event named eventName.
     */
    listeners<EventKey extends keyof EventMap = EventName>(event: EventKey): EventMap[EventKey][] {
        const {_events} = this;
        const handler = _events[event];

        if (!handler) {
            return [];
        }

        const hasAnyOnceListener = this._onceIds.length > 0;

        if (typeof handler === 'function') {
            if (!hasAnyOnceListener || !handler[sOnceListenerWrapperId]) {
                return [ handler as EventMap[EventKey] ];
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return handler.listener;
        }

        if (!hasAnyOnceListener) {
            return [ ...(handler as EventMap[EventKey][]) ];
        }

        return handler.map<EventMap[EventKey]>(handler => {
            if (handler[sOnceListenerWrapperId]) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return handler.listener;
            }

            return handler;
        });
    }

    /**
     * Returns a copy of the array of listeners for the event named eventName, including any wrappers (such as those created by .once()).
     */
    rawListeners<EventKey extends keyof EventMap = EventName>(event: EventKey): EventMap[EventKey][] {
        const {_events} = this;
        const handler = _events[event];

        if (!handler) {
            return [];
        }

        if (typeof handler === 'function') {
            return [ handler as EventMap[EventKey] ];
        }

        return [ ...(handler as EventMap[EventKey][]) ];
    }

    eventNames(): Array<string | symbol> {
        // todo: return number key as number
        return Object.keys(this._events);
    }

    listenerCount<EventKey extends keyof EventMap = EventName>(event: EventKey): number {
        const {_events} = this;
        const handler = _events[event];

        if (!handler) {
            return 0;
        }

        if (typeof handler === 'function') {
            return 1;
        }

        return (handler as EventMap[EventKey][]).length;
    }

    // todo:
    //   on: [Function: on],
    //   captureRejectionSymbol: Symbol(nodejs.rejection),
    //   captureRejections: [Getter/Setter],
    //   defaultMaxListeners: [Getter/Setter],
    //   init: [Function (anonymous)],

    /** Creates a Promise that is fulfilled when the EventEmitter emits the given event or that is rejected if the EventEmitter emits 'error' while waiting. The Promise will resolve with an array of all the arguments emitted to the given event.
     *
     * This method is intentionally generic and works with the web platform EventTarget interface, which has no special 'error' event semantics and does not listen to the 'error' event.
     *
     * @see {@link https://nodejs.org/api/events.html#events_events_once_emitter_name_options nodejs events.once(emitter, name, options)}
     *
     * @param emitter
     * @param name
     * @param options?
     * @param {AbortSignal} options.signal? - {@link https://nodejs.org/api/globals.html#globals_class_abortsignal AbortSignal}
     * @param {ServerTiming} options.timing?
     * @param {Function} options.checkFn?
     */
    static once(emitter: EventEmitterEx, name: EventName, options?: IEventEmitter_StaticOnceOptions): Promise<any[]> {
        const signal = options && options.signal || void 0;
        const hasSignal = !!signal;
        let listenersCleanUpByAbort: Function|void = void 0;
        let timing = options && options.timing || void 0;
        let hasTiming = !!timing;
        // todo: support options.timeout as non-standard promise rejecter. Wile on timeout, promise will reject with `new TimeoutError`

        if (signal) {
            {
                const invalidSignalError = checkAbortSignal(signal);

                if (invalidSignalError) {
                    return Promise.reject(invalidSignalError);
                }
            }

            // Return early if already aborted, thus avoiding making an HTTP request
            if (signal.aborted) {
                return Promise.reject(errorFabric('Aborted', 'AbortError', /*DOMException.ABORT_ERR*/20));
            }
        }

        if (hasTiming) {
            timing!.time(String(name));
        }

        const promise = new Promise<any[]>((resolve, reject) => {
            const onceListener = (...args) => {
                if (hasSignal) {
                    listenersCleanUpByAbort = void 0;
                }
                if (hasTiming) {
                    timing!.timeEnd(String(name), true);
                    // cleanup
                    timing = void 0;
                    hasTiming = false;
                }

                emitter.removeListener('error', errorListener);
                resolve(args);
            };
            const errorListener = error => {
                if (hasSignal) {
                    listenersCleanUpByAbort = void 0;
                }
                if (hasTiming) {
                    timing!.timeEnd(String(name), true);
                    // cleanup
                    timing = void 0;
                    hasTiming = false;
                }

                emitter.removeListener(name, onceListener);
                reject(error);
            }

            if (hasSignal) {
                listenersCleanUpByAbort = function() {
                    emitter.removeListener('error', errorListener);
                    emitter.removeListener(name, onceListener);

                    listenersCleanUpByAbort = void 0;
                };
            }

            if (options && options.checkFn) {
                // options с функцией checkFn только для статических методов потому, что тут мы можем гарантировать, что
                //  onceListener - это уникальная функция. Иначе, нужно было бы в _addListener делать кейс, когда
                //  передаётся один и тот же обработчик (ссылка на функцию), но с разными options.
                emitter._addListener(name, onceListener, false, true, options);
            }
            else {
                emitter.once(name, onceListener);
            }
            emitter.once('error', errorListener);
        });

        if (signal) {
            let abortCallback;

            // Turn an event into a promise, reject it once `abort` is dispatched
            const cancellation = new Promise<void>((resolve, reject) => {
                abortCallback = function(clearPromiseSymbol) {
                    signal.removeEventListener('abort', abortCallback);

                    if (clearPromiseSymbol === sClearPromiseSymbol) {
                        // Очищаем Promise, чтобы он не висел нереализованным
                        resolve();
                    }
                    else {
                        // todo: Мне кажется, тут это лишнее. Нужно проверить
                        if (hasTiming) {
                            timing!.timeEnd(String(name), true);
                            // cleanup
                            timing = void 0;
                            hasTiming = false;
                        }

                        if (listenersCleanUpByAbort) {
                            listenersCleanUpByAbort();
                        }

                        reject(errorFabric('Aborted', 'AbortError', /*DOMException.ABORT_ERR*/20));
                    }

                    abortCallback = void 0;
                };

                signal.addEventListener('abort', abortCallback);
            });

            // Return the fastest promise (don't need to wait for request to finish)
            return Promise.race([
                cancellation,
                promise,
            ]).then(result => {
                if (abortCallback) {
                    // Вызываем abortCallback передавая в неё sClearPromiseSymbol, чтобы она сама за собой подчистила
                    abortCallback(sClearPromiseSymbol);
                }

                if (hasTiming) {
                    timing!.timeEnd(String(name), true);
                    // cleanup
                    timing = void 0;
                    hasTiming = false;
                }

                return result as any[];
            }).catch(error => {
                if (abortCallback) {
                    // Вызываем abortCallback передавая в неё sClearPromiseSymbol, чтобы она сама за собой подчистила
                    abortCallback(sClearPromiseSymbol);
                }

                if (hasTiming) {
                    timing!.timeEnd(String(name), true);
                    // cleanup
                    timing = void 0;
                    hasTiming = false;
                }

                throw error;
            });
        }

        return promise;
    }

    static errorMonitor = errorMonitor;
    // domain is not supported
    static usingDomains = false;

    static EventEmitter = EventEmitterEx;
    /** alias for global AbortController */
    static AbortController = AbortController;
}

export default EventEmitterEx;

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

function checkAbortSignal(signal: AbortSignal): TypeError|void {
    if (typeof signal !== 'object'
        || !(
            signal instanceof AbortSignal
            // AbortSignal can be from another context
            || (signal as AbortSignal).constructor.name === 'AbortSignal'
        )
    ) {
        return new TypeError(`Failed to execute 'fetch' on 'Window': member signal is not of type AbortSignal.`);
    }
}

type OnceListenerState<EventMap extends DefaultEventMap = DefaultEventMap, EventKey extends keyof EventMap = EventName> = {
    id: number;
    type: EventKey;
    fired: boolean;
    wrapFn: EventMap[EventKey];
    listener: Function;
    target: EventEmitterEx;
}
const sOnceListenerWrapperId = Symbol('');

function onceWrapper(this: OnceListenerState, ...args) {
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

function _onceWrap<EventMap extends DefaultEventMap = DefaultEventMap, EventKey extends keyof EventMap = EventName>(target: EventEmitterEx, type: EventKey, listener: EventMap[EventKey]) {
    const id = ++_onceListenerIdCounter;
    const state: OnceListenerState<EventMap, EventKey> = {
        id,
        type,
        fired: false,
        wrapFn: void 0 as any as EventMap[EventKey],
        listener,
        target,
    };
    const wrapped = onceWrapper.bind(state) as EventMap[EventKey];

    target._onceIds.push(state.id);

    wrapped[sOnceListenerWrapperId] = id;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    wrapped.listener = listener;
    state.wrapFn = wrapped;

    return wrapped as EventMap[EventKey];
}

function emitNone_array(handlers: Function[], self: EventEmitterEx, hasAnyListenerWithOptions: boolean, event: EventName) {
    // arrayClone
    const listeners = [ ...handlers ];
    const len = listeners.length;

    if (hasAnyListenerWithOptions) {
        let calledLen = 0;

        for (let i = 0 ; i < len ; ++i) {
            const func_handler = listeners[i];
            const options: IEventEmitter_StaticOnceOptions = hasAnyListenerWithOptions && func_handler[sListenerOptions];

            if (options && options.checkFn) {
                if (!options.checkFn(event, this, [])) {
                    continue;
                }
            }

            calledLen++;
            listeners[i].call(self);
        }

        return calledLen;
    }
    else {
        for (let i = 0 ; i < len ; ++i) {
            listeners[i].call(self);
        }

        return len;
    }
}

function emitOne_array(handlers: Function[], self: EventEmitterEx, arg1: any, hasAnyListenerWithOptions: boolean, event: EventName) {
    // arrayClone
    const listeners = [ ...handlers ];
    const len = listeners.length;

    if (hasAnyListenerWithOptions) {
        let calledLen = 0;

        for (let i = 0 ; i < len ; ++i) {
            const func_handler = listeners[i];
            const options: IEventEmitter_StaticOnceOptions = hasAnyListenerWithOptions && func_handler[sListenerOptions];

            if (options && options.checkFn) {
                if (!options.checkFn(event, this, [ arg1 ])) {
                    continue;
                }
            }

            calledLen++;
            listeners[i].call(self, arg1);
        }

        return calledLen;
    }
    else {
        for (let i = 0; i < len; ++i) {
            listeners[i].call(self, arg1);
        }
    }
}

function emitTwo_array(handlers: Function[], self: EventEmitterEx, arg1: any, arg2: any, hasAnyListenerWithOptions: boolean, event: EventName) {
    // arrayClone
    const listeners = [ ...handlers ];
    const len = listeners.length;

    if (hasAnyListenerWithOptions) {
        let calledLen = 0;

        for (let i = 0 ; i < len ; ++i) {
            const func_handler = listeners[i];
            const options: IEventEmitter_StaticOnceOptions = hasAnyListenerWithOptions && func_handler[sListenerOptions];

            if (options && options.checkFn) {
                if (!options.checkFn(event, this, [ arg1, arg2 ])) {
                    continue;
                }
            }

            calledLen++;
            listeners[i].call(self, arg1, arg2);
        }

        return calledLen;
    }
    else {
        for (let i = 0; i < len; ++i) {
            listeners[i].call(self, arg1, arg2);
        }
    }
}

function emitThree_array(handlers: Function[], self: EventEmitterEx, arg1: any, arg2: any, arg3: any, hasAnyListenerWithOptions: boolean, event: EventName) {
    // arrayClone
    const listeners = [ ...handlers ];
    const len = listeners.length;

    if (hasAnyListenerWithOptions) {
        let calledLen = 0;

        for (let i = 0 ; i < len ; ++i) {
            const func_handler = listeners[i];
            const options: IEventEmitter_StaticOnceOptions = hasAnyListenerWithOptions && func_handler[sListenerOptions];

            if (options && options.checkFn) {
                if (!options.checkFn(event, this, [ arg1, arg2, arg3 ])) {
                    continue;
                }
            }

            calledLen++;
            listeners[i].call(self, arg1, arg2, arg3);
        }

        return calledLen;
    }
    else {
        for (let i = 0; i < len; ++i) {
            listeners[i].call(self, arg1, arg2, arg3);
        }
    }
}

function emitMany_array(handlers: Function[], self: EventEmitterEx, args: any[], hasAnyListenerWithOptions: boolean, event: EventName) {
    // arrayClone
    const listeners = [ ...handlers ];
    const len = listeners.length;

    if (hasAnyListenerWithOptions) {
        let calledLen = 0;

        for (let i = 0 ; i < len ; ++i) {
            const func_handler = listeners[i];
            const options: IEventEmitter_StaticOnceOptions = hasAnyListenerWithOptions && func_handler[sListenerOptions];

            if (options && options.checkFn) {
                if (!options.checkFn(event, this, args)) {
                    continue;
                }
            }

            calledLen++;
            listeners[i].call(self);
        }

        return calledLen;
    }
    else {
        for (let i = 0; i < len; ++i) {
            listeners[i].apply(self, args);
        }
    }
}

/*
// TESTED: in 2021, spliceOne is much slower
// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
    for (let i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1) {
        list[i] = list[k];
    }

    list.pop();
}
*/
