'use strict';
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFetchAbortable = exports.hasNativeSupport = exports.AbortSignal = exports.AbortController = exports.isAbortedError = exports.errorFabric = exports.RemoteAbortController = exports.AbortControllerProxy = exports.AbortControllersGroup = void 0;
exports.isAbortSignal = isAbortSignal;
exports.isAbortController = isAbortController;
exports.isAbortControllersGroup = isAbortControllersGroup;
exports.createAbortError = createAbortError;
exports.isAbortError = isAbortError;
exports.isTimeoutError = isTimeoutError;
let _AbortController = typeof AbortController !== 'undefined' ? AbortController : void 0;
let _AbortSignal = typeof AbortSignal !== 'undefined' ? AbortSignal : void 0;
let _hasNativeSupport = typeof _AbortController === 'function' && typeof _AbortSignal === 'function';
let _nativeAbortController = _hasNativeSupport ? _AbortController : void 0;
let _extendedAbortController = _nativeAbortController;
let _isFetchAbortable = _hasNativeSupport;
// let _forcedPolyfill = false;
let _es5ExtendsFix = false;
let _AbortSignal_prototype_reason_fix = false;
/* todo: Определять поддержку и полифилить её в EventTarget.prototype.addEventListener
const _IS_NATIVE_AbortSignal_addEventListener_hasSignalSupport = (function() {    // const _AbortSignal_prototype = AbortSignal.prototype;
    // const _AbortSignal_addEventListener = _AbortSignal_prototype.addEventListener;
    // const _AbortSignal_removeEventListener = _AbortSignal_prototype.removeEventListener;
    // todo: Использовать класс EventTargetListenersGuard для того, чтобы реализовать поддержку signal там, где
    //  её нет у AbortSignal. Класс EventTargetListenersGuard должен работать только на перехват addEventListener
    //  с options.signal.
    try {
        const ab1 = new AbortController();
        const signal1 = ab1.signal;
        const ab2 = new AbortController();
        const signal2 = ab1.signal;
        let result = true;

        signal2.addEventListener('abort', () => {
            result = false;
        }, { signal: signal1 });

        ab1.abort();
        ab2.abort();

        return result;
    }
    catch {
        return false;
    }
})();
*/
const tagAbortSignal = 'AbortSignal';
const tagAbortController = 'AbortController';
const tagAbortError = 'AbortError';
const tagTimeoutError = 'TimeoutError';
const hasSymbols = typeof Symbol !== 'undefined';
const sToStringTag = hasSymbols && Symbol.toStringTag;
const setStringTag = (classProto, stringTagValue) => {
    if (classProto) {
        if (sToStringTag) {
            if (classProto[sToStringTag] !== stringTagValue) {
                try {
                    // in 'use strict' mode it can throw error:
                    //  `TypeError: Cannot assign to read only property 'Symbol(Symbol.toStringTag)' of object '[object AbortController]'`
                    //  on this code:
                    // obj[sToStringTag] = stringTagValue;
                    //  no sure, it will not throw on this:
                    Object.defineProperty(classProto, sToStringTag, { value: stringTagValue, configurable: true });
                }
                catch {
                    // ignore
                }
            }
        }
        else if (!classProto.toString) { // If `Symbol.toStringTag` is not available: set #toString() as fallback
            classProto.toString = function () {
                return `[object ${stringTagValue}]`;
            };
        }
    }
};
function _defineNonEnumProperty(object, propName, writable = true, value) {
    if (value === void 0) {
        Object.defineProperty(object, propName, {
            enumerable: false,
            writable: writable,
            configurable: true,
        });
    }
    else {
        Object.defineProperty(object, propName, {
            value,
            enumerable: false,
            writable: writable,
            configurable: true,
        });
    }
    return object;
}
/**
 * test AbortController is actually works
 * @private
 */
