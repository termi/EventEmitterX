'use strict';

import { EventEmitterX, _assertIsDefined, _isLifecycleEvent, _isEventEmitterCompatible, isEventEmitterCompatible, ABORT_ERR } from './EventEmitterX';
import type { DefaultEventMap, EventName, NodeEventName, ICompatibleEmitter, NodeEventEmitter as INodeEventEmitter, _ConstructorOptions, EMD } from './EventEmitterX';

interface EventEmitterSimpleProxy_Options extends _ConstructorOptions {
    emitter: EventEmitterX | INodeEventEmitter/* | DOMEventTarget*/;
}

export class EventEmitterSimpleProxy<EventMap extends DefaultEventMap = DefaultEventMap> extends EventEmitterX<EventMap> {
    private _eventEmitter: EventEmitterX | INodeEventEmitter | undefined;
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
            this._eventEmitter = emitter as EventEmitterX | INodeEventEmitter;
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

        return (this._eventEmitter as ICompatibleEmitter).emit(event as NodeEventName, ...args);
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
            (_eventEmitter as EventEmitterX).removeListener(event as NodeEventName, eventProxy);
        }
        else {
            // eslint-disable-next-line unicorn/consistent-destructuring
            eventProxy = this._onEventEmitterEvent.bind(this, event);
            _proxyHandlers[event] = eventProxy;
        }

        _assertIsDefined(eventProxy);

        // The bridge belongs to the local listener group, not to the most recently added listener.
        // Local once wrappers remove themselves; removeListener detaches the bridge when the group is empty.
        if (prepend) {
            (_eventEmitter as EventEmitterX).prependListener(event as NodeEventName, eventProxy);
        }
        else {
            (_eventEmitter as EventEmitterX).on(event as NodeEventName, eventProxy);
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

        for (const type of Reflect.ownKeys(_proxyHandlers)) {
            if (event !== void 0 && (typeof event === 'number' ? String(event) : event) !== type) {
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

        if (event === void 0) {
            this._proxyHandlers = Object.create(null);
        }

        return super.removeAllListeners(event);
    }
}

const tagEventEmitterSimpleProxy = 'EventEmitterSimpleProxy';

EventEmitterSimpleProxy.prototype[Symbol.toStringTag] = tagEventEmitterSimpleProxy;

if (EventEmitterSimpleProxy.constructor.name !== tagEventEmitterSimpleProxy) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(EventEmitterSimpleProxy.constructor, 'name', Object.setPrototypeOf({ value: tagEventEmitterSimpleProxy, configurable: true, enumerable: false, writable: false }, null));
}
