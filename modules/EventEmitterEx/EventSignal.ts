// noinspection JSConstantReassignment

'use strict';

// see:
// * [Большое сравнение реактивных систем](https://page.hyoo.ru/#!=3ia3ll_rcpl7b)
// * [Difference between effect and useSignalEffect in signals-react](https://stackoverflow.com/questions/77789234/difference-between-effect-and-usesignaleffect-in-signals-react)
// * [Effector](https://effector.dev/ru/)
//    * [effector / filter example](https://share.effector.dev/0zxWY3px)
//    * [effector / combine example](https://share.effector.dev/l8Cvwz7a)
//    * [guard | effector](https://effector.dev/en/api/effector/guard/) and [guard example](https://share.effector.dev/zLB4NwNV)
// * [cellx - The ultra-fast implementation of reactivity for javascript](https://github.com/Riim/cellx/)

import type { EventEmitter } from "node:events";

import type { EventSignal_ReactCopy } from "./EventSignal_types";

import { isTest, isIDEDebugger } from 'termi@runEnv';
import { isUniqueSymbol } from 'termi@type_guards';
import { EventEmitterX } from "../events";
import { arrayContentStringify, stringifyWithCircularHandle, isRunningInWebDevMode } from "./utils";
import {
    createEventSignalMagicContext,
    getReactFunctionComponentFromMagicContext,
} from "./view_utils";

// todo:
//  1. Использовать версию EventEmitterX с WeakMap в качестве _events, чтобы не "держать" сигналы от удаления GC.
//     А точнее, чтобы подписки на _signalSymbol авто-удалялись при удалении из памяти EventSignal, для которого этот _signalSymbol создавался.
//  2. Кидать события onCreateEventSignal, onDestroyEventSignal и другие
//  3. Добавить в опции конструктора EventSignal свойство "domain" для переопределения, какой signalEventsEmitter использовать.
const signalEventsEmitter = new EventEmitterX({
    listenerOncePerEventType: true,
});
const timersTriggerEventsEmitter = new EventEmitterX({
    listenerOncePerEventType: true,
});

const subscribersEventsEmitter = new EventEmitterX({
    listenerOncePerEventType: true,
});

const isReactDev = isRunningInWebDevMode();
const _is = Object.is;
let idIncrement = 0;
// note: can be implemented via stack
let currentSignal: EventSignal<any, any, any> | null = null;

// type Method<T, ARGS extends any[]> = (first: T, ...args: ARGS) => T;
// type MethodsMap<T> = Record<string, Method<T, any[]>>;
// type InputMethods__<T> = MethodsMap<T> | undefined;

// Вспомогательный тип для определения возвращаемого типа
type ReturnTypeOrPromise<T> = T extends Promise<infer U> ? Promise<U> : T;

export class EventSignal<T, S=T, D=undefined, R=T> {
    public readonly id = ++idIncrement;
    // noinspection JSUnusedGlobalSymbols
    public readonly isEventSignal = true;
    /**
     * Use it as for React key.
     *
     * * React key must be string (can't be Symbol).
     * * React keys don't need to be unique globally.
     */
    public readonly key: string;
    private _value: T;
    private readonly _finaleValue: T | undefined;
    private readonly _finaleSourceValue: S | undefined;
    private _subscriptionsToDeps: Set<number | string | symbol> | null = null;
    // // this symbol MUST using only for subscriptions
    // private readonly _signalSymbol: symbol;
    // // this symbol can be used for any public-related data, such as logging, counters etc
    // private readonly _uniqueSymbol: symbol;
    private readonly _signalSymbol: symbol;
    private _stateFlags: EventSignal.StateFlags = 0;
    private _version = 0;
    private _computationsCount = 0;
    /** (React) component version. Only usable with {@link registerReactComponentForComponentType} and {@link _subscribeOnNextAnimationFrame} */
    private _cv = 0 | 0;
    /** computationDeferredList */
    private _cDeferredList: ({ resolve: ((newValue: T) => void), reject: ((error: unknown) => void), promise: Promise<T> })[] | undefined;
    private _recalcPromise: Promise<void> | null | undefined;
    // todo: [tag: SET_WITH_SETTER__QUEUES] Недоделанные наброски
    // private _setPromise: Promise<void> | null | undefined;
    private _promise: Promise<T> | undefined;
    private _reject: ((error: unknown) => void) | undefined;
    private _resolve: ((newValue: T) => void) | undefined;
    private _triggerCleanUp: (() => void) | undefined;
    private _throttleCleanUp: (() => void) | undefined;
    private _onDestroy: (() => void) | undefined;
    private readonly _abortSignal?: AbortSignal;
    private readonly _oneOfDepUpdated = (noEventSignalDepUpdate?: boolean) => {
        const stateFlags = this._stateFlags;
        const hasNoThrottle_or_wasThrottleTrigger = ((stateFlags & EventSignal.StateFlags.hasThrottle) === 0
            || (stateFlags & EventSignal.StateFlags.wasThrottleTrigger) !== 0
        );

        if ((stateFlags & EventSignal.StateFlags.isNeedToCalculateNewValue) === 0) {
            // this._isNeedToCompute = true;
            this._stateFlags |= (EventSignal.StateFlags.isNeedToCalculateNewValue
                | EventSignal.StateFlags.wasDepsUpdate
            );
            this._stateFlags &= ~(EventSignal.StateFlags.wasSourceSetting
                | EventSignal.StateFlags.wasSourceSettingFromEvent
            );
        }
        else if (!noEventSignalDepUpdate) {
            this._stateFlags |= EventSignal.StateFlags.wasDepsUpdate;
            this._stateFlags &= ~(EventSignal.StateFlags.wasSourceSetting
                | EventSignal.StateFlags.wasSourceSettingFromEvent
            );
        }

        if (hasNoThrottle_or_wasThrottleTrigger) {
            // todo: В конструкторе EventSignal может приходить кастомный EventsEmitter.
            // Уведомим всех наших подписчиков, что наши зависимости изменились и это значит, что наше значение может стать новым.
            // todo: Проверить и исправить, что при любой пачки изменений мы посылаем событие в signalEventsEmitter ровно
            //  один раз до тех пор, как не "реализуем" это изменение.
            signalEventsEmitter.emit(this._signalSymbol);
            this._recalculateIfNeeded();
        }
    };
    private readonly _computation?: EventSignal.ComputationWithSource<T, S, D, R>;
    private _sourceValue: S | undefined;
    // todo: add `statusData?: any;`?
    public readonly status?: string;
    public readonly lastError?: Error | string | unknown | undefined;
    // todo: Заменить на _sourceMapAndFilterFn
    private readonly _sourceMapFn?: EventSignal.NewOptionsWithSource<T, S, D, R>["sourceMap"];
    // todo: Заменить на _sourceMapAndFilterFn
    private readonly _sourceFilterFn?: EventSignal.NewOptionsWithSource<T, S, D, R>["sourceFilter"];
    private readonly _sourceCleanup: (() => void) | undefined;
    /**
     * Payload
     */
    public data: D = void 0 as unknown as D;

    /*
    public readonly _: InputMethods extends undefined
        ? undefined
        : InputMethods extends Record<string, never>
            ? undefined
            : {
                [K in keyof InputMethods]: InputMethods[K] extends Method<T, infer Args>
                    ? (...args: Args) => ReturnType<InputMethods[K]>
                    : undefined;
            };
    */

    // todo: Разрешить ТОЛЬКО string | number | symbol, потому что от поддержки function | Object тут только усложняется код
    // For React
    public readonly componentType?: EventSignal.NewOptions<T, S, D, R>["componentType"];
    // For React
    private _reactFC?: _ComponentDescription<T, S, D, R>;

    // Reserved for React
    declare readonly $$typeof: symbol;
    /**
     * Reserved for React
     *
     * React component function (React.FC) despite of type `string` here.
     */
    declare readonly type: ({ eventSignal, current$ }: {
        current$: EventSignal<T, S, D, R>,
        /** @deprecated use {@link current$} */
        eventSignal?: EventSignal<T, S, D, R>,
        __proto__?: null,
    }, context?: Object) => { type: any, props: any, key: string };
    // Reserved for React
    // declare readonly type: (props: {
    //     eventSignal: EventSignal<T, S, D, R>,
    // }) => any;
    // Reserved for React
    declare readonly props: {
        current$: EventSignal<any>,
        /** @deprecated use {@link current$} */
        eventSignal?: EventSignal<any>,
    };
    // Reserved for React
    declare readonly keyProps: { key: EventSignal<any>["key"] };
    // Reserved for React
    declare readonly defaultProps: {
        current$: EventSignal<any>,
        /** @deprecated use {@link current$} */
        eventSignal?: EventSignal<any>,
    };
    // Reserved for React
    declare readonly ref: null;
    // Reserved for React
    declare readonly children?: null;
    // Reserved for React
    declare readonly _self?: null;
    // Reserved for React
    declare readonly _source?: null;
    // Reserved for React
    declare readonly _owner?: null;
    // // Reserved for React
    // declare readonly component?: null;