function _testAbortController(AbortControllerClass) {
    if (!AbortControllerClass) {
        return false;
    }
    const ac = new AbortControllerClass();
    let aborted = false;
    const onAbort = () => aborted = true;
    ac.signal.addEventListener('abort', onAbort);
    ac.abort();
    ac.signal.removeEventListener('abort', onAbort);
    return aborted;
}
// https://github.com/mo/abortcontroller-polyfill/commit/256fde6b551678bbb72a7821c1fdbb734bfbe84a
// https://github.com/mo/abortcontroller-polyfill/issues/32
// Note that the "unfetch" minimal fetch polyfill defines fetch() without
// defining window.Request, and this polyfill need to work on top of unfetch
// so the below feature detection needs the !self.AbortController part.
// The Request.prototype check is also needed because Safari versions 11.1.2
// up to and including 12.1.x has a window.AbortController present but still
// does NOT correctly implement abortable fetch:
//
// The native AbortController is just a stub that doesn't actually abort. This affects
// Safari 12.0.1 on Mac OS and also the iOS version. Chrome and Firefox on iOS are also
// affected since they also share the same webkit rending engine.
//
// https://bugs.webkit.org/show_bug.cgi?id=174980#c2
if (_hasNativeSupport && typeof window !== 'undefined' && typeof Request === 'function' && !Request.prototype.hasOwnProperty('signal')) { // eslint-disable-line no-prototype-builtins
    _isFetchAbortable = false;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (!_testAbortController(_AbortController)) {
        _nativeAbortController = void 0;
        _extendedAbortController = void 0;
        _AbortController = void 0;
        _AbortSignal = void 0;
        // _forcedPolyfill = true;
        _hasNativeSupport = false;
    }
}
if (_hasNativeSupport) {
    (function () {
        let passed = false;
        // Если es6 код будет транслирован в es5, то наследование от нативного AbortController не будет доступно
        //  (будет ошибка `Failed to construct 'AbortController': Please use the 'new' operator`).
        // Ниже, проверяем, что мы можем наследоваться от нативного AbortController. Если нет - заменяет нативный AbortController
        //  на нашу реализацию.
        // Наследование от AbortController нужно для класса AbortControllersGroup.
        try {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const _AbortControllerClass = _AbortController;
            class A extends _AbortControllerClass {
                constructor() {
                    super();
                    this.test = true;
                }
            }
            const a = new A();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore
            passed = a.test === true && _testAbortController(A);
        }
        catch {
            // ignore
        }
        if (!passed) {
            // Если понадобиться делать наследование от AbortController в других файлах, то нужно будет добавить
            //  переменную, которая будет говорить о том, что нужно перезаписать глобальную переменную AbortController.
            // Сейчас наследование AbortControllersGroup в es5-сборке работает только из-за того, что оно наследуется
            //  от нашей собственной реализации.
            _es5ExtendsFix = true;
            // _forcedPolyfill = true;
        }
    })();
    if (!_es5ExtendsFix) {
        (function () {
            const ac = new AbortController();
            const { signal } = ac;
            const reason = Symbol();
            ac.abort(reason);
            if (signal.reason !== reason) {
                // Реализация AbortController/AbortSignal не поддерживает reason
                _AbortSignal_prototype_reason_fix = true;
            }
        })();
    }
}
if (!_hasNativeSupport
    || _es5ExtendsFix
    || _AbortSignal_prototype_reason_fix
// || _forcedPolyfill
) {
    const shouldReuseNativeImplementation = _hasNativeSupport && (_es5ExtendsFix
        || _AbortSignal_prototype_reason_fix);
    // polyfill code based on https://github.com/mo/abortcontroller-polyfill
    // [31.12.2020] Убрал асинхронный вызов обработчика, т.к. это не соответствует нативной реализации (и тесты
    //  spec/modules/events_spec.ts не проходятся при использовании этого полифила).
    /*
    const _setImmediate: typeof setImmediate = typeof setImmediate === 'function' ? setImmediate : (setTimeout as any as typeof setImmediate);
    const _debounceCall = function(_this, callback, event) {
        _setImmediate(() => callback.call(_this, event));
    };
    */
    const _setImmediate = typeof setImmediate === 'function'
        ? setImmediate
        : typeof queueMicrotask === 'function'
            ? queueMicrotask
            : setTimeout;
    class EventTarget {
        constructor() {
            this.listeners = Object.create(null);
            _defineNonEnumProperty(this, 'listeners');
        }
        addEventListener(type, callback, options = {}) {
            const { signal } = options;
            if (signal !== void 0) {
                // eslint-disable-next-line unicorn/no-lonely-if
                if (!isAbortSignal(signal)) {
                    throw new TypeError(`Failed to execute 'addEventListener' on 'EventTarget': member signal is not of type AbortSignal.`);
                }
            }
            if (!callback) {
                return;
            }
            if (!this.listeners[type]) {
                this.listeners[type] = [];
            }
            const stack = this.listeners[type];
            if (stack.some(({ callback: existedCallback }) => existedCallback === callback)) {
                return;
            }
            let unsubscribeSignalCallback = void 0;
            if (signal) {
                if (signal.aborted) {
                    return;
                }
                const abortListener = () => {
                    this.removeEventListener(type, callback);
                };
                unsubscribeSignalCallback = function () {
                    signal.removeEventListener('abort', abortListener);
                };
                signal.addEventListener('abort', abortListener, { once: true });
            }
            const once = typeof options === 'object' && !!options
                ? !!options.once
                : void 0;
            stack.push({
                callback,
                once,
                unsubscribeSignalCallback,
            });
        }
        // eslint-disable-next-line promise/prefer-await-to-callbacks
        removeEventListener(type, callback) {
            if (!this.listeners[type]) {
                return;
            }
            const stack = this.listeners[type];
            const index = stack.findIndex(({ callback: existedCallback }) => existedCallback === callback);
            if (index !== -1) {
                const listener = stack[index];
                const { unsubscribeSignalCallback, } = listener;
                if (unsubscribeSignalCallback) {
                    unsubscribeSignalCallback();
                    listener.unsubscribeSignalCallback = void 0;
                }
                stack.splice(index, 1);
            }
            if (stack.length === 0) {
                delete this.listeners[type];
            }
        }
        dispatchEvent(event) {
            const { type } = event;
            const listenersForType = this.listeners[type];
            if (!listenersForType) {
                return false;
            }
            // copy listeners array
            const stack = [...listenersForType];
            for (let i = 0, l = stack.length; i < l; i++) {
                const listener = stack[i];
                try {
                    listener.callback.call(this, event);
                }
                catch (err) {
                    _setImmediate(() => {
                        throw err;
                    });
                }
                if (listener.once) {
                    const { unsubscribeSignalCallback } = listener;
                    if (unsubscribeSignalCallback) {
                        unsubscribeSignalCallback();
                        listener.unsubscribeSignalCallback = void 0;
                    }
                    // eslint-disable-next-line unicorn/consistent-destructuring
                    this.removeEventListener(type, listener.callback);
                }
            }
            // через вызов event.preventDefault() нельзя отменить abort.
            // eslint-disable-next-line unicorn/consistent-destructuring
            return !event.defaultPrevented;
        }
    }
    let checkTrueAbortEvent = true;
    const sTrueAbortEvent = (hasSymbols ? Symbol('sTrueAbortEvent') : '__sTrueAbortEvent__');
    const sDispatchEvent = (hasSymbols ? Symbol('sDispatchEvent') : '__sDispatchEvent__');
    const classAbortSignal = class AbortSignal extends EventTarget {
        get aborted() {
            return this._aborted;
        }
        get reason() {
            return this._reason;
        }
        constructor() {
            super();
            this._aborted = false;
            this._reason = void 0;
            this.onabort = null;
            // Some versions of babel does not transpile super() correctly for IE <= 10, if the parent
            // constructor has failed to run, then "this.listeners" will still be undefined and then we call
            // the parent constructor directly instead as a workaround. For general details, see babel bug:
            // https://github.com/babel/babel/issues/3041
            // This hack was added as a fix for the issue described here:
            // https://github.com/Financial-Times/polyfill-library/pull/59#issuecomment-477558042
            if (!this.listeners) {
                /* istanbul ignore next */
                EventTarget.call(this);
            }
            // we want Object.keys(new AbortController().signal) to be [] for compat with the native impl
            _defineNonEnumProperty(this, '_aborted');
            _defineNonEnumProperty(this, '_reason');
            _defineNonEnumProperty(this, 'onabort');
        }
        [sDispatchEvent](event, reason) {
            const isAbortEvent = event.type === 'abort'
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore TS7053: Element implicitly has an any type because expression of type symbol | "__sTrueAbortEvent__" can't be used to index type
                && (checkTrueAbortEvent ? event[sTrueAbortEvent] === true : true);
            if (isAbortEvent) {
                this._aborted = true;
                this._reason = reason;
            }
            const result = this.dispatchEvent(event);
            if (isAbortEvent) {
                // Принудительно делаем грубый аналог removeAllListeners, т.к. после срабатывания события 'abort', на этом
                //  экземпляре AbortSignal события 'abort' больше срабатывать не будут и коллбеки в listeners больше не понадобятся
                //  (т.к. AbortController и AbortSignal нельзя вернуть в состояние aborted = false, после вызова AbortController#abort).
                // Если эта логика будет мешать, то можно её удалить (т.к. addEventListener с options.once сделает своё
                //  дело - удалит обработчик после срабатывания события 'abort').
                this.listeners = Object.create(null);
            }
            return result;
        }
        dispatchEvent(event) {
            const isAbortEvent = event.type === 'abort'
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                // @ts-ignore TS7053: Element implicitly has an any type because expression of type symbol | "__sTrueAbortEvent__" can't be used to index type
                && (checkTrueAbortEvent ? event[sTrueAbortEvent] === true : true);
            if (isAbortEvent) {
                // eslint-disable-next-line unicorn/no-lonely-if
                if (typeof this.onabort === 'function') {
                    this.onabort.call(this, event);
                }
            }
            return super.dispatchEvent(event);
        }
        /**
         * The static `AbortSignal.abort()` method returns an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
         * that is already set as aborted (and which does not trigger an abort event).
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/abort}
         */
        static abort(reason) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            const controller = new classAbortController();
            controller.abort(reason);
            return controller.signal;
        }
    };
    if (classAbortSignal.prototype.constructor.name !== tagAbortSignal) {
        // Fix class name after minification (UglifyJS/Terser or GCC)
        /* istanbul ignore next */
        Object.defineProperty(classAbortSignal.prototype.constructor, 'name', { value: tagAbortSignal, configurable: true });
    }
    const eventFabric = (function () {
        try {
            const event = new Event('test');
            if (event instanceof Event) {
                return function (type) {
                    return new Event(type);
                };
            }
        }
        catch {
            // continue regardless of error
        }
        if (typeof document !== 'undefined') {
            try {
                if (!document.createEvent) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    if (document.createEventObject) {
                        // For Internet Explorer 8:
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        const event = document.createEventObject();
                        event.type = 'abort';
                        if (event.type === 'abort') {
                            return function (type) {
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-expect-error
                                const event = document.createEventObject();
                                event.type = type;
                                return event;
                            };
                        }
                    }
                }
                else {
                    // For Internet Explorer 11:
                    const event = document.createEvent('Event');
                    // noinspection JSDeprecatedSymbols
                    event.initEvent('test', false, false);
                    return function (type) {
                        const event = document.createEvent('Event');
                        // noinspection JSDeprecatedSymbols
                        event.initEvent(type, false, false);
                        return event;
                    };
                }
            }
            catch {
                // continue regardless of error
            }
        }
        // fallback
        return function (type) {
            return {
                type,
                bubbles: false,
                cancelable: false,
                defaultPrevented: false,
                preventDefault() {
                    this.defaultPrevented = true;
                },
            };
        };
    })();
    // Should used only with non-native AbortController.
    const kIsAborted2 = (hasSymbols ? Symbol('kIsAborted2') : '_kIsAborted2');
    const nativeAbortController = shouldReuseNativeImplementation ? _nativeAbortController : void 0;
    let classAbortController = class AbortController {
        constructor() {
            // we want Object.keys(new AbortController()) to be [] for compat with the native impl
            _defineNonEnumProperty(this, 'signal');
            if (nativeAbortController) {
                // Если нам понадобилось подменить нативную реализацию AbortController (например, в es5 среде, где нельзя
                //  пронаследоваться от AbortController), то используем внутри нативный AbortController.
                const ac = new nativeAbortController();
                this._nativeAC = ac;
                this.signal = ac.signal;
            }
            else {
                this.signal = new classAbortSignal();
            }
        }
        abort(reason) {
            if (this[kIsAborted2]) {
                return;
            }
            if (reason === void 0) {
                // Вызов этой функции очень дорогой. `createAbortError()` занимает примерно 70ms, хотя должно выполнять за 1 мс.
                reason = createAbortError();
            }
            this[kIsAborted2] = true;
            if (this._nativeAC) {
                const { _nativeAC } = this;
                if (_AbortSignal_prototype_reason_fix) {
                    const { signal } = _nativeAC;
                    Object.defineProperty(signal, 'reason', { value: reason, writable: false, enumerable: true, configurable: true });
                }
                _nativeAC.abort(reason);
                return;
            }
            const event = eventFabric('abort');
            // Установка event[sTrueAbortEvent] и проверка его в нашей реализации AbortSignal#dispatchEvent, сделана
            //  для того, чтобы нельзя было вызвать фейковое событие 'abort' вот так, например:
            // ```
            // var ac = new AbortController();
            // var ev = new Event('abort');
            // ac.signal.dispatchEvent(ev);
            // ```
            event[sTrueAbortEvent] = true;
            if (event[sTrueAbortEvent] !== true) {
                // Гарантируем, что код abort() будут работать:
                //  если значение sTrueAbortEvent не установилось в объект, отключаем проверку внутри нашей реализации
                //   AbortSignal#dispatchEvent. sTrueAbortEvent мог не установиться, если объект события не расширяемый.
                checkTrueAbortEvent = false;
            }
            // this.signal SHOULD BE instance of classAbortSignal
            if (!(this.signal instanceof classAbortSignal) || !this.signal[sDispatchEvent]) {
                throw new TypeError('Invalid signal instance. Should be instance of internal AbortSignal implementation.');
            }
            this.signal[sDispatchEvent](event, reason);
        }
    };
    if (nativeAbortController) {
        // inherit from existed native AbortController
        const nonNativeAbortControllerDescriptors = Object.getOwnPropertyDescriptors(classAbortController.prototype);
        const newPrototype = (function () {
            try {
                // nodejs throw error:
                //  `Uncaught TypeError [ERR_INVALID_THIS]: Value of "this" must be of type AbortController`
                //  on `Object.create(AbortController.prototype)`
                return Object.create(nativeAbortController.prototype, nonNativeAbortControllerDescriptors);
            }
            catch {
                const ac = new nativeAbortController();
                /* is this necessary?
                try {
                    // hide signal from prototype chain
                    Object.defineProperty(ac, 'signal', { value: null });
                }
                catch {
                    // ignore
                }
                */
                return Object.defineProperties(ac, nonNativeAbortControllerDescriptors);
            }
        })();
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore `TS2741: Property _nativeAC is missing in type AbortController but required in type AbortController`
            classAbortController.prototype = newPrototype;
        }
        catch {
            // for example with JSDOM: 'TypeError: Cannot redefine property: prototype'
            const _classAbortController = classAbortController;
            // Replace class(constructor) with factory.
            //
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            classAbortController = function () {
                const proto = Object.getPrototypeOf(this);
                // create instance of classAbortController
                const ac = new _classAbortController();
                // replace proto of instance of classAbortController
                Object.setPrototypeOf(ac, proto);
                return ac;
            };
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore `TS2719: Type AbortController is not assignable to type AbortController. Two different types with this name exist, but they are unrelated.`
            classAbortController.prototype = newPrototype;
        }
    }
    if (classAbortController.prototype.constructor.name !== tagAbortController) {
        // Fix class name after minification (UglifyJS/Terser or GCC)
        /* istanbul ignore next */
        Object.defineProperty(classAbortController.prototype.constructor, 'name', { value: tagAbortController, configurable: true });
    }
    {
        // These are necessary to make sure that we get correct output for:
        // Object.prototype.toString.call(new AbortController())
        setStringTag(classAbortController.prototype, tagAbortController);
        setStringTag(classAbortSignal.prototype, tagAbortSignal);
    }
    _extendedAbortController = classAbortController;
    if (!nativeAbortController) {
        // Только если у нас нет нативной поддержки AbortController, подменяем глобальные ссылки AbortController и AbortSignal.
        // Т.к. при `shouldReuseNativeImplementation==true` наша реализация classAbortController наследуется от нативного AbortController,
        //  проверка типа `(new AbortControllersGroup([]) instanceof AbortController)` будет работать.
        _AbortController = classAbortController;
        _AbortSignal = classAbortSignal;
        _defineNonEnumProperty(globalThis, 'AbortController', true, _AbortController);
        _defineNonEnumProperty(globalThis, 'AbortSignal', true, _AbortSignal);
    }
    else if (_AbortSignal_prototype_reason_fix) {
        // Если мы принудительно использует polyfill, но у нас есть нативная реализация, то подменить нужно
        //  только AbortController, т.к. внутри себя он будет использовать нативный AbortSignal.
        _AbortController = classAbortController;
        _defineNonEnumProperty(globalThis, 'AbortController', true, _AbortController);
    }
    /*
    else if (_forcedPolyfill) {
        // Если мы принудительно использует polyfill, но у нас есть нативная реализация, то подменить нужно
        //  только AbortController, т.к. внутри себя он будет использовать нативный AbortSignal.
        _AbortController = classAbortController;

        _defineNonEnumProperty(globalThis, 'AbortController', true, _AbortController);
    }
    */
}
const _AbortControllerClass = _extendedAbortController;
const tagAbortControllersGroup = 'AbortControllersGroup';
// Should used only with AbortControllersGroup. Should not be the same as in non-native AbortController.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const kIsAborted1 = (hasSymbols ? Symbol('kIsAborted1') : '_kIsAborted1');
class AbortControllersGroup extends _AbortControllerClass {
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
    constructor(controllers, signals, spreadAbortCall = true, spreadOnAborted = false) {
        super();
        this[_a] = false;
        this._onAbort = (reason) => {
            if (!this[kIsAborted1]) {
                if (this._spreadOnAborted) {
                    this._abort(reason, true, false);
                }
                else {
                    this[kIsAborted1] = true;
                    this.close();
                    super.abort(reason);
                }
            }
        };
        this._onAbortOwn = () => {
            if (this.signal.aborted) {
                // Если произошло "настоящее" событие 'abort', то свойство aborted у объекта AbortSignal измениться до того,
                //  как будут вызваны обработчики событий.
                // Эта проверка добавлена из-за того, что можно сгенерировать ненастоящее событие 'abort', простым кодом:
                // ```
                // var ac = new AbortController();
                // var ev = new Event('abort');
                // ac.signal.dispatchEvent(ev);
                // ```
                this._onAbort(this.signal.reason);
            }
        };
        let alreadyAbortedSignal = null;
        this._controllers = controllers.filter(abortController => {
            if (abortController) {
                if (!isAbortController(abortController)) {
                    throw new TypeError(`One member of "controllers" array is defined and not instanceof AbortController.`);
                }
                if (abortController.signal.aborted) {
                    alreadyAbortedSignal = abortController.signal;
                }
                return true;
            }
            return false;
        });
        this._signals = (signals || []).filter(signal => {
            if (signal) {
                if (!isAbortSignal(signal)) {
                    throw new TypeError(`One member of "signals" array is defined and not instanceof AbortSignal.`);
                }
                if (signal.aborted) {
                    alreadyAbortedSignal = signal;
                }
                return true;
            }
            return false;
        });
        this._spreadAbortCall = spreadAbortCall;
        this._spreadOnAborted = spreadOnAborted;
        // eslint-disable-next-line @typescript-eslint/no-this-alias,unicorn/no-this-assignment
        const self = this;
        this.__abortListener = function onAbortEvent() {
            self._onAbort(this.reason);
        };
        if (alreadyAbortedSignal) {
            this._abort(alreadyAbortedSignal.reason, spreadOnAborted, true);
        }
        else {
            this._sub();
        }
    }
    /** Alias for [AbortControllersGroup#close]{@link close} */
    destructor() {
        this.close();
    }
    /**
     * You should call this method, when instance is not needed any more!
     * <br/>
     * One exception: you don't have to call `close()`, if [AbortControllersGroup#abort]{@link AbortControllersGroup.prototype.abort}
     *  was called. But you can call `close()` on already closed instance, so you don't have to check is [AbortControllersGroup#abort]{@link AbortControllersGroup.prototype.abort}
     *  was called.
     */
    close() {
        this._unsub();
        this._controllers = [];
        this._signals = [];
    }
    /**
     * The `abort()` method of the AbortControllersGroup interface aborts a request before it has completed.
     *
     * It's also cleanup this instance, so you should call [AbortControllersGroup#close]{@link AbortControllersGroup.prototype.close}
     *  only if `abort()` was not called.
     *
     * @see {AbortController.abort}
     * @see [MDN AbortController#abort]{@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort}
     */
    abort(reason) {
        this._abort(reason, this._spreadAbortCall, false);
    }
    _abort(reason, spreadAbortCallToControllers, doNotUnsub) {
        this[kIsAborted1] = true;
        if (!doNotUnsub) {
            this._unsub();
        }
        super.abort(reason);
        if (spreadAbortCallToControllers) {
            for (const controller of this._controllers) {
                controller.abort(this.signal.reason);
            }
        }
        this._controllers = [];
        this._signals = [];
    }
    _sub() {
        this.signal.addEventListener('abort', this._onAbortOwn);
        for (const controller of this._controllers) {
            controller.signal.addEventListener('abort', this.__abortListener);
        }
        for (const signal of this._signals) {
            signal.addEventListener('abort', this.__abortListener);
        }
    }
    _unsub() {
        this.signal.removeEventListener('abort', this._onAbortOwn);
        for (const controller of this._controllers) {
            controller.signal.removeEventListener('abort', this.__abortListener);
        }
        for (const signal of this._signals) {
            signal.removeEventListener('abort', this.__abortListener);
        }
    }
}
exports.AbortControllersGroup = AbortControllersGroup;
_a = kIsAborted1;
const _AbortControllersGroup_prototype = AbortControllersGroup.prototype;
if (_AbortControllersGroup_prototype.constructor.name !== tagAbortControllersGroup) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    /* istanbul ignore next */
    Object.defineProperty(_AbortControllersGroup_prototype.constructor, 'name', { value: tagAbortControllersGroup, configurable: true });
}
setStringTag(_AbortControllersGroup_prototype, tagAbortControllersGroup);
const tagAbortControllerProxy = 'AbortControllerProxy';
class AbortControllerProxy {
    /**
     * @example
     const abortEventName = 'abort-' + ((Math.random() * 9e7) | 0).toString(36);
     const ee = new EventEmitter();
     const ac = new AbortController();
     const acProxy = new AbortControllerProxy({ abortController: ac, emitter: ee, abortEventName });

     ac.signal.addEventListener('abort', () => console.info('Aborted', abortEventName));

     setTimeout(() => ee.emit(abortEventName), 300);
     */
    constructor(initial) {
        this._subscriptions = [];
        this._onAbortEvent = () => {
            this.close();
        };
        const { abortController, emitter, abortEventName, filter, closeEventName, closeEventFilter, signal, } = initial;
        this._abortController = abortController;
        this._emitter = emitter;
        this._abortEventFilter = typeof filter === 'function' ? filter : void 0;
        this._closeEventFilter = typeof closeEventFilter === 'function' ? closeEventFilter : void 0;
        this._signal = signal || void 0;
        this._sub(abortEventName, closeEventName, signal);
    }
    /** Alias for [AbortControllerProxy#close]{@link close} */
    destructor() {
        this.close();
    }
    close() {
        this._clear(true);
    }
    _clear(doUnsub = false) {
        if (doUnsub) {
            this._unsub();
        }
        this._abortController = void 0;
        this._emitter = void 0;
        this._abortEventFilter = void 0;
        this._closeEventFilter = void 0;
        this._signal = void 0;
    }
    _sub(abortEventName, closeEventName, signal) {
        const { _subscriptions, _abortController: abortController, _emitter: emitter, } = this;
        if (!emitter || !abortController) {
            return;
        }
        if (signal) {
            signal.addEventListener('abort', this._onAbortEvent);
        }
        if (!Array.isArray(abortEventName)) {
            abortEventName = [abortEventName];
        }
        for (const eventName of abortEventName) {
            const listener = (...amitArgs) => {
                this._onEmitterAbortEvent(eventName, ...amitArgs);
            };
            _subscriptions.push([
                eventName,
                1,
                listener,
            ]);
            emitter.on(eventName, listener);
        }
        if (closeEventName) {
            if (!Array.isArray(closeEventName)) {
                closeEventName = [closeEventName];
            }
            for (const eventName of closeEventName) {
                const listener = (...amitArgs) => {
                    this._onEmitterCloseEvent(eventName, ...amitArgs);
                };
                _subscriptions.push([
                    eventName,
                    2,
                    listener,
                ]);
                emitter.on(eventName, listener);
            }
        }
        abortController.signal.addEventListener('abort', this._onAbortEvent);
    }
    _unsub() {
        const { _subscriptions, _abortController: abortController, _emitter: emitter, _signal: signal, } = this;
        if (signal) {
            // eslint-disable-next-line unicorn/consistent-destructuring
            signal.removeEventListener('abort', this._onAbortEvent);
        }
        if (abortController) {
            // eslint-disable-next-line unicorn/consistent-destructuring
            abortController.signal.removeEventListener('abort', this._onAbortEvent);
        }
        if (emitter) {
            for (const { 0: eventName, 2: listener } of _subscriptions) {
                emitter.removeListener(eventName, listener);
            }
        }
        _subscriptions.length = 0;
    }
    _onEmitterAbortEvent(abortEventName, ...amitArgs) {
        const { _abortEventFilter: filter, _emitter: emitter, } = this;
        if (filter && !filter.call(emitter, abortEventName, ...amitArgs)) {
            return;
        }
        // Abort reason should be first after eventName in RemoteAbortController#emit() arguments list
        const { 0: reason } = amitArgs;
        // After successful 'abort' event, it is not necessary to listen events any more.
        this._unsub();
        const { _abortController: abortController, } = this;
        if (abortController) {
            abortController.abort(reason);
        }
        // After successful 'abort' event, it is not necessary to have links to any external objects.
        this._clear(false);
    }
    _onEmitterCloseEvent(abortEventName, ...amitArgs) {
        const { _closeEventFilter: closeEventFilter, _emitter: emitter, } = this;
        if (closeEventFilter && !closeEventFilter.call(emitter, abortEventName, ...amitArgs)) {
            return;
        }
        this._clear(true);
    }
}
exports.AbortControllerProxy = AbortControllerProxy;
const _AbortControllerProxy_prototype = AbortControllerProxy.prototype;
if (_AbortControllerProxy_prototype.constructor.name !== tagAbortControllerProxy) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    /* istanbul ignore next */
    Object.defineProperty(_AbortControllerProxy_prototype.constructor, 'name', { value: tagAbortControllerProxy, configurable: true });
}
setStringTag(_AbortControllerProxy_prototype, tagAbortControllerProxy);
const tagRemoteAbortController = 'RemoteAbortController';
class RemoteAbortController extends _AbortControllerClass {
    constructor(emitter, abortEventName) {
        super();
        this[_b] = false;
        this._onAbort = (reason) => {
            if (!this[kIsAborted1]) {
                this[kIsAborted1] = true;
                super.abort(reason);
            }
            this._emitAbortEvent(reason);
            this.close();
        };
        this._onAbortOwn = () => {
            if (this.signal.aborted) {
                // Если произошло "настоящее" событие 'abort', то свойство aborted у объекта AbortSignal измениться до того,
                //  как будут вызваны обработчики событий.
                // Эта проверка добавлена из-за того, что можно сгенерировать ненастоящее событие 'abort', простым кодом:
                // ```
                // var ac = new AbortController();
                // var ev = new Event('abort');
                // ac.signal.dispatchEvent(ev);
                // ```
                this._onAbort(this.signal.reason);
            }
        };
        this._emitter = emitter;
        this._abortEventName = abortEventName;
        this._sub();
    }
    /** Alias for [RemoteAbortController#close]{@link close} */
    destructor() {
        this.close();
    }
    close() {
        this._unsub();
        this._emitter = void 0;
        this._abortEventName = '';
    }
    abort(reason) {
        this._onAbort(reason);
    }
    _sub() {
        this.signal.addEventListener('abort', this._onAbortOwn);
    }
    _unsub() {
        this.signal.removeEventListener('abort', this._onAbortOwn);
    }
    _emitAbortEvent(reason) {
        const { _emitter: emitter, _abortEventName: abortEventName, } = this;
        if (!emitter || !abortEventName) {
            return;
        }
        emitter.emit(abortEventName, reason);
    }
}
exports.RemoteAbortController = RemoteAbortController;
_b = kIsAborted1;
const _RemoteAbortController_prototype = RemoteAbortController.prototype;
if (_RemoteAbortController_prototype.constructor.name !== tagRemoteAbortController) {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    /* istanbul ignore next */
    Object.defineProperty(_RemoteAbortController_prototype.constructor, 'name', { value: tagRemoteAbortController, configurable: true });
}
setStringTag(_RemoteAbortController_prototype, tagRemoteAbortController);
/**
 * Important warning: tools such as UglifyJS/Terser will minify class name and therefore proto.constructor.name
 *
 * @example Workaround for this case:
 if (ClassName.prototype.constructor.name !== 'ClassName') {
    // Fix class name after minification (UglifyJS/Terser or GCC)
    Object.defineProperty(ClassName.prototype.constructor, 'name', { value: 'ClassName', configurable: true });
}
 *
 * @param object
 * @param constructorName
 * @private
 */
