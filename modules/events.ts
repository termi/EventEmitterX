/// <reference types="node" />

// todo: Изучить [DOM-compatible EventTarget](https://github.com/yiminghe/ts-event-target/blob/main/src/index.ts)
// todo: Реализовать EventTarget (для старых версий nodejs):
//  копировать код из https://github.com/nodejs/node/blob/master/lib/internal/event_target.js
//  - тесты:
//    - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget.js

// import type {EventEmitter} from "events";
import type ServerTiming from 'termi@ServerTiming';
import AbortController, {errorFabric, isAbortSignal} from 'termi@abortable';

type Timeout = NodeJS.Timeout;
type DOMEventTarget = EventTarget;
type NodeEventEmitter = NodeJS.EventEmitter;
// type NodeEventEmitter = EventEmitter;
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
export declare function asTypedEventEmitter<EventMap extends DefaultEventMap, X extends NodeEventEmitter>(x: X): IEventEmitter<EventMap>;

interface Options {
    maxListeners?: number;
    // listener can be registered at most once per event type
    listenerOncePerEventType?: boolean;
    /* todo: add handleEvent support
    // support EventTarget.handleEvent
    supportHandleEvent?: boolean;
     */
}

// interface TEST<EventMap extends DefaultEventMap = DefaultEventMap, EventKey extends keyof EventMap = EventName> { }

interface StaticOnceOptions<EE, E> {
    /** [AbortSignal](https://nodejs.org/api/globals.html#globals_class_abortsignal) */
    signal?: AbortSignal;
    timing?: ServerTiming;
    checkFn?: (number: E, eventEmitter: EE, args: any[]) => boolean;
    timeout?: number;
    // [key: string]: any;
}

let _onceListenerIdCounter = 0;
// This symbol shall be used to install a listener for only monitoring 'error' events. Listeners installed using this symbol are called before the regular 'error' listeners are called.
// Installing a listener using this symbol does not change the behavior once an 'error' event is emitted, therefore the process will still crash if no regular 'error' listener is installed.
const errorMonitor = Symbol('events.errorMonitor');
// const captureRejectionSymbol = Symbol('nodejs.rejection');
// Symbol for EventEmitterEx.once
const sCleanAbortPromise = Symbol();

/** Implemented event emitter */
export class EventEmitterEx<EventMap extends DefaultEventMap = DefaultEventMap> implements IEventEmitter<EventMap> {
    private _events: {
        [eventName in keyof EventMap]?: Function|Function[]
    } = Object.create(null);

    _maxListeners = Infinity;

