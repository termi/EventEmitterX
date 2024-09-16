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
import { isTest } from 'termi@runEnv';
import { EventEmitterEx } from "../events";

// todo:
//  1. Использовать версию EventEmitterX с WeakMap в качестве _events, чтобы не "держать" сигналы от удаления GC.
//     А точнее, чтобы подписки на _signalSymbol авто-удалялись при удалении из памяти EventSignal, для которого этот _signalSymbol создавался.
//  2. Кидать события onCreateEventSignal, onDestroyEventSignal и другие
//  3. Добавить в опции конструктора EventSignal свойство "domain" для переопределения, какой signalEventsEmitter использовать.
const signalEventsEmitter = new EventEmitterEx({
    listenerOncePerEventType: true,
});

const subscribersEventsEmitter = new EventEmitterEx({
    listenerOncePerEventType: true,
});

let idIncrement = 0;
let currentSignal: EventSignal<any, any, any> | null = null;

export class EventSignal<T, S=T, D=undefined> {
    public readonly id = ++idIncrement;
    private _value: T;
    private readonly _finaleValue: T | undefined;
    private readonly _finaleSourceValue: S | undefined;
    private readonly _subscriptionsToDeps = new Set<number | string | symbol>();
    // // this symbol MUST using only for subscriptions
    // private readonly _signalSymbol: symbol;
    // // this symbol can be used for any public-related data, such as logging, counters etc
    // private readonly _uniqueSymbol: symbol;
    private readonly _signalSymbol: symbol;
    private _version = 0;
    private _computationsCount = 0;
    private _recalcPromise: Promise<void> | undefined;
    private _promise: Promise<T> | undefined;
    private _reject: ((error: unknown) => void) | undefined;
    private _resolve: ((newValue: T) => void) | undefined;
    private readonly _abortSignal?: AbortSignal;
    private readonly _setNeedToCompute = () => {
        if (!this._isNeedToCompute) {
            this._isNeedToCompute = true;

            // todo: В конструкторе EventSignal может приходить кастомный EventsEmitter.
            // Уведомим всех наших подписчиков, что наши зависимости изменились и это значит, что наше значение может стать новым.
            signalEventsEmitter.emit(this._signalSymbol);
        }

        this._recalculateIfNeeded();
    };
    private readonly _computation?: EventSignal.ComputationWithSource<T, S, D>;
    private readonly hasComputation: boolean;
    protected _isNeedToCompute = true;
    protected _nowInSettings = false;
    protected _nowInComputing = false;
    protected _hasSourceEmitter = false;
    private _sourceValue: S | undefined;
    public isDestroyed = false;
    /** WeakRef or replacement object */
    private readonly _sourceEmitterRef?: { deref(): EventEmitter | EventEmitterEx | EventTarget | undefined };
    private readonly _sourceMapFn?: EventSignal.NewOptionsWithSource<T, S, D>["sourceMap"];
    private readonly _sourceFilterFn?: EventSignal.NewOptionsWithSource<T, S, D>["sourceFilter"];
    private readonly _initialComputations?: [
        event: number | string | symbol,
        listener: (...args: unknown[]) => void,
    ][];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore Ignore: `TS2322: Type 'undefined' is not assignable to type 'D'. \n'D' could be instantiated with an arbitrary type which could be unrelated to 'undefined'`
    public data: D = void 0;

    // For React
    public readonly componentType?: EventSignal.NewOptions<T, S, D>["componentType"];
    // For React
    private _reactFC?: [ reactFC: EventSignal.NewOptions<T, S, D>["reactFC"] | false, preDefinedProps?: Object ];

    // Reserved for React
    declare readonly $$typeof: symbol;
    /**
     * Reserved for React
     *
     * React component function (React.FC) despite of type `string` here.
     */
    declare readonly type: string;
    // Reserved for React
    // declare readonly type: (props: {
    //     eventSignal: EventSignal<T, S, D>,
    // }) => any;
    // Reserved for React
    declare readonly props: { eventSignal: EventSignal<any> };
    // Reserved for React
    declare readonly defaultProps: { eventSignal: EventSignal<any> };
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
    constructor(initialValue: Awaited<T> | T, options: EventSignal.NewOptions<T, S, D> | EventSignal.NewOptionsWithSource<T, S, D>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource<T, S, D>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource<T, S, D>, options: EventSignal.NewOptionsWithSource<T, S, D>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource<T, S, D>, options: EventSignal.NewOptions<T, S, D>);
    constructor(
        initialValue: Awaited<T>,
        computationOrOptions?:// eslint-disable-next-line callforce/sort-type-constituents
            // | EventSignal.AsyncComputationWithSource<T, S, D>
            | EventSignal.ComputationWithSource<T, S, D>
            | EventSignal.NewOptions<T, S, D>
        ,
        options?: EventSignal.NewOptions<T, S, D>
    ) {
        const isSecondParameterComputation = typeof computationOrOptions === 'function';

        if (!isSecondParameterComputation) {
            options = computationOrOptions;
        }

        this._computation = isSecondParameterComputation
            ? computationOrOptions
            : void 0// (options as EventSignal.NewOptionsWithComputation<T, S, D> | EventSignal.NewOptionsWithSourceAndComputation<T, S, D> | undefined)?.computation
        ;

        const description = options?.description || '';
        const symbolDescription = this.id + (description ? `#${description}` : '');

        this._signalSymbol = Symbol(symbolDescription);
        // this._uniqueSymbol = Symbol(symbolDescription);
        this._finaleValue = options?.finaleValue;

        if (this._finaleValue === void 0) {
            this._finaleSourceValue = options?.finaleSourceValue;
        }

        const {
            _subscriptionsToDeps,
            _computation,
            _setNeedToCompute,
        } = this;

        this.hasComputation = typeof _computation === 'function';
        this._value = typeof initialValue === 'function' ? void 0 as T : initialValue as T;

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
            } = options as EventSignal.NewOptionsWithSource<T, S, D>;