    //todo: Возможности, которые можно добавить:
    // 1. В опциях конструктора добавить свойство actions - это объект с методами, которые изменяют значение EventSignal.
    //    Он будет прикреплён к данному экземпляру и доступен как `eventSignal.actions`. Метода в "actions" аналогичные
    //    тому, что возвращает createMethod (createAction).
    // 2. В опциях конструктора добавить свойство views - это объект с функциями computation из которых будет сгенерирован
    //    набор EventSignal с зависимостью от текущего EventSignal (значение текущего передаётся как sourceValue в сгенерированные).
    //    Доступны сгенерированные EventSignal's будут как `eventSignal.views`.
    // 3. Нужно добавиить режимы оповещения подписчиков (через addListener() или then()): синхронный и асинхронный.
    //    * В асинхронном режиме (по-умолчанию), подписчики получают изменения в следующим тике (микротаске) при изменении
    //      одной или более зависимостей. В этом случае, если более одной зависимости изменяться последовательно синхронно,
    //      то подписчики получат только одно финальное уведомление.
    //    * В синхронном режиме, подписчики получают изменения сразу синхронно при изменении любой из зависимостей.
    //      В этом случае, если более одной зависимости изменяться последовательно синхронно, то подписчики получат
    //      нескольких последовательных синхронных уведомлений.
    // 4. Можно добавить метод batchUpdates(Start/End) который позволит более точно контролировать **синхронное** применение
    //    изменений в EventSignal для которого есть 2 и более зависимостей.
    constructor(initialValue: Awaited<T> | T);
    // constructor(initialValue: Awaited<T>, asyncComputation: EventSignal.AsyncComputationWithSource<T, S, D>);
    constructor(initialValue: Awaited<T> | T, options: Omit<EventSignal.NewOptions<ReturnTypeOrPromise<R>, S, D, R>, 'trigger'> | Omit<EventSignal.NewOptionsWithSource<ReturnTypeOrPromise<R>, S, D, R>, 'trigger'>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource<ReturnTypeOrPromise<R>, S, D, R>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource2<ReturnTypeOrPromise<R>, S, D, R>, options: EventSignal.NewOptionsWithInitialSourceValue<ReturnTypeOrPromise<R>, S, D, R>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource<ReturnTypeOrPromise<R>, S, D, R>, options: EventSignal.NewOptionsWithSource<ReturnTypeOrPromise<R>, S, D, R>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource<ReturnTypeOrPromise<R>, S, D, R>, options: EventSignal.NewOptions<ReturnTypeOrPromise<R>, S, D, R> | EventSignal.NewOptionsWithInitialSourceValue<ReturnTypeOrPromise<R>, S, D, R>);
    constructor(
        initialValue: Awaited<T>,
        computationOrOptions?:// eslint-disable-next-line callforce/sort-type-constituents
            // | EventSignal.AsyncComputationWithSource<T, S, D>
            | EventSignal.ComputationWithSource<ReturnTypeOrPromise<R>, S, D, R>
            | EventSignal.NewOptions<ReturnTypeOrPromise<R>, S, D, R>
        ,
        options?: EventSignal.NewOptions<ReturnTypeOrPromise<R>, S, D, R>
    ) {
        const isSecondParameterComputation = typeof computationOrOptions === 'function';

        if (!isSecondParameterComputation) {
            options = computationOrOptions;
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        this._computation = isSecondParameterComputation
            ? computationOrOptions
            : void 0// (options as EventSignal.NewOptionsWithComputation<T, S, D> | EventSignal.NewOptionsWithSourceAndComputation<T, S, D> | undefined)?.computation
        ;

        const description = options?.description || '';
        const symbolDescription = this.id + (description ? `#${description}` : '');

        this._signalSymbol = Symbol(symbolDescription);
        // this._uniqueSymbol = Symbol(symbolDescription);

        const finaleValue = options?.finaleValue;

        if (finaleValue !== void 0) {
            this._finaleValue = finaleValue as unknown as T;
        }

        const finaleSourceValue = options?.finaleSourceValue;

        if (finaleSourceValue !== void 0) {
            this._finaleSourceValue = finaleSourceValue;
        }

        const {
            _computation,
            _oneOfDepUpdated,
        } = this;
        // note: `@scoped` is not in jsdoc standard. To use this you need to include the custom eslint rule.
        /** @scoped variable can't be used in inner scope */
        let stateFlags = this._stateFlags;

        if (typeof _computation === 'function') {
            stateFlags |= (EventSignal.StateFlags.hasComputation | EventSignal.StateFlags.isNeedToCalculateNewValue);
            this.lastError = void 0;

            Object.defineProperty(_computation, 'name', {
                value: `computation#${symbolDescription}`,
                enumerable: false,
                configurable: true,
                writable: false,
            });
        }

        Object.defineProperty(_oneOfDepUpdated, 'name', {
            value: `_oneOfDepUpdated#${this.id}`,
            enumerable: false,
            configurable: true,
            writable: false,
        });

        if (isIDEDebugger || isReactDev) {
            Object.defineProperty(_oneOfDepUpdated, 'current$', {
                value: this,
                enumerable: false,
                configurable: true,
                writable: false,
            });
        }

        this._value = typeof initialValue === 'function' ? void 0 as T : initialValue as T;
        this._sourceValue = (options as EventSignal.NewOptionsWithInitialSourceValue<T, S, D, R>)?.initialSourceValue ?? void 0;

        this.set = this.set.bind(this);
        // note: I don't see any cases where `use` would be called without `EventSignal` object in form of `current$.use()`.
        // this.use = this.use.bind(this);

        // noinspection JSUnusedAssignment
        initialValue = void 0 as Awaited<T>;

        if (options) {
            const {
                deps,
                sourceEmitter,
                sourceEvent,
                sourceMap,
                sourceFilter,
                data,
                signal: _abortSignal,
                componentType,
                reactFC,
                trigger,
                throttle,
                onDestroy,
            } = options as EventSignal.NewOptionsWithSource<T, S, D, R>;

            if (Array.isArray(deps) && deps.length > 0) {
                const _subscriptionsToDeps = this._subscriptionsToDeps ??= new Set();

                stateFlags |= EventSignal.StateFlags.hasDepsFromProps;

                for (const { eventName } of deps) {
                    _subscriptionsToDeps.add(eventName);

                    signalEventsEmitter.on(eventName, _oneOfDepUpdated);
                }
            }

            if (data !== void 0) {
                this.data = data;
            }

            if (sourceEvent && sourceEmitter) {
                this._sourceMapFn = sourceMap;
                this._sourceFilterFn = sourceFilter;

                // this._hasSourceEmitter = true;
                stateFlags |= EventSignal.StateFlags.hasSourceEmitter;

                this._sourceCleanup = _eventTargetAddListeners(sourceEmitter, (...args: unknown[]) => {
                    // eslint-disable-next-line prefer-spread
                    if (this._sourceFilterFn && !this._sourceFilterFn.apply(null, args as [ event: number | string | symbol, ...args: unknown[] ])) {
                        return;
                    }

                    const { _sourceMapFn } = this;
                    const _newSourceValue = _sourceMapFn
                        // eslint-disable-next-line prefer-spread
                        ? _sourceMapFn.apply(null, args as [ event: number | string | symbol, ...args: unknown[] ])
                        : args[1] as S
                    ;
                    // Если в событии не было агрументов (массив args состоит только из названия событий), то форсируем установку sourceValue.
                    const isForceRecomputeWithSameSourceValue = _newSourceValue === void 0;

                    if (isForceRecomputeWithSameSourceValue && _sourceMapFn) {
                        // _sourceMapFn ничего не вернула - ничего делать не нужно
                        return;
                    }

                    this._stateFlags |= EventSignal.StateFlags.wasSourceSettingFromEvent;
                    this._stateFlags &= ~EventSignal.StateFlags.wasDepsUpdate;

                    const newSourceValue = isForceRecomputeWithSameSourceValue ? this._sourceValue : _newSourceValue;

                    const isNeedToUpdate = this._setSourceValue(
                        newSourceValue,
                        // Срабатывание подписки на событие всегда тригеррит re-computation, даже если newSourceValue === this._sourceValue
                        false,
                        newSourceValue === void 0,
                    );

                    if (!isNeedToUpdate) {
                        //todo: _updateReason должен применяться к EventSignal.updateReason только после установки нового фактического значения EventSignal.value
                        // this._updateReason = 'sourceEmitter';
                        this._stateFlags &= ~EventSignal.StateFlags.wasSourceSettingFromEvent;
                    }
                }, {
                    eventName: sourceEvent,
                    addEventNameToListener: true,
                    __proto__: null,
                });
            }

            if (_abortSignal) {
                this._abortSignal = _abortSignal;

                _abortSignal.addEventListener('abort', this[Symbol.dispose]);
            }

            if (reactFC) {
                this._reactFC = { 0: reactFC/*, 1: preDefinedProps*/, __proto__: null };
            }
            else if (componentType) {
                this.componentType = componentType;
            }

            if (trigger && typeof trigger === 'object') {
                // note: Первый параметр занят под объект события (event) при срабатывания обработчика на EventTarget.
                const _onTrigger = () => {
                    if ((this._stateFlags & EventSignal.StateFlags.wasForceUpdateTrigger) === 0) {
                        this._stateFlags |= (EventSignal.StateFlags.isNeedToCalculateNewValue | EventSignal.StateFlags.wasForceUpdateTrigger);

                        this._oneOfDepUpdated(true);
                    }
                };

                Object.defineProperty(_onTrigger, 'name', {
                    value: `_onTrigger#${this.id}`,
                    enumerable: false,
                    configurable: true,
                    writable: false,
                });

                if (isIDEDebugger || isReactDev) {
                    Object.defineProperty(_onTrigger, 'current$', {
                        value: this,
                        enumerable: false,
                        configurable: true,
                        writable: false,
                    });
                }

                const triggerCleanUp = this._subscribeToTrigger(trigger, _onTrigger);

                if (triggerCleanUp) {
                    this._triggerCleanUp = triggerCleanUp;
                }
            }

            if (throttle && typeof throttle === 'object') {
                // note: Первый параметр занят под объект события (event) при срабатывания обработчика на EventTarget.
                const _onThrottleTrigger = () => {
                    this._stateFlags |= EventSignal.StateFlags.wasThrottleTrigger;

                    if ((this._stateFlags & EventSignal.StateFlags.isNeedToCalculateNewValue) !== 0) {
                        this._oneOfDepUpdated(true);
                    }
                };

                Object.defineProperty(_onThrottleTrigger, 'name', {
                    value: `_onThrottleTrigger#${this.id}`,
                    enumerable: false,
                    configurable: true,
                    writable: false,
                });

                if (isIDEDebugger || isReactDev) {
                    Object.defineProperty(_onThrottleTrigger, 'current$', {
                        value: this,
                        enumerable: false,
                        configurable: true,
                        writable: false,
                    });
                }

                const throttleCleanUp = this._subscribeToTrigger(throttle, _onThrottleTrigger, () => {
                    this._stateFlags &= ~EventSignal.StateFlags.hasThrottle;
                    this._throttleCleanUp = void 0;

                    if ((this._stateFlags & EventSignal.StateFlags.isDestroyed) === 0) {
                        _onThrottleTrigger();
                    }
                });

                if (throttleCleanUp) {
                    this._throttleCleanUp = throttleCleanUp;

                    stateFlags |= EventSignal.StateFlags.hasThrottle;

                    if ((stateFlags & (EventSignal.StateFlags.hasComputation | EventSignal.StateFlags.isNeedToCalculateNewValue))
                        === (EventSignal.StateFlags.hasComputation | EventSignal.StateFlags.isNeedToCalculateNewValue)
                    ) {
                        // First computation is needed
                        stateFlags |= EventSignal.StateFlags.wasThrottleTrigger;
                    }
                }
            }

            if (onDestroy) {
                this._onDestroy = onDestroy;
            }

            /*
            if (methods) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore `TS2322: Type {} is not assignable to type`
                const _ = this._ = Object.create(null);

                for (const key of Object.keys(methods)) {
                    const originalMethod = methods[key];

                    if (typeof originalMethod === 'function') {
                        _[key] = (...args: any[]) => {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                            // @ts-ignore dont care about 'never' here
                            return originalMethod(this.get(), ...args);
                        };
                    }
                }
            }
            */
        }

        this._stateFlags = stateFlags;

        const { id } = this;
        const key = id.toString(36);

        this.key = key;

        Object.defineProperty(this.component, 'name', {
            value: `EventSignal.component#${key}${description ? `(${description})` : ''}`,
            configurable: true,
            writable: false,
            enumerable: true,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore allow `__proto__`
            __proto__: null,
        });
    }

    destructor() {
        if ((this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            return;
        }

        const {
            _finaleValue,
            _finaleSourceValue,
            _signalSymbol,
            _abortSignal,
            _sourceMapFn,
            _sourceFilterFn,
            lastError,
            status,
            _resolve,
            _reject,
            _promise,
            _sourceCleanup,
            _triggerCleanUp,
            _throttleCleanUp,
            _onDestroy,
        } = this;
        const has_finaleValue = _finaleValue !== void 0;
        const has_finaleSourceValue = _finaleSourceValue !== void 0;

        // this.isDestroyed = true;
        this._stateFlags |= EventSignal.StateFlags.isDestroyed;

        //todo: Сейчас не работает
        // EventSignal._setComponentOnDestroy(this);

        if (has_finaleValue || has_finaleSourceValue) {
            if (this._setSourceValue((has_finaleValue ? _finaleValue : _finaleSourceValue) as unknown as S, true)) {
                //todo: _updateReason должен применяться к EventSignal.updateReason только после установки нового фактического значения EventSignal.value
                // this._updateReason = Symbol.dispose;

                const maybePromise = this._calculateValue(has_finaleValue);

                // eslint-disable-next-line promise/prefer-await-to-then
                if (typeof (maybePromise as Promise<T>)?.then === 'function') {
                    // eslint-disable-next-line promise/prefer-await-to-then,promise/prefer-await-to-callbacks
                    (maybePromise as Promise<T>)?.then(null, (error) => {
                        console.error('EventSignal#destructor: async _calculateValue: error:', error);
                    });
                }
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this._finaleValue = void 0;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this._finaleSourceValue = void 0;
        }

        this.clearDeps();

        // If has finaleSourceValue do not cleanup this._sourceValue due .getSourceValue() method
        if (!has_finaleSourceValue) {
            this._sourceValue = void 0;
        }

        this._stateFlags &= ~(EventSignal.StateFlags.hasSourceEmitter
            | EventSignal.StateFlags.nowInCalculatingNewValue
            | EventSignal.StateFlags.nowInSettings
            | EventSignal.StateFlags.isNeedToCalculateNewValue
            | EventSignal.StateFlags.wasDepsUpdate
            | EventSignal.StateFlags.wasSourceSetting
            | EventSignal.StateFlags.wasSourceSettingFromEvent
            | EventSignal.StateFlags.hasThrottle
            | EventSignal.StateFlags.wasThrottleTrigger
            | EventSignal.StateFlags.wasForceUpdateTrigger
        );

        if (_sourceMapFn) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this._sourceMapFn = void 0;
        }
        if (_sourceFilterFn) {// eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this._sourceFilterFn = void 0;
        }
        if (lastError) {// eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this.lastError = void 0;
        }
        if (status) {// eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this.status = void 0;
        }
        // todo: [tag: SET_WITH_SETTER__QUEUES] Недоделанные наброски
        // this._setPromise = null;

        // // todo: Если будет реализован EventSignal._setComponentOnDestroy, то это нужно убрать
        // if (Object.hasOwn(this, 'type')) {
        //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        //     // @ts-ignore ignore `TS2704: The operand of a 'delete' operator cannot be a read-only property.`
        //     delete this.type;
        // }

        if (_abortSignal) {
            _abortSignal.removeEventListener('abort', this[Symbol.dispose]);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this._abortSignal = void 0;
        }

        // todo: Рассмотреть возможность вызывать Promise.resolve() с finaleValue если this.isDestroyed
        this._rejectPromiseIfDestroyed();

        if (this._cDeferredList) {
            this._cDeferredList.length = 0;
            this._cDeferredList = void 0;
        }

        if (_resolve) {
            this._resolve = void 0;
        }
        if (_reject) {
            this._reject = void 0;
        }
        if (_promise) {
            this._promise = void 0;
        }

        if (_sourceCleanup) {
            _sourceCleanup();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this._sourceCleanup = void 0;
        }
        if (_triggerCleanUp) {
            _triggerCleanUp();
            this._triggerCleanUp = void 0;
        }
        if (_throttleCleanUp) {
            _throttleCleanUp();
            this._throttleCleanUp = void 0;
        }

        /**
         * Удаляем подписки ДРУГИХ сигналов на этот EventSignal.
         */
        signalEventsEmitter.removeAllListeners(_signalSymbol);
        /**
         * Удаляем подписки которые были повешены в функции [on]{@link on}.
         */
        subscribersEventsEmitter.removeAllListeners(_signalSymbol);

        _onDestroy?.();
    }

    [Symbol.dispose] = () => {
        this.destructor();
    };

    getDispose = () => {
        return this[Symbol.dispose];
    };

    get destroyed() {
        return (this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0;
    }

    clearDeps() {
        const {
            _subscriptionsToDeps,
            _oneOfDepUpdated,
        } = this;

        if (_subscriptionsToDeps) {
            /**
             * Удаляем подписки на другие EventSignal.
             */
            for (const eventName of _subscriptionsToDeps) {
                signalEventsEmitter.removeListener(eventName, _oneOfDepUpdated);
            }

            _subscriptionsToDeps.clear();
        }
    }

    get eventName() {
        return this._signalSymbol;
    }

    private _subscribeToTrigger(
        trigger: EventSignal.TriggerDescription,
        listener: () => void,
        onEnd?: () => void,
    ) {
        // AbortSignal
        const { signal } = trigger;

        if (signal?.aborted) {
            return;
        }

        let triggerCleanUp: (() => void) | undefined;

        if (trigger.type === 'clock') {
            const signalSymbol = this._signalSymbol;
            const { ms, timerGroupId = '', once } = trigger;

            triggerCleanUp = _getAndSubTimerGroup(timerGroupId, listener, {
                signalSymbol,
                ms,
                isTimeout: once,
                signal,
                onEnd,
                __proto__: null,
            });
        }
        else if (trigger.type === 'emitter') {
            const {
                emitter,
            } = trigger;

            if (emitter) {
                const { event, filter, once } = trigger;

                triggerCleanUp = _eventTargetAddListeners(emitter, listener, {
                    eventName: event,
                    filter,
                    once,
                    // Usable only with `emitter is EventTarget`
                    passive: true,
                    signal,
                    onEnd,
                    __proto__: null,
                });
            }
        }
        else if ((trigger.type === void 0 || trigger.type === 'eventSignal') && isEventSignal(trigger.eventSignal)) {
            const signalSymbol = trigger.eventSignal._signalSymbol;

            if (signalSymbol && !signal?.aborted) {
                signalEventsEmitter.on(signalSymbol, listener);

                if (signal) {
                    triggerCleanUp = () => {
                        if (triggerCleanUp) {
                            signal.removeEventListener('abort', triggerCleanUp);
                            signalEventsEmitter.removeListener(signalSymbol, listener);
                            onEnd?.();
                            triggerCleanUp = void 0;
                        }
                    };

                    signal.addEventListener('abort', triggerCleanUp, { once: true });
                }
                else {
                    triggerCleanUp = () => {
                        if (triggerCleanUp) {
                            signalEventsEmitter.removeListener(signalSymbol, listener);
                            onEnd?.();
                            triggerCleanUp = void 0;
                        }
                    };
                }
            }
        }

        return triggerCleanUp;
    }

    private async _awaitForCurrentValue(
        currentValue = this._value,
        isPromise = !!currentValue && typeof currentValue === 'object' && typeof currentValue["then"] === 'function'
    ) {
        if (!isPromise) {
            return;
        }

        this._value = await currentValue;
    }

    private _setStatus(newStatus = 'default', needToEmitStateChanges?: boolean) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore `TS2540: Cannot assign to 'status' because it is a read-only property.`
        this.status = newStatus;

        if (needToEmitStateChanges !== false) {
            subscribersEventsEmitter.emit(this._signalSymbol, this._value);
        }
    }

    private _setErrorState(error: Error | string | unknown | null) {
        if (error == null) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore `TS2540: Cannot assign to 'lastError' because it is a read-only property.`
            this.lastError = void 0;

            // reset status to default
            this._setStatus();
        }
        else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore `TS2540: Cannot assign to 'lastError' because it is a read-only property.`
            this.lastError = error;

            this._setStatus('error');
        }
    }

