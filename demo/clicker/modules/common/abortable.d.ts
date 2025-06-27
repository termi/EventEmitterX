/* eslint-disable @typescript-eslint/no-explicit-any,no-var */
/// <reference types="node" />
declare var AbortSignal: {
    prototype: AbortSignal;
    new (): AbortSignal;
    /**
     * The static `AbortSignal.abort()` method returns an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
     * that is already set as aborted (and which does not trigger an abort event).
     *
     * `reason` parameter added in: nodejs [v17.2.0, v16.14.0];
     *
     * @see [MDN Reference]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/abort_static}
     */
    abort(reason?: any): AbortSignal;
    /**
     * The `AbortSignal.any()` static method takes an iterable of abort signals and returns an AbortSignal.
     * The returned abort signal is aborted when any of the input iterable abort signals are aborted.
     * The `abort reason` will be set to the reason of the first signal that is aborted. If any of the given abort
     * signals are already aborted then so will be the returned AbortSignal.
     *
     * @see [MDN Reference]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static}
     */
    any(signals: AbortSignal[]): AbortSignal;
    /**
     * The static `AbortSignal.timeout()` method returns an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
     * that will automatically abort after a specified time.
     *
     * @see [MDN Reference]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static}
     */
    timeout(time: number): AbortSignal;
};
declare global {
    interface AbortSignal {
        /**
         * The `reason` read-only property returns a JavaScript value that indicates the abort reason.
         *
         * The property is undefined when the signal has not been aborted. It can be set to a specific value when the
         * signal is aborted, using [AbortController.abort()]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort}
         * or [AbortSignal.abort()]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/abort}.
         * If not explicitly set in those methods, it defaults to "AbortError" [DOMException]{@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException}.
         *
         * @see [MDN / AbortSignal.reason]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/reason}
         */
        readonly reason: any;
        /**
         * The `throwIfAborted()` method throws the signal's abort [reason]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/reason}
         * if the signal has been aborted; otherwise it does nothing.
         *
         * An API that needs to support aborting can accept an [AbortSignal]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal}
         * object and use `throwIfAborted()` to test and throw when the [abort]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/abort_event}
         * event is signalled.
         *
         * This method can also be used to abort operations at particular points in code, rather than passing to functions
         * that take a signal.
         *
         * @see [MDN / AbortSignal.throwIfAborted()]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/throwIfAborted}
         */
        throwIfAborted(): void;
    }
}
declare const _AbortControllerClass: {
    new (): AbortController;
    prototype: AbortController;
};
declare const kIsAborted1: unique symbol;
export declare class AbortControllersGroup extends _AbortControllerClass {
    private _controllers;
    private _signals;
    private readonly _spreadAbortCall;
    private readonly _spreadOnAborted;
    private readonly __abortListener;
    private [kIsAborted1];
    /**
     * By default, it will call {@link AbortController.prototype.abort} for each of `controllers` if method {@link abort}
     *  is called. You can change this behaviour by settings `spreadAbortCall=false` in constructor.
     *
     * <br />**Important!**: When AbortControllersGroup instance is not needed any more, call {@link close} method for cleanup purpose!
     * If any of `controller` or `signal` is aborted, cleanup will do automatically.
     *
     * @param controllers
     * @param signals
     * @param [spreadAbortCall=true] - When [AbortControllersGroup#abort]{@link AbortControllersGroup.prototype.abort}
     *  is called, then call [AbortController#abort]{@link AbortController.prototype.abort} for each of `controllers`.
     *  It's default behaviour.
     * @param [spreadOnAborted=false] - If any of `controllers` or `signals` is "aborted", then
     *  call [AbortController#abort]{@link AbortController.prototype.abort} for each of `controllers`.<br>
     *  `controllers` or `signals` is "aborted" means one of this:
     *   1. `controller.signal.aborted == true` then passed to constructor.
     *   2. `signal.aborted == true` then passed to constructor.
     *   3. on `"abort"` event on any of `controllers` or `signals`, comes **not** due [AbortControllersGroup#abort]{@link AbortControllersGroup.prototype.abort}.
     *
     * @example
     const ac1 = new AbortController();
     const ac2 = new AbortController();
     const acg = new AbortControllersGroup([ ac1, ac2 ]);

     (new Promise((res, rej) => {
         setTimeout(() => {
            // cleanup AbortControllersGroup
            acg.close();
            res();
         }, 5000);
         acg.signal.addEventListener('abort', rej, { once: true });
     })).catch(abortEvent => console.error('abort:', abortEvent, ac1.signal.aborted, ac2.signal.aborted));
     // error output will be: 'abort:', { type: 'abort', ... }, false, true
     // ac1.signal.aborted will be false, due `ac2.abort()` call, not `acg.abort()`

     setTimeout(() => ac2.abort(), 1000);
     *
     * @example
     const ac1 = new AbortController();
     const ac2 = new AbortController();
     const ac3 = new AbortController();
     // By default (if third parameter "spreadAbortCall" == true), call "abort"
     //  method for each passed controllers if `AbortControllersGroup#abort` called.
     const acg = new AbortControllersGroup([ ac1, ac2 ], [ ac3.signal ]);

     acg.signal.addEventListener('abort', () => { console.info('any of AC aborted. #3'); }, { once: true });
     ac1.signal.addEventListener('abort', () => { console.info('ac1 aborted. #1'); }, { once: true });
     ac2.signal.addEventListener('abort', () => { console.info('ac2 aborted. #2'); }, { once: true });
     // ac3 will not aborted due it passed by `signal`, not by `controller` itself
     ac3.signal.addEventListener('abort', () => { console.info('ac3 aborted. This message should not shown!'); }, { once: true });

     // `AbortControllersGroup#abort` called
     acg.abort();
     // cleanup AbortControllersGroup
     acg.close();

     console.info(acg.signal.aborted, ac1.signal.aborted, ac2.signal.aborted, ac3.signal.aborted);
     // output: true, true, true, false
     *
     * @example
     const ac1 = new AbortController();
     const ac2 = new AbortController();
     const ac3 = new AbortController();
     const ac4 = new AbortController();
     // If 4'th parameter "spreadOnAborted" = true, call "abort" method for each
     //  passed `controller`'s.
     const acg = new AbortControllersGroup([ ac1, ac2 ], [ ac3.signal, ac4.signal ], true, true);

     acg.signal.addEventListener('abort', () => { console.info('any of AC aborted. #3'); }, { once: true });
     ac1.signal.addEventListener('abort', () => { console.info('ac1 aborted. #1'); }, { once: true });
     ac2.signal.addEventListener('abort', () => { console.info('ac2 aborted. #2'); }, { once: true });
     // ac4 will not aborted due it passed by `signal`, not by `controller` itself
     ac4.signal.addEventListener('abort', () => { console.info('ac4 aborted. This message should not shown!'); }, { once: true });

     // instead of ac3, it can be ac1, ac2 and ac4; with the same result.
     ac3.abort();
     // cleanup AbortControllersGroup
     acg.close();

     console.info(acg.signal.aborted, ac1.signal.aborted, ac2.signal.aborted, ac3.signal.aborted, ac4.signal.aborted);
     // output: true, true, true, true, false
     *
     * @see {AbortController}
     * @see [MDN AbortController]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController}
     * @see {AbortSignal}
     * @see [MDN AbortSignal]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal}
     */
    constructor(controllers: (AbortController | void)[], signals?: (AbortSignal | void)[], spreadAbortCall?: boolean, spreadOnAborted?: boolean);
    /** Alias for [AbortControllersGroup#close]{@link close} */
    destructor(): void;
    /**
     * You should call this method, when instance is not needed any more!
     * <br/>
     * One exception: you don't have to call `close()`, if [AbortControllersGroup#abort]{@link AbortControllersGroup.prototype.abort}
     *  was called. But you can call `close()` on already closed instance, so you don't have to check is [AbortControllersGroup#abort]{@link AbortControllersGroup.prototype.abort}
     *  was called.
     */
    close(): void;
    /**
     * The `abort()` method of the AbortControllersGroup interface aborts a request before it has completed.
     *
     * It's also cleanup this instance, so you should call [AbortControllersGroup#close]{@link AbortControllersGroup.prototype.close}
     *  only if `abort()` was not called.
     *
     * @see {AbortController.abort}
     * @see [MDN AbortController#abort]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort}
     */
    abort(reason?: any): void;
    private _abort;
    private _onAbort;
    private _onAbortOwn;
    private _sub;
    private _unsub;
}
type INodeEventEmitter = NodeJS.EventEmitter;
type ReplaceReturnType<T extends (...a: any) => any, TNewReturn> = (...a: Parameters<T>) => TNewReturn;
interface ICompatibleEmitter {
    on: ReplaceReturnType<INodeEventEmitter["on"], any>;
    removeListener: ReplaceReturnType<INodeEventEmitter["removeListener"], any>;
    emit: ReplaceReturnType<INodeEventEmitter["emit"], any>;
}
type CompatibleEmitterEventName = number | string | symbol;
interface AbortControllerProxy_ConstructorInitial<EE extends ICompatibleEmitter = ICompatibleEmitter> {
    abortController: AbortController;
    emitter: EE;
    /** event name in emitter for resolving this proxy (calling abortController.abort) */
    abortEventName: CompatibleEmitterEventName | CompatibleEmitterEventName[];
    filter?: AbortControllerProxy["_abortEventFilter"];
    /** event name in emitter for closing this proxy */
    closeEventName?: CompatibleEmitterEventName | CompatibleEmitterEventName[];
    closeEventFilter?: AbortControllerProxy["_closeEventFilter"];
    /** a signal to close this proxy */
    signal?: AbortSignal;
}
export declare class AbortControllerProxy<EE extends ICompatibleEmitter = ICompatibleEmitter> {
    /** @borrows AbortControllerProxy_ConstructorInitial.abortController as _abortController */
    private _abortController;
    /** @borrows AbortControllerProxy_ConstructorInitial.emitter as _emitter */
    private _emitter;
    /** @borrows AbortControllerProxy_ConstructorInitial.filter as _abortEventFilter */
    private _abortEventFilter;
    /** @borrows AbortControllerProxy_ConstructorInitial.closeEventFilter as _closeEventFilter */
    private _closeEventFilter;
    /** @borrows AbortControllerProxy_ConstructorInitial.signal as _signal */
    private _signal;
    private readonly _subscriptions;
    /**
     * @example
     const abortEventName = 'abort-' + ((Math.random() * 9e7) | 0).toString(36);
     const ee = new EventEmitter();
     const ac = new AbortController();
     const acProxy = new AbortControllerProxy({ abortController: ac, emitter: ee, abortEventName });

     ac.signal.addEventListener('abort', () => console.info('Aborted', abortEventName));

     setTimeout(() => ee.emit(abortEventName), 300);
     */
    constructor(initial: AbortControllerProxy_ConstructorInitial<EE>);
    /** Alias for [AbortControllerProxy#close]{@link close} */
    destructor(): void;
    close(): void;
    private _clear;
    private _onAbortEvent;
    private _sub;
    private _unsub;
    private _onEmitterAbortEvent;
    private _onEmitterCloseEvent;
}
export declare class RemoteAbortController<EE extends ICompatibleEmitter = ICompatibleEmitter> extends _AbortControllerClass {
    private _abortEventName;
    private _emitter;
    private [kIsAborted1];
    constructor(emitter: EE, abortEventName: CompatibleEmitterEventName);
    /** Alias for [RemoteAbortController#close]{@link close} */
    destructor(): void;
    close(): void;
    abort(reason?: any): void;
    private _onAbort;
    private _onAbortOwn;
    private _sub;
    private _unsub;
    private _emitAbortEvent;
}
export declare function isAbortSignal(maybeAbortSignal: unknown): maybeAbortSignal is AbortSignal;
export declare function isAbortController(maybeAbortController: unknown): maybeAbortController is AbortController;
export declare function isAbortControllersGroup(maybeAbortControllersGroup: unknown): maybeAbortControllersGroup is AbortControllersGroup;
export declare const errorFabric: ((message: string, name: string, code?: number | string, cause?: any) => DOMException) | ((message: string, name: string, code?: number | string, cause?: any) => Error);
/**
 * todo:
 *  1. move to ErrorTools.createAbortError and createAbortDOMException
 *  2. make it deprecated
 */