            if (Array.isArray(deps) && deps.length > 0) {
                for (const { eventName } of deps) {
                    _subscriptionsToDeps.add(eventName);

                    signalEventsEmitter.on(eventName, _setNeedToCompute);
                }
            }

            if (data !== void 0) {
                this.data = data;
            }

            if (sourceEvent && sourceEmitter) {
                this._sourceEmitterRef = _weakRefFabric<EventEmitter | EventEmitterEx | EventTarget>(sourceEmitter);
                this._sourceMapFn = sourceMap;
                this._sourceFilterFn = sourceFilter;
                this._initialComputations = [];

                this._hasSourceEmitter = true;

                const events = Array.isArray(sourceEvent) ? sourceEvent : [ sourceEvent ];

                for (const event of events) {
                    const _initialComputation = (...args: unknown[]) => {
                        args.unshift(event);

                        if (this._sourceFilterFn && !this._sourceFilterFn.apply(null, args as [event: number | string | symbol, ...args: unknown[]])) {
                            return;
                        }

                        const newSourceValue = this._sourceMapFn
                            ? this._sourceMapFn.apply(null, args as [event: number | string | symbol, ...args: unknown[]])
                            : args[1] as S
                        ;

                        this._setSourceValue(newSourceValue);
                    };

                    this._initialComputations.push([
                        event,
                        _initialComputation,
                    ]);

                    _eventTargetAgnosticAddListener(sourceEmitter, event, _initialComputation);
                }
            }

            if (_abortSignal) {
                this._abortSignal = _abortSignal;

                _abortSignal.addEventListener('abort', this._abortHandler);
            }