    private _calculateValue(ignoreComputation?: boolean): Promise<T> | T | undefined {
        const {
            _sourceValue,
        } = this;

        this._stateFlags &= ~EventSignal.StateFlags.wasThrottleTrigger;

        if ((this._stateFlags & EventSignal.StateFlags.hasComputation) !== 0 && !ignoreComputation) {
            if (this.status || this.lastError) {
                // reset status (mostly 'error')
                this._setErrorState(null);
            }

            const prevValue = this._value;

            if (!!prevValue && typeof prevValue === 'object' && typeof prevValue["then"] === 'function') {
                this._setStatus('pending');

                // eslint-disable-next-line promise/prefer-await-to-then
                return this._awaitForCurrentValue(prevValue, true).then(() => {
                    this._setStatus();

                    return this._calculateValue(ignoreComputation);
                    // eslint-disable-next-line promise/prefer-await-to-callbacks
                }, error => {
                    this._setErrorState(error);

                    throw error;
                }) as Promise<T>;
            }

            if (currentSignal === this) {
                throw new EventSignalError(`Depends on own value`, {
                    eventSignal: this,
                });
            }

            if ((this._stateFlags & EventSignal.StateFlags.nowInCalculatingNewValue) !== 0
                && (this._stateFlags & EventSignal.StateFlags.nowInCalculatingNewValueAsync) === 0
            ) {
                // If now in SYNC computation/calculation phase
                throw new EventSignalError(`Now in computing state (cycle deps?)`, {
                    eventSignal: this,
                });
            }

            const _computation = this._computation as NonNullable<EventSignal<T, S, D, R>["_computation"]>;
            const prev_currentSignal = currentSignal;

            //todo: Сделать у EventSignal состояние со значениями PENDING и DONE, а также свойства-объекты типа
            // EventSignal, которые будут изменяться каждый раз при смене этих состояний.
            // А для AsyncEventSignal добавляться ещё свойства-объекты типа EventSignal для FAIL и FINALLY.
            // Это может быть сделано по подобию `createEffect` у effector.
            //
            // eslint-disable-next-line unicorn/no-this-assignment
            currentSignal = this;

            // this._nowInComputing = true;
            this._stateFlags |= EventSignal.StateFlags.nowInCalculatingNewValue;

            let nowInCalculatingNewValueAsync = false;

            try {
                this._computationsCount++;

                // Если в _computation нужны _updateFlags они должны быть прочитаны сразу, в синхронном коде.
                const newValue = _computation(prevValue as unknown as Awaited<T>, _sourceValue, this) as unknown as T;

                // this._updateFlags = 0;this._isNeedToCompute = false;
                this._stateFlags &= ~(EventSignal.StateFlags.isNeedToCalculateNewValue
                    | EventSignal.StateFlags.wasDepsUpdate
                    | EventSignal.StateFlags.wasSourceSetting
                    | EventSignal.StateFlags.wasSourceSettingFromEvent
                    | EventSignal.StateFlags.wasForceUpdateTrigger
                );

                // fixme: Async computation is experimental!
                //  И сейчас есть проблема со значением currentSignal, потому что если внутри _computation
                //  есть несколько EventSignal каждый из которых вызывается в асинхронно, то:
                //  1. В лучшем случае, мы не подпишемся ни на какие EventSignal
                //  2. В нормальном случае, подпишемся только на те, которые вызывались синхронно в первой части асинхронной функции
                //  3. В худшем случае, МЫ ПОДПИШЕМСЯ НА СЛУЧАЙНЫЙ EventSignal который в этот момент исполнялся
                if (!!newValue && typeof newValue === 'object' && typeof newValue["then"] === 'function') {
                    nowInCalculatingNewValueAsync = true;

                    this._stateFlags |= (EventSignal.StateFlags.nowInCalculatingNewValueAsync | EventSignal.StateFlags.wasLastAsyncComputation);
                    this._setStatus('pending');

                    const _cDeferredList = this._cDeferredList ??= [];
                    // todo: ЭТО ДРАФТ, он может быть ПЕРЕДЕЛАН
                    // eslint-disable-next-line prefer-destructuring
                    const pendingValue = (newValue as unknown as Promise<T> & { pendingValue: string })["pendingValue"];

                    if (pendingValue !== void 0) {
                        this._value = pendingValue as unknown as T;
                    }

                    const computationDeferred = Promise.withResolvers<T>();

                    // Async computation DRAFT support
                    // todo: Это очень простая реализация async computation. Тут не учитывается много моментов:
                    //  3. Как ПРАВИЛЬНО обрабатывать .catch?
                    //  4. Асинхронный .set() ?
                    //  5. ...
                    // eslint-disable-next-line promise/prefer-await-to-then
                    (newValue as unknown as { then(onFulfilled: (a: T) => void): Promise<unknown> }).then((newValue) => {
                        if (_cDeferredList.at(-1) !== computationDeferred) {
                            return;
                        }

                        this._stateFlags &= ~(EventSignal.StateFlags.nowInCalculatingNewValue | EventSignal.StateFlags.nowInCalculatingNewValueAsync);
                        // todo: Кажется, тут лишнее это. Ниже всё равно будет выставлен 'default' статус
                        this._setStatus('default');

                        let isNeedToUpdate = newValue !== void 0;

                        if (isNeedToUpdate) {
                            if (typeof newValue === 'object') {
                                if ((this._stateFlags & EventSignal.StateFlags.nextValueShouldBeForceSettled) !== 0) {
                                    this._stateFlags &= ~EventSignal.StateFlags.nextValueShouldBeForceSettled;
                                }
                                else if ((this._stateFlags & EventSignal.StateFlags.valuesAsObjectShouldBeForceSettled) !== 0) {
                                    // nothing to do
                                }
                                else {
                                    isNeedToUpdate = !_shallowEqualObjects(prevValue, newValue);
                                }
                            }
                            else {
                                isNeedToUpdate = !_is(prevValue, newValue);
                            }
                        }

                        if (isNeedToUpdate) {
                            this._version++;
                            this._value = newValue;
                            this._resolveIfNeeded(newValue);
                            this._setStatus(void 0, false);

                            // Если у нас есть несколько идущих одновременно async computation их Promise будут закрыты
                            //  со значением только от самого последнего async computation.
                            for (const { resolve } of _cDeferredList) {
                                resolve(newValue);
                            }

                            _cDeferredList.length = 0;

                            subscribersEventsEmitter.emit(this._signalSymbol, newValue);
                        }
                        else {
                            // todo: Проверить, зачем мы тут тригерим подписчиков subscribersEventsEmitter, если фактически
                            //  нового значения не было.
                            this._setStatus();

                            const prevValue = this._value;

                            // Если у нас есть несколько идущих одновременно async computation их Promise будут закрыты
                            //  со значением только от самого последнего async computation.
                            for (const { resolve } of _cDeferredList) {
                                resolve(prevValue);
                            }

                            _cDeferredList.length = 0;
                        }
                        // eslint-disable-next-line promise/prefer-await-to-then,promise/prefer-await-to-callbacks
                    }).catch(error => {
                        if (_cDeferredList.at(-1) !== computationDeferred) {
                            console.error('EventSignal: async computation: error:', error);

                            return;
                        }

                        this._stateFlags &= ~(EventSignal.StateFlags.nowInCalculatingNewValue | EventSignal.StateFlags.nowInCalculatingNewValueAsync);
                        this._setErrorState(error);

                        console.error('EventSignal: async computation: error:', error);

                        const prevValue = this._value;

                        // Если у нас есть несколько идущих одновременно async computation их Promise будут закрыты
                        //  со значением только от самого последнего async computation.
                        // В данном случае, при обработке ошибок, используем самое последнее успешное значение.
                        for (const { resolve } of _cDeferredList) {
                            resolve(prevValue);
                        }

                        _cDeferredList.length = 0;
                    });

                    _cDeferredList.push(computationDeferred);

                    return computationDeferred.promise;
                }

                let isNeedToUpdate = newValue !== void 0;

                if (isNeedToUpdate) {
                    if (typeof newValue === 'object') {
                        if ((this._stateFlags & EventSignal.StateFlags.nextValueShouldBeForceSettled) !== 0) {
                            this._stateFlags &= ~EventSignal.StateFlags.nextValueShouldBeForceSettled;
                        }
                        else if ((this._stateFlags & EventSignal.StateFlags.valuesAsObjectShouldBeForceSettled) !== 0) {
                            // nothing to do
                        }
                        else {
                            isNeedToUpdate = !_shallowEqualObjects(prevValue, newValue);
                        }
                    }
                    else {
                        isNeedToUpdate = !_is(prevValue, newValue);
                    }
                }

                if (isNeedToUpdate) {
                    this._version++;
                    this._value = newValue as NonNullable<typeof newValue>;
                    this._resolveIfNeeded(newValue as NonNullable<typeof newValue>);

                    subscribersEventsEmitter.emit(this._signalSymbol, newValue);
                }

                if ((this._stateFlags & EventSignal.StateFlags.wasLastAsyncComputation) !== 0) {
                    this._stateFlags &= ~EventSignal.StateFlags.wasLastAsyncComputation;

                    if (this._cDeferredList) {
                        const currentValue = this._value;

                        for (const { resolve } of this._cDeferredList) {
                            resolve(currentValue);
                        }
                    }
                }
            }
            catch (error) {
                if (error && error instanceof EventSignalError) {
                    throw error;
                }

                this._setErrorState(error);
            }
            finally {
                currentSignal = prev_currentSignal;

                if (!nowInCalculatingNewValueAsync) {
                    // this._nowInComputing = false;
                    this._stateFlags &= ~EventSignal.StateFlags.nowInCalculatingNewValue;
                }
            }
        }
        else {
            // this._isNeedToCompute = false;
            this._stateFlags &= ~(EventSignal.StateFlags.isNeedToCalculateNewValue | EventSignal.StateFlags.wasForceUpdateTrigger);

            // note: If prevValue is Promise here, we really dont care
            const prevValue = this._value;
            let newValue: T | undefined;

            if (_sourceValue !== void 0) {
                newValue = _sourceValue as unknown as T;
            }

            const not_nowInSettings = (this._stateFlags & EventSignal.StateFlags.nowInSettings) === 0;

            if (not_nowInSettings) {
                let isNeedToUpdate = newValue !== void 0;

                if (isNeedToUpdate) {
                    if (typeof newValue === 'object') {
                        if ((this._stateFlags & EventSignal.StateFlags.nextValueShouldBeForceSettled) !== 0) {
                            this._stateFlags &= ~EventSignal.StateFlags.nextValueShouldBeForceSettled;
                        }
                        else if ((this._stateFlags & EventSignal.StateFlags.valuesAsObjectShouldBeForceSettled) !== 0) {
                            // nothing to do
                        }
                        else {
                            isNeedToUpdate = !_shallowEqualObjects(prevValue, newValue);
                        }
                    }
                    else {
                        isNeedToUpdate = !_is(prevValue, newValue);
                    }
                }

                if (isNeedToUpdate) {
                    this._version++;
                    this._value = newValue as NonNullable<typeof newValue>;
                    // this._nowInSettings = true;
                    this._stateFlags |= EventSignal.StateFlags.nowInSettings;

                    try {
                        this._resolveIfNeeded(newValue as NonNullable<typeof newValue>);

                        subscribersEventsEmitter.emit(this._signalSymbol, newValue);
                    }
                    finally {
                        // this._nowInSettings = false; this._updateFlags = 0;
                        this._stateFlags &= ~(EventSignal.StateFlags.nowInSettings
                            | EventSignal.StateFlags.wasDepsUpdate
                            | EventSignal.StateFlags.wasSourceSetting
                            | EventSignal.StateFlags.wasSourceSettingFromEvent
                        );
                    }
                }
            }
        }
    }

    retry = () => {
        if (this.status === 'error') {
            // eslint-disable-next-line promise/prefer-await-to-then,promise/prefer-await-to-callbacks
            Promise.resolve(this._calculateValue()).catch(error => {
                this._setErrorState(error);
            });
        }
    };