function _findConstructorName(object, constructorName) {
    let proto = object && typeof object === 'object' && Object.getPrototypeOf(object) || void 0;
    while (proto) {
        if (proto.constructor?.name === constructorName) {
            return true;
        }
        proto = Object.getPrototypeOf(proto);
    }
    return false;
}
function isAbortSignal(maybeAbortSignal) {
    if (maybeAbortSignal instanceof AbortSignal) {
        return true;
    }
    // it's can be AbortSignal from another environment (another process or window)
    return _findConstructorName(maybeAbortSignal, tagAbortSignal);
}
function isAbortController(maybeAbortController) {
    if (maybeAbortController instanceof AbortController) {
        return true;
    }
    // it's can be AbortController from another environment (another process or window)
    return _findConstructorName(maybeAbortController, tagAbortController);
}
function isAbortControllersGroup(maybeAbortControllersGroup) {
    if (maybeAbortControllersGroup instanceof AbortControllersGroup) {
        return true;
    }
    // it's can be AbortControllersGroup from another environment (another process or window)
    return _findConstructorName(maybeAbortControllersGroup, tagAbortControllersGroup);
}
exports.errorFabric = (function () {
    if (typeof DOMException !== 'undefined') {
        try {
            // IE 11 does not support calling the DOMException constructor
            const abortError = new DOMException('Aborted', tagAbortError);
            if (abortError instanceof DOMException) {
                return function (message, name, code = 0, cause) {
                    const error = new DOMException(message, name);
                    if (!error.stack) {
                        const _error = new Error('-get-stack-');
                        _defineNonEnumProperty(error, 'stack', false, _error.stack);
                        const toString = function toString() {
                            return `DOMException [${this.name}]: ${this.message}\n${this.stack}`;
                        };
                        _defineNonEnumProperty(error, 'toString', false, toString);
                        error[Symbol.for('nodejs.util.inspect.custom')] = toString;
                    }
                    if (error.code !== code) {
                        _defineNonEnumProperty(error, 'code', false, code);
                    }
                    if (cause !== void 0) {
                        _defineNonEnumProperty(error, 'cause', false, cause);
                    }
                    return error;
                };
            }
        }
        catch {
            // continue regardless of error
        }
    }
    return function (message, name, code = 0, cause) {
        const errorConstructorOptions = cause !== void 0 ? { cause } : void 0;
        const error = _sanitizeAbortErrorStack(new Error(message, errorConstructorOptions));
        _defineNonEnumProperty(error, 'name', false, name || '');
        _defineNonEnumProperty(error, 'code', false, code);
        if (cause !== void 0 && error.cause !== cause) {
            _defineNonEnumProperty(error, 'cause', false, cause);
        }
        return error;
    };
})();
function _sanitizeAbortErrorStack(abortError) {
    const { stack = '' } = abortError;
    if (!_isPropertyEditable(abortError, 'stack')) {
        return abortError;
    }
    if (!abortError["originalStack"]) {
        abortError["originalStack"] = abortError;
    }
    abortError.stack = stack.split(/\n/).filter(stackLine => {
        if (/[/\\]AbortController\./.test(stackLine)) {
            return false;
        }
        if (/[/\\]events\./.test(stackLine)) {
            return false;
        }
        // noinspection RedundantIfStatementJS
        if (stackLine.includes('node:internal/event_target')
            || stackLine.includes('node:internal/abort_controller')) {
            return false;
        }
        // noinspection RedundantIfStatementJS
        if (stackLine === 'at new Promise (<anonymous>)') {
            return false;
        }
        return true;
    }).join('\n');
    return abortError;
}
/** DOMException.ABORT_ERR */
const DOMException__ABORT_ERR = 20;
/** DOMException.TIMEOUT_ERR */
const DOMException__TIMEOUT_ERR = 23;
let _defaultAbortErrorCode;
// todo: [27.12.2023] Дополнение к комментарию ниже:
//  на данный момент, в nodejs (как минимум в v16.19.0) существует две версии AbortError:
//   - `class DOMException`, для каждого экземпляра которого: `{ name: 'AbortError', code: 20, message: 'The operation was aborted' }` (все свойства not enumerable) где 20 === DOMException.ABORT_ERR
//   - `class AbortError extends Error`, для каждого экземпляра которого: `{ name: 'AbortError', code: 'ABORT_ERR', message: 'The operation was aborted' }` ("message" not enumerable)
//  `DOMException` используется в качестве дефолтной ошибки внутри `AbortController#abort`, если не указан `reason`,
//   а `AbortError` используется например в `events.once()` в качестве ошибки, которая попадёт в `catch`, если операция завершиться отменой.
//  Как проверить:
//  ```
//  var ac = new AbortController();ac.abort();var ee = new events();var e;events.once(ee, 'test', { signal: ac.signal }).catch(err => (e = err));
//  console.log({ name: e.name, cname: e.constructor.name }, e.constructor, { name: e.cause.name, cname: e.cause.constructor.name }, e.cause.constructor);
//  ```
//
// todo: [15.07.2022] Эта функция должна возвращать экземпляр внутреннего класса AbortError (совместимый с браузерным DOMException.ABORT_ERR),
//  т.к. в nodejs используется именно AbortError для таких ошибок.
//  А вот функция createTimeoutError, что для браузера, что для node, эта функция должна возвращать DOMException, если
//  это возможно, т.к. даже в nodejs возвращается экземпляр DOMException в качестве ошибки timeout:
//  `23 DOMException [TimeoutError]: The operation was aborted due to timeout`.
/**
 * todo:
 *  1. move to ErrorTools.createAbortError and createAbortDOMException
 *  2. make it deprecated
 */
