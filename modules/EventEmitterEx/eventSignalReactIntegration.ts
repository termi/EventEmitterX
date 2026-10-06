import type { EventSignal } from "./EventSignal";
import type { EventSignal_ReactCopy } from "./EventSignal_types";
import { isTest } from 'termi@runEnv';
import { isUniqueSymbol } from 'termi@type_guards';
import { EventEmitterX } from "../events";
import { arrayContentStringify, stringifyWithCircularHandle, isRunningInWebDevMode } from "./utils";
import { createEventSignalMagicContext, getReactFunctionComponentFromMagicContext } from "./view_utils";
import { _awaitNextAnimationFrame, _unAwaitNextAnimationFrame } from "./animationFrameScheduler";

const isReactDev = isRunningInWebDevMode();
function _noop() {}

export interface EventSignalReactBridge {
    weakCallback<F extends (...args: any[]) => any>(signal$: EventSignal<any, any, any, any>, callback: F): F;
    releaseWeakCallback(signal$: EventSignal<any, any, any, any>, callback: (...args: any[]) => any): void;
    trackCleanup(signal$: EventSignal<any, any, any, any>, cleanup: () => void): void;
    untrackCleanup(signal$: EventSignal<any, any, any, any>, cleanup: () => void): void;
    getDescription(signal$: EventSignal<any, any, any, any>): string | undefined;
    getStoredValue<T, S, D, R>(signal$: EventSignal<T, S, D, R>): T;
    getComponent<T, S, D, R>(signal$: EventSignal<T, S, D, R>): _ComponentDescription<T, S, D, R> | null;
    setComponent<T, S, D, R>(signal$: EventSignal<T, S, D, R>, descriptor: _ComponentDescription<T, S, D, R> | null): void;
    subscribe<T, S, D, R>(signal$: EventSignal<T, S, D, R>, listener: (value: EventSignal.LastValue<T, R>) => void): () => void;
    getComponentVersion(signal$: EventSignal<any, any, any, any>): number;
    incrementComponentVersion(signal$: EventSignal<any, any, any, any>): void;
    arePropsEqual(left: unknown, right: unknown): boolean;
}

