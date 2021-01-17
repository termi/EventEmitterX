/// <reference types="node" />

// see: https://github.com/nodejs/node/blob/master/lib/events.js

// todo: Изучить [DOM-compatible EventTarget](https://github.com/yiminghe/ts-event-target/blob/main/src/index.ts)
// todo: Реализовать EventTarget (для старых версий nodejs):
//  копировать код из https://github.com/nodejs/node/blob/master/lib/internal/event_target.js
//  - тесты:
//    - https://github.com/nodejs/node/blob/master/test/parallel/test-eventtarget.js

import type EventEmitter from "events";
import type ServerTiming from 'termi@ServerTiming';
import type {
    // default as TAbortController,
    AbortControllersGroup as TAbortControllersGroup,
} from 'termi@abortable';
import * as AbortController_Module from '../common/AbortController';

const {
    default: AbortController,
    errorFabric,
    isAbortSignal,
    AbortControllersGroup,
} = AbortController_Module;

type Timeout = ReturnType<typeof setTimeout>;
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

/* todo: как-то нужно добавить эти типы в EventMap передаваемый в EventEmitterEx
type InnerListeners = {
    'newListener': (eventName: EventName, listener: Listener) => void|((eventName: EventName, listener: Listener) => void)[];
    'removeListener': (eventName: EventName, listener: Listener) => void|((eventName: EventName, listener: Listener) => void)[];
    'error': ((error: Error) => void)|((error: Error) => void)[]|((error: any) => void)|((error: any) => void)[];
};
*/

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
    // support DOMEventTarget.handleEvent
    supportHandleEvent?: boolean;
     */
}

// interface TEST<EventMap extends DefaultEventMap = DefaultEventMap, EventKey extends keyof EventMap = EventName> { }

interface StaticOnceOptionsDefault {
    /** Add listener in the beginning of listeners list */
    prepend?: boolean;
    /** [AbortSignal](https://nodejs.org/api/globals.html#globals_class_abortsignal)
     * If option "signal" is defined, {@link abortControllers} option is not available.
     */
    signal?: AbortSignal;
    /** A list of AbortController's to subscribe to it's signal's 'abort' event.
     * If option "abortControllers" is defined, {@link signal} option is not available.
     */
    abortControllers?: (AbortController|void)[];
    timing?: ServerTiming;
    /** timeout in ms */
    timeout?: number;
    /** Custom error event name. Default error event name is 'error'. */
    errorEventName?: EventName;
    /** You can throw a Error inside checkFn to reject once() with your error */
    checkFn?: Function;
    // [key: string]: any;
}
interface StaticOnceOptions<EE, E> extends StaticOnceOptionsDefault {
    /** You can throw a Error inside checkFn to reject once() with your error */
    checkFn?: (eventEmitter: EE, emitEventName: E, amitArgs: any[]) => boolean;
    abortControllers?: never;
}
interface StaticOnceOptions_AC<EE, E> extends StaticOnceOptionsDefault {
    /** You can throw a Error inside checkFn to reject once() with your error */
    checkFn?: (eventEmitter: EE, emitEventName: E, amitArgs: any[]) => boolean;
    signal?: never;
}
interface StaticOnceOptionsEventTarget extends StaticOnceOptionsDefault {
    // todo: add:
    //  capture?: boolean;
    //  passive?: boolean;
    /** prepend option is not supported for EventTarget emitter */
    prepend?: never;
    /** You can throw a Error inside checkFn to reject once() with your error */
    checkFn?: (eventEmitter: DOMEventTarget, emitEventName: string, event: Event) => boolean;
    abortControllers?: never;
}
interface StaticOnceOptionsEventTarget_AC extends StaticOnceOptionsDefault {
    // todo: add:
    //  capture?: boolean;
    //  passive?: boolean;
    /** prepend option is not supported for EventTarget emitter */
    prepend?: never;
    /** You can throw a Error inside checkFn to reject once() with your error */
    checkFn?: (eventEmitter: DOMEventTarget, emitEventName: string, event: Event) => boolean;
    signal?: never;
}