            if (reactFC) {
                this._reactFC = [ reactFC ];
            }
            else if (componentType) {
                this.componentType = componentType;
            }
        }
    }

    destructor() {
        const {
            _finaleValue,
            _finaleSourceValue,
            _signalSymbol,
            _abortSignal,
            _subscriptionsToDeps,
            _setNeedToCompute,
            _initialComputations,
            _sourceEmitterRef,
        } = this;
        const has_finaleValue = _finaleValue !== void 0;

        this.isDestroyed = true;

        //todo: Сейчас не работает
        // EventSignal._setComponentOnDestroy(this);

        if (has_finaleValue || _finaleSourceValue !== void 0) {
            this._setSourceValue((has_finaleValue ? _finaleValue : _finaleSourceValue) as unknown as S, true);

            const maybePromise = this._calculateValue(has_finaleValue);

            // eslint-disable-next-line promise/prefer-await-to-then
            if (typeof (maybePromise as Promise<T>)?.then === 'function') {
                // eslint-disable-next-line promise/prefer-await-to-then,promise/prefer-await-to-callbacks
                (maybePromise as Promise<T>)?.then(null, (error) => {
                    console.error('EventSignal#destructor: async _calculateValue: error:', error);
                });
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this._finaleValue = void 0;
        }

        /**
         * Удаляем подписки на другие EventSignal.
         */
        for (const eventName of _subscriptionsToDeps) {
            signalEventsEmitter.removeListener(eventName, _setNeedToCompute);
        }

        _subscriptionsToDeps.clear();

        if (_initialComputations && _sourceEmitterRef) {
            const _sourceEmitter = _sourceEmitterRef.deref();

            if (_sourceEmitter) {
                for (const { 0: event, 1: _initialComputation } of _initialComputations) {
                    _eventTargetAgnosticRemoveListener(_sourceEmitter, event, _initialComputation);
                }
            }

            _initialComputations.length = 0;
        }

        this._hasSourceEmitter = false;
        this._sourceValue = void 0;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore readonly attribute
        this._sourceEmitterRef = void 0;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore readonly attribute
        this._sourceMapFn = void 0;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore readonly attribute
        this._sourceFilterFn = void 0;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore readonly attribute
        this._initialComputations = void 0;

        // // todo: Если будет реализован EventSignal._setComponentOnDestroy, то это нужно убрать
        // if (Object.hasOwn(this, 'type')) {
        //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        //     // @ts-ignore ignore `TS2704: The operand of a 'delete' operator cannot be a read-only property.`
        //     delete this.type;
        // }

        if (_abortSignal) {
            _abortSignal.removeEventListener('abort', this._abortHandler);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this._abortSignal = void 0;
        }

        // todo: Рассмотреть возможность вызывать Promise.resolve() с finaleValue если this.isDestroyed
        this._rejectPromiseIfDestroyed();

        /**
         * Удаляем подписки ДРУГИХ сигналов на этот EventSignal.
         */
        signalEventsEmitter.removeAllListeners(_signalSymbol);
        /**
         * Удаляем подписки которые были повешены в функции [on]{@link on}.
         */
        subscribersEventsEmitter.removeAllListeners(_signalSymbol);
    }

    [Symbol.dispose]() {
        this.destructor();
    }

    private _abortHandler = () => {
        this.destructor();
    };

    get eventName() {
        return this._signalSymbol;
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

    private _calculateValue(ignoreComputation?: boolean): Promise<T> | T | undefined {
        const {
            _sourceValue,
        } = this;

        if (this.hasComputation && !ignoreComputation) {
            const prevValue = this._value;

            if (!!prevValue && typeof prevValue === 'object' && typeof prevValue["then"] === 'function') {
                // eslint-disable-next-line promise/prefer-await-to-then
                return this._awaitForCurrentValue(prevValue, true).then(() => {
                    return this._calculateValue(ignoreComputation);
                }) as Promise<T>;
            }

            if (currentSignal === this) {
                throw new Error(`Depends on own value`);
            }

            if (this._nowInComputing) {
                throw new Error(`Now in computing state (cycle deps?)`);
            }

            const _computation = this._computation as NonNullable<EventSignal<T, S, D>["_computation"]>;
            const prev_currentSignal = currentSignal;

            //todo: Сделать у EventSignal состояние со значениями PENDING и DONE, а также свойства-объекты типа
            // EventSignal, которые будут изменяться каждый раз при смене этих состояний.
            // А для AsyncEventSignal добавляться ещё свойства-объекты типа EventSignal для FAIL и FINALLY.
            // Это может быть сделано по подобию `createEffect` у effector.
            //
            // eslint-disable-next-line unicorn/no-this-assignment
            currentSignal = this;

            this._nowInComputing = true;

            try {
                const newValue = _computation(prevValue, _sourceValue, this.data);

                this._isNeedToCompute = false;

                // fixme: Async computation is experimental!
                //  И сейчас есть проблема со значением currentSignal, потому что если внутри _computation
                //  есть несколько EventSignal каждый из которых вызывается в асинхронно, то:
                //  1. В лучшем случае, мы не подпишемся ни на какие EventSignal
                //  2. В нормальном случае, подпишемся только на те, которые вызывались синхронно в первой части асинхронной функции
                //  3. В худшем случае, МЫ ПОДПИШЕМСЯ НА СЛУЧАЙНЫЙ EventSignal который в этот момент исполнялся
                if (!!newValue && typeof newValue === 'object' && typeof newValue["then"] === 'function') {
                    // Async computation DRAFT support
                    // todo: Это очень простая реализация async computation. Тут не учитывается много моментов:
                    //  1. Если у нас есть заведённый Promise с текущей async computation и нужно сделать новый.
                    //  2. Если у нас есть несколько идущих одновременно async computation, то завершаться они могут быть
                    //     в разной последовательности, не в том же порядке, в каком вызывались, поэтому, нужно испрользовать
                    //     только newValue ОТ САМОГО ПОСЛЕДНЕГО вызова async computation в качестве `this._value`.
                    //  3. Как ПРАВИЛЬНО обрабатывать .catch?
                    //  4. Асинхронный .set() ?
                    //  5. ...
                    // eslint-disable-next-line promise/prefer-await-to-then
                    return (newValue as unknown as { then(onFulfilled: (a: T) => T): Promise<unknown> }).then((newValue) => {
                        if (newValue !== void 0
                            && (
                                typeof newValue === 'object'
                                || !Object.is(prevValue, newValue)
                            )
                        ) {
                            this._version++;
                            this._value = newValue;
                            this._resolveIfNeeded(newValue);

                            subscribersEventsEmitter.emit(this._signalSymbol, newValue);
                        }

                        return newValue;
                        // eslint-disable-next-line promise/prefer-await-to-then,promise/prefer-await-to-callbacks
                    }).catch(error => {
                        console.error('EventSignal: async computation: error:', error);

                        return this._value;
                    }) as Promise<T>;
                }

                if (newValue !== void 0
                    && (
                        typeof newValue === 'object'
                        || !Object.is(prevValue, newValue)
                    )
                ) {
                    this._version++;
                    this._value = newValue;
                    this._resolveIfNeeded(newValue);

                    subscribersEventsEmitter.emit(this._signalSymbol, newValue);
                }
            }
            finally {
                currentSignal = prev_currentSignal;
                this._nowInComputing = false;
                this._computationsCount++;
            }
        }
        else {
            this._isNeedToCompute = false;

            // note: If prevValue is Promise here, we really dont care
            const prevValue = this._value;
            let newValue: T | undefined;

            if (_sourceValue !== void 0) {
                newValue = _sourceValue as unknown as T;
            }

            if (!this._nowInSettings && newValue !== void 0) {
                if (!Object.is(prevValue, newValue)) {
                    this._version++;
                    this._value = newValue;
                    this._nowInSettings = true;

                    try {
                        this._resolveIfNeeded(newValue);

                        subscribersEventsEmitter.emit(this._signalSymbol, newValue);
                    }
                    finally {
                        this._nowInSettings = false;
                    }
                }
            }
        }
    }

    get = () => {
        if (this.isDestroyed) {
            if (currentSignal && currentSignal !== this) {
                // todo: currentSignal._unsubscribeFrom(this._signalSymbol);
                void 0;
            }

            return this._value;
        }

        if (currentSignal && currentSignal !== this) {
            currentSignal._subscribeTo(this._signalSymbol);
        }

        if (this._isNeedToCompute) {
            const maybePromise = this._calculateValue();

            if (maybePromise) {
                // todo: Это только набросок поддержки async computation. Он не доделан.
                //  Поэтому, НЕЛЬЗЯ у get() делать в типизации в качестве возвращаемого значения Promise.
                //  Если и делать Promise у get() то только через generic или перегрузку.
                return maybePromise as T;
            }
        }

        return this._value;
    };

    set(setter: (prev: T, sourceValue: S, data: D) => S): void;
    set(newSourceValue: S): void;
    set(newSourceValue: S | ((prev: T, sourceValue: S, data: D) => S)) {
        if (this.isDestroyed) {
            return;
        }

        if (typeof newSourceValue === 'function') {
            const currentValue = this.get();
            const currentSourceValue = (this._sourceValue !== void 0 ? this._sourceValue : currentValue) as S;
            const _newSourceValue = (newSourceValue as ((prev: T, sourceValue: S, data: D) => S))(this.get(), currentSourceValue, this.data);

            if (this._setSourceValue(_newSourceValue, true)) {
                this._recalculateIfNeeded();
            }
        }
        // todo: Рассмотреть возможность возвращать true если что-то изменилось
        else if (this._setSourceValue(newSourceValue, true)) {
            this._recalculateIfNeeded();
        }
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

    private _setSourceValue(newSourceValue: S | undefined, checkValueIsSame = false) {
        const { _sourceValue } = this;

        if (newSourceValue !== void 0
            && (!checkValueIsSame || (
                typeof _sourceValue === 'object'
                || !Object.is(newSourceValue, _sourceValue)
            ))
        ) {
            this._sourceValue = newSourceValue;
            this._isNeedToCompute = true;

            signalEventsEmitter.emit(this._signalSymbol);

            return true;
        }

        return false;
    }

    toString() {
        return this.get();
    }

    valueOf() {
        return this.get();
    }

    private _recalculateIfNeeded() {
        if (this._checkPendingState()) {
            if (!this._recalcPromise) {
                // call recalculation in microtask
                this._recalcPromise = Promise.resolve()
                    // eslint-disable-next-line promise/prefer-await-to-then
                    .then(() => {
                        this._recalcPromise = void 0;

                        // call new recalculation value:
                        //  1. resolving pending promises
                        //  2. trigger new changes event to subscribers
                        this.get();
                        // eslint-disable-next-line promise/prefer-await-to-then,promise/prefer-await-to-callbacks
                    }).catch(error => {
                        // todo: Не выводить ошибку в консоль, а кидать в signalEventsEmitter событие 'signalError' в
                        //  котором должен бы обработчик для этого события.
                        console.error('EventSignal: #get: error:', error);
                    })
                ;
            }
        }
    }

    private _checkPendingState() {
        return !(!this._resolve && !subscribersEventsEmitter.hasListener(this._signalSymbol));
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
        if (!this.isDestroyed) {
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

        if (this._reject) {
            const { description } = this._signalSymbol;

            this._reject(new Error(`EventSignal object is destroyed${description ? ` (${description})` : ''}`));

            this._resolve = void 0;
            this._reject = void 0;
            this._promise = void 0;
        }
    }

    toPromise(onFulfilled?: (result: T) => void, onRejected?: (error: unknown) => void) {
        let currentPromise: typeof this._promise;

        if (this._promise) {
            currentPromise = this._promise;
        }
        else {
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
        while (!this.isDestroyed) {
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
        const { _subscriptionsToDeps } = this;
        const hasSubscription = _subscriptionsToDeps.has(signalSymbol);

        if (this.isDestroyed) {
            if (hasSubscription) {
                _subscriptionsToDeps.delete(signalSymbol);
            }

            return;
        }

        if (!hasSubscription) {
            _subscriptionsToDeps.add(signalSymbol);

            // todo:
            //  1. В конструкторе EventSignal может приходить кастомный EventsEmitter.
            //  2. Когда в EventsEmitterEx будет реализован третий параметр, передевать:
            //    2.1. cleanupCallback(onTeardown) - коллбек, который должен вызываться, когда этот listener удаляется
            //    2.2. weakSpyOnTarget - объект, который нужно добавить в WeakMap и при удалении которого GC мы должны удалить listener (это будет проверять setInterval каждые 2-5 минут).
            signalEventsEmitter.addListener(signalSymbol, this._setNeedToCompute);
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
    ): EventSignal.Subscription;
    protected _addListener(
        ignoredEventName: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void) | undefined,
        listener: ((newValue: T) => void) | undefined,
        once?: boolean,
        prepend?: boolean,
    ): EventSignal.Subscription | EventSignal<T, S, D>;
    protected _addListener(
        ignoredEventName: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void) | undefined,
        listener: ((newValue: T) => void) | undefined,
        once = false,
        prepend = false,
    ): EventSignal.Subscription | EventSignal<T, S, D> {
        let shouldReturnThis = false;

        if (typeof ignoredEventName === 'function') {
            listener = ignoredEventName;
            ignoredEventName = void 0;
        }
        else {
            shouldReturnThis = true;
        }

        if (this.isDestroyed) {
            if (shouldReturnThis) {
                return this;
            }

            return {
                unsubscribe: _noop,
                closed: true,
            };
        }

        _checkListener<(newValue: T) => void>(listener);

        if (ignoredEventName !== undefined
            && ignoredEventName !== ''
            && ignoredEventName !== 'change'
            && ignoredEventName !== 'changed'
        ) {
            if (ignoredEventName === 'error') {
                // ignore "error" subscription for now (not implemented yet)
                return this;
            }

            throw new Error(`Invalid "ignoredEventName". Should be undefined or one of ["", "change", "changed", "error"] but "${String(ignoredEventName)}" found`);
        }

        const eventName = this._signalSymbol;

        if (once) {
            if (prepend) {
                subscribersEventsEmitter.prependOnceListener(eventName, listener);
            }
            else {
                subscribersEventsEmitter.once(eventName, listener);
            }
        }
        else {
            if (prepend) {
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
        const unsubscribe = () => {
            closed = true;

            this._removeListener(ignoredEventName, listener);
        };

        return {
            // Cancels the subscription
            unsubscribe,
            // A boolean value indicating whether the subscription is closed
            get closed() {
                return closed;
            },
        };
    }

    protected _removeListener(
        ignoredEventName: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void) | undefined,
        listener: ((newValue: T) => void) | undefined,
    ): EventSignal<T, S, D> | undefined {
        let shouldReturnThis = false;

        if (typeof ignoredEventName === 'function') {
            listener = ignoredEventName;
            ignoredEventName = void 0;
        }
        else {
            shouldReturnThis = true;
        }

        if (this.isDestroyed) {
            if (shouldReturnThis) {
                return this;
            }

            return;
        }

        _checkListener<(newValue: T) => void>(listener);

        if (ignoredEventName !== undefined && ignoredEventName !== '' && ignoredEventName !== 'change' && ignoredEventName !== 'changed') {
            if (ignoredEventName === 'error') {
                // ignore "error" subscription
                return;
            }

            throw new Error(`Invalid "ignoredEventName". Should be undefined or one of ["", "change", "changed", "error"] but "${String(ignoredEventName)}" found`);
        }

        subscribersEventsEmitter.removeListener(this._signalSymbol, listener);
    }

    once(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    once(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    once(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._addListener(arg1, arg2, true);
    }

    on(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    on(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    on(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._addListener(arg1, arg2);
    }

    addListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    addListener(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    addListener(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._addListener(arg1, arg2);
    }

    prependListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    prependListener(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    prependListener(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._addListener(arg1, arg2, false, true);
    }

    prependOnceListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    prependOnceListener(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    prependOnceListener(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._addListener(arg1, arg2, true, true);
    }

    off(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    off(callbackFn: (newValue: T) => void): void;
    off(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._removeListener(arg1, arg2);
    }

    removeListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    removeListener(callbackFn: (newValue: T) => void): void;
    removeListener(arg1: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void), arg2?: (newValue: T) => void) {
        return this._removeListener(arg1, arg2);
    }

    emit(ignoredEventName: EventSignal.IgnoredEventNameForListeners, ...argumentsToBeIgnored: unknown[]): EventSignal<T, S, D>;
    emit(): void;
    emit(ignoredEventName?: EventSignal.IgnoredEventNameForListeners): EventSignal<T, S, D> | undefined {
        let shouldReturnThis = false;

        if (typeof ignoredEventName !== 'undefined') {
            shouldReturnThis = true;
        }

        if (this.isDestroyed) {
            if (shouldReturnThis) {
                return this;
            }

            return;
        }

        if (ignoredEventName !== undefined && ignoredEventName !== '' && ignoredEventName !== 'change' && ignoredEventName !== 'changed') {
            if (ignoredEventName === 'error') {
                // ignore "error" emitting
                return;
            }

            throw new Error(`Invalid "ignoredEventName". Should be undefined or one of ["", "change", "changed", "error"] but "${String(ignoredEventName)}" found`);
        }

        // call new recalculation value:
        //  1. resolving pending promises
        //  2. trigger new changes event to subscribers
        this.get();

        if (shouldReturnThis) {
            return this;
        }
    }

    /**
     * todo: add overload: subscribe = (subscriptionObserver: {
     *   next: (value: T) => void,
     *   error: (error: any) => void,
     *   complete: () => void,
     *  }, subscribeOptions?: { signal: AbortSignal }) => {}
     * Alternative for {@link addListener}
     * @returns - unsubscribe callback.
     */
    subscribe = (func: () => void, /*subscribeOptions?: { signal: AbortSignal })*/) => {
        if (!(typeof (func as unknown) === 'function')) {
            return _noop;
        }

        const { unsubscribe } = this._addListener(func);

        return unsubscribe;
    };

    get version() {
        return this._version;
    }

    get computationsCount() {
        return this._computationsCount;
    }

    /**
     * Use it as for React key.
     *
     * * React key must be string (can't be Symbol).
     * * React keys don't need to be unique globally.
     */
    get key() {
        return this.id.toString(36);
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
    createMethod<INPUT=void>(computation: (currentValue: T, input: INPUT extends void ? undefined : INPUT, currentSourceValue: S, data: D) => S) {
        return (input: INPUT) => {
            const currentValue = this._value;
            const { _sourceValue } = this;
            const currentSourceValue = _sourceValue !== void 0 ? _sourceValue : (currentValue as unknown as S);
            const newSourceValue = computation(currentValue, input as (INPUT extends void ? undefined : INPUT), currentSourceValue, this.data);

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
        return new EventSignal<CR, S>(void 0 as CR, () => {
            return computation(this.get());
        });
    }

    setReactFC(reactFC?: EventSignal.NewOptions<T, S, D>["reactFC"] | false) {
        const prev = this._reactFC;

        this._reactFC = [ reactFC ];

        return prev;
    }

    static createSignal<T>(initialValue: T): EventSignal<T, T>;
    static createSignal<T, S, D>(initialValue: T, computation: EventSignal.ComputationWithSource<T, S, D>, options?: EventSignal.NewOptions<T, S, D> | EventSignal.NewOptionsWithSource<T, S, D>): EventSignal<T, S, D>;
    static createSignal<T, S, D>(initialValue: T, options: EventSignal.NewOptionsWithSource<T, S, D>): EventSignal<T, S, D>;
    static createSignal<T, S, D>(initialValue: T, options: EventSignal.NewOptions<T, S, D>): EventSignal<T, T>;
    static createSignal<T, S, D>(
        initialValue: T,
        computationOrOptions?: EventSignal.ComputationWithSource<T, S, D> | EventSignal.NewOptions<T, S, D> | EventSignal.NewOptionsWithSource<T, S, D>,
        options?: EventSignal.NewOptions<T, S, D>,
    ): EventSignal<T, S, D> {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
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

    declare static initReact;
    //todo: Сейчас не работает
    // declare private static _setComponentOnDestroy;

    //todo:
    // export function reactUseSignal<T>(value: T) {
    // 	return useMemo(() => new EventSignal<T>(value), []);
    // }

    static {
        type SetStateAction<S> = S | ((prevState: S) => S);
        type Dispatch<A> = (value: A) => void;
        // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/942c50bb4d57679ca1dcb210f4984b41e7bbfdbb/types/react/v17/index.d.ts#L920
        type UseStateFunc = <S>(initialState: S | (() => S)) => [S, Dispatch<SetStateAction<S>>];
        type EffectCallback = () => ((() => void) | void);
        // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/942c50bb4d57679ca1dcb210f4984b41e7bbfdbb/types/react/v17/index.d.ts#L1082
        type UseEffectFunc = (effect: EffectCallback, deps?: readonly any[]) => void;
        // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/d5a5c3b0ef50b7277750ed631c3d640b27272143/types/react/index.d.ts#L2161
        type UseSyncExternalStore = (
            subscribe: (onStoreChange: () => void) => () => void,
            getSnapshot: () => any,
            getServerSnapshot?: () => any,
        ) => any;

        let _ReactFragment: symbol;
        let _ReactMemo: symbol;
        let _React_createElement: ((
            type: Function | string | symbol,
            props?: Object | null,
            ...children: Object[]
        ) => Object) | undefined;
        let _React_memo: ((
            type: Function | string | symbol,
            compare?: Function,
        ) => Object) | undefined;
        let _useEffectImplementation: UseEffectFunc = function() {
            console.warn('warning: "useEffect" for EventSignal is not set. Please use `EventSignal.initReact({ useEffect, useState })`.');
        };
        let _useStateImplementation: UseStateFunc = function() {
            console.warn('warning: "useState" for EventSignal is not set. Please use `EventSignal.initReact({ useEffect, useState })`.');

            let value: any;

            return [ value, (newValue: any) => void (value = newValue) ];
        };
        let _useSyncExternalStore: UseSyncExternalStore | undefined;

        this.initReact = function(hooks: {
            useEffect: UseEffectFunc,
            useState: UseStateFunc,
        } |  {
            useSyncExternalStore: UseSyncExternalStore,
            createElement?: typeof _React_createElement,
            memo?: typeof _React_createElement,
        }) {
            if ('useSyncExternalStore' in hooks) {
                _useSyncExternalStore = hooks.useSyncExternalStore;

                if (hooks.createElement) {
                    _React_createElement = hooks.createElement;
                }
                if (hooks.memo) {
                    _React_memo = hooks.memo;

                    Object.defineProperties(this.prototype, {
                        type: {
                            configurable: true,
                            value: _React_memo(EventSignalComponent),
                        },
                    });
                }
            }
            else {
                _useEffectImplementation = hooks.useEffect;
                _useStateImplementation = hooks.useState;
            }

            _ReactFragment = Symbol.for('react.fragment');
            _ReactMemo = Symbol.for('react.memo');
        };

        /*//todo: Сейчас не работает
        / **
         * A wrapper component that renders a EventSignal's value directly as a Text node or JSX.
         * /
        const EventSignalDestroyedComponent = function EventSignalDestroyedComponent({ signal }: { eventSignal: EventSignal<any> }) {
            const componentType = signal._componentType;
            const reactFC = signal._reactFC ?? (componentType !== void 0 ? _getReactFunctionComponent(componentType) : void 0);
            const has_reactFC = reactFC != null && (reactFC as unknown) !== false;

            if (has_reactFC) {
                return reactFC({ signal });
            }
        };

        this._setComponentOnDestroy = function(eventSignal: EventSignal<any, any, any>) {
            void Object.defineProperty(signal, 'type', {
                configurable: true,
                value: EventSignalDestroyedComponent,
            });
        };
        */
        const memorizedComponents = new WeakMap<Function, Function>();
        const memorizedComponents_emplaceHandler = Object.setPrototypeOf({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore
            insert(key) {
                return _React_memo ? _React_memo(key) : key;
            },
        }, null);

        /**
         * A wrapper component that renders a EventSignal's value directly as a Text node or JSX.
         */
        function EventSignalComponent({ eventSignal }: { eventSignal: EventSignal<any> }) {
            const { componentType } = eventSignal;
            const reactFCDescriptor = Boolean(_React_createElement)
                ? eventSignal._reactFC ?? (componentType !== void 0 ? _getReactFunctionComponent(componentType) : void 0)
                : void 0
            ;
            const reactFC = reactFCDescriptor?.[0];
            const has_reactFC = reactFC != null && reactFC !== false;
            const preDefinedProps = has_reactFC ? reactFCDescriptor?.[1] : void 0;

            // todo: Разобраться, что делать для обработки ошибок, которые могут возникать внутри
            //  computation-функций. Тут в _useSyncExternalStore передаётся ссылка на `signal.get`.
            //  Это лишает нас возможности тут же по месту обрабатывать ошибки,
            //  которые будут при вызове `signal.get`. Надо подумать, как сделать лучше.
            if (_useSyncExternalStore) {
                //todo: Как обрабатывать ошибки:
                // 1. Сделать метод: EventSignal.getLast который будет возвращать _value без перевычисления (будет перевычесленно, только если это самое первое обращение к _value).
                // 2. Тут в try/catch вызывать eventSignal.get, если он упал с ошибкой, то запоминать ошибку
                // 3. В любом случае, вызывать _useSyncExternalStore(eventSignal.subscribe, eventSignal.getLast);
                // 4. Если на 2м этапе была ошибка, то рендерить специальный компонент, который отвечает за отображение ошибок
                //todo: Как обрабатывать async computation:
                // 1. Метод getLast должен быть сделан
                // 2. Если вызов eventSignal.get вернул Promise, значит это async computation
                // 3. В любом случае, вызывать _useSyncExternalStore(eventSignal.subscribe, eventSignal.getLast);
                // 4. Если это самый первый вызов async computation и в _value ещё ничего нет, то рендерить тут специальный компонент для отображения прогресса
                // 5. Когда async computation завершиться и значение будет получено, то компонент сам перерендериться
                //
                // https://react.dev/reference/react/useSyncExternalStore
                const signalValue = _useSyncExternalStore(eventSignal.subscribe, eventSignal.get);

                if (has_reactFC) {
                    const { key, version } = eventSignal;
                    const memorizedReactFC = _React_memo && (reactFC["$$typeof"] !== _ReactMemo)
                        ? memorizedComponents.emplace(reactFC, memorizedComponents_emplaceHandler)
                        : reactFC
                    ;
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const children = _React_createElement!(memorizedReactFC, { key, eventSignal, version, componentType, ...preDefinedProps });

                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    return _React_createElement!(_ReactFragment, null, children);
                }

                if (typeof signalValue === 'object' && signalValue) {
                    return JSON.stringify(signalValue);
                }

                return signalValue;
            }
            else {
                // todo: Разобраться, что делать для обработки ошибок, которые могут возникать внутри
                //  computation-функций. Тут в _useStateImplementation специально передаётся ссылка на `signal.get`
                //  для того, чтобы не создавать каждый раз стрелочную функцию при вызове этого React-компонета,
                //  которая вызоветься только один раз как initializer function.
                //  Однако описанная выше оптимизация лишает нас возможности тут же по месту обрабатывать ошибки,
                //  которые будут при вызове `signal.get`. Надо подумать, как сделать лучше.
                const { 0: signalValue, 1: setSignalValue } = _useStateImplementation<ReturnType<typeof eventSignal.get>>(eventSignal.get);

                _useEffectImplementation(() => {
                    const listener = () => {
                        // todo: Add try/catch/finally?
                        setSignalValue(eventSignal.get());
                    };

                    eventSignal.addListener(listener);

                    return () => {
                        eventSignal.removeListener(listener);
                    };
                }, []);

                if (has_reactFC) {
                    return reactFC({ eventSignal, version: eventSignal.version });
                }

                return signalValue;
            }
        }
        // Один из вариантов обработки ошибок:
        /*
        const EventSignalComponent = function EventSignalComponent({ eventSignal }: { eventSignal: EventSignal<any> }) {
            const { 0: signalValue, 1: setSignalValue } = _useStateImplementation<ReturnType<typeof eventSignal.get>>(eventSignal.get);
            const { 0: signalErrorValue, 1: setSignalErrorValue } = _useStateImplementation<string>('');

            _useEffectImplementation(() => {
                const listener = () => {
                    setSignalValue(eventSignal.get());
                };
                const errorListener = (error) => {
                    console.error(error);
                    setSignalErrorValue(String(error));
                }
                signal.addListener('error', errorListener);
                signal.addListener(listener);

                return () => {
                    signal.removeListener('error', errorListener);
                    signal.removeListener(listener);
                };
            }, []);

            if (signalErrorValue) return signalErrorValue;

            return signalValue;
        };
        */

        // Decorate Signals so React renders them as <EventSignalComponent> components. - https://github.com/preactjs/signals/blob/10e13d3a67e796873c2d4ddc6d04cd8d8705194b/packages/react/runtime/src/index.ts#L354
        // See "_useSignalsImplementation" in preactjs/signals https://github.com/preactjs/signals/blob/10e13d3a67e796873c2d4ddc6d04cd8d8705194b/packages/react/runtime/src/index.ts#L323
        Object.defineProperties(this.prototype, {
            $$typeof: {
                configurable: true,
                // https://github.com/facebook/react/blob/346c7d4c43a0717302d446da9e7423a8e28d8996/packages/shared/ReactSymbols.js#L15
                value: Symbol.for("react.element"),
            },
            type: {
                configurable: true,
                value: EventSignalComponent,
            },
            props: {
                configurable: true,
                get() {
                    return { eventSignal: this };
                },
            },
            defaultProps: {
                configurable: true,
                get() {
                    return { eventSignal: this };
                },
            },
            ref: { configurable: true, value: null },
        });
    }

    static registerReactComponentForComponentType<
        T=unknown,
        S=T,
        D=unknown,
        CT extends Object | number | string | symbol | undefined=EventSignal.NewOptions<T, S, D>["componentType"],
        PROPS extends {
            eventSignal: EventSignal<T, S, D>,
            version?: number,
            componentType?: CT,
        } = {
            eventSignal: EventSignal<T, S, D>,
            version?: number,
            componentType?: CT,
            [key: string]: unknown,
        },
    >(
        componentType: CT,
        reactFC: (props: PROPS) => any,
        preDefinedProps?: Omit<PROPS, 'componentType' | 'eventSignal' | 'version'>,
    ) {
        return _setReactFunctionComponent(componentType, reactFC, preDefinedProps);
    }
    /*
    // Optimized: Will update the text node directly
    function Counter() {
        return (
            <p>
                <>Value: {count}</>// count is EventSignal with `EventSignal.prototype.$$typeof == ReactElemType`
            </p>
        );
    }
    */
}

export namespace EventSignal {
    // export type AsyncComputationWithSource<T, S, D> = {
    //     async (prevValue: T, sourceValue: R | undefined, data: D): T | undefined,
    // } | void;
    export type ComputationWithSource<T, S, D> = (prevValue: T, sourceValue: S | undefined, data: D) => T | void;

    export type NewOptions<T, S, D> = {
        description?: string,
        /**
         * Value after [EventSignal]{@link EventSignal} destroyed.
         */
        finaleValue?: T,
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
        componentType?: Object | number | string | symbol | undefined,
        reactFC?: (props: {
            eventSignal: EventSignal<T, S, D>,
            version: number,
            [key: string]: unknown,
        }) => any,
        //todo:
        // methods: {
        //   increment<number | void>(prevValue, arg = 1) { return prevValue + arg; },
        //   decrement<number | void>(prevValue, arg = 1) { return prevValue - arg; },
        //   setFromDOMEvent(prevValue, event: React.ChangeEvent<HTMLInputElement>) { return String(event.target.value || ''); },
        // }
        // // comes to signal._.increment and signal._.decrement, signal._.setFromDOMEvent
    };
    export type NewOptionsWithSource<T, S, D> = NewOptions<T, S, D> & {
        sourceEmitter: EventEmitter | EventEmitterEx | EventTarget | undefined,
        // todo: добавить sourceMapAndFilter, который может быть использован вместо пары sourceMap/sourceFilter
        sourceEvent: (number | string | symbol)[] | number | string | symbol,
        sourceMap?: (event: number | string | symbol, ...args: any[]) => S,
        sourceFilter?: (event: number | string | symbol, ...args: any[]) => boolean,
        //todo:
        // // this function can throw Error
        // validateSourceValue?: (newSourceValueBeforeApply: S) => boolean,
        // // this function can throw Error
        // validateValue?: (newValueBeforeApply) => boolean,
    };

    /**
     * * Only valid values: '' | 'change' | 'changed' | 'error'.
     * * All other values will rise TypeError.
     */
    export type IgnoredEventNameForListeners = string | symbol | '' | 'change' | 'changed' | 'error';

    export type Subscription = {
        // Cancels the subscription
        unsubscribe: () => void,
        // A boolean value indicating whether the subscription is closed
        closed: boolean,
    };
}

const _reactFunctionComponentByComponentType_WeakMap = new WeakMap();
const _reactFunctionComponentByComponentType_Map = new Map<number | string, [ reactFC: (props: any) => any, preDefinedProps?: Object ]>();

function _getReactFunctionComponent(componentType: EventSignal.NewOptions<any, any, any>["componentType"]) {
    const type = typeof componentType;

    if (componentType === null || type === 'undefined') {
        return null;
    }

    if (type === 'object' || type === 'symbol') {
        return _reactFunctionComponentByComponentType_WeakMap.get(componentType as Object) as (props: any) => any | null || null;
    }

    return _reactFunctionComponentByComponentType_Map.get(componentType as number | string) || null;
}

function _setReactFunctionComponent(
    componentType: EventSignal.NewOptions<any, any, any>["componentType"],
    reactFC?: (props: any) => any,
    preDefinedProps?: Object,
) {
    const type = typeof componentType;

    if (componentType === null || type === 'undefined') {
        return null;
    }

    if (type === 'object' || type === 'symbol') {
        const prev = _reactFunctionComponentByComponentType_WeakMap.get(componentType as Object) as (props: any) => any;

        if (reactFC == null) {
            _reactFunctionComponentByComponentType_WeakMap.delete(componentType as Object);
        }
        else {
            _reactFunctionComponentByComponentType_WeakMap.set(componentType as Object, [ reactFC, preDefinedProps ]);
        }

        return prev || null;
    }

    const prev = _reactFunctionComponentByComponentType_Map.get(componentType as number | string);

    if (reactFC == null) {
        _reactFunctionComponentByComponentType_Map.delete(componentType as number | string);
    }
    else {
        _reactFunctionComponentByComponentType_Map.set(componentType as number | string, [ reactFC, preDefinedProps ]);
    }

    return prev || null;
}

const kTargetListener = Symbol('kTargetListener');

/** @private */
function _eventTargetAgnosticAddListener<T>(
    emitter: EventEmitter | EventTarget,
    name: number | string | symbol,
    listener: (newValue: T) => void,
    flags?: { once?: boolean },
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
        const eventName = typeof name === 'symbol' ? String(`symbol----${String(name)}`) : name as string;

        (emitter as EventTarget).addEventListener(eventName, listener as (() => void), flags);
    }
    else {
        throw new TypeError(`Invalid type of "emitter". Should be EventEmitter or EventTarget`);
    }
}

/** @private */
function _eventTargetAgnosticRemoveListener<T>(emitter: EventEmitter | EventTarget, name: number | string | symbol, listener: (newValue: T) => void) {
    if (typeof (emitter as EventEmitter).removeListener === 'function') {
        (emitter as EventEmitter).removeListener(name as string, listener);
    }
    else if (typeof (emitter as EventTarget).removeEventListener === 'function') {
        const eventName = typeof name === 'symbol' ? String(`symbol----${String(name)}`) : name as string;
        const compatibleListener = listener[kTargetListener] || listener;

        (emitter as EventTarget).removeEventListener(eventName, compatibleListener);
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
//         const eventName = typeof name === 'symbol' ? String(`symbol----${String(name)}`) : name as string;
//
//         (emitter as EventTarget).dispatchEvent(new CustomEvent<unknown>(eventName, {
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

function _noop() {
    // nothing
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
        //  Chrome: TypeError: Method WeakRef.prototype.deref called on incompatible receiver #<WeakRef>
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

function _weakRefFabric<O = Object | symbol>(target: O): { deref(): O | undefined } {
    if (typeof target === 'symbol' ? _WeakRef_symbols_support : _WeakRef_native_support) {
        return new WeakRef(target as Object) as unknown as { deref(): O | undefined };
    }

    return Object.setPrototypeOf({
        __value: target,
    }, __FakeWeakRef_proto__) as { deref(): O | undefined };
}

// todo: Не экспортировать signalEventsEmitter, а сделать отдельные методы, которые будут давать информацию о его состоянии.
export const __test__get_signalEventsEmitter = isTest ? () => signalEventsEmitter : void 0 as unknown as (() => typeof signalEventsEmitter);
export const __test__get_subscribersEventsEmitter = isTest ? () => subscribersEventsEmitter : void 0 as unknown as (() => typeof subscribersEventsEmitter);