    private _innerGet() {
        const stateFlags = this._stateFlags;

        if ((stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            return this._value;
        }

        // todo: [tag: SET_WITH_SETTER__QUEUES] Недоделанные наброски
        // // note: Тут нельзя откладывать выполнение если поднят флаг EventSignal.StateFlags.hasThrottle
        // if ((stateFlags & EventSignal.StateFlags.isNeedToCalculateNewValue) !== 0) {
        //     const maybePromise = this._calculateValue();
        //
        //     if (maybePromise) {
        //         return maybePromise;
        //     }
        // }

        return this._value;
    }

    /** A getter version of {@link getSync} */
    get value() {
        return this.getSync();
    }

    get = () => {
        const stateFlags = this._stateFlags;

        if ((stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            /*
            if (currentSignal && currentSignal !== this) {
                // todo: currentSignal._unsubscribeFrom(this._signalSymbol);
                void 0;
            }
            */

            return this._value as unknown as R;
        }

        if (currentSignal && currentSignal !== this) {
            currentSignal._subscribeTo(this._signalSymbol);
        }

        if ((stateFlags & EventSignal.StateFlags.isNeedToCalculateNewValue) !== 0
            && (
                (stateFlags & EventSignal.StateFlags.hasThrottle) === 0
                || (stateFlags & EventSignal.StateFlags.wasThrottleTrigger) !== 0
            )
        ) {
            const maybePromise = this._calculateValue();

            if (maybePromise) {
                // todo: Это только набросок поддержки async computation. Он не доделан.
                //  Поэтому, НЕЛЬЗЯ у get() делать в типизации в качестве возвращаемого значения Promise.
                //  Если и делать Promise у get() то только через generic или перегрузку.
                return maybePromise as unknown as R;
            }
        }

        if ((stateFlags & EventSignal.StateFlags.nowInCalculatingNewValueAsync) !== 0
            && this._cDeferredList
            && this._cDeferredList.length > 0
        ) {
            const lastDeferred = this._cDeferredList.at(-1);

            if (lastDeferred) {
                return lastDeferred.promise as unknown as R;
            }
        }

        if ((stateFlags & EventSignal.StateFlags.wasLastAsyncComputation) !== 0) {
            return Promise.resolve(this._value) as unknown as R;
        }

        return this._value as unknown as R;
    };

    getSafe = () => {
        try {
            const newValue = this.get();

            if (!!newValue && typeof newValue === 'object' && typeof newValue["then"] === 'function') {
                // eslint-disable-next-line promise/prefer-await-to-then
                const newPromise = (newValue as unknown as Promise<T>).then(value => value, () => {
                    // ignore error, return last value
                    // Ошибка игнорируется. Внутри get() она будет записана в this.lastError и должен быть выставлен status.
                    return this._value;
                });

                if (newValue["pendingValue"] !== void 0) {
                    newPromise["pendingValue"] = newValue["pendingValue"];
                }

                return newPromise;
            }
        }
        catch {
            // Ошибка игнорируется. Внутри get() она будет записана в this.lastError и должен быть выставлен status.
            return this._value;
        }
    };

    getSyncSafe = () => {
        try {
            const newValue = this.get();

            if (!!newValue && typeof newValue === 'object' && typeof newValue["then"] === 'function') {
                // Возвращаем последнее значение. После резолва промиса, произойдёт обновление сигнала и пере-получение значения.
                // В this._value также может быть значение "pendingValue".
                return this._value as Awaited<T>;
            }

            return newValue as Awaited<T>;
        }
        catch {
            // Ошибка игнорируется. Внутри get() она будет записана в this.lastError и должен быть выставлен status.
            return this._value as Awaited<T>;
        }
    };

    getLast = (): Awaited<T> => {
        return this._value as Awaited<T>;
    };

    getSync = (): Awaited<T> => {
        const newValue = this.get();

        if (!!newValue && typeof newValue === 'object' && typeof newValue["then"] === 'function') {
            return this._value as Awaited<T>;
        }

        return newValue as Awaited<T>;
    };

    getSourceValue = () => {
        return this._sourceValue;
    };

    getStateFlags() {
        return this._stateFlags;
    }

    markNextValueAsForced() {
        this._stateFlags |= EventSignal.StateFlags.nextValueShouldBeForceSettled;
    }

    // todo: Добавить второй параметр `updateReason?: number | string | symbol` для
    //  1. Истории изменений (в том числе для дебага)
    //  2. Для возможности игнорировать установки нового значения с определёнными значениями reason (пока предполагается
    //     только для React-хуков EventSignal.use({ ignoreUpdateReason: 'reason-name' }) и EventSignal.useListener((v) => { log(v); }, { ignoreUpdateReason: 'reason-name' })
    /** setter */
    set(setter: (prev: Awaited<T>, sourceValue: S, data: D) => S): void;
    set(newSourceValue: S): void;
    set(newSourceValue: S | ((prev: Awaited<T>, sourceValue: S, data: D) => S)): void {
        if ((this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            return;
        }

        if (typeof newSourceValue === 'function') {
            // note: Вызывает тут _innerGet а не get, чтобы исключить ситуацию, когда при вызове .set сигнала B
            //  в функции-обработчике изменения (или в computation) сигнала А, получается, что сигнал A подписывается на сигнал B.
            //  todo: Тесты нужны
            const currentValue = this._innerGet();

            // todo: [tag: SET_WITH_SETTER__QUEUES] Недоделанные наброски
            // if (!!currentValue && typeof currentValue === 'object' && typeof currentValue["then"] === 'function') {
            //     // eslint-disable-next-line promise/prefer-await-to-then
            //     const setPromise = this._setPromise = (this._setPromise || Promise.resolve()).then(() => {
            //         // eslint-disable-next-line promise/prefer-await-to-then,promise/no-nesting
            //         return (currentValue as Promise<T>).then(() => {
            //             return this.set(newSourceValue as ((prev: Awaited<T>, sourceValue: S, data: D) => S));
            //         });
            //         // eslint-disable-next-line promise/prefer-await-to-then
            //     }).finally(() => {
            //         if (this._setPromise === setPromise) {
            //             this._setPromise = null;
            //         }
            //     });
            //
            //     // note: set может возвращать Promise только если сделать класс наследник AsyncEventSignal и создавать сигнал соответствующего класса из фабрики createSignal
            //     return;
            // }

            const { _sourceValue } = this;
            const currentSourceValue = (_sourceValue !== void 0 ? _sourceValue : currentValue) as S;
            const _newSourceValue = (newSourceValue as ((prev: T, sourceValue: S, data: D) => S))(currentValue as T, currentSourceValue, this.data);

            if (this._setSourceValue(_newSourceValue, true)) {
                //todo: _updateReason должен применяться к EventSignal.updateReason только после установки нового фактического значения EventSignal.value
                // this._updateReason = updateReason ?? 'set';
                // this._stateFlags |= EventSignal.StateFlags.wasSetSourceSetting;
                this._recalculateIfNeeded();
            }
        }
        // todo: Рассмотреть возможность возвращать true если что-то изменилось
        else if (this._setSourceValue(newSourceValue, true)) {
            //todo: _updateReason должен применяться к EventSignal.updateReason только после установки нового фактического значения EventSignal.value
            // this._updateReason = updateReason ?? 'set';
            // this._stateFlags |= EventSignal.StateFlags.wasSetSourceSetting;
            this._recalculateIfNeeded();
        }
    }

    // todo: mutate(mutation: (value) => boolean)) - Внутри коллбека mutation происходит мутация value, а возвращаемое значение говорит о том, изменилось ли значение или нет.
    mutate<PROPS=Partial<Awaited<S>>>(props: PROPS) {
        if (props == null || (this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            return false;
        }

        if (typeof props !== 'object') {
            if (this._setSourceValue(props as S, true)) {
                //todo: _updateReason должен применяться к EventSignal.updateReason только после установки нового фактического значения EventSignal.value
                // this._updateReason = updateReason ?? 'mutate';
                // this._stateFlags |= EventSignal.StateFlags.wasMutateSourceSetting;
                this._recalculateIfNeeded();

                return true;
            }

            return false;
        }

        let hasChanges = (this._stateFlags & EventSignal.StateFlags.nextValueShouldBeForceSettled) !== 0;
        const { _sourceValue } = this;
        const currentValue = _sourceValue !== void 0 ? _sourceValue : this._value;

        if (!currentValue) {
            if (this._setSourceValue(props as S, true)) {
                //todo: _updateReason должен применяться к EventSignal.updateReason только после установки нового фактического значения EventSignal.value
                // this._updateReason = updateReason ?? 'mutate';
                // this._stateFlags |= EventSignal.StateFlags.wasMutateSourceSetting;
                this._recalculateIfNeeded();

                return true;
            }

            return false;
        }

        for (const key of Object.keys(props)) {
            const propValue = props[key];

            hasChanges ||= (currentValue[key] !== propValue);
            currentValue[key] = propValue;
        }

        if (hasChanges) {
            this.markNextValueAsForced();
            // only for `signalEventsEmitter.emit(this._signalSymbol);`
            this._setSourceValue(currentValue as S, false);

            //todo: _updateReason должен применяться к EventSignal.updateReason только после установки нового фактического значения EventSignal.value
            // this._updateReason = updateReason ?? 'mutate';
            // this._stateFlags |= EventSignal.StateFlags.wasMutateSourceSetting;

            this._recalculateIfNeeded();
        }

        return hasChanges;
    }

    // todo: https://wicg.github.io/observable/#typedefdef-observerunion
    // todo: https://github.com/WICG/observable
    // todo: https://github.com/tc39/proposal-observable?tab=readme-ov-file#observable
    // todo: https://www.npmjs.com/package/symbol-observable
    // someObject[Symbol_observable] = () => {
    //   return {
    //     subscribe(observer) {
    //       const handler = e => observer.next(e);
    //       someObject.addEventListener('data', handler);
    //       return {
    //         unsubscribe() {
    //           someObject.removeEventListener('data', handler);
    //         }
    //       }
    //     },
    //     [Symbol_observable]() { return this }
    //   }
    // }

    // todo: Подсчитывать количество установок _sourceValue? Отдельно для одинаковых/undefined?
    private _setSourceValue(
        newSourceValue: S | undefined,
        checkValueIsSame = false,
        ignoreUndefinedNewSourceValue = false,
    ) {
        const _sourceValue = this._sourceValue ?? this._value;
        let isNeedToUpdate = newSourceValue !== void 0 || ignoreUndefinedNewSourceValue;

        if (isNeedToUpdate) {
            if (!checkValueIsSame || this.status === 'error') {
                // nothing to do
            }
            else if (typeof _sourceValue === 'object') {
                if ((this._stateFlags & EventSignal.StateFlags.nextValueShouldBeForceSettled) !== 0) {
                    if ((this._stateFlags & EventSignal.StateFlags.hasComputation) !== 0) {
                        // Если есть сomputation, то в нём будет вычисленно новое значение isNeedToUpdate
                        this._stateFlags &= ~EventSignal.StateFlags.nextValueShouldBeForceSettled;
                    }
                    else {
                        /** Do not unset for {@link this._calculateValue} */
                    }
                }
                else if ((this._stateFlags & EventSignal.StateFlags.valuesAsObjectShouldBeForceSettled) !== 0) {
                    // nothing to do
                }
                else {
                    isNeedToUpdate = !_shallowEqualObjects(_sourceValue, newSourceValue);
                }
            }
            else {
                isNeedToUpdate = !_is(_sourceValue, newSourceValue);
            }
        }

        if (isNeedToUpdate) {
            this._stateFlags |= EventSignal.StateFlags.wasSourceSetting;
            this._sourceValue = newSourceValue;

            const stateFlags = this._stateFlags;

            if ((stateFlags & EventSignal.StateFlags.nowInCalculatingNewValue) === 0
                || (stateFlags & EventSignal.StateFlags.nowInCalculatingNewValueAsync) !== 0
            ) {
                // this._isNeedToCompute = true;
                this._stateFlags |= EventSignal.StateFlags.isNeedToCalculateNewValue;

                if ((stateFlags & EventSignal.StateFlags.hasThrottle) !== 0
                    && (stateFlags & EventSignal.StateFlags.wasThrottleTrigger) === 0
                ) {
                    return false;
                }

                signalEventsEmitter.emit(this._signalSymbol);

                return true;
            }
        }

        return false;
    }

    toString() {
        const signalValue = this.getSync();

        if (typeof signalValue === 'object' && signalValue) {
            if (Array.isArray(signalValue)) {
                return `[${arrayContentStringify(signalValue).join(',')}]`;
            }

            return stringifyWithCircularHandle(signalValue);
        }

        return String(signalValue);
    }

    valueOf() {
        return this.get();
    }

    private _recalculateIfNeeded() {
        if (this._checkPendingState() && (this._stateFlags & EventSignal.StateFlags.isNeedToCalculateNewValue) !== 0) {
            if (!this._recalcPromise) {
                // call recalculation in microtask
                this._recalcPromise = Promise.resolve()
                    // eslint-disable-next-line promise/prefer-await-to-then
                    .then(async () => {
                        this._recalcPromise = null;

                        if ((this._stateFlags & EventSignal.StateFlags.isNeedToCalculateNewValue) !== 0) {
                            // call new recalculation value:
                            //  1. resolving pending promises
                            //  2. trigger new changes event to subscribers
                            await this._calculateValue(void 0);
                        }
                        // eslint-disable-next-line promise/prefer-await-to-then,promise/prefer-await-to-callbacks
                    }).catch(error => {
                        // todo: Не выводить ошибку в консоль, а кидать в signalEventsEmitter событие 'signalError' в
                        //  котором должен бы обработчик для этого события.
                        console.error('EventSignal: #get: error:', error);
                    })
                ;
            }
        }
        // todo: Не уверен, что это нужно. Потому что пересчитывание значения должно быть только в случае:
        //  1. Если мы запрашиваем новое значение (вызов `get()`)
        //  2. Если есть подписка в signalEventsEmitter на этот сигнал от другого сигнала (точно?, уточнить)
        //  3. Если есть listener повешенный с помощью addListener (подписка в subscribersEventsEmitter на этот сигнал)
        // else {
        //     const stateFlags = this._stateFlags;
        //
        //     if ((stateFlags & EventSignal.StateFlags.hasThrottle) !== 0
        //         && (stateFlags & EventSignal.StateFlags.wasThrottleTrigger) === 0
        //     ) {
        //         this._stateFlags &= ~EventSignal.StateFlags.wasThrottleTrigger;
        //
        //         const maybePromise = this._calculateValue();
        //
        //         // eslint-disable-next-line promise/prefer-await-to-then
        //         if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        //             // eslint-disable-next-line promise/prefer-await-to-then,promise/prefer-await-to-callbacks
        //             (maybePromise as Promise<unknown>).then(_noop, error => {
        //                 // todo: Не выводить ошибку в консоль, а кидать в signalEventsEmitter событие 'signalError' в
        //                 //  котором должен бы обработчик для этого события.
        //                 console.error('EventSignal: debounce _calculateValue: error:', error);
        //             });
        //         }
        //     }
        // }
    }

    private _checkPendingState() {
        const stateFlags = this._stateFlags;

        return !(!this._resolve && !subscribersEventsEmitter.hasListener(this._signalSymbol))
            // todo: Точно на этом этапе нужно тормозить при throttle? Или в этот момент уже поздно тормозить? И не сломает ли это логику в каком-то из кейсов?
            && (
                (stateFlags & EventSignal.StateFlags.hasThrottle) === 0
                || (stateFlags & EventSignal.StateFlags.wasThrottleTrigger) !== 0
            )
        ;
    }

    private _resolveIfNeeded(newValue: T) {
        if (this._resolve) {
            this._resolve(newValue);

            this._resolve = void 0;
            this._reject = void 0;
            this._promise = void 0;
        }
    }

    private _rejectPromiseIfDestroyed() {
        if ((this._stateFlags & EventSignal.StateFlags.isDestroyed) === 0) {
            return;
        }

        // todo:
        //  1. Сделать отдельный режим (по-умолчанию) в котором промис будет резолвиться с последним значением
        //  2. Нужно определять, что текущий promise - это ожидание асинхронного итератора и его резолвить с { done: true, value: void 0 }
        /*
        if (this._resolve) {
            this._resolve(this._value);

            this._resolve = void 0;
            this._reject = void 0;
            this._promise = void 0;
        }
        */
        const { description } = this._signalSymbol;
        const lazyError = {
            _error: null as Error | null,
            get error() {
                if (this._error) {
                    return this._error;
                }

                return this._error = new Error(`EventSignal object is destroyed${description ? ` (${description})` : ''}`);
            },
        };

        if (this._reject) {
            this._reject(lazyError.error);

            this._resolve = void 0;
            this._reject = void 0;
            this._promise = void 0;
        }

        if (this._cDeferredList && this._cDeferredList.length > 0) {
            const { error } = lazyError;

            for (const { reject } of this._cDeferredList) {
                reject(error);
            }
        }
    }

    toPromise(): Promise<T>;
    toPromise(onFulfilled?: (result: T) => void, onRejected?: (error: unknown) => void): Promise<T> | Promise<void>;
    toPromise(onFulfilled?: (result: T) => void, onRejected?: (error: unknown) => void) {
        let currentPromise: typeof this._promise;

        if (this._promise) {
            currentPromise = this._promise;
        }
        else {
            // todo: Перейти на this._cDeferredList ?
            const { resolve, reject, promise } = Promise.withResolvers<T>();

            this._resolve = resolve;
            this._reject = reject;
            this._promise = promise;

            currentPromise = promise;
        }

        // todo: Рассмотреть возможность вызывать Promise.resolve() с finaleValue если this.isDestroyed
        this._rejectPromiseIfDestroyed();

        if (!onFulfilled && !onRejected) {
            return currentPromise;
        }

        // eslint-disable-next-line promise/prefer-await-to-then
        return currentPromise.then(onFulfilled, onRejected);
    }

    /*
    // note: Не уверен, что это хорошая практика - реализовывать метод `.then()`: из-за этого, например ESLint глючит и
    //  он выводит сообщение `ESLint: Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.(@typescript-eslint/no-floating-promises)`
    //  на вполне безобидный код, который возвращает `this: EventSignal`:
    //  Object.defineProperty(signal, 'type', { configurable: true, value: EventSignalDestroyedComponent });
    // eslint-disable-next-line unicorn/no-thenable
    then(onFulfilled?: (result: T) => void, onRejected?: (error: unknown) => void) {
        return this.toPromise(onFulfilled, onRejected);
    }
    */

    async *[Symbol.asyncIterator]() {
        while (!this.destroyed) {
            // note: Я не уверен, что тут await - это правильно.
            //  - Возможно, он тут портит логику ожидания?
            //  - Однако без этого await, успеват вызваться очередной `then`, создаться `promise` до вызова `destructor`.
            //    А когда `destructor` будет вызван, этот промис зареджектиться с ошибкой.
            //  - А если передевать в `then` `onRejected` и игнорировать ошибку в нём, то асинхронный итератор
            //    возвращает последнее значение в виде undefined.
            const isDone = Symbol();
            const promise = this.toPromise(value => {
                return value;
            }, function() {
                // todo: Тут не совсем корректно подавлять ВСЕ ошибки. Нужно только ту ошибку, которая относиться к закрытию EventSignal
                return isDone;
            });

            const result = await promise;

            if (result === isDone) {
                return;
            }

            yield result;
        }
    }

    private _subscribeTo(signalSymbol: symbol) {
        const _subscriptionsToDeps = this._subscriptionsToDeps ??= new Set();
        const hasSubscription = _subscriptionsToDeps.has(signalSymbol);

        if ((this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            if (hasSubscription) {
                signalEventsEmitter.removeListener(signalSymbol, this._oneOfDepUpdated);
                _subscriptionsToDeps.delete(signalSymbol);
            }

            return;
        }

        if (!hasSubscription) {
            _subscriptionsToDeps.add(signalSymbol);

            // todo:
            //  1. В конструкторе EventSignal может приходить кастомный EventsEmitter.
            //  2. Когда в EventEmitterX будет реализован третий параметр, передевать:
            //    2.1. cleanupCallback(onTeardown) - коллбек, который должен вызываться, когда этот listener удаляется
            //    2.2. weakSpyOnTarget - объект, который нужно добавить в WeakMap и при удалении которого GC мы должны удалить listener (это будет проверять setInterval каждые 2-5 минут).
            signalEventsEmitter.addListener(signalSymbol, this._oneOfDepUpdated);
        }
    }

    //todo: Рассмотреть возможность подписываться на некоторые события внутри EventSignal.
    // Например на:
    // - 'error' - когда функция computation вызывает ошибку
    // - 'progress' - это будущее гипотетическое событие, которое может быть для AsyncComputedEventSignal срабатывающая
    //    каждый раз, когда для зависимости (AsyncEventSignal или EventSignal) выполднен `get` (который может быть асинхронным).
    // - произвольное событие, которое может быть порождено методом `createEvent(eventName: string, computation): (input: INPUT) => void`.
    protected _addListener(
        listener: ((newValue: T) => void) | undefined,
        _ignore?: undefined,
        subscriptionFlags?: number,
    ): EventSignal.Subscription;
    protected _addListener(
        ignoredEventName: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void) | undefined,
        listener: ((newValue: T) => void) | undefined,
        subscriptionFlags?: number,
    ): EventSignal.Subscription | EventSignal<T, S, D, R>;
    protected _addListener(
        ignoredEventName: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void) | undefined,
        listener: ((newValue: T) => void) | undefined,
        subscriptionFlags = 0,
    ): EventSignal.Subscription | EventSignal<T, S, D, R> {
        let shouldReturnThis = false;

        if (typeof ignoredEventName === 'function') {
            listener = ignoredEventName;
            ignoredEventName = void 0;
        }
        else {
            shouldReturnThis = true;
        }

        if ((this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            if (shouldReturnThis) {
                return this;
            }

            return _emptySubscription;
        }

        /**
         * note: If this is `true`, {@link shouldReturnThis} should be `false` and it's not checked for simplicity.
         */
        const makeItEasyAndFastAndUseSubscription = (subscriptionFlags & 1 << 3) !== 0;

        if (!makeItEasyAndFastAndUseSubscription) {
            _checkListener<(newValue: T) => void>(listener);
            _checkEventSignalEventName(ignoredEventName);

            if (ignoredEventName === 'error') {
                // ignore "error" subscription
                // note: in this case `shouldReturnThis` should always be `true`.
                return this;
            }
        }
        else if (!listener) {
            // note: in this case `shouldReturnThis` should always be `false`.
            return _emptySubscription;
        }

        const eventName = this._signalSymbol;

        if ((subscriptionFlags & 1 << 1) !== 0) { // isUseOnce
            if ((subscriptionFlags & 1 << 2) !== 0) { // isUsePrepend
                subscribersEventsEmitter.prependOnceListener(eventName, listener);
            }
            else {
                subscribersEventsEmitter.once(eventName, listener);
            }
        }
        else {
            if ((subscriptionFlags & 1 << 2) !== 0) { // isUsePrepend
                subscribersEventsEmitter.prependListener(eventName, listener);
            }
            else {
                subscribersEventsEmitter.on(eventName, listener);
            }
        }

        if (shouldReturnThis) {
            return this;
        }

        let closed = false;
        let suspended = false;
        const unsubscribe = () => {
            closed = true;

            this._removeListener(ignoredEventName, listener, true);
        };

        return {
            // Cancels the subscription
            unsubscribe,
            suspend: () => {
                if (suspended) {
                    return false;
                }

                this._removeListener(ignoredEventName, listener, true);

                suspended = true;

                return true;
            },
            resume() {
                // listener SHOULD be defined. This check is only for TypeScript.
                if (listener && suspended) {
                    // Copy & Paste this code block from above for performance reason
                    if ((subscriptionFlags & 1 << 1) !== 0) { // isUseOnce
                        if ((subscriptionFlags & 1 << 2) !== 0) { // isUsePrepend
                            subscribersEventsEmitter.prependOnceListener(eventName, listener);
                        }
                        else {
                            subscribersEventsEmitter.once(eventName, listener);
                        }
                    }
                    else {
                        if ((subscriptionFlags & 1 << 2) !== 0) { // isUsePrepend
                            subscribersEventsEmitter.prependListener(eventName, listener);
                        }
                        else {
                            subscribersEventsEmitter.on(eventName, listener);
                        }
                    }

                    suspended = false;

                    return true;
                }

                return false;
            },
            get suspended() {
                return suspended;
            },
            // A boolean value indicating whether the subscription is closed
            get closed() {
                return closed;
            },
            __proto__: null,
        };
    }

    protected _removeListener(
        ignoredEventName: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void) | undefined,
        listener: ((newValue: T) => void) | undefined,
        makeItEasyAndFastAndUseSubscription?: boolean,
    ): EventSignal<T, S, D, R> | undefined {
        let shouldReturnThis = false;

        if (!makeItEasyAndFastAndUseSubscription) {
            if (typeof ignoredEventName === 'function') {
                listener = ignoredEventName;
                ignoredEventName = void 0;
            }
            else {
                shouldReturnThis = true;
            }

            _checkListener<(newValue: T) => void>(listener);
            _checkEventSignalEventName(ignoredEventName);

            if (ignoredEventName === 'error') {
                // ignore "error" subscription
                // note: in this case `shouldReturnThis` should always be `true`.
                return this;
            }
        }

        subscribersEventsEmitter.removeListener(this._signalSymbol, listener as NonNullable<typeof listener>);

        if (shouldReturnThis) {
            return this;
        }

        return;
    }

    once(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D, R>;
    once(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    once(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._addListener(arg1, arg2, 1 << 1);
    }

    on(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D, R>;
    on(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    on(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._addListener(arg1, arg2);
    }

    addListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D, R>;
    addListener(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    addListener(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._addListener(arg1, arg2);
    }

    prependListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D, R>;
    prependListener(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    prependListener(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._addListener(arg1, arg2, 1 << 2);
    }

    prependOnceListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D, R>;
    prependOnceListener(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    prependOnceListener(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._addListener(arg1, arg2, (1 << 1) | (1 << 2));
    }

    off(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D, R>;
    off(callbackFn: (newValue: T) => void): void;
    off(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._removeListener(arg1, arg2);
    }

    removeListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D, R>;
    removeListener(callbackFn: (newValue: T) => void): void;
    removeListener(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._removeListener(arg1, arg2);
    }

    emit(ignoredEventName: EventSignal.IgnoredEventNameForListeners, ...argumentsToBeIgnored: unknown[]): boolean;
    emit(): boolean;
    emit(ignoredEventName?: EventSignal.IgnoredEventNameForListeners) {
        if ((this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            return false;
        }

        _checkEventSignalEventName(ignoredEventName);

        if (ignoredEventName === 'error') {
            // ignore "error" emitting
            return;
        }

        // call new recalculation value:
        //  1. resolving pending promises
        //  2. trigger new changes event to subscribers
        this.get();

        return true;
    }

    removeAllListeners(): this {// eslint-disable-line class-methods-use-this
        throw new Error('Not implemented');
    }

    setMaxListeners(_ignoredNewValue: number) {// eslint-disable-line class-methods-use-this
        // ignore
        return this;
    }

    getMaxListeners() {// eslint-disable-line class-methods-use-this
        return Number.POSITIVE_INFINITY;
    }

    listeners(type?: number | string | symbol): Function[] {// eslint-disable-line class-methods-use-this
        _checkEventSignalEventName(type);

        if (type === 'error') {
            // ignore "error" subscription
            throw new Error('Not implemented');
        }

        return signalEventsEmitter.listeners(this._signalSymbol);
    }

    rawListeners(_type: string): Function[] {// eslint-disable-line class-methods-use-this
        throw new Error('Not implemented');
    }

    listenerCount(_type: string): number {// eslint-disable-line class-methods-use-this
        throw new Error('Not implemented');
    }

    eventNames(): string[] {// eslint-disable-line class-methods-use-this
        throw new Error('Not implemented');
    }

    /**
     * * Get the current value.
     * * Subscribe on this Signal changes. Will trigger React re-render on new value.
     *
     * Use it in React as implementation of `useSignal` custom hook.
     */
    use(): Awaited<T>;
    /**
     * todo: options.ignoreUpdateReason
     *
     * * Get the current value and modified it with {@link reducer}.
     * * Subscribe on this Signal changes. Will trigger React re-render only if {@link reducer} returns new value.
     *
     * Use it in React as implementation of `useSignal` custom hook.
     */
    use<REDUCE_VALUE>(reducer: (value: Awaited<T>) => REDUCE_VALUE, areReducedValueEqual?: (prevValue: REDUCE_VALUE, newValue: REDUCE_VALUE) => boolean): REDUCE_VALUE;
    /**
     * todo: options.ignoreUpdateReason
     */
    use<REDUCE_VALUE>(reducer?: (value: Awaited<T>) => REDUCE_VALUE, areReducedValueEqual?: (prevValue: REDUCE_VALUE, newValue: REDUCE_VALUE) => boolean): Awaited<T> | REDUCE_VALUE {
        const { _useSyncExternalStore } = this;

        if (_useSyncExternalStore) {
            if (isReactDev) {
                this._useDebugValue?.({
                    id: this.id,
                    description: this._signalSymbol.description,
                    value: this._value,
                    source: '#use()',
                });
            }

            // todo: Если текущий сигнал это computableSignal, и него есть настройка throttle/debounce,
            //  то нужно заводить useEffect который отменит получение значения (т.е. отменит действие throttle/debounce).
            //  Т.е., если компонент в котором использовался хук EventSignal.use уже unmount, то и вычислять новое значение не нужно.
            //  Но НЕЛЬЗЯ это делать опционально - потому что для одного и того же компонента, могут использоваться разные
            //  сигналы - c throttle и без, соответственно есть вероятность conditional hook.
            /**
             * Trigger value calculation (if needed).
             * If computation is async it will trigger next render (via {@link this.subscribeOnNextAnimationFrame}).
             */
            this.getSyncSafe();

            if (reducer) {
                if (areReducedValueEqual) {
                    const { 0: reducedValue, 1: setReducedValue } = this._useState(() => reducer(this.getLast()));
                    const scopeRef = this._useRef({ reducer, areReducedValueEqual, reducedValue });

                    scopeRef.current.reducer = reducer;
                    scopeRef.current.areReducedValueEqual = areReducedValueEqual;

                    this._useEffect(() => {
                        return this.subscribeOnNextAnimationFrame(() => {
                            const newValue = scopeRef.current.reducer(this.getLast());

                            if (!scopeRef.current.areReducedValueEqual(scopeRef.current.reducedValue, newValue)) {
                                scopeRef.current.reducedValue = newValue;
                                setReducedValue(newValue);
                            }
                        });
                    }, [ this ]);

                    return reducedValue;
                }

                let reducerResultCache: unknown;

                // todo: Нужно добавить в EventSignal.use возможность передать список зависимостей deps
                // note: Если не передавать список зависимостей (deps) то "reducer" будет вызываться каждый раз 2 раза:
                //  1. На срабатывании onStoreChanges
                //  2. На срабатывании хука useSyncExternalStore
                //  3. Будет ещё 3й и даже 4й раз, если не кешировать значение (reducerResultCache)
                // note: Если список зависимостей отсутствует и в дефолтный не добавить сам "reducer", то значение будет
                //  считаться с неактуальным окружением (scope) функции "reducer", что со 100% гарантией приведёт к плавающим багам.
                const getSnapshot = this._useCallback(() => {
                    if (!reducerResultCache) {
                        queueMicrotask(() => {
                            reducerResultCache = undefined;
                        });
                    }

                    // Mutable value (same object ref as prev value) returned by reducer is not supported (for now?).
                    return reducerResultCache ??= reducer(this.getLast());
                }, [ this, reducer ]);

                return _useSyncExternalStore(this.subscribeOnNextAnimationFrame, getSnapshot);
                // return _useSyncExternalStore(this.subscribeOnNextAnimationFrame, () => {
                //     if (!reducerResultCache) {
                //         queueMicrotask(() => {
                //             reducerResultCache = undefined;
                //         });
                //     }
                //
                //     // Mutable value (same object ref as prev value) returned by reducer is not supported (for now?).
                //     return reducerResultCache ??= reducer(this.getLast());
                // });
            }

            // Mutable value (same object ref as prev value) is supported by version increment and `return this.getLast()`.
            _useSyncExternalStore(this.subscribeOnNextAnimationFrame, this.getVersion);
        }
        else {
            console.warn('warning: "useSyncExternalStore" for EventSignal is not set. Please use `if (!EventSignal.reactIsInited) EventSignal.initReact(React)`.');

            if (reducer) {
                // Mutable value (same object ref as prev value) returned by reducer is not supported (for now?).
                return reducer(this.getLast());
            }
        }

        return this.getLast();
    }

    /**
     * * Get the current value.
     * * Call {@link listener} once inside `useLayoutEffect`.
     * * Subscribe {@link listener} on this Signal changes. Will not trigger React re-render.
     *
     * Use it in React as implementation of `useSignalListener` custom hook.
     *
     * todo:
     *  1. Add options.suspend - do not call listener in useLayoutEffect and do not subscribe to changes
     *  2. Add options.noSub - do not subscribe to changes
     *  3. Add options.ignoreUpdateReason
     */
    useListener(listener: (newValue: T) => void, deps?: any[]/*, { suspend, noSub }: { suspend?: boolean, noSub?: boolean }*/) {
        if (!(typeof (listener as unknown) === 'function') || (this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            return this.getLast();
        }

        const { _useLayoutEffect } = this;

        if (_useLayoutEffect) {
            const actualDeps = Array.isArray(deps) ? [ ...deps, this ] : [ this ];

            _useLayoutEffect(() => {
                // if (suspend) return noop;
                // if (ignoreUpdateReason === this.lastUpdateReason) return noop;

                listener(this.getLast());

                // if (noSub) return noop;

                // Calling `_addListener` with `makeItEasyAndFastAndUseSubscription` flag.
                return this._addListener(listener, void 0, 1 << 3).unsubscribe;
            }, actualDeps);
        }
        else {
            console.warn('warning: "useEffect" for EventSignal is not set. Please use `if (!EventSignal.reactIsInited) EventSignal.initReact(React)`.');
        }

        return this.getLast();
    }

    /**
     * todo: add overload: subscribe = (subscriptionObserver: {
     *   next: (value: T) => void,
     *   error: (error: any) => void,
     *   complete: () => void,
     *  }, subscribeOptions?: { signal: AbortSignal }) => {}
     * Alternative for {@link addListener}
     * @returns - unsubscribe callback.
     * @example React useSignal hook
     * export function useSignal<T>(signal: EventSignal<T>): T {
     *   return useSyncExternalStore(signal.subscribe, signal.get);
     * }
     */
    subscribe = (func: () => void, /*subscribeOptions?: { signal: AbortSignal })*/) => {
        if (!(typeof (func as unknown) === 'function')) {
            return _noop;
        }

        // Calling `_addListener` with `makeItEasyAndFastAndUseSubscription` flag.
        return this._addListener(func, void 0, 1 << 3).unsubscribe;
    };

    // noinspection JSUnusedGlobalSymbols
    subscribeOnNextAnimationFrame = this._subscribeOnNextAnimationFrame.bind(this, false);
    subscribeOnNextRender = this._subscribeOnNextAnimationFrame.bind(this, true);

    private _subscribeOnNextAnimationFrame(subscribeToComponentTypeUpdate: boolean, func: () => void/*, subscribeOptions?: {
        signal?: AbortSignal,
        reducer?: (value: Awaited<T>, prevValue: any) => any,
    }*/) {
        if (typeof requestAnimationFrame !== 'function') {
            throw new TypeError('"requestAnimationFrame" is not supported in this JS Agent.');
        }

        if (!(typeof (func as unknown) === 'function') || (this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            return _noop;
        }

        /*
        const reducer = subscribeOptions?.reducer;
        */
        const _listenerWithAnimFrameDebounce = _awaitNextAnimationFrame.bind(null, func);
        // Calling `_addListener` with `makeItEasyAndFastAndUseSubscription` flag.
        const { unsubscribe } = this._addListener(_listenerWithAnimFrameDebounce, void 0, 1 << 3);
        let _listenerComponentTypeUpdate: ((status?: string) => void) | undefined;

        if (subscribeToComponentTypeUpdate) {
            _listenerComponentTypeUpdate = (status?: string) => {
                this._cv++;

                if (status == null ? (this.status == null || this.status === 'default') : this.status === status) {
                    // Do not emit callback if instance in a status different from the one for which the change was received
                    _listenerWithAnimFrameDebounce();
                }
            };

            if (this.componentType) {
                _componentsEmitter.on(this.componentType as string, _listenerComponentTypeUpdate);
            }
        }

        return () => {
            if (_listenerComponentTypeUpdate && this.componentType) {
                _componentsEmitter.removeListener(this.componentType as string, _listenerComponentTypeUpdate);
                _listenerComponentTypeUpdate = void 0;
            }

            _unAwaitNextAnimationFrame(func);
            unsubscribe();
        };
    }

    get version() {
        return this._version;
    }

    getVersion = () => {
        return this._version;
    };

    getSnapshotVersion = (): string => {
        let componentSnapshotVersion = `${this._version}`;

        const { status, _cv } = this;

        if (status) {
            // note: this._computationsCount here is for async computations
            componentSnapshotVersion += `-${this._computationsCount}-${status}`;
        }

        if (_cv) {
            componentSnapshotVersion += `=${_cv}`;
        }

        return componentSnapshotVersion;
    };

    get computationsCount() {
        return this._computationsCount;
    }

    // /**
    //  * Use it for logging, counting etc.
    //  *
    //  * * This is globally unique key.
    //  */
    // get uniqueKey() {
    //     return this._uniqueSymbol;
    // }

    // note: Другое возможное название: createAction
    createMethod<INPUT=void>(computation: (currentValue: T, input: INPUT extends void ? undefined : INPUT, currentSourceValue: S, eventSignal: EventSignal<T, S, D, R>) => S) {
        return (input: INPUT) => {
            const currentValue = this._value;
            const { _sourceValue } = this;
            const currentSourceValue = _sourceValue !== void 0 ? _sourceValue : (currentValue as unknown as S);
            const newSourceValue = computation(currentValue, input as (INPUT extends void ? undefined : INPUT), currentSourceValue, this);

            if (newSourceValue !== void 0) {
                this.set(newSourceValue);
            }
        };
    }

    // todo: В новом EventSignal сохранять data, methods (._.), react-компоненты и т.д. из исходного EventSignal
    // todo: Неправильно, что у constructor~computation, createMethod~computation и map~computation разные сигнатуры
    // todo: Нужно доработать map и возвращать новый EventSignal который обратно связан с текущим EventSignal.
    //  "обратно связан" - результат работы нового EventSignal будет устанавливаться в качестве значения в текущий EventSignal.
    map<CR>(computation: (currentSourceValue: T) => CR) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore `TS2769: No overload matches this call.
        //   Overload 1 of 5, '(initialValue: CR | Awaited<CR>, options: NewOptions<CR, S, undefined> | NewOptionsWithSource<CR, S, undefined>): EventSignal<...>', gave the following error.
        //     Argument of type '() => CR' is not assignable to parameter of type 'NewOptions<CR, S, undefined> | NewOptionsWithSource<CR, S, undefined>'.
        //     Overload 2 of 5, '(initialValue: CR | Awaited<CR>, computation: ComputationWithSource<CR, S, undefined>): EventSignal<CR, S, undefined>', gave the following error.
        //       Argument of type '() => CR' is not assignable to parameter of type 'ComputationWithSource<CR, S, undefined>'.
        // `
        return new EventSignal<CR, S>(void 0 as CR, () => {
            return computation(this.get() as unknown as T);
        });
    }

    setReactFC<FC extends EventSignal.NewOptions<T, S, D, R>["reactFC"] | false>(reactFC?: FC, preDefinedProps?: FC extends (...args: any) => any ? Partial<Parameters<FC>[0]> : never | undefined) {
        const prev = this._reactFC;

        this._reactFC = { 0: reactFC, 1: preDefinedProps, __proto__: null };

        return prev;
    }

    // noinspection JSUnusedGlobalSymbols
    component = Object.defineProperties(Object.assign((props: Record<string, any> & {
        children?: unknown,
        sFC?: EventSignal.ReactFC<T, S, D, R> | false,
        sDefaultFC?: EventSignal.ReactFC<T, S, D, R> | false,
        // sComponents?: Map<ComponentType, EventSignal.ReactFC<any, any, any, any>>)
        sIgnoreRecursive?: boolean,
    }, context?: Object) => {
        const { type } = this;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const _type: EventSignal<T, S, D, R>["type"] = 'type' in type ? type.type : type;

        return _type({
            __proto__: null,
            eventSignal: this,
            current$: this,
            ...props,
        }, context);
    }, {
        ViewContext: null as unknown as EventSignal_ReactCopy.Context<Record<number | string | symbol, (
            ((...props: any[]) => any)
            | [ <T extends unknown[]>(...props: T) => any, Partial<T> ]
        )>>["Provider"],
    }), {
        /**
         * A BETA version of EventSignal's ViewContext
         */
        ViewContext: {
            get() {
                const ViewContext = EventSignal._ContextProvider;

                if (ViewContext) {
                    Object.defineProperty(this, 'ViewContext', {
                        value: ViewContext,
                        enumerable: true,
                        configurable: true,
                        writable: false,
                    });
                }

                return ViewContext as EventSignal_ReactCopy.Context<Record<number | string | symbol, (...props: any[]) => any>>["Provider"];
            },
            configurable: true,
            enumerable: true,
        },
    });

    static createSignal<T>(initialValue: T): EventSignal<T, T>;
    static createSignal<T, S, D, R = T>(initialValue: T, computation: EventSignal.ComputationWithSource<T, S, D, T>, options?: EventSignal.NewOptions<T, S, D, R> | EventSignal.NewOptionsWithSource<T, S, D, R>): EventSignal<T, S, D, R>;
    static createSignal<T, S, D, R = T>(initialValue: T, options: EventSignal.NewOptionsWithSource<T, S, D, R>): EventSignal<T, S, D, R>;
    static createSignal<T, S, D, R>(initialValue: T, options: EventSignal.NewOptions<T, S, D, R>): EventSignal<T, T>;
    static createSignal<T, S, D, R = T>(
        initialValue: T,
        computationOrOptions?: EventSignal.ComputationWithSource<T, S, D, R> | EventSignal.NewOptions<T, S, D, R> | EventSignal.NewOptionsWithSource<T, S, D, R>,
        options?: EventSignal.NewOptions<T, S, D, R>,
    ): EventSignal<T, S, D, R> {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore
        return new EventSignal(initialValue, computationOrOptions, options);
    }
    // static createSignal<T>(computation: NonNullable<EventSignal.NewOptionsWithComputation<T>["computation"]>): EventSignal<T>;
    // static createSignal<T>(computation: NonNullable<EventSignal.NewOptionsWithComputation<T>["computation"]>, options: EventSignal.NewOptions<T>): EventSignal<T>;
    // static createSignal<T>(initialValue: T): EventSignal<T>;
    // static createSignal<T>(initialValue: T, options: EventSignal.NewOptionsWithComputation<T>): EventSignal<T>;
    // static createSignal<T>(initialValue: NonNullable<EventSignal.NewOptionsWithComputation<T>["computation"]> | T, options?: EventSignal.NewOptions<T>): EventSignal<T> {
    //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //     // @ts-expect-error
    //     return new EventSignal(initialValue, options);
    // }

    static get currentSignal() {
        return currentSignal;
    }

    declare private _useSyncExternalStore: UseSyncExternalStore | undefined;
    declare private _useRef: any | undefined;
    declare private _useState: any | undefined;
    declare private _useEffect: any | undefined;
    declare private _useLayoutEffect: any | undefined;
    declare private _useCallback: any | undefined;
    declare private _useDebugValue: ((value: any) => void) | undefined;
    static reactIsInited = false;
    declare static initReact;
    /** For debug only */
    declare static _React: unknown;
    /**
     * A BETA version of EventSignal's ViewContext
     */
    declare private static _ContextProvider: { (props: Object): null, children: any, value: any, readonly $$typeof: symbol } | undefined;
    //todo: Сейчас не работает
    // declare private static _setComponentOnDestroy;

    //todo:
    // export function reactUseSignal<T>(value: T) {
    // 	return useMemo(() => new EventSignal<T>(value), []);
    // }

    static {
        const _EventSignal_prototype = this.prototype;

        // make `EventSignal extends null`
        Object.setPrototypeOf(_EventSignal_prototype, null);

        // var REACT_PROVIDER_TYPE = Symbol.for("react.provider");

        type _ReactFiber = {
            return: _ReactFiber | null,
            type: () => any,
            pendingProps?: {
                eventSignal?: EventSignal<any>,
            },
        };

        let _React: {
            __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
                A: {
                    getOwner(): _ReactFiber,
                },
            },
        } | undefined;
        let _ErrorBoundary: ((
            type: Function | string | symbol,
            props?: Object | null,
            ...children: (Object | null)[]
        ) => Object) | undefined;
        let _ReactFragment: symbol;
        // let _ReactProfiler: symbol;
        let _React_createElement: ((
            type: Function | string | symbol,
            props?: Object | null,
            ...children: (Object | null)[]
        ) => Object) | undefined;
        let _React_memo: ((
            type: Function | string | symbol,
            compare?: Function,
        ) => Object) | undefined;
        let _useSyncExternalStore: UseSyncExternalStore | undefined;
        let _useDebugValue: ((value: any) => void) | undefined;
        let _EventSignalsContext: undefined | Object & { Provider: Object, _currentValue: Object | undefined };
        let _useContext: (key: Object) => (Object | null) = () => null;

        this.initReact = function(ReactParam: unknown, ErrorBoundary?: ((
            type: Function | string | symbol,
            props?: Object | null,
            ...children: (Object | null)[]
        ) => Object) | undefined) {
            if (!ReactParam) {
                this._React = void 0;
                _EventSignal_prototype._useSyncExternalStore = _useSyncExternalStore = void 0;
                _EventSignal_prototype._useRef = void 0;
                _EventSignal_prototype._useState = void 0;
                _EventSignal_prototype._useEffect = void 0;
                _EventSignal_prototype._useLayoutEffect = void 0;
                _EventSignal_prototype._useCallback = void 0;
                _EventSignal_prototype._useDebugValue = void 0;
                Object.defineProperty(_EventSignal_prototype, 'type', { value: void 0, configurable: true, writable: true });

                _React_createElement = void 0;
                _React_memo = void 0;
                _useContext = () => null;
                _EventSignalsContext = void 0;
                this._ContextProvider = void 0;

                return;
            }

            const __React = ReactParam as {
                useRef: <T>(initValue?: T) => { current: T },
                useState: (init?: () => any) => [ value: any, setValue: (value: any) => void ],
                useEffect: (effect: () => any, deps?: any[]) => void,
                useLayoutEffect: (effect: () => any, deps?: any[]) => void,
                useCallback: (callback: () => any, deps?: any[]) => void,
                useSyncExternalStore: UseSyncExternalStore,
                useDebugValue: (value: any) => void,
                createContext: () => NonNullable<typeof _EventSignalsContext>,
                useContext: typeof _useContext,
                createElement?: typeof _React_createElement,
                memo?: typeof _React_createElement,
                version?: string,
            };
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            const isReactGte19 = Number.parseInt(__React.version || '') >= 19;

            if (isReactDev || isTest) {
                this._React = _React = __React as unknown as typeof _React;
            }

            reactInit: if ('useSyncExternalStore' in __React) {
                _EventSignal_prototype._useSyncExternalStore = _useSyncExternalStore = __React.useSyncExternalStore;
                _EventSignal_prototype._useRef = __React.useRef;
                _EventSignal_prototype._useState = __React.useState;
                _EventSignal_prototype._useEffect = __React.useEffect;
                _EventSignal_prototype._useLayoutEffect = __React.useLayoutEffect || __React.useEffect;
                _EventSignal_prototype._useCallback = __React.useCallback;

                if (isReactDev) {
                    _EventSignal_prototype._useDebugValue = _useDebugValue = __React.useDebugValue;
                }

                if (__React.createElement) {
                    _React_createElement = __React.createElement;
                }
                if (__React.memo) {
                    _React_memo = __React.memo;

                    // EventSignal.prototype.type = EventSignalComponent;
                    // this.prototype.type = EventSignalComponent;
                    Object.defineProperties(_EventSignal_prototype, {
                        type: {
                            configurable: true,
                            value: _React_memo(EventSignalComponent),
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                            // @ts-ignore allow `__proto__`
                            __proto__: null,
                        },
                    });
                }

                _useContext = __React.useContext;

                if (_EventSignalsContext) {
                    break reactInit;
                }

                if (__React.createContext) {
                    /**
                     * A BETA version of EventSignal's ViewContext
                     */
                    _EventSignalsContext = createEventSignalMagicContext(__React.createContext, 'EventSignalsContext');
                }

                if (isReactGte19) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                    // @ts-ignore
                    this._ContextProvider = _EventSignalsContext;
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                    // @ts-ignore
                    this._ContextProvider = _EventSignalsContext.Provider;
                }
            }

            _ErrorBoundary = ErrorBoundary;
            _ReactFragment = Symbol.for('react.fragment');
            // _ReactProfiler = Symbol.for("react.profiler");

            if (isReactGte19) {
                // EventSignal.prototype.$$typeof = Symbol();
                // this.prototype.$$typeof = Symbol();
                Object.defineProperties(_EventSignal_prototype, {
                    $$typeof: {
                        configurable: true,
                        value: Symbol.for("react.transitional.element"),
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                        // @ts-ignore allow `__proto__`
                        __proto__: null,
                    },
                });
            }

            //todo: Можно детектить StrictMode
            // Object.defineProperty(React, 'StrictMode', {
            //     get() {
            //         console.log('globalThis.__StrictMode', globalThis.__StrictMode);
            //         return globalThis.__StrictMode;
            //     },
            // });

            this.reactIsInited = true;
        };

        /*//todo: Сейчас не работает
        / **
         * A wrapper component that renders a EventSignal's value directly as a Text node or JSX.
         * /
        const EventSignalDestroyedComponent = function EventSignalDestroyedComponent({ current$ }: { current$: EventSignal<any> }) {
            const componentType = current$._componentType;
            const reactFC = current$._reactFC ?? (componentType !== void 0 ? _getReactFunctionComponent(componentType) : void 0);
            const has_reactFC = reactFC != null && (reactFC as unknown) !== false;

            if (has_reactFC) {
                return reactFC({ current$ });
            }
        };

        this._setComponentOnDestroy = function(eventSignal: EventSignal<any, any, any>) {
            void Object.defineProperty(eventSignal, 'type', {
                configurable: true,
                value: EventSignalDestroyedComponent,
            });
        };
        */
        const memorizedComponents = new WeakMap<EventSignal.ReactFC<any, any, any, any>, EventSignal.ReactFC<any, any, any, any>>();
        const memorizedComponents_onNew = function(key: EventSignal.ReactFC<any, any, any, any>) {
            return _React_memo
                ? _React_memo(key) as EventSignal.ReactFC<any, any, any, any>
                : key
            ;
        };

        /**
         * todo: Добавить обёртку ErrorBoundary
         *  * https://builtin.com/software-engineering-perspectives/react-error-boundary
         *  * https://blog.stackademic.com/mastering-advanced-error-handling-in-functional-react-components-94fe2a68e96c
         *  * https://gist.github.com/andywer/800f3f25ce3698e8f8b5f1e79fed5c9c
         *  * Also see https://github.com/bvaughn/react-error-boundary and https://dev.to/edemagbenyo/handle-errors-in-react-components-like-a-pro-l7l
         *
         * A wrapper component that renders a EventSignal's value directly as a Text node or JSX.
         */
        function EventSignalComponent({
            eventSignal,
            children,
            sFC,
            sDefaultFC,
            sIgnoreRecursive,
            ...otherProps
        }: {
            eventSignal: EventSignal<any>,
            children?: Object,
            sFC?: EventSignal.ReactFC<any, any, any, any> | false,
            sDefaultFC?: EventSignal.ReactFC<any, any, any, any> | false,
            sIgnoreRecursive?: boolean,
        }) {
            /**
             * A BETA version of EventSignal's ViewContext
             */
            const contextValue = _EventSignalsContext?._currentValue;
            // Вызовем get/getSyncSafe:
            //  1. Чтобы все подписки внутри computation сработали
            //  2. Чтобы выставился правильный status
            //  3. Если eventSignal это async computable signal, то вернётся последнее значение (или "pendingValue").
            //     Это нужно для того, чтобы не тригеррить React Suspense-логику (она реагирует на Promise в значении).
            // (можно сделать для этого отдельный метод, который будет вызывать computation только если оно ещё ни разу не вызывалось).
            const signalValue = eventSignal.getSyncSafe();
            const { componentType } = eventSignal;
            const reactFCDescriptor = sFC === void 0 && Boolean(_React_createElement)
                ? (contextValue ? getReactFunctionComponentFromMagicContext(contextValue, componentType, eventSignal.status) as (_ComponentDescription<any, any, any, any> | null) : void 0)
                    ?? eventSignal._reactFC
                    ?? (componentType !== void 0 ? _getReactFunctionComponent(componentType, eventSignal.status) : void 0)
                : void 0
            ;
            let reactFCDescriptor_0: NonNullable<(typeof reactFCDescriptor)>[0] | null | undefined;
            const reactFC = sFC !== void 0 ? sFC : ((reactFCDescriptor_0 = reactFCDescriptor?.[0]) ?? sDefaultFC);
            const preDefinedProps = reactFCDescriptor_0 ? (reactFCDescriptor as NonNullable<(typeof reactFCDescriptor)>)[1] as Record<any, any> : void 0;
            let snapshotVersion: string | undefined = void 0;

            if (_useSyncExternalStore) {
                // https://react.dev/reference/react/useSyncExternalStore
                snapshotVersion = _useSyncExternalStore(eventSignal.subscribeOnNextRender, eventSignal.getSnapshotVersion);

                if (isReactDev && _useDebugValue) {
                    _useDebugValue({
                        id: eventSignal.id,
                        description: eventSignal._signalSymbol.description,
                        value: eventSignal._value,
                        source: '$Component',
                    });
                }

                renderReactComponent: if (reactFC != null && reactFC !== false) {
                    if (isReactDev && !sIgnoreRecursive) {
                        /**
                         * Детектируем рекурсивный вызов EventSignalComponent(), чтобы избежать ситуации, когда внутри
                         *  зарегистрированного React-компонента в JSX возвращается сам EventSignal и мы опять вызываем EventSignalComponent(),
                         *  чтобы вернуть тот же самый зарегистрированный React-компонент.
                         *
                         * @see [Provide a way to detect infinite component rendering recursion in development #12525](https://github.com/facebook/react/issues/12525)
                         * @see [useStrictModeDetector](https://github.com/Oblosys/react-hook-tracer/blob/e3108d8d5c6db0e919cebb164644ed2c70f15421/packages/react-hook-tracer/src/hooks/hookUtil.ts#L16)
                         */
                        let currentFiber: _ReactFiber | null | undefined = _React?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?.A?.getOwner?.();

                        while (currentFiber) {
                            currentFiber = currentFiber.return;

                            if (currentFiber?.type === reactFC
                                && currentFiber.pendingProps?.eventSignal?.id === eventSignal.id
                            ) {
                                console.warn(`warning: recursive render detected while rendering "${reactFC.name}". You may need \`.get()\` to eventSignal?`, eventSignal, snapshotVersion);

                                break renderReactComponent;
                            }
                        }
                    }

                    const memorizedReactFC: EventSignal.ReactFC<any, any, any, any> = _React_memo && !("$$typeof" in reactFC)
                        ? memorizedComponents.getOrInsertComputed(reactFC, memorizedComponents_onNew)
                        : reactFC
                    ;
                    const { key, version } = eventSignal;
                    // noinspection UnnecessaryLocalVariableJS
                    const element = _React_createElement!(memorizedReactFC, { // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        __proto__: null,
                        key,
                        // @deprecated use current$
                        eventSignal,
                        current$: eventSignal,
                        current$Value: signalValue,
                        // todo: rename to 'current$Version'?
                        version,
                        // todo: rename to 'current$SnapshotVersion'?
                        snapshotVersion,
                        ...preDefinedProps,
                        ...otherProps,
                    }, children || null);

                    if (_ErrorBoundary) {
                        const reactFCDescriptor = (contextValue ? getReactFunctionComponentFromMagicContext(contextValue, componentType, 'error-boundary') as (_ComponentDescription<any, any, any, any> | null) : void 0)
                            ?? (componentType !== void 0 ? _getReactFunctionComponent(componentType, 'error-boundary') : void 0)
                        ;

                        if (reactFCDescriptor) {
                            return _React_createElement!(_ErrorBoundary, { // eslint-disable-line @typescript-eslint/no-non-null-assertion
                                __proto__: null,
                                key,
                                FallbackComponent: reactFCDescriptor[0],
                                // // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                // fallback: _React_createElement!(reactFCDescriptor[0], {
                                //     __proto__: null,
                                //     key,
                                //     eventSignal,
                                // }),
                            }, element);
                        }
                    }

                    return element;
                }
            }
            else {
                console.warn('warning: "useSyncExternalStore" for EventSignal is not set. Please use `if (!EventSignal.reactIsInited) EventSignal.initReact(React)`.');
            }

            if (children) {
                // return children instead of signalValue
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                return _React_createElement!(_ReactFragment, eventSignal.keyProps, children || null);
            }

            if (typeof signalValue === 'object' && signalValue) {
                if (Array.isArray(signalValue)) {
                    return arrayContentStringify(signalValue, _isReactComponentObject);
                }

                if (_isReactComponentObject(signalValue)) {
                    return signalValue;
                }

                return stringifyWithCircularHandle(signalValue);
            }

            return signalValue;
        }

        Object.defineProperty(EventSignalComponent, 'name', {
            value: '$Component',
            enumerable: false,
            configurable: true,
            writable: false,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore allow `__proto__`
            __proto__: null,
        });

        // Decorate Signals so React renders them as <EventSignalComponent> components. - https://github.com/preactjs/signals/blob/10e13d3a67e796873c2d4ddc6d04cd8d8705194b/packages/react/runtime/src/index.ts#L354
        // See "_useSignalsImplementation" in preactjs/signals https://github.com/preactjs/signals/blob/10e13d3a67e796873c2d4ddc6d04cd8d8705194b/packages/react/runtime/src/index.ts#L323
        Object.defineProperties(_EventSignal_prototype, {
            $$typeof: {
                configurable: true,
                enumerable: false,
                // https://github.com/facebook/react/blob/346c7d4c43a0717302d446da9e7423a8e28d8996/packages/shared/ReactSymbols.js#L15
                value: Symbol.for("react.element"),
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore allow `__proto__`
                __proto__: null,
            },
            type: {
                configurable: true,
                enumerable: false,
                value: EventSignalComponent,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore allow `__proto__`
                __proto__: null,
            },
            props: {
                configurable: true,
                enumerable: false,
                get(this: EventSignal<any>) {
                    const props: EventSignal<any, any, any>["props"] = Object.freeze(Object.setPrototypeOf({ eventSignal: this, current$: this }, null));

                    return _defineNonEnumValue(this, 'props', props);
                },
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore allow `__proto__`
                __proto__: null,
            },
            keyProps: {
                configurable: true,
                enumerable: false,
                get(this: EventSignal<any>) {
                    const { key } = this;
                    const keyProps: EventSignal<any, any, any>["keyProps"] = Object.freeze(Object.setPrototypeOf({ key }, null));

                    return _defineNonEnumValue(this, 'keyProps', keyProps);
                },
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore allow `__proto__`
                __proto__: null,
            },
            displayName: {
                configurable: true,
                enumerable: false,
                get(this: EventSignal<any>) {
                    const { description } = this._signalSymbol;
                    const displayName = `EventSignal#${this.id}${description ? `(${description})` : ''}`;

                    return _defineNonEnumValue(this, 'displayName', displayName);
                },
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore allow `__proto__`
                __proto__: null,
            },
            ref: { configurable: true, value: null },
        });
    }

    static registerReactComponentForComponentType<
        T=unknown,
        S=T,
        D=unknown,
        R=T,
        CT extends Object | number | string | symbol | undefined=EventSignal.NewOptions<T, S, D, R>["componentType"],
        PROPS extends {
            // deprecated use current$
            eventSignal?: EventSignal<T, S, D, R>,
            current$?: EventSignal<T, S, D, R>,
            current$Value?: EventSignal<T, S, D, R>["value"],
            version?: number,
            componentType?: CT,
        } = {
            // deprecated use current$
            eventSignal?: EventSignal<T, S, D, R>,
            current$: EventSignal<T, S, D, R>,
            version?: number,
            componentType?: CT,
            [key: string]: unknown,
        },
    >(
        componentType: CT,
        reactFC: EventSignal.ReactFC<any, any, any, any, PROPS>,
        status: number | string | symbol,
        preDefinedProps?: _PreDefinedProps<PROPS>,
    ): EventSignal.ReactFC<any, any, any, any, PROPS> | Record<string, EventSignal.ReactFC<any, any, any, any, PROPS>> | null;
    static registerReactComponentForComponentType<
        T=unknown,
        S=T,
        D=unknown,
        R=T,
        CT extends Object | number | string | symbol | undefined=EventSignal.NewOptions<T, S, D, R>["componentType"],
        PROPS extends {
            // deprecated use current$
            eventSignal?: EventSignal<T, S, D, R>,
            current$?: EventSignal<T, S, D, R>,
            current$Value?: EventSignal<T, S, D, R>["value"],
            version?: number,
            componentType?: CT,
        } = {
            // deprecated use current$
            eventSignal?: EventSignal<T, S, D, R>,
            current$: EventSignal<T, S, D, R>,
            version?: number,
            componentType?: CT,
            [key: string]: unknown,
        },
    >(
        componentType: CT,
        reactFC: EventSignal.ReactFC<any, any, any, any, PROPS>,
        preDefinedProps?: _PreDefinedProps<PROPS>,
    ): EventSignal.ReactFC<any, any, any, any, PROPS> | Record<string, EventSignal.ReactFC<any, any, any, any, PROPS>> | null;
    static registerReactComponentForComponentType<
        T=unknown,
        S=T,
        D=unknown,
        R=T,
        CT extends Object | number | string | symbol | undefined=EventSignal.NewOptions<T, S, D, R>["componentType"],
        PROPS extends {
            // deprecated use current$
            eventSignal?: EventSignal<T, S, D, R>,
            current$?: EventSignal<T, S, D, R>,
            current$Value?: EventSignal<T, S, D, R>["value"],
            version?: number,
            componentType?: CT,
        } = {
            // deprecated use current$
            eventSignal?: EventSignal<T, S, D, R>,
            current$: EventSignal<T, S, D, R>,
            version?: number,
            componentType?: CT,
            [key: string]: unknown,
        },
    >(
        componentType: CT,
        reactFC: EventSignal.ReactFC<any, any, any, any, PROPS>,
        arg3?: _PreDefinedProps<PROPS> | number | string | symbol,
        arg4?: _PreDefinedProps<PROPS>,
    ): EventSignal.ReactFC<any, any, any, any, PROPS> | Record<string, EventSignal.ReactFC<any, any, any, any, PROPS>> | null {
        const status: string | undefined = typeof arg3 === 'string' || typeof arg3 === 'number' ? arg3 as string : void 0;
        const preDefinedProps: Omit<Partial<PROPS>, 'componentType' | 'eventSignal' | 'version'> | undefined = status === void 0
            ? arg3 as _PreDefinedProps<PROPS>
            : arg4 as _PreDefinedProps<PROPS>
        ;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore `TS2345: Argument of type ReactFC<any, any, any, any, PROPS> is not assignable to parameter of type ReactFC<any, any, any, any, {}>`
        const reactFCDescriptor = _setReactFunctionComponent(componentType, reactFC, status, preDefinedProps);
        const prev_reactFC = reactFCDescriptor?.[0] || null;

        if (componentType && (prev_reactFC !== reactFC || !_shallowEqualObjects(reactFCDescriptor?.[1], preDefinedProps))) {
            // todo: componentType Может быть Объектом
            _componentsEmitter.emit(componentType as string, status);
        }

        return reactFCDescriptor?.[0] || null;
    }
}

export namespace EventSignal {
    // export type AsyncComputationWithSource<T, S, D> = {
    //     async (prevValue: T, sourceValue: R | undefined, data: D): T | undefined,
    // } | void;
    export type ComputationWithSource<T, S, D, R> =
        (prevValue: Awaited<T>, sourceValue: S | undefined, eventSignal: EventSignal<T, S, D, R>) => (R | undefined)
    ;
    export type ComputationWithSource2<T, S, D, R> =
        (prevValue: Awaited<T>, sourceValue: S, eventSignal: EventSignal<T, S, D, R>) => (R | undefined)
    ;

    export type TriggerDescriptionTimerGroupId = number | string | symbol;

    // todo:
    //  see https://lodash.com/docs/4.17.15#debounce
    //  see [See David Corbacho's article for details over the differences between _.debounce and _.throttle.](https://css-tricks.com/debouncing-throttling-explained-examples/)
    /*export type ThrottleDescriptionDebounce = {
        type: 'debounce',
        // The number of milliseconds to delay.
        ms: number,
        // Specify invoking on the leading edge of the timeout.
        leading?: boolean,
        // Specify invoking on the trailing edge of the timeout.
        trailing?: boolean,
        // The maximum time func is allowed to be delayed before it's invoked.
        maxWait?: number,
        timerGroupId?: TriggerDescriptionTimerGroupId,
        __proto__?: null,
    };
    */
    export type TriggerDescriptionClock = {
        type: 'clock',
        // Value of EventSignal can be changed every X milliseconds
        ms: number,
        // if 'once == true' setTimeout will be used, setInterval otherwise
        once?: boolean,
        timerGroupId?: TriggerDescriptionTimerGroupId,
        signal?: AbortSignal,
        __proto__?: null,
    };
    export type TriggerDescriptionEventSignal = {
        type?: 'eventSignal',
        eventSignal: EventSignal<any>,
        signal?: AbortSignal,
        __proto__?: null,
    };
    export type TriggerDescriptionEmitter = {
        type: 'emitter',
        emitter: EventEmitter | EventEmitterX | EventTarget | WeakRef<EventEmitter | EventEmitterX | EventTarget> | undefined,
        event: (number | string | symbol)[] | number | string | symbol,
        filter?: ((this: null, eventName: number | string | symbol, ...args: any[]) => boolean),
        once?: boolean,
        signal?: AbortSignal,
        __proto__?: null,
    };

    export type TriggerDescription = TriggerDescriptionClock | TriggerDescriptionEmitter | TriggerDescriptionEventSignal;

    export type ReactFC<T, S, D, R, PROPS={}> = (props: {
        /** @deprecated use {@link current$} */
        eventSignal?: EventSignal<T, S, D, R>,
        current$: EventSignal<T, S, D, R>,
        current$Value: Awaited<T>,
        version?: number,
        children?: any,
        [key: string]: any,
    } & PROPS) => any;

    export type NewOptions<T, S, D, R> = {
        description?: string,
        /**
         * Value after [EventSignal]{@link EventSignal} destroyed.
         */
        finaleValue?: Awaited<R>,
        /**
         * Source value after [EventSignal]{@link EventSignal} destroyed.
         */
        finaleSourceValue?: S,
        deps?: {
            eventName: number | string | symbol,
        }[],
        data?: D,
        /** An [AbortSignal]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal} from [AbortController]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController} */
        signal?: AbortSignal,
        // todo: Разрешить ТОЛЬКО string | number | symbol, потому что от поддержки function | Object тут только усложняется код
        componentType?: Object | number | string | symbol | undefined,
        reactFC?: ReactFC<T, S, D, R>,
        trigger?: TriggerDescription,
        //todo: Не применять throttle к некоторым источникам
        // throttle?: TriggerDescription & { ignore?: 'set' | 'source' | 'trigger' },
        throttle?: TriggerDescription,
        onDestroy?: () => void,
        //todo:
        // methods: {
        //   increment<number | void>(prevValue, arg = 1) { return prevValue + arg; },
        //   decrement<number | void>(prevValue, arg = 1) { return prevValue - arg; },
        //   setFromDOMEvent(prevValue, event: React.ChangeEvent<HTMLInputElement>) { return String(event.target.value || ''); },
        // }
        // // comes to signal._.increment and signal._.decrement, signal._.setFromDOMEvent

        __proto__?: null,
    };
    export interface NewOptionsWithInitialSourceValue<T, S, D, R> extends NewOptions<T, S, D, R> {
        initialSourceValue: S;
    }
    export type NewOptionsWithSource<T, S, D, R> = NewOptions<T, S, D, R> & {
        sourceEmitter: EventEmitter | EventEmitterX | EventTarget | undefined,
        sourceEvent: (number | string | symbol)[] | number | string | symbol,
        // todo: добавить sourceMapAndFilter, который может быть использован вместо пары sourceMap/sourceFilter
        sourceMap?: ((this: null, eventName: number | string | symbol, ...args: any[]) => S),
        sourceFilter?: ((this: null, eventName: number | string | symbol, ...args: any[]) => boolean),
        //todo:
        // // this function can throw Error
        // validateSourceValue?: (newSourceValueBeforeApply: S) => boolean,
        // // this function can throw Error
        // validateValue?: (newValueBeforeApply) => boolean,
    };

    /**
     * * Only valid values: '' | 'change' | 'changed' | 'data' | 'error'.
     * * All other values will rise TypeError.
     */
    export type IgnoredEventNameForListeners = string | symbol | '' | 'change' | 'changed' | 'data' | 'error';

    export type Subscription = {
        // Cancels the subscription
        unsubscribe: () => void,
        /** Suspend this subscription. Returns `true` if subscription was not suspended. */
        suspend: () => boolean,
        /** Resume/unsuspend this subscription. Returns `true` if subscription was suspended. */
        resume: () => boolean,
        suspended: boolean,
        // A boolean value indicating whether the subscription is closed
        closed: boolean,
        __proto__?: null,
    };

    export const enum StateFlags {
        wasDepsUpdate = 1 << 1,
        wasSourceSetting = 1 << 2,
        wasSourceSettingFromEvent = 1 << 3,
        wasThrottleTrigger = 1 << 4,
        wasForceUpdateTrigger = 1 << 5,
        /* todo:
        wasSetSourceSetting = 1 << 6,
        wasMutateSourceSetting = 1 << 7,
        */

        isNeedToCalculateNewValue = 1 << 8,
        hasSourceEmitter = 1 << 9,
        hasComputation = 1 << 10,
        hasDepsFromProps = 1 << 11,
        hasThrottle = 1 << 12,

        /**
         * Is last (most relevant) computation returns Promise?
         */
        wasLastAsyncComputation = 1 << 14,
        nowInSettings = 1 << 15,
        nowInCalculatingNewValue = 1 << 16,
        nowInCalculatingNewValueAsync = 1 << 17,

        nextValueShouldBeForceSettled = 1 << 20,
        valuesAsObjectShouldBeForceSettled = 1 << 21,

        isDestroyed = 1 << 30,
    }
}

const tagEventSignal = 'EventSignal';

EventSignal.prototype[Symbol.toStringTag] = tagEventSignal;

class EventSignalError extends Error {
    eventSignal: EventSignal<any, any, any, any> | undefined;

    constructor(message: string, options: ConstructorParameters<typeof Error>[1] & { cause?: unknown, eventSignal: EventSignal<any, any, any, any> }) {
        super(message, options);

        this.eventSignal = options.eventSignal;
    }
}

const _emptySubscription: EventSignal.Subscription = {
    unsubscribe: _noop,
    suspend: _noopFalse,
    resume: _noopFalse,
    suspended: false,
    closed: true,
    __proto__: null,
};

Object.freeze(_emptySubscription);

export function isEventSignal<T extends EventSignal<unknown, unknown, unknown, unknown>>(maybeEventSignal: T | unknown): maybeEventSignal is T {
    return !!maybeEventSignal
        && ((maybeEventSignal as EventSignal<any>).isEventSignal as unknown) === true
    ;
}

function _isWeakRef<T extends object=object>(maybeWeakRef: WeakRef<T> | unknown): maybeWeakRef is WeakRef<T> {
    return !!maybeWeakRef
        && typeof (maybeWeakRef as WeakRef<any>).deref === 'function'
        // can be 'WeakRef' or 'FakeWeakRef'
        && String(maybeWeakRef[Symbol.toStringTag]).includes('WeakRef')
    ;
}

type _TimerGroup = ReturnType<typeof _makeTimerGroup>;

const _timeoutTimerGroupsContainer = new Map<EventSignal.TriggerDescriptionTimerGroupId, Map<number, _TimerGroup>>();
const _intervalTimerGroupsContainer = new Map<EventSignal.TriggerDescriptionTimerGroupId, Map<number, _TimerGroup>>();
const _timerGroupsContainer_onNew = function() {
    return new Map<number, _TimerGroup>();
};
const _makeTimerGroup = (ms: number, map: Map<number, any> | undefined, isTimeout = false) => {
    const subs = [] as { 0: symbol, 1: (() => void) | undefined, __proto__: null }[];
    let destroyed = false;
    let timer: ReturnType<typeof setInterval | typeof setTimeout> | undefined;
    let makeTimer: (() => typeof timer) | undefined = () => {
        return isTimeout
            ? setTimeout(function() {
                for (const { 0: signalSymbol } of subs) {
                    timersTriggerEventsEmitter.emit(signalSymbol);
                }

                destroy();
            })
            : setInterval(function() {
                for (const { 0: signalSymbol } of subs) {
                    timersTriggerEventsEmitter.emit(signalSymbol);
                }
            }, ms)
        ;
    };
    const destroy = function() {
        if (destroyed) {
            return;
        }

        destroyed = true;
        clearInterval(timer);
        map?.delete(ms);
        timer = makeTimer = map = void 0;

        for (const { 1: effect } of subs) {
            effect?.();
        }

        subs.length = 0;
    };

    return {
        // addSub
        [0](signalSymbol: symbol, effect?: (() => void)) {
            if (!destroyed) {
                const wasLength = subs.length;

                subs.push({ 0: signalSymbol, 1: effect, __proto__: null });

                if (wasLength === 0 && !timer && makeTimer) {
                    timer = makeTimer();
                }
            }
        },
        // removeSub
        [1](signalSymbol: symbol) {
            const wasLength = subs.length;
            const index = subs.findIndex(sub => {
                return sub[0] === signalSymbol;
            });

            if (index !== -1) {
                const sub = subs[index];

                subs.splice(index, 1);

                sub?.[1]?.();
            }

            if (wasLength !== 0 && subs.length === 0) {
                destroy();
            }
        },
        __proto__: null,
    };
};

function _getAndSubTimerGroup(
    timerGroupId: EventSignal.TriggerDescriptionTimerGroupId,
    listener: (...args: unknown[]) => void,
    {
        signalSymbol,
        ms,
        isTimeout,
        signal,
        onEnd,
    }: {
        signalSymbol: symbol,
        ms: number,
        isTimeout?: boolean,
        signal?: AbortSignal,
        onEnd?: () => void,
        __proto__: null,
    }
): (() => void) | undefined {
    const mapsByMsMap = (isTimeout ? _timeoutTimerGroupsContainer : _intervalTimerGroupsContainer)
        .getOrInsertComputed(timerGroupId, _timerGroupsContainer_onNew)
    ;
    const timerGroup = mapsByMsMap
        .getOrInsertComputed(ms, function() {
            return _makeTimerGroup(ms, mapsByMsMap, isTimeout);
        })
    ;
    // removeSub
    const unsubscribe = timerGroup[1].bind(timerGroup, signalSymbol);

    let abortCleanup: (() => void) | undefined;

    if (signal) {
        if (signal.aborted) {
            return;
        }

        /** note: {@link unsubscribe} will call {@link onRemoveSubscription} internally */
        signal.addEventListener('abort', unsubscribe, { once: true });

        abortCleanup = signal.removeEventListener.bind(signal, 'abort', unsubscribe);
    }

    const removeListener = timersTriggerEventsEmitter.removeListener.bind(timersTriggerEventsEmitter, signalSymbol, listener);
    const onRemoveSubscription = () => {
        removeListener();
        abortCleanup?.();
        onEnd?.();
    };

    // addSub
    timerGroup[0](signalSymbol, onRemoveSubscription);
    timersTriggerEventsEmitter.on(signalSymbol, listener);

    return unsubscribe;
}

type _PreDefinedProps<PROPS=any> = Omit<Partial<PROPS>, 'componentType' | 'eventSignal' | 'version'>;
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/d5a5c3b0ef50b7277750ed631c3d640b27272143/types/react/index.d.ts#L2161
type UseSyncExternalStore = (
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => any,
    getServerSnapshot?: () => any,
) => any;

const _componentsEmitter = new EventEmitterX({
    listenerOncePerEventType: true,
});

function _isReactComponentObject(object: { $$typeof?: unknown, type?: unknown, [key: string]: unknown }) {
    return !!object
        && typeof object === 'object'
        && object.$$typeof !== void 0
        && object.type !== void 0
    ;
}

function _shallowEqualObjects(obj1: unknown | null | undefined, obj2: unknown | null | undefined) {
    if (obj1 === obj2
        || (obj1 == null && obj2 == null)
    ) {
        return true;
    }

    if (!obj1 || !obj2) {
        return false;
    }

    if (obj1 instanceof Date) {
        if (obj2 instanceof Date) {
            return obj1.getTime() === obj2.getTime();
        }

        return false;
    }

    // todo: add support for Set, Map, etc

    const keys1 = Object.keys(obj1);

    if (keys1.length !== Object.keys(obj2).length) {
        return false;
    }

    for (let i = 0, len = keys1.length ; i < len ; i++) {
        const key = keys1[i] as NonNullable<typeof keys1[0]>;

        if (obj1[key] !== obj2[key]) {
            return false;
        }
    }

    return true;
}

function _defineNonEnumValue<T = unknown>(obj: Object, propName: string, value: T): T {
    Object.defineProperty(obj, propName, {
        value,
        configurable: true,
        enumerable: false,
        writable: false,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore allow `__proto__`
        __proto__: null,
    });

    return value;
}

let _nextAnimationFrameCounter = 0;
let _nextAnimationFrameTimer: ReturnType<typeof requestAnimationFrame> | undefined = void 0;
const PREDEFINED_QUEUE_POOL_SIZE = 64;
const REDUCE_ARRAY_EACH = 100;
const _nextAnimationFrameQueue: (() => void)[] = new Array(PREDEFINED_QUEUE_POOL_SIZE).fill(_noop);
let _nextAnimationFrameQueueLen = 0;
const _onNextAnimationFrame = () => {
    _nextAnimationFrameTimer = void 0;
    _nextAnimationFrameCounter++;

    try {
        for (let i = 0 ; i < _nextAnimationFrameQueueLen ; i++) {
            (_nextAnimationFrameQueue[i] as NonNullable<typeof _nextAnimationFrameQueue[0]>)();
            _nextAnimationFrameQueue[i] = _noop;
        }
    }
    catch (error) {
        console.error('EventSignal~subscribeOnNextAnimationFrame~onNextAnimationFrame: error:', error);
    }

    _nextAnimationFrameQueueLen = 0;

    if ((_nextAnimationFrameCounter % REDUCE_ARRAY_EACH) === 0
        && _nextAnimationFrameQueue.length > PREDEFINED_QUEUE_POOL_SIZE
    ) {
        _nextAnimationFrameQueue.length = PREDEFINED_QUEUE_POOL_SIZE;
    }
};
const _awaitNextAnimationFrame = (func: () => void) => {
    _nextAnimationFrameQueue[_nextAnimationFrameQueueLen++] = func;

    if (!_nextAnimationFrameTimer) {
        _nextAnimationFrameTimer = requestAnimationFrame(_onNextAnimationFrame);
    }
};
const _unAwaitNextAnimationFrame = (func: () => void) => {
    const index = _nextAnimationFrameQueue.indexOf(func);

    if (index !== -1) {
        _nextAnimationFrameQueue[index] = _noop;
    }
};

const _hasWeekMapSymbolsSupport = (function() {
    try {
        const wm = new WeakMap();
        const symbol = Symbol();
        const obj = {};

        wm.set(symbol as unknown as Object, obj);

        return wm.get(symbol as unknown as Object) === obj;
    }
    catch {
        return false;
    }
})();

type _ComponentDescription<T, S, D, R> = {
    // reactFC
    0: EventSignal.ReactFC<T, S, D, R> | false | undefined,
    // preDefinedProps
    1?: Object,
    __proto__: null,
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
// @ts-ignore `TS2344: Type symbol | object does not satisfy the constraint object`
const _reactFunctionComponentByComponentType_WeakMap = new WeakMap<object | symbol, {
    [status: string]: _ComponentDescription<any, any, any, any>,
}>();
const _reactFunctionComponentByComponentType_Map = new Map<number | string, {
    [status: string]: _ComponentDescription<any, any, any, any>,
}>();

function _getReactFunctionComponent(
    componentType: EventSignal.NewOptions<any, any, any, any>["componentType"],
    status?: string,
): _ComponentDescription<any, any, any, any> | null {
    const type = typeof componentType;

    if (componentType === null || type === 'undefined') {
        return null;
    }

    const reactFCs: ReturnType<typeof _reactFunctionComponentByComponentType_Map.get> | null = (
        (type === 'object' || (type === 'symbol' && _hasWeekMapSymbolsSupport && isUniqueSymbol(componentType as symbol)))
            ? _reactFunctionComponentByComponentType_WeakMap.get(componentType as Object)
            : _reactFunctionComponentByComponentType_Map.get(componentType as number | string)
    ) || null;

    if (status === 'error-boundary') {
        return reactFCs?.['error-boundary'] || null;
    }

    if (status === 'error-only') {
        return reactFCs?.['error'] || null;
    }

    return reactFCs
        ? ((status != null ? reactFCs[status] : null) || reactFCs["default"] || null)
        : null
    ;
}

function _setReactFunctionComponent(
    componentType: EventSignal.NewOptions<any, any, any, any>["componentType"],
    reactFC: EventSignal.ReactFC<any, any, any, any> | null | undefined,
    status: string | undefined,
    preDefinedProps?: Object,
) {
    const type = typeof componentType;

    if (componentType === null || type === 'undefined') {
        return null;
    }

    const _status = status ?? 'default';
    const map = (
        (type === 'object' || (type === 'symbol' && _hasWeekMapSymbolsSupport && isUniqueSymbol(componentType as symbol)))
            ? (_reactFunctionComponentByComponentType_WeakMap as unknown as typeof _reactFunctionComponentByComponentType_Map)
            : _reactFunctionComponentByComponentType_Map
    );
    const prev_reactFCs = map.get(componentType as string) || null;
    const prev_reactFCDescriptor = prev_reactFCs?.[_status];

    if (reactFC == null) {
        if (prev_reactFCs !== null) {
            map.delete(componentType as string);
        }
    }
    else {
        // todo: Судя по тестам производительности, использование тут массива более производительно (и тратит меньше памяти)
        const componentDescriptionForStatus: _ComponentDescription<any, any, any, any> = {
            0: reactFC,
            1: preDefinedProps,
            __proto__: null,
        };

        if (prev_reactFCs === null) {
            const reactFCs = Object.create(null);

            reactFCs[_status] = componentDescriptionForStatus;

            map.set(componentType as string, reactFCs);
        }
        else {
            prev_reactFCs[_status] = componentDescriptionForStatus;
        }
    }

    return prev_reactFCDescriptor || null;
}

/**
 * @private
 * @throws {TypeError} 'Invalid type of "emitter". Should be EventEmitter or EventTarget'
 * @throws {TypeError} 'Failed to execute 'addEventListener' on 'EventTarget': Cannot convert a Symbol value to a string'
 */
function _eventTargetAddListeners(
    emitter: EventEmitter | EventTarget | WeakRef<EventEmitter | EventTarget> | undefined,
    listener: (...args: unknown[]) => void,
    options: {
        eventName: (number | string | symbol)[] | number | string | symbol,
        filter?: (this: null, eventName: number | string | symbol, ...args: unknown[]) => boolean,
        addEventNameToListener?: boolean,
        once?: boolean,
        // Usable only with `emitter is EventTarget`
        passive?: boolean,
        signal?: AbortSignal,
        onEnd?: () => void,
        __proto__?: null,
    },
) {
    const { signal, onEnd } = options;

    if (signal?.aborted || !emitter) {
        return;
    }

    const isWeakRefEmitter = _isWeakRef(emitter);
    /** WeakRef or replacement object */
    const emitterWeakRef = isWeakRefEmitter
        ? emitter as WeakRef<EventEmitter | EventTarget>
        : _weakRefFabric(emitter as EventEmitter | EventTarget)
    ;
    const subscriptions: { 0: number | string | symbol, 1: typeof listener, __proto__: null }[] = [];
    const cancel = function() {
        const emitter = emitterWeakRef.deref();

        if (emitter) {
            for (const { 0: eventName, 1: listener } of subscriptions) {
                _eventTargetAgnosticRemoveListener(emitter, eventName, listener);
            }
        }

        subscriptions.length = 0;
        abortCleanup?.();
        onEnd?.();
    };
    let abortCleanup: (() => void) | undefined;

    if (signal) {
        signal.addEventListener('abort', cancel, { once: true });

        abortCleanup = signal.removeEventListener.bind(signal, 'abort', cancel);
    }

    {
        const _emitter = isWeakRefEmitter
            ? (emitter as WeakRef<EventEmitter | EventTarget>).deref()
            : emitter as EventEmitter | EventTarget
        ;

        if (_emitter) {
            const { eventName, filter, once, passive, addEventNameToListener } = options;
            const flags = { once, passive, __proto__: null };

            for (const _eventName of Array.isArray(eventName) ? eventName : [ eventName ]) {
                const _listener = (filter || addEventNameToListener)
                    ? (...args: unknown[]) => {
                        const matched = !filter || filter.call(null, _eventName, ...args);

                        if (matched) {
                            if (addEventNameToListener) {
                                listener(_eventName, ...args);
                            }
                            else {
                                listener(...args);
                            }

                            if (once) {
                                cancel();
                            }
                        }
                    }
                    : listener
                ;

                subscriptions.push({ 0: _eventName, 1: _listener, __proto__: null });
                _eventTargetAgnosticAddListener(_emitter, _eventName, _listener, flags);
            }
        }
        else {
            abortCleanup?.();

            return;
        }
    }

    // noinspection JSUnusedAssignment
    emitter = void 0;

    return cancel;
}

/**
 * @private
 * @throws {TypeError} 'Invalid type of "emitter". Should be EventEmitter or EventTarget'
 * @throws {TypeError} 'Failed to execute 'addEventListener' on 'EventTarget': Cannot convert a Symbol value to a string'
 */
function _eventTargetAgnosticAddListener<T>(
    emitter: EventEmitter | EventTarget,
    name: number | string | symbol,
    listener: (newValue: T) => void,
    flags?: { once?: boolean, signal?: AbortSignal, __proto__?: null },
) {
    if (typeof (emitter as EventEmitter).on === 'function') {
        if (flags?.once) {
            (emitter as EventEmitter).once(name as string, listener);
        }
        else {
            (emitter as EventEmitter).on(name as string, listener);
        }
    }
    else if (typeof (emitter as EventTarget).addEventListener === 'function') {
        // note: is eventName is symbol it will be error:
        //  TypeError: Failed to execute 'addEventListener' on 'EventTarget': Cannot convert a Symbol value to a string
        // note: listener is type of `(event: { target: EventTarget }) => void`
        (emitter as EventTarget).addEventListener(name as string, listener as (() => void), flags);
    }
    else {
        throw new TypeError(`Invalid type of "emitter". Should be EventEmitter or EventTarget`);
    }
}

/**
 * @private
 * @throws {TypeError} 'Invalid type of "emitter". Should be EventEmitter or EventTarget'
 * @throws {TypeError} 'Failed to execute 'removeEventListener' on 'EventTarget': Cannot convert a Symbol value to a string'
 */
function _eventTargetAgnosticRemoveListener<T>(
    emitter: EventEmitter | EventTarget,
    name: number | string | symbol,
    listener: (newValue: T) => void,
) {
    if (typeof (emitter as EventEmitter).removeListener === 'function') {
        (emitter as EventEmitter).removeListener(name as string, listener);
    }
    else if (typeof (emitter as EventTarget).removeEventListener === 'function') {
        // note: is eventName is symbol it will be error:
        //  TypeError: Failed to execute 'removeEventListener' on 'EventTarget': Cannot convert a Symbol value to a string
        // note: listener is type of `(event: { target: EventTarget }) => void`
        (emitter as EventTarget).removeEventListener(name as string, listener as (() => void));
    }
    else {
        throw new TypeError(`Invalid type of "emitter". Should be EventEmitter or EventTarget`);
    }
}

// /** @private */
// function eventTargetAgnosticEmitEvent(emitter: EventEmitter | EventTarget, name: number | string | symbol, eventData: unknown) {
//     if (typeof (emitter as EventEmitter).emit === 'function') {
//         (emitter as EventEmitter).emit(name as string, eventData);
//     }
//     else if (typeof (emitter as EventTarget).dispatchEvent === 'function') {
//         // note: is eventName is symbol it will be error:
//         //  TypeError: Failed to construct 'CustomEvent': Cannot convert a Symbol value to a string
//         (emitter as EventTarget).dispatchEvent(new CustomEvent<unknown>(name as string, {
//             detail: eventData,
//         }));
//     }
//     else {
//         throw new TypeError(`Invalid type of "emitter". Should be EventEmitter or EventTarget`);
//     }
// }

/** @private */
function _checkListener<T extends Function>(listener: T | unknown/* | EventListenerObject, supportHandleEvent = false*/): asserts listener is T/* | EventListenerObject*/ {
    if (typeof listener !== 'function') {
        /*if (supportHandleEvent) {
            if (typeof listener !== 'object' || !listener) {
                throw new TypeError('"listener" argument must be a function or Object.{handleEvent: Function|void}');
            }
        }
        else*/ {
            throw new TypeError('"listener" argument must be a function');
        }
    }
}

/** @private */
function _checkEventSignalEventName(ignoredEventName: EventSignal.IgnoredEventNameForListeners | number | string | undefined) {
    if (ignoredEventName !== undefined
        && ignoredEventName !== ''
        && ignoredEventName !== 'change'
        && ignoredEventName !== 'changed'
        && ignoredEventName !== 'data'
        && ignoredEventName !== 'error'
    ) {
        throw new Error(`Invalid "ignoredEventName". Should be undefined or one of ["", "change", "changed", "data", "error"] but "${String(ignoredEventName)}" found`);
    }
}

function _noop() {
    // nothing
}

function _noopFalse() {
    return false;
}

const _WeakRef_native_support = (function() {
    // check 1
    if (typeof WeakRef === 'undefined'
        // check 2 - detect polyfill
        || WeakRef.prototype[Symbol.toStringTag] !== 'WeakRef'
    ) {
        return false;
    }

    // check 3 - detect polyfill or incompatible
    try {
        const o = Object.create(null);
        const wr = new WeakRef(o);

        if (wr[Symbol.toStringTag] !== 'WeakRef') {
            return false;
        }

        if (wr.deref() !== o) {
            return false;
        }
    }
    catch {
        return false;
    }

    // check 4 - detect polyfill
    try {
        // This SHOULD throw error:
        //  Chrome/nodejs: TypeError: Method WeakRef.prototype.deref called on incompatible receiver #<WeakRef>
        //  FireFox: `TypeError: Receiver of WeakRef.deref call is not a WeakRef`
        Object.create(WeakRef.prototype).deref();

        return false;
    }
    catch {
        return true;
    }
})();
const _WeakRef_symbols_support = _WeakRef_native_support && (function() {
    try {
        const s = Symbol('_WeakRef_symbols_support');
        const wr = new WeakRef(s as Object);

        return wr.deref() === s;
    }
    catch {
        return false;
    }
})();

const __FakeWeakRef_proto__ = Object.setPrototypeOf({
    deref(this: { __value: Object | symbol }) {
        return this.__value;
    },
    [Symbol.toStringTag]: 'FakeWeakRef',
}, null);

function _weakRefFabric<O extends object = object>(target: O): WeakRef<O> {
    if (typeof (target as unknown) === 'symbol' ? _WeakRef_symbols_support : _WeakRef_native_support) {
        return new WeakRef(target as Object as O);
    }

    return Object.setPrototypeOf({
        __value: target,
    }, __FakeWeakRef_proto__) as WeakRef<O>;
}

// todo: Не экспортировать signalEventsEmitter, а сделать отдельные методы, которые будут давать информацию о его состоянии.
export const __test__get_signalEventsEmitter = (isTest || isReactDev) ? () => signalEventsEmitter : void 0 as unknown as (() => typeof signalEventsEmitter);
export const __test__get_subscribersEventsEmitter = (isTest || isReactDev) ? () => subscribersEventsEmitter : void 0 as unknown as (() => typeof subscribersEventsEmitter);
export const __test__get_timersTriggerEventsEmitter = (isTest || isReactDev) ? () => timersTriggerEventsEmitter : void 0 as unknown as (() => typeof timersTriggerEventsEmitter);

if (isIDEDebugger || isReactDev) {
    const _global = (globalThis as unknown as {
        __test__get_signalEventsEmitter: typeof __test__get_signalEventsEmitter,
        __test__get_subscribersEventsEmitter: typeof __test__get_subscribersEventsEmitter,
        __test__get_timersTriggerEventsEmitter: typeof __test__get_timersTriggerEventsEmitter,
    });

    _global.__test__get_signalEventsEmitter = __test__get_signalEventsEmitter;
    _global.__test__get_subscribersEventsEmitter = __test__get_subscribersEventsEmitter;
    _global.__test__get_timersTriggerEventsEmitter = __test__get_timersTriggerEventsEmitter;
}