export declare function createAbortError(code?: number | string, cause?: any): Error | DOMException;
/**
 * @see [MDN / DOMException]{@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException}
 */
export declare function isAbortError(error: DOMException | Error | unknown): boolean;
/**
 * @deprecated
 * @use [isAbortError]{@link isAbortError}
 */
export declare const isAbortedError: typeof isAbortError;
/**
 * @see [MDN / DOMException]{@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException}
 */
export declare function isTimeoutError(error: DOMException | Error | unknown): boolean;
declare const __AbortController: {
    new (): AbortController;
    prototype: AbortController;
};
declare const __AbortSignal: {
    new (): AbortSignal;
    prototype: AbortSignal;
    /**
     * The static `AbortSignal.abort()` method returns an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
     * that is already set as aborted (and which does not trigger an abort event).
     *
     * `reason` parameter added in: nodejs [v17.2.0, v16.14.0];
     *
     * @see [MDN Reference]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/abort_static}
     */
    abort(reason?: any): AbortSignal;
    /**
     * The `AbortSignal.any()` static method takes an iterable of abort signals and returns an AbortSignal.
     * The returned abort signal is aborted when any of the input iterable abort signals are aborted.
     * The `abort reason` will be set to the reason of the first signal that is aborted. If any of the given abort
     * signals are already aborted then so will be the returned AbortSignal.
     *
     * @see [MDN Reference]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static}
     */
    any(signals: AbortSignal[]): AbortSignal;
    /**
     * The static `AbortSignal.timeout()` method returns an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
     * that will automatically abort after a specified time.
     *
     * @see [MDN Reference]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static}
     */
    timeout(time: number): AbortSignal;
};
export default __AbortController;
export { __AbortController as AbortController };
export { __AbortSignal as AbortSignal };
export declare const hasNativeSupport: boolean;
export declare const isFetchAbortable: boolean;