export function createEventSignalReact(SignalClass: typeof EventSignal, bridge: EventSignalReactBridge) {
    const hooks: {
        _useSyncExternalStore?: UseSyncExternalStore,
        _useRef?: any, _useState?: any, _useEffect?: any,
        _useLayoutEffect?: any, _useCallback?: any,
        _useDebugValue?: (value: any) => void,
    } = {};
    let contextProvider: unknown;

        const _EventSignal_prototype = SignalClass.prototype;



        // var REACT_PROVIDER_TYPE = Symbol.for("react.provider");

        type _ReactFiber = {
            return: _ReactFiber | null,
            type: () => any,
            pendingProps?: {
                current$?: EventSignal<any>,
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
        let _useEffect: /*UseEffect*/any | undefined;
        let _useDebugValue: ((value: any) => void) | undefined;
        let _EventSignalsContext: undefined | Object & { Provider: Object, _currentValue: Object | undefined };
        let _useContext: (key: Object) => (Object | null) = () => null;

        const initReact = function(this: typeof EventSignal, ReactParam: unknown, ErrorBoundary?: ((
            type: Function | string | symbol,
            props?: Object | null,
            ...children: (Object | null)[]
        ) => Object) | undefined) {
            if (!ReactParam) {
                this._React = void 0;
                hooks._useSyncExternalStore = _useSyncExternalStore = void 0;
                hooks._useRef = void 0;
                hooks._useState = void 0;
                hooks._useEffect = _useEffect = void 0;
                hooks._useLayoutEffect = void 0;
                hooks._useCallback = void 0;
                hooks._useDebugValue = void 0;
                Object.defineProperty(_EventSignal_prototype, 'type', { value: void 0, configurable: true, writable: true });

                _React_createElement = void 0;
                _React_memo = void 0;
                _useContext = () => null;
                _EventSignalsContext = void 0;
                contextProvider = void 0;

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
                hooks._useSyncExternalStore = _useSyncExternalStore = __React.useSyncExternalStore;
                hooks._useRef = __React.useRef;
                hooks._useState = __React.useState;
                hooks._useEffect = _useEffect = __React.useEffect;
                hooks._useLayoutEffect = __React.useLayoutEffect || __React.useEffect;
                hooks._useCallback = __React.useCallback;

                if (isReactDev) {
                    hooks._useDebugValue = _useDebugValue = __React.useDebugValue;
                }

                if (__React.createElement) {
                    _React_createElement = __React.createElement;
                }
                if (__React.memo) {
                    _React_memo = __React.memo;

                    // EventSignal.prototype.type = EventSignalComponent;
                    // this.prototype.type = EventSignalComponent;
                    // this.prototype['type'] = EventSignalComponent;
                    // this.prototype["type"] = EventSignalComponent;
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
                    contextProvider = _EventSignalsContext;
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                    // @ts-ignore
                    contextProvider = _EventSignalsContext.Provider;
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

        const kNoUseHooks = Symbol('kNoUseHooks');
        /**
         * A wrapper component that renders a EventSignal's value directly as a Text node or JSX.
         */
        const EventSignalDestroyedComponent = function EventSignalDestroyedComponent(props: Parameters<typeof EventSignalComponent>[0]) {
            return EventSignalComponent(props, kNoUseHooks);
        };

        const setComponentOnDestroy = function(signal$: EventSignal<any, any, any>) {
            void Object.defineProperty(signal$, 'type', {
                configurable: true,
                value: EventSignalDestroyedComponent,
            });
        };

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
            current$: signal$,
            children,
            sFC,
            sDefaultFC,
            sIgnoreRecursive,
            ...otherProps
        }: {
            current$: EventSignal<any>,
            children?: Object,
            sFC?: EventSignal.ReactFC<any, any, any, any> | false,
            sDefaultFC?: EventSignal.ReactFC<any, any, any, any> | false,
            sIgnoreRecursive?: boolean,
        }, controlSymbol?: symbol) {
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
            const signalValue = signal$.getSyncSafe();
            const { componentType } = signal$;
            const _reactFC = bridge.getComponent(signal$);
            const reactFCDescriptor = sFC === void 0 && Boolean(_React_createElement)
                ? (contextValue ? getReactFunctionComponentFromMagicContext(contextValue, componentType, signal$.status) as (_ComponentDescription<any, any, any, any> | null) : void 0)
                    ?? _reactFC
                    ?? (componentType !== void 0 ? _getReactFunctionComponent(componentType, signal$.status) : void 0)
                : void 0
            ;
            let reactFCDescriptor_0: NonNullable<(typeof reactFCDescriptor)>[0] | null | undefined;
            const reactFC = sFC !== void 0 ? sFC : ((reactFCDescriptor_0 = reactFCDescriptor?.[0]) ?? sDefaultFC);
            const preDefinedProps = reactFCDescriptor_0 ? (reactFCDescriptor as NonNullable<(typeof reactFCDescriptor)>)[1] as Record<any, any> : void 0;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore `TS7053: Element implicitly has an any type because expression of type 2 can't be used to index type`
            const destroyOnUnmount = (reactFCDescriptor ? reactFCDescriptor[2] as { destroyOnUnmount?: boolean } | undefined : void 0)?.destroyOnUnmount
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error `TS7053: Element implicitly has an any type because expression of type 2 can't be used to index type`
                ?? (_reactFC ? _reactFC[2] as { destroyOnUnmount?: boolean } | undefined : void 0)?.destroyOnUnmount
            ;
            let snapshotVersion: string | undefined = void 0;

            if (_useSyncExternalStore) {
                const noUseHooks = controlSymbol === kNoUseHooks;

                if (destroyOnUnmount && !noUseHooks) {
                    // note: _useEffect SHOULD BE defined!
                    _useEffect(signal$.getDispose, [ signal$ ]);
                }

                // https://react.dev/reference/react/useSyncExternalStore
                snapshotVersion = !noUseHooks
                    ? _useSyncExternalStore(signal$.subscribeOnNextRender, signal$.getSnapshotVersion)
                    : signal$.getSnapshotVersion()
                ;

                if (isReactDev && _useDebugValue && !noUseHooks) {
                    _useDebugValue({
                        id: signal$.id,
                        description: bridge.getDescription(signal$),
                        value: bridge.getStoredValue(signal$),
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
                                && currentFiber.pendingProps?.current$?.id === signal$.id
                            ) {
                                console.warn(`warning: recursive render detected while rendering "${reactFC.name}". You may need \`.get()\` to eventSignal?`, signal$, snapshotVersion);

                                break renderReactComponent;
                            }
                        }
                    }

                    const memorizedReactFC: EventSignal.ReactFC<any, any, any, any> = _React_memo && !("$$typeof" in reactFC)
                        ? memorizedComponents.getOrInsertComputed(reactFC, memorizedComponents_onNew)
                        : reactFC
                    ;
                    const { key, version } = signal$;
                    // noinspection UnnecessaryLocalVariableJS
                    const element = _React_createElement!(memorizedReactFC, { // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        key,
                        // @deprecated use current$
                        eventSignal: signal$,
                        current$: signal$,
                        current$Value: signalValue,
                        current$Version: version,
                        current$SnapshotVersion: snapshotVersion,
                        // deprecated
                        version,
                        // deprecated
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
                                key,
                                FallbackComponent: reactFCDescriptor[0],
                                // // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                // fallback: _React_createElement!(reactFCDescriptor[0], {
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
                return _React_createElement!(_ReactFragment, signal$.keyProps, children || null);
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
                    // note: Not using `Object.setPrototypeOf({ current$: this }, null)` for performance reason (awaiting to support hidden classes for null-prototype objects in V8)
                    const props: EventSignal<any, any, any>["props"] = Object.freeze({ current$: this });

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
                    const description = bridge.getDescription(this);
                    const displayName = `EventSignal#${this.id}${description ? `(${description})` : ''}`;

                    return _defineNonEnumValue(this, 'displayName', displayName);
                },
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore allow `__proto__`
                __proto__: null,
            },
            ref: { configurable: true, value: null },
        });

    function use<T, S, D, R, REDUCE_VALUE>(signal$: EventSignal<T, S, D, R>, reducer?: (value: EventSignal.LastValue<T, R>) => REDUCE_VALUE, areReducedValuesEqual?: (prevValue: REDUCE_VALUE, newValue: REDUCE_VALUE) => boolean): EventSignal.LastValue<T, R> | REDUCE_VALUE {
        const { _useSyncExternalStore } = hooks;

        if (_useSyncExternalStore) {
            if (isReactDev) {
                hooks._useDebugValue?.({
                    id: signal$.id,
                    description: bridge.getDescription(signal$),
                    value: bridge.getStoredValue(signal$),
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
             * If computation is async it will trigger next render (via {@link signal$.subscribeOnNextAnimationFrame}).
             */
            signal$.getSyncSafe();

            if (reducer) {
                if (areReducedValuesEqual) {
                    const { 0: reducedValue, 1: setReducedValue } = hooks._useState(() => reducer(signal$.getLast())) as {
                        0: REDUCE_VALUE,
                        1: (newValue: REDUCE_VALUE | ((prevValue: REDUCE_VALUE) => REDUCE_VALUE)) => void,
                    };
                    const scopeRef = hooks._useRef({}) as {
                        current: {
                            reducer: typeof reducer,
                            areReducedValuesEqual: typeof areReducedValuesEqual,
                            reducedValue: typeof reducedValue,
                        },
                    };
                    const scope = scopeRef.current;

                    scope.reducer = reducer;
                    scope.areReducedValuesEqual = areReducedValuesEqual;
                    scope.reducedValue = reducedValue;

                    hooks._useEffect(() => {
                        return signal$.subscribeOnNextAnimationFrame(() => {
                            const scope = scopeRef.current;
                            const newValue = scope.reducer(signal$.getLast());

                            if (!scope.areReducedValuesEqual(scope.reducedValue, newValue)) {
                                setReducedValue(newValue);
                            }
                        });
                    }, [ signal$ ]);

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
                const getSnapshot = hooks._useCallback(() => {
                    if (!reducerResultCache) {
                        queueMicrotask(() => {
                            reducerResultCache = undefined;
                        });
                    }

                    // Mutable value (same object ref as prev value) returned by reducer is not supported (for now?).
                    return reducerResultCache ??= reducer(signal$.getLast());
                }, [ signal$, reducer ]);

                return _useSyncExternalStore(signal$.subscribeOnNextAnimationFrame, getSnapshot);
                // return _useSyncExternalStore(signal$.subscribeOnNextAnimationFrame, () => {
                //     if (!reducerResultCache) {
                //         queueMicrotask(() => {
                //             reducerResultCache = undefined;
                //         });
                //     }
                //
                //     // Mutable value (same object ref as prev value) returned by reducer is not supported (for now?).
                //     return reducerResultCache ??= reducer(signal$.getLast());
                // });
            }

            // Mutable value (same object ref as prev value) is supported by version increment and `return signal$.getLast()`.
            _useSyncExternalStore(signal$.subscribeOnNextAnimationFrame, signal$.getVersion);
        }
        else {
            console.warn('warning: "useSyncExternalStore" for EventSignal is not set. Please use `if (!EventSignal.reactIsInited) EventSignal.initReact(React)`.');

            if (reducer) {
                // Mutable value (same object ref as prev value) returned by reducer is not supported (for now?).
                return reducer(signal$.getLast());
            }
        }

        return signal$.getLast();
    }

    function useListener<T, S, D, R, __RR=EventSignal.LastValue<T, R>>(signal$: EventSignal<T, S, D, R>,
        listener: (newValue: __RR) => void,
        options?: {
            areValuesEqual?: (prevValue: __RR | undefined, newValue: __RR) => boolean,
            deps?: any[],
            // suspend?: boolean, noChanges?: boolean
        }
    ): EventSignal.LastValue<T, R> {
        const { _useLayoutEffect } = hooks;

        if (_useLayoutEffect) {
            const deps = options?.deps;
            const areValuesEqual = options?.areValuesEqual;
            const actualDeps = deps ? [ ...deps, signal$ ] : [ signal$ ];

            if (areValuesEqual) {
                const scopeRef = hooks._useRef({}) as {
                    current: {
                        areValuesEqual: typeof areValuesEqual,
                        value: __RR | undefined,
                    },
                };
                const scope = scopeRef.current;

                scope.areValuesEqual = areValuesEqual;
                scope.value = void 0;

                _useLayoutEffect(() => {
                    const actualListener = (value: __RR) => {
                        if (!scope.areValuesEqual(scope.value ?? value, value)) {
                            scope.value = value;

                            listener(value);
                        }
                    };

                    // if (suspend) return noop;
                    // if (ignoreUpdateReason === signal$.lastUpdateReason) return noop;

                    actualListener(signal$.getLast() as unknown as __RR);

                    // if (noSub) return noop;

                    // Calling `_addListener` with `makeItEasyAndFastAndUseSubscription` flag.
                    return bridge.subscribe(signal$, actualListener as unknown as (newValue: EventSignal.LastValue<T, R>) => void);
                }, actualDeps);
            }
            else {
                _useLayoutEffect(() => {
                    // if (suspend) return noop;
                    // if (ignoreUpdateReason === signal$.lastUpdateReason) return noop;

                    listener(signal$.getLast() as unknown as __RR);

                    // if (noSub) return noop;

                    // Calling `_addListener` with `makeItEasyAndFastAndUseSubscription` flag.
                    return bridge.subscribe(signal$, listener as unknown as (newValue: EventSignal.LastValue<T, R>) => void);
                }, actualDeps);
            }
        }
        else {
            console.warn('warning: "useEffect" for EventSignal is not set. Please use `if (!EventSignal.reactIsInited) EventSignal.initReact(React)`.');
        }

        return signal$.getLast();
    }

    function useReducedListener<T, S, D, R, REDUCED_VALUE, __RR=R>(signal$: EventSignal<T, S, D, R>,
        reducer: (newValue: __RR) => REDUCED_VALUE,
        listener: (newReducedValue: REDUCED_VALUE) => void,
        options?: {
            areReducedValuesEqual?: (prevValue: REDUCED_VALUE | undefined, newValue: REDUCED_VALUE) => boolean,
            deps?: any[],
        }
    ): REDUCED_VALUE {
        const { _useLayoutEffect } = hooks;

        if (_useLayoutEffect) {
            const deps = options?.deps;
            const areReducedValuesEqual = options?.areReducedValuesEqual;
            const actualDeps = deps ? [ ...deps, signal$ ] : [ signal$ ];

            const scopeRef = hooks._useRef({}) as {
                current: {
                    reducer: typeof reducer,
                    areReducedValuesEqual: typeof areReducedValuesEqual,
                    reducedValue: REDUCED_VALUE | undefined,
                },
            };
            const scope = scopeRef.current;

            scope.reducer = reducer;
            scope.areReducedValuesEqual = areReducedValuesEqual;
            scope.reducedValue = undefined;

            _useLayoutEffect(() => {
                const actualListener = (value: __RR) => {
                    if (scope.areReducedValuesEqual) {
                        const reducedValue = reducer(value);

                        if (!scope.areReducedValuesEqual(scope.reducedValue, reducedValue)) {
                            scope.reducedValue = reducedValue;

                            listener(reducedValue);
                        }
                    }
                    else {
                        listener(reducer(value));
                    }
                };

                // if (suspend) return noop;
                // if (ignoreUpdateReason === signal$.lastUpdateReason) return noop;

                actualListener(signal$.getLast() as unknown as __RR);

                // if (noSub) return noop;

                // Calling `_addListener` with `makeItEasyAndFastAndUseSubscription` flag.
                return bridge.subscribe(signal$, actualListener as unknown as (newValue: EventSignal.LastValue<T, R>) => void);
            }, actualDeps);
        }
        else {
            console.warn('warning: "useEffect" for EventSignal is not set. Please use `if (!EventSignal.reactIsInited) EventSignal.initReact(React)`.');
        }

        return reducer(signal$.getLast() as unknown as __RR);
    }

    function subscribeOnNextAnimationFrame<T, S, D, R>(signal$: EventSignal<T, S, D, R>, subscribeToComponentTypeUpdate: boolean, func: () => void/*, subscribeOptions?: {
        signal?: AbortSignal,
        reducer?: (value: EventSignal.LastValue<T, R>, prevValue: any) => any,
    }*/) {
        if (typeof requestAnimationFrame !== 'function') {
            throw new TypeError('"requestAnimationFrame" is not supported in signal$ JS Agent.');
        }

        if (!(typeof (func as unknown) === 'function') || signal$.destroyed) {
            return _noop;
        }

        /*
        const reducer = subscribeOptions?.reducer;
        */
        const weakFunc = bridge.weakCallback(signal$, func);
        const frameCleanup = _unAwaitNextAnimationFrame.bind(null, weakFunc);

        bridge.trackCleanup(signal$, frameCleanup);

        const _listenerWithAnimFrameDebounce = _awaitNextAnimationFrame.bind(null, weakFunc);
        // Calling `_addListener` with `makeItEasyAndFastAndUseSubscription` flag.
        const unsubscribe = bridge.subscribe(signal$, _listenerWithAnimFrameDebounce);
        let _listenerComponentTypeUpdate: ((status?: string) => void) | undefined;
        let componentCleanup: (() => void) | undefined;

        if (subscribeToComponentTypeUpdate) {
            _listenerComponentTypeUpdate = bridge.weakCallback(signal$, (status?: string) => {
                bridge.incrementComponentVersion(signal$);

                if (status == null ? (signal$.status == null || signal$.status === 'default') : signal$.status === status) {
                    // Do not emit callback if instance in a status different from the one for which the change was received
                    _listenerWithAnimFrameDebounce();
                }
            });

            if (signal$.componentType) {
                _componentsEmitter.on(signal$.componentType as string, _listenerComponentTypeUpdate);
                componentCleanup = _componentsEmitter.removeListener.bind(_componentsEmitter, signal$.componentType as string, _listenerComponentTypeUpdate);
                bridge.trackCleanup(signal$, componentCleanup);
            }
        }

        return () => {
            if (_listenerComponentTypeUpdate && componentCleanup) {
                componentCleanup();
                bridge.untrackCleanup(signal$, componentCleanup);
                bridge.releaseWeakCallback(signal$, _listenerComponentTypeUpdate);
                _listenerComponentTypeUpdate = void 0;
            }

            frameCleanup();
            bridge.untrackCleanup(signal$, frameCleanup);
            bridge.releaseWeakCallback(signal$, weakFunc);
            unsubscribe();
        };
    }

    function setReactFC<T, S, D, R, FC extends EventSignal.NewOptions<T, S, D, R>["reactFC"] | false>(signal$: EventSignal<T, S, D, R>, reactFC?: FC, preDefinedProps?: FC extends (...args: any) => any ? Partial<Parameters<FC>[0]> : never | undefined) {
        const prev = bridge.getComponent(signal$);
        let descriptor = prev;

        if (!reactFC) {
            descriptor = null;
        }
        else if (Array.isArray(reactFC)) {
            descriptor = reactFC;
        }
        else if ('0' in reactFC) {
            descriptor = [ reactFC[0], reactFC[1] ];
        }
        else {
            descriptor = [ reactFC, preDefinedProps ];
        }

        bridge.setComponent(signal$, descriptor);

        return prev;
    }

    function getSnapshotVersion<T, S, D, R>(signal$: EventSignal<T, S, D, R>): string {
        let componentSnapshotVersion = `${signal$.version}`;

        const { status } = signal$;
        const _cv = bridge.getComponentVersion(signal$);

        if (status) {
            // note: signal$.computationsCount here is for async computations
            componentSnapshotVersion += `-${signal$.computationsCount}-${status}`;
        }

        if (_cv) {
            componentSnapshotVersion += `=${_cv}`;
        }

        return componentSnapshotVersion;
    }

    function createComponent<T, S, D, R>(signal$: EventSignal<T, S, D, R>) {
        return Object.defineProperties(Object.assign((props: Record<string, any> & {
        children?: unknown,
        sFC?: EventSignal.ReactFC<T, S, D, R> | false,
        sDefaultFC?: EventSignal.ReactFC<T, S, D, R> | false,
        // sComponents?: Map<ComponentType, EventSignal.ReactFC<any, any, any, any>>)
        sIgnoreRecursive?: boolean,
    }, context?: Object) => {
        const { type } = signal$;
        /** @see {EventSignalComponent} */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const _type: EventSignal<T, S, D, R>["type"] = 'type' in type ? type.type : type;

        return _type({
            __proto__: null,
            // deprecated
            eventSignal: signal$,
            current$: signal$,
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
                const ViewContext = contextProvider;

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
    }

    function registerReactComponentForComponentType<
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
            // todo: rename to 'current$Version'?
            version?: number,
            componentType?: CT,
        } = {
            // deprecated use current$
            eventSignal?: EventSignal<T, S, D, R>,
            current$: EventSignal<T, S, D, R>,
            // todo: rename to 'current$Version'?
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

        if (componentType && (prev_reactFC !== reactFC || !bridge.arePropsEqual(reactFCDescriptor?.[1], preDefinedProps))) {
            // todo: componentType Может быть Объектом
            _componentsEmitter.emit(componentType as string, status);
        }

        return reactFCDescriptor?.[0] || null;
    }

    return { initReact, setComponentOnDestroy, use, useListener, useReducedListener,
        subscribeOnNextAnimationFrame, getSnapshotVersion, setReactFC, createComponent,
        registerReactComponentForComponentType };
}

export type _PreDefinedProps<PROPS=any> = Omit<Partial<PROPS>, 'componentType' | 'eventSignal' | 'version'>;
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

export type _ComponentDescription<T, S, D, R> = /** todo: prefer tuple instead of object */{
    // reactFC
    0: EventSignal.ReactFC<T, S, D, R> | false | undefined,
    // preDefinedProps
    1?: Object,
    __proto__: null,
} | [ reactFC: EventSignal.ReactFC<T, S, D, R> | false | undefined, preDefinedProps?: Object, reactFCOptions?: { destroyOnUnmount?: boolean } ];

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
            const reactFCs: Record<string, typeof componentDescriptionForStatus> = Object.create(null);

            reactFCs[_status] = componentDescriptionForStatus;

            map.set(componentType as string, reactFCs);
        }
        else {
            prev_reactFCs[_status] = componentDescriptionForStatus;
        }
    }

    return prev_reactFCDescriptor || null;
}