let _onceListenerIdCounter = 0;
// This symbol shall be used to install a listener for only monitoring 'error' events. Listeners installed using this symbol are called before the regular 'error' listeners are called.
// Installing a listener using this symbol does not change the behavior once an 'error' event is emitted, therefore the process will still crash if no regular 'error' listener is installed.

const isNodeJS = (function() {
    if (typeof process === 'object' && process) {
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
    // captureRejectionSymbol,
}: {
    readonly errorMonitor: typeof EventEmitter.errorMonitor,
    // readonly captureRejectionSymbol: unique symbol,
} = (function() {
    let errorMonitor;
    // let captureRejectionSymbol;

    if (isNodeJS) {
        // this is nodejs
        try {
            const events = globalThis["require"]('events');

            errorMonitor = events.errorMonitor;
            // captureRejectionSymbol = events.captureRejectionSymbol;
        }
        catch(e) {
            // ignore
        }
    }

    if (!errorMonitor) {
        errorMonitor = Symbol('events.errorMonitor');
    }
    // if (!captureRejectionSymbol) {
    //     captureRejectionSymbol = Symbol('nodejs.rejection');
    // }

    return {
        errorMonitor,
        // captureRejectionSymbol,
    };
})()
// Symbol for EventEmitterEx.once
const sCleanAbortPromise = Symbol();

// listenerOncePerEventType, listener can be registered at most once per event type
const EventEmitterEx_Flags_listenerOncePerEventType = 1 << 1;
const EventEmitterEx_Flags_has_error_listener = 1 << 10;
const EventEmitterEx_Flags_has_newListener_listener = 1 << 11;
const EventEmitterEx_Flags_has_removeListener_listener = 1 << 12;
const EventEmitterEx_Flags_has_errorMonitor_listener = 1 << 13;

/** Implemented event emitter */
export class EventEmitterEx<EventMap extends DefaultEventMap = DefaultEventMap> implements IEventEmitter<EventMap> {
    private _events: {
        [eventName in keyof EventMap]?: Function|Function[]
    } = Object.create(null);

    _maxListeners = Infinity;

    private _f = 0;

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
            } = options;

            if (maxListeners !== void 0) {
                this._maxListeners = maxListeners;
            }
            if (listenerOncePerEventType !== void 0) {
                this._f |= EventEmitterEx_Flags_listenerOncePerEventType;
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
            const {_f} = this;
            // const has_error_listener = _checkBit(_flags, EventEmitterEx_Flags_has_error_listener);

            if (isErrorEvent) {
                if (_checkBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener)) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    this.emit(errorMonitor, ...args);
                }
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
            _f,
        } = this;
        const listenerOncePerEventType = _checkBit(_f, EventEmitterEx_Flags_listenerOncePerEventType);
        const has_newListener_listener = _checkBit(_f, EventEmitterEx_Flags_has_newListener_listener);
        // todo: add handleEvent support
        const listenerAs_objectWith_handleEvent = false;//supportHandleEvent && typeof listener === 'object';
        const handler = _events[event];
        let newLen: number;

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

        if (has_newListener_listener) {
            // todo: Разобраться, почему тут TypeScript ругается, хотя описание для 'newListener' в DefaultEventMap есть.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.emit('newListener', event, listener);
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
            _f,
        } = this;
        // const listenerOncePerEventType = _checkBit(_flgs, EventEmitterEx_Flags_listenerOncePerEventType);
        const handler = _events[event];

        if (handler === void 0) {
            return this;
        }

        const has_error_listener = _checkBit(_f, EventEmitterEx_Flags_has_error_listener);
        const has_errorMonitor_listener = _checkBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener);
        const has_newListener_listener = _checkBit(_f, EventEmitterEx_Flags_has_newListener_listener);
        let has_removeListener_listener = _checkBit(_f, EventEmitterEx_Flags_has_removeListener_listener);

        const hasAnyOnceListener = this._onceIds.length > 0;
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
                const idIndex = this._onceIds.indexOf(onceWrapperId);

                if (idIndex !== -1) {
                    this._onceIds.splice(idIndex, 1);
                }

                delete _events[event];
                newListenersCount = 0;
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
                    const idIndex = this._onceIds.indexOf(onceWrapperId);

                    if (idIndex !== -1) {
                        this._onceIds.splice(idIndex, 1);
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
                        // spliceOne(listeners, position);
                        listeners.splice(index, 1);
                    }

                    if (newListenersCount === 1) {
                        _events[event] = listeners[0];
                    }
                }
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
                        // spliceOne(listeners, index);
                        listeners.splice(index, 1);
                    }

                    if (newListenersCount === 1) {
                        _events[event] = listeners[0];
                    }
                }
            }
        }

        if (newListenersCount !== void 0) {
            if (newListenersCount === 0) {
                if (has_error_listener && event === 'error') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_error_listener);
                }
                else if (has_errorMonitor_listener && event === errorMonitor) {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener);
                }
                else if (has_newListener_listener && event === 'newListener') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_newListener_listener);
                }
                else if (has_removeListener_listener && event === 'removeListener') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_removeListener_listener);
                    // Если мы удаляем последний 'removeListener', то и кидать событие некому.
                    // Именно так работает нативный nodejs 'events' - 'removeListener' не вызывается, когда мы удаляем сам 'removeListener'.
                    has_removeListener_listener = false;
                }
            }
        }
        else {
            // this code should be unreachable
            throw new Error('Normally unreachable error');
        }

        if (has_removeListener_listener) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.emit('removeListener', event, listener);
        }

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
        const {_f} = this;
        const has_removeListener_listener = _checkBit(_f, EventEmitterEx_Flags_has_removeListener_listener);

        if (has_removeListener_listener && event !== 'removeListener') {
            if (!event) {
                // Emit removeListener for all listeners on all events
                const {_events} = this;

                for (const key of Object.keys(_events)) {
                    if (key === 'removeListener') {
                        continue;
                    }

                    this.removeAllListeners(key);
                }

                this.removeAllListeners('removeListener');

                this._onceIds.length = 0;
                this._events = Object.create(null);
                this._f = _unsetBit(_f,
                    EventEmitterEx_Flags_has_error_listener
                    | EventEmitterEx_Flags_has_newListener_listener
                    | EventEmitterEx_Flags_has_removeListener_listener
                    | EventEmitterEx_Flags_has_errorMonitor_listener
                );
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

                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.emit('removeListener', event, handler["listener"]);
                        }
                        else {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.emit('removeListener', event, handler);
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

                            if (onceWrapperId !== void 0) {
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                this.emit('removeListener', event, handler["listener"]);
                            }
                            else {
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                this.emit('removeListener', event, handler);
                            }
                        }
                    }
                }

                delete this._events[event];

                if (_checkBit(_f, EventEmitterEx_Flags_has_error_listener) && event === 'error') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_error_listener);
                }
                else if (_checkBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener) && event === errorMonitor) {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener);
                }
                else if (_checkBit(_f, EventEmitterEx_Flags_has_newListener_listener) && event === 'newListener') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_newListener_listener);
                }
                else if (has_removeListener_listener && event === 'removeListener') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_removeListener_listener);
                }
            }
        }
        else {
            // Not listening for removeListener, no need to emit
            if (!event) {
                this._onceIds.length = 0;
                this._events = Object.create(null);
                this._f = _unsetBit(_f,
                    EventEmitterEx_Flags_has_error_listener
                    | EventEmitterEx_Flags_has_newListener_listener
                    | EventEmitterEx_Flags_has_removeListener_listener
                    | EventEmitterEx_Flags_has_errorMonitor_listener
                );
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

                if (_checkBit(_f, EventEmitterEx_Flags_has_error_listener) && event === 'error') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_error_listener);
                }
                else if (_checkBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener) && event === errorMonitor) {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_errorMonitor_listener);
                }
                else if (_checkBit(_f, EventEmitterEx_Flags_has_newListener_listener) && event === 'newListener') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_newListener_listener);
                }
                else if (has_removeListener_listener && event === 'removeListener') {
                    this._f = _unsetBit(_f, EventEmitterEx_Flags_has_removeListener_listener);
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
    //   static on(emitter: EventEmitter|DOMEventTarget, event: string): AsyncIterableIterator<any>;
    //     - tests: https://github.com/nodejs/node/blob/master/test/parallel/test-event-on-async-iterator.js
    //   captureRejectionSymbol: Symbol(nodejs.rejection),
    //   captureRejections: [Getter/Setter],
    //   defaultMaxListeners: [Getter/Setter],
    //   init: [Function (anonymous)],
    //   static getEventListeners(emitter: EventEmitter|DOMEventTarget, type: string)
    //     - tests: https://github.com/nodejs/node/blob/master/test/parallel/test-events-static-geteventlisteners.js

    static once(emitter: EventEmitterEx, types: EventName|EventName[], options?: StaticOnceOptions<EventEmitterEx, EventName>): Promise<any[]>;
    static once(emitter: EventEmitterEx, types: EventName|EventName[], options?: StaticOnceOptions_AC<EventEmitterEx, EventName>): Promise<any[]>;
    static once(emitter: NodeEventEmitter, types: string|symbol|(string|symbol)[], options?: StaticOnceOptions<NodeEventEmitter, string|symbol>): Promise<any[]>;
    static once(emitter: NodeEventEmitter, types: string|symbol|(string|symbol)[], options?: StaticOnceOptions_AC<NodeEventEmitter, string|symbol>): Promise<any[]>;
    static once(emitter: DOMEventTarget, types: string|string[], options?: StaticOnceOptionsEventTarget): Promise<Event>;
    static once(emitter: DOMEventTarget, types: string|string[], options?: StaticOnceOptionsEventTarget_AC): Promise<Event>;
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
     * @param {ServerTiming=} options.timing
     * @param {number=} options.timeout
     * @param {Function=} options.checkFn
     */
    static once(
            emitter: DOMEventTarget|EventEmitterEx|NodeEventEmitter,
            types: EventName|EventName[],
            // options?: StaticOnceOptionsEventTarget|StaticOnceOptions<typeof emitter, typeof types extends Array<infer T> ? T : typeof types>
            options?: StaticOnceOptionsDefault,
    ): Promise<any[]|Event> {
        let isEventTarget = false;

        if (!(emitter instanceof EventEmitterEx) && !isEventEmitterCompatible(emitter as EventEmitterEx|NodeEventEmitter)) {
            isEventTarget = isEventTargetCompatible(emitter as DOMEventTarget);

            if (!isEventTarget) {
                return Promise.reject(new EventsTypeError('The "emitter" argument must be an instance of EventEmitter or EventTarget.', 'ERR_INVALID_ARG_TYPE'));
            }
            // throw new EventsTypeError('DOMEventTarget compatible mode not implemented yet', 'ERR_INVALID_ARG_TYPE');
        }

        const _emitter = (emitter as NodeEventEmitter|EventEmitterEx);
        const staticOnceOptions = (options || {}) as StaticOnceOptions<NodeEventEmitter|EventEmitterEx, EventName>;
        const usePrependListener = !!staticOnceOptions.prepend;
        const errorEventNameIsDefined = staticOnceOptions.errorEventName !== void 0;
        const errorEventName = (staticOnceOptions.errorEventName || 'error') as string|symbol;
        let signal = staticOnceOptions.signal || void 0;
        const abortControllers = (staticOnceOptions as StaticOnceOptionsDefault).abortControllers || void 0;
        const isValidAbortControllers = Array.isArray(abortControllers) && abortControllers.length > 0;
        const timeout = staticOnceOptions.timeout || void 0;
        // options с функцией checkFn только для статических методов потому, что тут мы можем гарантировать, что
        //  onceListener - это уникальная функция. Иначе, нужно было бы в _addListener делать кейс, когда
        //  передаётся один и тот же обработчик (ссылка на функцию), но с разными options.
        const checkFn = staticOnceOptions.checkFn && typeof staticOnceOptions.checkFn === 'function' ? staticOnceOptions.checkFn : void 0;
        let listenersCleanUp: Function|void = void 0;
        let timing = staticOnceOptions.timing || void 0;
        let hasTiming = !!timing;
        let abortControllersGroup: TAbortControllersGroup|void;

        if (usePrependListener && isEventTarget) {
            return Promise.reject(new EventsTypeError('The "prepend" option is not supported for EventTarget emitter.', 'ERR_INVALID_OPTION_TYPE'));
        }

        if (abortControllers && isValidAbortControllers) {
            if (signal) {
                // Можно использовать либо signal, либо abortController, но не обоих одновременно
                return Promise.reject(new EventsTypeError(`Failed to execute 'once' on emitter: Pick one option: signal or abortControllers`, 'ERR_INVALID_OPTION_TYPE'));
            }

            abortControllersGroup = new AbortControllersGroup(abortControllers);
            signal = abortControllersGroup.signal;
        }

        if (signal) {
            if (!isAbortSignal(signal)) {
                return Promise.reject(new EventsTypeError(`Failed to execute 'once' on emitter: member signal is not of type AbortSignal.`, 'ERR_INVALID_OPTION_TYPE'));
            }

            // Return early if already aborted.
            if (signal.aborted) {
                return Promise.reject(errorFabric('Aborted', 'AbortError', /*DOMException.ABORT_ERR*/20));
            }
        }

        if (hasTiming) {
            timing!.time(types as string[]);
        }

        let promise;

        if (Array.isArray(types)) {
            let winnerEventType: void|(typeof types extends Array<infer T> ? T : typeof types);

            promise = new Promise<any[]>((resolve, reject) => {
                const eventListenersByType: [ type: typeof types extends Array<infer T> ? T : never, listener: Listener ][] = [];

                listenersCleanUp = function() {
                    for (const [ type, listener ] of eventListenersByType) {
                        if (isEventTarget) {
                            (emitter as DOMEventTarget).removeEventListener(type as string, listener);
                        }
                        else {
                            _emitter.removeListener(type as string|symbol, listener);
                        }

                        if (hasTiming && type !== winnerEventType) {
                            timing!.timeClear(type as string, true);
                        }
                    }

                    if (isEventTarget) {
                        if (errorEventNameIsDefined) {
                            // EventTarget does not have `error` event semantics like Node
                            (emitter as DOMEventTarget).removeEventListener(errorEventName as string, errorListener);
                        }
                    }
                    else {
                        _emitter.removeListener(errorEventName, errorListener);
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
                    const eventListener = (...args) => {
                        if (checkFn) {
                            try {
                                if (!checkFn(_emitter, type, args)) {
                                    return;
                                }
                            }
                            catch(err) {
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
                        (emitter as DOMEventTarget).addEventListener(type as string, eventListener);
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
                        timing!.timeClear(types as string[], true);
                        // cleanup
                        timing = void 0;
                        hasTiming = false;
                    }

                    if (listenersCleanUp) {
                        listenersCleanUp();
                    }

                    reject(error);
                };

                if (isEventTarget) {
                    if (errorEventNameIsDefined) {
                        // EventTarget does not have `error` event semantics like Node
                        (emitter as DOMEventTarget).addEventListener(errorEventName as string, errorListener);
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

            promise = new Promise<any[]>((resolve, reject) => {
                const eventListener = (...args) => {
                    if (checkFn) {
                        try {
                            if (!checkFn(_emitter, type, args)) {
                                return;
                            }
                        }
                        catch(err) {
                            reject(err);
                        }
                    }

                    if (hasTiming) {
                        timing!.timeEnd(type as string, true);
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
                        //  timing!.timeClear(type as string, true);
                        timing!.timeEnd(type as string, true);
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
                        (emitter as DOMEventTarget).removeEventListener(type as string, eventListener);
                        if (errorEventNameIsDefined) {
                            // EventTarget does not have `error` event semantics like Node
                            (emitter as DOMEventTarget).removeEventListener(errorEventName as string, errorListener);
                        }
                    }
                    else {
                        _emitter.removeListener(type as string|symbol, eventListener);
                        _emitter.removeListener(errorEventName, errorListener);
                    }

                    listenersCleanUp = void 0;
                };

                if (isEventTarget) {
                    (emitter as DOMEventTarget).addEventListener(type as string, eventListener);
                    if (errorEventNameIsDefined) {
                        // EventTarget does not have `error` event semantics like Node
                        (emitter as DOMEventTarget).addEventListener(errorEventName as string, errorListener);
                    }
                }
                else if (usePrependListener) {
                    _emitter.prependListener(type as string|symbol, eventListener);
                    _emitter.prependListener(errorEventName, errorListener);
                }
                else {
                    _emitter.on(type as string|symbol, eventListener);
                    _emitter.on(errorEventName, errorListener);
                }
            });
        }

        if (signal || timeout) {
            let abortCallback: ((this: AbortSignal|void, ev: typeof sCleanAbortPromise|AbortSignalEventMap["abort"]) => void)|void;
            let cleanTimeoutCallback: Function|void;

            // Turn an event into a promise, reject it once `abort` is dispatched
            const cancelPromise = signal ? new Promise<void>((resolve, reject) => {
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

                        reject(errorFabric('Aborted', 'AbortError', /*DOMException.ABORT_ERR*/20));
                    }

                    abortCallback = void 0;
                };

                signal!.addEventListener('abort', abortCallback);
            }) : void 0;
            const timeoutPromise = timeout ? new Promise<void>((resolve, reject) => {
                let timeoutId: Timeout|void = setTimeout(() => {
                    timeoutId = void 0;

                    if (hasTiming) {
                        // todo: Создавать метку времени для 'timeout' и закрывать её в случае таймаута. Если ошибки не было - удалять метку времени для 'timeout' из timing.
                        //  timing!.timeClear(type as string, true);
                        timing!.timeEnd(types as string[], true);
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
                if (abortControllersGroup) {
                    abortControllersGroup.close();
                }

                if (hasTiming) {
                    timing!.timeEnd(types as string[], true);
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
                }

                if (hasTiming) {
                    timing!.timeEnd(types as string[], true);
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

export function isEventEmitterCompatible(emitter: EventEmitterEx|NodeEventEmitter|Object) {
    return !!emitter
        && typeof (emitter as NodeEventEmitter).on === 'function'
        && typeof (emitter as NodeEventEmitter).once === 'function'
        && typeof (emitter as NodeEventEmitter).removeListener === 'function'
        && typeof (emitter as NodeEventEmitter).emit === 'function'
        && typeof (emitter as NodeEventEmitter).prependListener === 'function'
    ;
}

export function isEventTargetCompatible(emitter: DOMEventTarget|Object) {
    return !!emitter
        && typeof (emitter as DOMEventTarget).addEventListener === 'function'
        && typeof (emitter as DOMEventTarget).removeEventListener === 'function'
        && typeof (emitter as DOMEventTarget).dispatchEvent === 'function'
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

function _checkBit(mask: number, bit: number): boolean {
    return (mask & bit) !== 0;
}
function _unsetBit(mask: number, bit: number): number {
    return mask & ~bit;
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
