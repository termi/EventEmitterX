'use strict';

import { EventEmitterX, _assertIsDefined, _isLifecycleEvent, _isEventEmitterCompatible, isEventEmitterCompatible, ABORT_ERR } from './EventEmitterX';
import type { DefaultEventMap, EventName, NodeEventName, ICompatibleEmitter, NodeEventEmitter as INodeEventEmitter, _ConstructorOptions, EMD } from './EventEmitterX';

type EventEmitterProxy_SourceProxyHook = (
    defaultEventEmitter: ICompatibleEmitter | undefined,
    eventType: EventName,
) => ICompatibleEmitter | null | undefined;

type EventEmitterProxy_TargetProxyHook = (
    defaultEventEmitter: ICompatibleEmitter | undefined,
    eventType: EventName,
    eventArgs: unknown[] | null,
) => ICompatibleEmitter | null | undefined;

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

export class EventEmitterProxy<EventMap extends DefaultEventMap = DefaultEventMap> extends EventEmitterX<EventMap> {
    private _getSourceEmitter: EventEmitterProxy_SourceProxyHook | undefined = void 0;
    private _getTargetEmitter: EventEmitterProxy_TargetProxyHook | undefined = void 0;
    private _sourceEmitter: ICompatibleEmitter/* | DOMEventTarget*/ | undefined;
    private _targetEmitter: ICompatibleEmitter/* | DOMEventTarget*/ | undefined;
    // private _eventTarget: DOMEventTarget|void;
    private _allowDirectEmitToTarget: Required<EventEmitterProxy_Options["allowDirectEmitToTarget"]>;
    private _hasProxyHandlers: Partial<Record<EventName, true>> = Object.create(null);
    private _antiLoopingInfoMap: Partial<Record<EventName, { args: unknown[], __proto__: null }>> = Object.create(null);
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
                __proto__: null,
            };

            if (this._antiLoopingInfoMap[event]) {
                throw new Error(`[EventEmitterProxy][#emit]: potentially multiply synchronously nested emit for event "${String(event)}"`);
            }

            this._antiLoopingInfoMap[event] = antiLoopingInfo;
        }

        try {
            return targetEmitter.emit(event as NodeEventName, ...args);
        }
        finally {
            if (has_sourceEmitter_subscription) {
                delete this._antiLoopingInfoMap[event];
            }
        }
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

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore `TS2345: Argument of type 'unknown[]' is not assignable to parameter of type 'Parameters  [EventName]>'.`
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
        const eventKey = typeof event === 'number' ? String(event) : event;
        const knownSubscription = this._knownSubscriptions.find(([ eventType, eventsEmitter ]) => {
            return eventKey === (typeof eventType === 'number' ? String(eventType) : eventType)
                && eventsEmitter === sourceEmitter
            ;
        });
        let eventProxyHandler: typeof _knownSubscriptions[number][2];

        if (knownSubscription) {
            eventProxyHandler = knownSubscription[2];

            // Нам нужно быть уверенным, что обработчик будет подписан на этот type, но только один раз
            // Если он ещё не был подписан, то removeListener ничего не сделает
            (sourceEmitter as EventEmitterX).removeListener(event as NodeEventName, eventProxyHandler);
        }
        else {
            eventProxyHandler = this._onEventEmitterEvent.bind(this, sourceEmitter, event);
        }

        _assertIsDefined(eventProxyHandler);

        // The bridge belongs to the local listener group, not to the most recently added listener.
        // Local once wrappers remove themselves; removeListener detaches the bridge when the group is empty.
        if (prepend) {
            (sourceEmitter as EventEmitterX).prependListener(event as NodeEventName, eventProxyHandler);
        }
        else {
            (sourceEmitter as EventEmitterX).on(event as NodeEventName, eventProxyHandler);
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

    private _removeListenerFromTargets(event: EventName | undefined, targetEmitter: ICompatibleEmitter | undefined) {
        const has_event = event !== void 0;
        const eventKey = typeof event === 'number' ? String(event) : event;
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

            if ((has_event ? (typeof eventType === 'number' ? String(eventType) : eventType) === eventKey : true)
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

        for (const eventType of Reflect.ownKeys(subscriptionsCounters)) {
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

    static {
        const tagEventEmitterProxy = 'EventEmitterProxy';

        this.prototype[Symbol.toStringTag] = tagEventEmitterProxy;

        if (this.constructor.name !== tagEventEmitterProxy) {
            // Fix class name after minification (UglifyJS/Terser or GCC)
            Object.defineProperty(this.constructor, 'name', Object.setPrototypeOf({ value: tagEventEmitterProxy, configurable: true, enumerable: false, writable: false }, null));
        }
    }
}