    // listenerOncePerEventType, listener can be registered at most once per event type
    private _lopet = false;
    /* todo: add handleEvent support
    // supportHandleEvent, support EventTarget.handleEvent
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
            } = options;

            if (maxListeners !== void 0) {
                this._maxListeners = maxListeners;
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
                        emitNone_array(array_handler, this);
                        break;
                    case 1:
                        emitOne_array(array_handler, this, args[0]);
                        break;
                    case 2:
                        emitTwo_array(array_handler, this, args[0], args[1]);
                        break;
                    case 3:
                        emitThree_array(array_handler, this, args[0], args[1], args[2]);
                        break;
                    // slower
                    default:
                        emitMany_array(array_handler, this, args);
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
    private _addListener<EventKey extends keyof EventMap = EventName>(event: EventKey, listener: EventMap[EventKey], prepend: boolean, once: boolean): this {
        // const {_she: supportHandleEvent} = this;
        // if (typeof listener === 'object') {
        //     console.log(listener);
        // }

        checkListener(listener, /*supportHandleEvent*/false);

        if (once) {
            listener = _onceWrap<EventMap, EventKey>(this, event, listener);
        }

        const {
            _events,
            _maxListeners,
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

        if (_maxListeners !== Infinity && _maxListeners <= newLen) {
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

        const {
            _events,
            _lopet: listenerOncePerEventType,
        } = this;
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
        else if (!listenerOncePerEventType) {
            // remove all links to listener
            const listeners = (handler as Function[]);

            if (hasAnyOnceListener) {
                for (let i = listeners.length ; i-- > 0 ; ) {
                    const handler = listeners[i];

                    if (handler === listener) {
                        listeners.splice(i, 1);
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
                        listeners.splice(i, 1);
                    }
                }
            }
            else {
                const listeners = (handler as Function[]);
                let index;

                while ((index = listeners.indexOf(listener)) !== -1) {
                    if (index === 0) {
                        listeners.shift();
                    }
                    else {
                        // spliceOne(listeners, index);
                        listeners.splice(index, 1);
                    }
                }
            }

            if (listeners.length === 0) {
                delete _events[event];
            }
            else if (listeners.length === 1) {
                _events[event] = listeners[0];
            }
        }
        else if (hasAnyOnceListener) {
            // listenerOncePerEventType = true, so remove only first link to listener
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
            // listenerOncePerEventType = true, so remove only first link to listener
            const listeners = (handler as Function[]);
            const index = listeners.indexOf(listener);

            if (index !== -1) {
                const newLen = listeners.length - 1;

                if (newLen === 0) {
                    listeners.length = 0;
                    delete _events[event];
                }
                else {
                    if (index === 0) {
                        listeners.shift();
                    }
                    else {
                        // spliceOne(listeners, index);
                        listeners.splice(index, 1);
                    }

                    if (newLen === 1) {
                        _events[event] = listeners[0];
                    }
                }
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
        if (!event) {
            this._onceIds.length = 0;
            this._events = Object.create(null);
        }
        else {
            if (this._onceIds.length > 0) {
                const handler = this._events[event];

                if (typeof handler === 'function') {
                    const onceWrapperId = handler[sOnceListenerWrapperId];

                    if (onceWrapperId !== void 0) {
                        const idIndex = this._onceIds.indexOf(onceWrapperId);

                        if (idIndex !== -1) {
                            this._onceIds.splice(idIndex, 1);
                        }
                    }
                }
                else {
                    const listeners = (handler as Function[]);

                    for (let i = listeners.length ; i-- > 0 ; ) {
                        const handler = listeners[i];

                        const onceWrapperId = handler[sOnceListenerWrapperId];
                        const idIndex = this._onceIds.indexOf(onceWrapperId);

                        if (idIndex !== -1) {
                            this._onceIds.splice(idIndex, 1);
                        }
                    }
                }
            }

            delete this._events[event];
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
    //   static on(emitter: EventEmitter|EventTarget, event: string): AsyncIterableIterator<any>;
    //     - tests: https://github.com/nodejs/node/blob/master/test/parallel/test-event-on-async-iterator.js
    //   captureRejectionSymbol: Symbol(nodejs.rejection),
    //   captureRejections: [Getter/Setter],
    //   defaultMaxListeners: [Getter/Setter],
    //   init: [Function (anonymous)],
    //   static getEventListeners(emitter: EventEmitter|EventTarget, type: string)
    //     - tests: https://github.com/nodejs/node/blob/master/test/parallel/test-events-static-geteventlisteners.js

    static once(emitter: EventEmitterEx, name: EventName, options?: StaticOnceOptions<EventEmitterEx, EventName>): Promise<any[]>;
    static once(emitter: DOMEventTarget, name: string, options?: StaticOnceOptions<DOMEventTarget, string>): Promise<any[]>;
    static once(emitter: NodeEventEmitter, name: string|symbol, options?: StaticOnceOptions<NodeEventEmitter, string|symbol>): Promise<any[]>;
    /** Creates a Promise that is fulfilled when the EventEmitter emits the given event or that is rejected if the EventEmitter emits 'error' while waiting. The Promise will resolve with an array of all the arguments emitted to the given event.
     *
     * This method is intentionally generic and works with the web platform EventTarget interface, which has no special 'error' event semantics and does not listen to the 'error' event.
     *
     * @see {@link https://nodejs.org/api/events.html#events_events_once_emitter_name_options nodejs events.once(emitter, name, options)}
     *
     * @param emitter
     * @param name
     * @param {StaticOnceOptions=} options
     * @param {AbortSignal=} options.signal - {@link https://nodejs.org/api/globals.html#globals_class_abortsignal AbortSignal}
     * @param {ServerTiming=} options.timing
     * @param {Function=} options.checkFn
     * @param {number=} options.timeout
     */
    static once(emitter: DOMEventTarget|EventEmitterEx|NodeEventEmitter, name: EventName, options?: StaticOnceOptions<typeof emitter, typeof name>): Promise<any[]> {
        if (!(emitter instanceof EventEmitterEx) && !isEventEmitterCompatible(emitter as EventEmitterEx|NodeEventEmitter)) {
            // todo: make _once_DOMEventTarget
            throw new Error('DOMEventTarget compatible mode not implemented yet');
        }

        const _emitter = (emitter as NodeEventEmitter|EventEmitterEx);
        const staticOnceOptions = (options || {}) as StaticOnceOptions<NodeEventEmitter|EventEmitterEx, EventName>;
        const signal = staticOnceOptions.signal || void 0;
        const timeout = staticOnceOptions.timeout || void 0;
        // options с функцией checkFn только для статических методов потому, что тут мы можем гарантировать, что
        //  onceListener - это уникальная функция. Иначе, нужно было бы в _addListener делать кейс, когда
        //  передаётся один и тот же обработчик (ссылка на функцию), но с разными options.
        const checkFn = staticOnceOptions.checkFn && typeof staticOnceOptions.checkFn === 'function' ? staticOnceOptions.checkFn : void 0;
        let listenersCleanUp: Function|void = void 0;
        let timing = staticOnceOptions.timing || void 0;
        let hasTiming = !!timing;

        if (signal) {
            if (!isAbortSignal(signal)) {
                return Promise.reject(new TypeError(`Failed to execute 'fetch' on 'Window': member signal is not of type AbortSignal.`));
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
            const eventListener = (...args) => {
                if (checkFn && !checkFn(name, _emitter, args)) {
                    return;
                }

                if (hasTiming) {
                    timing!.timeEnd(String(name), true);
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
                    timing!.timeEnd(String(name), true);
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
                _emitter.removeListener(name as string|symbol, eventListener);
                _emitter.removeListener('error', errorListener);

                listenersCleanUp = void 0;
            };

            _emitter.on(name as string|symbol, eventListener);
            _emitter.once('error', errorListener);
        });

        if (signal || timeout) {
            let abortCallback: ((this: AbortSignal|void, ev: typeof sCleanAbortPromise|AbortSignalEventMap["abort"]) => void)|void;
            let cleanTimeoutCallback: Function|void;

            // Turn an event into a promise, reject it once `abort` is dispatched
            const cancelPromise = signal ? new Promise<void>((resolve, reject) => {
                abortCallback = function(clearPromiseSymbol) {
                    if (abortCallback) {
                        signal.removeEventListener('abort', abortCallback);
                    }

                    if (clearPromiseSymbol === sCleanAbortPromise) {
                        // Call resolve only in cleanup purpose. It should be called when it cannot affect Promise.race!
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

                        if (listenersCleanUp) {
                            listenersCleanUp();
                        }

                        reject(errorFabric('Aborted', 'AbortError', /*DOMException.ABORT_ERR*/20));
                    }

                    abortCallback = void 0;
                };

                signal.addEventListener('abort', abortCallback);
            }) : void 0;
            const timeoutPromise = timeout ? new Promise<void>((resolve, reject) => {
                let timeoutId: Timeout|void = setTimeout(() => {
                    timeoutId = void 0;

                    if (hasTiming) {
                        timing!.timeEnd(String(name), true);
                        // cleanup
                        timing = void 0;
                        hasTiming = false;
                    }

                    if (listenersCleanUp) {
                        listenersCleanUp();
                    }

                    reject(new Error(`TIMEOUT`));
                }, timeout);

                cleanTimeoutCallback = function() {
                    if (timeoutId) {
                        clearTimeout(timeoutId);

                        timeoutId = void 0;
                    }

                    // Call resolve only in cleanup purpose. It should be called when it cannot affect Promise.race!
                    // Очищаем Promise, чтобы он не висел нереализованным
                    resolve();
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
            return Promise.race(promises).then(result => {
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

                if (hasTiming) {
                    timing!.timeEnd(String(name), true);
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
    static EventEmitterEx = EventEmitterEx;
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

/*
function isDOMEventTarget(emitter: DOMEventTarget|EventEmitterEx|NodeEventEmitter) {
    return typeof (emitter as DOMEventTarget).addEventListener === 'function'
        && typeof (emitter as DOMEventTarget).removeEventListener === 'function'
    ;
}
*/

function isEventEmitterCompatible(emitter: EventEmitterEx|NodeEventEmitter) {
    return typeof emitter.on === 'function'
        && typeof emitter.once === 'function'
        && typeof emitter.removeListener === 'function'
    ;
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

function emitNone_array(handlers: Function[], self: EventEmitterEx) {
    // arrayClone
    const listeners = [ ...handlers ];
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        listeners[i].call(self);
    }
}

function emitOne_array(handlers: Function[], self: EventEmitterEx, arg1: any) {
    // arrayClone
    const listeners = [ ...handlers ];
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        listeners[i].call(self, arg1);
    }
}

function emitTwo_array(handlers: Function[], self: EventEmitterEx, arg1: any, arg2: any) {
    // arrayClone
    const listeners = [ ...handlers ];
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        listeners[i].call(self, arg1, arg2);
    }
}

function emitThree_array(handlers: Function[], self: EventEmitterEx, arg1: any, arg2: any, arg3: any) {
    // arrayClone
    const listeners = [ ...handlers ];
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        listeners[i].call(self, arg1, arg2, arg3);
    }
}

function emitMany_array(handlers: Function[], self: EventEmitterEx, args: any[]) {
    // arrayClone
    const listeners = [ ...handlers ];
    const len = listeners.length;
    for (let i = 0 ; i < len ; ++i) {
        listeners[i].apply(self, args);
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