function createAbortError(code, cause) {
    if (_defaultAbortErrorCode === void 0) {
        if (typeof DOMException !== 'undefined') {
            // In WEB `signal.reason.code == DOMException.ABORT_ERR`
            _defaultAbortErrorCode = DOMException__ABORT_ERR;
        }
        else {
            // Mimic nodejs ABORT_ERR `signal.reason.code == 'ABORT_ERR'`
            _defaultAbortErrorCode = 'ABORT_ERR';
        }
    }
    if (code === void 0) {
        code = _defaultAbortErrorCode;
    }
    // in node.js: error.code === 'ABORT_ERR'
    //  `events.once(new events(), 'test', { signal: AbortSignal.abort() }).catch(err => { console.info(err.code, err) })`
    // in browser: error.code === 20
    //  `fetch(location.href, { signal: AbortSignal.abort() }).catch(err => { console.info(err.code, err) })`
    return (0, exports.errorFabric)('The operation was aborted', tagAbortError, code, cause);
}
let _defaultTimeoutErrorCode;
/**
 * todo: move to ErrorTools.createTimeoutError and createTimeoutDOMException
 *
 * @private
 */
function _createTimeoutError(code, cause) {
    if (_defaultTimeoutErrorCode === void 0) {
        if (typeof DOMException !== 'undefined') {
            // In WEB `signal.reason.code == DOMException.TIMEOUT_ERR`
            _defaultTimeoutErrorCode = DOMException__TIMEOUT_ERR;
        }
        else {
            // Mimic nodejs ABORT_ERR
            /*
            ```
            // run in node
            (function() { const a = AbortSignal.timeout(1); setTimeout(() => console.info(a.reason.code, a.reason)); })()
            // 23 DOMException [TimeoutError]: The operation was aborted due to timeout
            ```
            */
            _defaultTimeoutErrorCode = DOMException__TIMEOUT_ERR;
        }
    }
    if (code === void 0) {
        code = _defaultTimeoutErrorCode;
    }
    return (0, exports.errorFabric)('The operation timed out.', tagTimeoutError, code, cause);
}
/*
// node:internal/errors
```
// Node uses an AbortError that isn't exactly the same as the DOMException
// to make usage of the error in userland and readable-stream easier.
// It is a regular error with `.code` and `.name`.
class AbortError extends Error {
  constructor() {
    super('The operation was aborted');
    this.code = 'ABORT_ERR';
    this.name = 'AbortError';
  }
}
```
*/
/**
 * @see [MDN / DOMException]{@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException}
 */
