/* eslint-disable @typescript-eslint/no-wrapper-object-types,@typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-function-type,@typescript-eslint/no-empty-object-type,@typescript-eslint/no-unused-vars */
/// <reference types="node" />
import type { EventEmitter } from "node:events";
import { EventEmitterX } from "../events";
export declare class EventSignal<T, S = T, D = undefined> {
    readonly id: number;
    /**
     * Use it as for React key.
     *
     * * React key must be string (can't be Symbol).
     * * React keys don't need to be unique globally.
     */
    readonly key: string;
    private _value;
    private readonly _finaleValue;
    private readonly _finaleSourceValue;
    private readonly _subscriptionsToDeps;
    private readonly _signalSymbol;
    private _version;
    private _updateFlags;
    private _computationsCount;
    private _componentVersion;
    private _computationPromise;
    private _recalcPromise;
    private _promise;
    private _reject;
    private _resolve;
    private readonly _abortSignal?;
    private readonly _oneOfDepUpdated;
    private readonly _computation?;
    private readonly hasComputation;
    protected _isNeedToCompute: boolean;
    protected _isInReactRenders: Set<EventSignal.ReactFC<any, any, any, any>> | undefined;
    protected _nowInSettings: boolean;
    protected _nowInComputing: boolean;
    protected _hasSourceEmitter: boolean;
    private _sourceValue;
    readonly status?: string;
    readonly lastError?: Error | string;
    isDestroyed: boolean;
    /** WeakRef or replacement object */
    private readonly _sourceEmitterRef?;
    private readonly _sourceMapFn?;
    private readonly _sourceFilterFn?;
    private readonly _initialComputations?;
    data: D;
    readonly componentType?: EventSignal.NewOptions<T, S, D>["componentType"];
    private _reactFC?;
    readonly $$typeof: symbol;
    /**
     * Reserved for React
     *
     * React component function (React.FC) despite of type `string` here.
     */
    readonly type: ({ eventSignal }: {
        eventSignal: EventSignal<T, S, D>;
    }, context?: Object) => {
        type: any;
        props: any;
        key: string;
    };
    readonly props: {
        eventSignal: EventSignal<any>;
    };
    readonly defaultProps: {
        eventSignal: EventSignal<any>;
    };
    readonly ref: null;
    readonly children?: null;
    readonly _self?: null;
    readonly _source?: null;
    readonly _owner?: null;
    constructor(initialValue: Awaited<T> | T);
    constructor(initialValue: Awaited<T> | T, options: EventSignal.NewOptions<T, S, D> | EventSignal.NewOptionsWithSource<T, S, D>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource<T, S, D>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource2<T, S, D>, options: EventSignal.NewOptionsWithInitialSourceValue<T, S, D>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource<T, S, D>, options: EventSignal.NewOptionsWithSource<T, S, D>);
    constructor(initialValue: Awaited<T> | T, computation: EventSignal.ComputationWithSource<T, S, D>, options: EventSignal.NewOptions<T, S, D> | EventSignal.NewOptionsWithInitialSourceValue<T, S, D>);
    destructor(): void;
    [Symbol.dispose](): void;
    private _abortHandler;
    get eventName(): symbol;
    private _awaitForCurrentValue;
    private _setStatus;
    private _setErrorState;
    private _calculateValue;
    get: () => T;
    retry: () => void;
    getSafe: () => T;
    getLast: () => T extends Promise<any> ? Awaited<T> : T;
    getSourceValue: () => S | undefined;
    getUpdateFlags(): number;
    set(setter: (prev: Awaited<T>, sourceValue: S, data: D) => S): void;
    set(newSourceValue: S): void;
    private _setSourceValue;
    toString(): T;
    valueOf(): T;
    private _recalculateIfNeeded;
    private _checkPendingState;
    private _resolveIfNeeded;
    private _rejectPromiseIfDestroyed;
    toPromise(onFulfilled?: (result: T) => void, onRejected?: (error: unknown) => void): Promise<void> | Promise<T>;
    [Symbol.asyncIterator](): AsyncGenerator<void | Awaited<T>, void, unknown>;
    private _subscribeTo;
    protected _addListener(listener: ((newValue: T) => void) | undefined, _ignore?: undefined): EventSignal.Subscription;
    protected _addListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void) | undefined, listener: ((newValue: T) => void) | undefined, once?: boolean, prepend?: boolean): EventSignal.Subscription | EventSignal<T, S, D>;
    protected _removeListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners | ((newValue: T) => void) | undefined, listener: ((newValue: T) => void) | undefined): EventSignal<T, S, D> | undefined;
    once(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    once(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    on(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    on(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    addListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    addListener(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    prependListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    prependListener(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    prependOnceListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    prependOnceListener(callbackFn: (newValue: T) => void): EventSignal.Subscription;
    off(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    off(callbackFn: (newValue: T) => void): void;
    removeListener(ignoredEventName: EventSignal.IgnoredEventNameForListeners, callbackFn: (newValue: T) => void): EventSignal<T, S, D>;
    removeListener(callbackFn: (newValue: T) => void): void;
    emit(ignoredEventName: EventSignal.IgnoredEventNameForListeners, ...argumentsToBeIgnored: unknown[]): EventSignal<T, S, D>;
    emit(): void;
    /**
     * todo: add overload: subscribe = (subscriptionObserver: {
     *   next: (value: T) => void,
     *   error: (error: any) => void,
     *   complete: () => void,
     *  }, subscribeOptions?: { signal: AbortSignal }) => {}
     * Alternative for {@link addListener}
     * @returns - unsubscribe callback.
     */
    subscribe: (func: () => void) => () => void;
    subscribeOnNextAnimationFrame: (func: () => void) => typeof _noop;
    subscribeOnNextRender: (func: () => void) => typeof _noop;
    private _subscribeOnNextAnimationFrame;
    get version(): number;
    getSnapshotVersion: () => string;
    get computationsCount(): number;
    createMethod<INPUT = void>(computation: (currentValue: T, input: INPUT extends void ? undefined : INPUT, currentSourceValue: S, eventSignal: EventSignal<T, S, D>) => S): (input: INPUT) => void;
    map<CR>(computation: (currentSourceValue: T) => CR): EventSignal<CR, S, undefined>;
    setReactFC(reactFC?: EventSignal.NewOptions<T, S, D>["reactFC"] | false): [reactFC: false | EventSignal.ReactFC<T, S, D, {}> | undefined, preDefinedProps?: Object | undefined] | undefined;
    component: (props: Record<string, any> & {
        children?: unknown;
        sFC?: EventSignal.ReactFC<T, S, D> | false;
    }, context?: Object) => {
        type: any;
        props: any;
        key: string;
    };
    static createSignal<T>(initialValue: T): EventSignal<T, T>;
    static createSignal<T, S, D>(initialValue: T, computation: EventSignal.ComputationWithSource<T, S, D>, options?: EventSignal.NewOptions<T, S, D> | EventSignal.NewOptionsWithSource<T, S, D>): EventSignal<T, S, D>;
    static createSignal<T, S, D>(initialValue: T, options: EventSignal.NewOptionsWithSource<T, S, D>): EventSignal<T, S, D>;
    static createSignal<T, S, D>(initialValue: T, options: EventSignal.NewOptions<T, S, D>): EventSignal<T, T>;
    static initReact: (hooks: {
        useSyncExternalStore: (subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => any, getServerSnapshot?: () => any) => any;
        createElement?: ((type: Function | string | symbol, props?: Object | null, ...children: (Object | null)[]) => Object) | undefined;
        memo?: ((type: Function | string | symbol, props?: Object | null, ...children: (Object | null)[]) => Object) | undefined;
    }) => void;
    static registerReactComponentForComponentType<T = unknown, S = T, D = unknown, CT extends Object | number | string | symbol | undefined = EventSignal.NewOptions<T, S, D>["componentType"], PROPS extends {
        eventSignal: EventSignal<T, S, D>;
        version?: number;
        componentType?: CT;
    } = {
        eventSignal: EventSignal<T, S, D>;
        version?: number;
        componentType?: CT;
        [key: string]: unknown;
    }>(componentType: CT, reactFC: EventSignal.ReactFC<any, any, any, PROPS>, status: number | string | symbol, preDefinedProps?: _PreDefinedProps<PROPS>): EventSignal.ReactFC<any, any, any, PROPS> | Record<string, EventSignal.ReactFC<any, any, any, PROPS>> | null;
    static registerReactComponentForComponentType<T = unknown, S = T, D = unknown, CT extends Object | number | string | symbol | undefined = EventSignal.NewOptions<T, S, D>["componentType"], PROPS extends {
        eventSignal: EventSignal<T, S, D>;
        version?: number;
        componentType?: CT;
    } = {
        eventSignal: EventSignal<T, S, D>;
        version?: number;
        componentType?: CT;
        [key: string]: unknown;
    }>(componentType: CT, reactFC: EventSignal.ReactFC<any, any, any, PROPS>, preDefinedProps?: _PreDefinedProps<PROPS>): EventSignal.ReactFC<any, any, any, PROPS> | Record<string, EventSignal.ReactFC<any, any, any, PROPS>> | null;
}
export declare namespace EventSignal {
    type ComputationWithSource<T, S, D> = T extends Promise<infer TT> ? (prevValue: TT, sourceValue: S | undefined, eventSignal: EventSignal<T, S, D>) => (T | void) : (prevValue: T, sourceValue: S | undefined, eventSignal: EventSignal<T, S, D>) => (T | void);
    type ComputationWithSource2<T, S, D> = T extends Promise<infer TT> ? (prevValue: TT, sourceValue: S, eventSignal: EventSignal<T, S, D>) => (T | void) : (prevValue: T, sourceValue: S, eventSignal: EventSignal<T, S, D>) => (T | void);
    type ReactFC<T, S, D, PROPS = {}> = (props: {
        eventSignal: EventSignal<T, S, D>;
        version?: number;
        children?: any;
        [key: string]: any;
    } & PROPS) => any;
    type NewOptions<T, S, D> = {
        description?: string;
        /**
         * Value after [EventSignal]{@link EventSignal} destroyed.
         */
        finaleValue?: T;
        /**
         * Source value after [EventSignal]{@link EventSignal} destroyed.
         */
        finaleSourceValue?: S;
        deps?: {
            eventName: number | string | symbol;
        }[];
        data?: D;
        /** An [AbortSignal]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal} from [AbortController]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController} */
        signal?: AbortSignal;
        componentType?: Object | number | string | symbol | undefined;
        reactFC?: ReactFC<T, S, D>;
    };
    interface NewOptionsWithInitialSourceValue<T, S, D> extends NewOptions<T, S, D> {
        initialSourceValue: S;
    }
    type NewOptionsWithSource<T, S, D> = NewOptions<T, S, D> & {
        sourceEmitter: EventEmitter | EventEmitterX | EventTarget | undefined;
        sourceEvent: (number | string | symbol)[] | number | string | symbol;
        sourceMap?: (eventName: number | string | symbol, ...args: any[]) => S;
        sourceFilter?: (eventName: number | string | symbol, ...args: any[]) => boolean;
    };
    /**
     * * Only valid values: '' | 'change' | 'changed' | 'error'.
     * * All other values will rise TypeError.
     */
    type IgnoredEventNameForListeners = string | symbol | '' | 'change' | 'changed' | 'error';
    type Subscription = {
        unsubscribe: () => void;
        closed: boolean;
    };
}
type _PreDefinedProps<PROPS = any> = Omit<Partial<PROPS>, 'componentType' | 'eventSignal' | 'version'>;
declare function _noop(): void;
export declare const __test__get_signalEventsEmitter: () => EventEmitterX<import("../events").DefaultEventMap>;
export declare const __test__get_subscribersEventsEmitter: () => EventEmitterX<import("../events").DefaultEventMap>;
export {};