function isAbortError(error) {
    if (error) {
        /**
         @example in node.js: error.code === 'ABORT_ERR'
         `events.once(new events(), 'test', { signal: AbortSignal.abort() }).catch(err => { console.info(err.code, err.name, err) })`
         @example in browser: error.code === 20
         `fetch(location.href, { signal: AbortSignal.abort() }).catch(err => { console.info(err.code, err.name, err) })`
         */
        if (error["code"] === DOMException__ABORT_ERR || error["code"] === 'ABORT_ERR') {
            return true;
        }
        if (error instanceof Error
            || (typeof DOMException !== 'undefined' && error instanceof DOMException)) {
            return error.name === tagAbortError;
        }
    }
    return false;
}
/**
 * @deprecated
 * @use [isAbortError]{@link isAbortError}
 */
exports.isAbortedError = isAbortError;
/**
 * @see [MDN / DOMException]{@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException}
 */
function isTimeoutError(error) {
    if (error) {
        /**
         Legacy code value: 23 and legacy constant name: 'TIMEOUT_ERR'
         // todo: add examples from nodejs and brosers
         */
        if (error["code"] === DOMException__TIMEOUT_ERR || error["code"] === 'TIMEOUT_ERR') {
            return true;
        }
        if (error instanceof Error
            || (typeof DOMException !== 'undefined' && error instanceof DOMException)) {
            return error.name === tagTimeoutError;
        }
    }
    return false;
}
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const __AbortController = _AbortController;
exports.AbortController = __AbortController;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const __AbortSignal = _AbortSignal;
exports.AbortSignal = __AbortSignal;
// static AbortSignal.abort polyfill
// https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/abort
if (typeof __AbortSignal.abort !== 'function') {
    /**
     * The static `AbortSignal.abort()` method returns an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
     * that is already set as aborted (and which does not trigger an abort event).
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/abort}
     */
    __AbortSignal.abort = function (reason) {
        const controller = new __AbortController();
        controller.abort(reason);
        return controller.signal;
    };
}
// https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
if (typeof __AbortSignal.timeout !== 'function') {
    /** ULONG_MAX. C/C++ "unsigned long" and "unsigned int" max. 4_294_967_295, 4294967295, 0xFFFFFFFF */
    const UINT32_MAX_VALUE = 4294967295;
    __AbortSignal.timeout = function (time) {
        if (time < 0 || time === 0 || time > UINT32_MAX_VALUE) {
            throw new RangeError(`AbortSignal.timeout: The value of "delay" is out of range. It must be >= 1 && < ${UINT32_MAX_VALUE + 1}. Received ${time}`);
        }
        if (!Number.isFinite(time)) {
            throw new TypeError('AbortSignal.timeout: Argument 1 is not a finite value, so is out of range for unsigned long.');
        }
        const controller = new __AbortController();
        setTimeout(() => {
            controller.abort(_createTimeoutError());
        }, time);
        return controller.signal;
    };
}
// https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static
if (typeof __AbortSignal.any !== 'function') {
    __AbortSignal.any = function (iterable) {
        if (!iterable) {
            throw new TypeError('AbortSignal.any: At least 1 argument required, but only 0 passed');
        }
        if (!Array.isArray(iterable) && !(!!iterable && typeof iterable === 'object' && Symbol.iterator in iterable)) {
            throw new TypeError(`AbortSignal.any: Argument 1 can't be converted to a sequence.`);
        }
        const controller = new __AbortController();
        const onAnyAborted = function (event) {
            const abortSignal = !!this && 'reason' in this
                ? this
                : !!event && !!event.target
                    ? event.target
                    : null;
            if (!abortSignal) {
                console.error('Invalid abortSignal inside AbortSignal.any~iterable[n].addEventListener~listener', this, event);
            }
            controller.abort(abortSignal?.reason);
        };
        for (const signal of iterable) {
            if (!signal || typeof signal !== 'object') {
                throw new TypeError('AbortSignal.any: Element of argument 1 is not an object.');
            }
            if (!isAbortSignal(signal)) {
                throw new TypeError('AbortSignal.any: Element of argument 1 does not implement interface AbortSignal.');
            }
            if (signal.aborted) {
                controller.abort(signal.reason);
                break;
            }
            signal.addEventListener('abort', onAnyAborted, {
                signal: controller.signal,
            });
        }
        return controller.signal;
    };
}
// https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/throwIfAborted
if (typeof __AbortSignal.prototype.throwIfAborted !== 'function') {
    __AbortSignal.prototype.throwIfAborted = function () {
        if (this.aborted) {
            throw this.reason;
        }
    };
}
/**
 * @private
 * @example
 * // Check for error
 * "Uncaught TypeError: Cannot assign to read only property 'stack' of object '[object DOMException]'"
 */
function _isPropertyEditable(obj, propertyName, options = {}) {
    if (Object.isFrozen(obj) || Object.isSealed(obj)) {
        return false;
    }
    const propertyDescriptors = Object.getOwnPropertyDescriptor(obj, propertyName);
    // No descriptor + object is not frozen/sealed, so 100% we can add property
    if (!propertyDescriptors) {
        return true;
    }
    // Can't use Object.defineProperty for props with configurable === false
    if (options.isUseDefineProperty && !propertyDescriptors.configurable) {
        return false;
    }
    return !!propertyDescriptors.writable;
}
exports.default = __AbortController;
exports.hasNativeSupport = _hasNativeSupport;
exports.isFetchAbortable = _isFetchAbortable;
//# sourceMappingURL=index.js.map