'use strict';
import { isTest as e } from "../../utils/runEnv";
import { isUniqueSymbol as t } from "../../type_guards/symbols";
import { EventEmitterX as i } from "./events";
import { arrayContentStringify as n, stringifyWithCircularHandle as o } from "./utils";

const r = new i({ listenerOncePerEventType: !0 }),
    s = new i({ listenerOncePerEventType: !0 });
let a = 0,
    u = null;

export class EventSignal {
    id = ++a;
    key;
    _value;
    _finaleValue;
    _finaleSourceValue;
    _subscriptionsToDeps = new Set;
    _signalSymbol;
    _version = 0;
    _updateFlags = 0;
    _computationsCount = 0
    ;
    _componentVersion = 0;
    _computationPromise = null;
    _recalcPromise;
    _promise;
    _reject;
    _resolve;
    _abortSignal;
    _oneOfDepUpdated = () => {
        this._updateFlags |= 2, this._isNeedToCompute
        || (this._isNeedToCompute = !0, r.emit(this._signalSymbol)), this._recalculateIfNeeded();
    };
    _computation;
    hasComputation;
    _isNeedToCompute = !0;
    _isInReactRenders;
    _nowInSettings = !1;
    _nowInComputing = !1;
    _hasSourceEmitter = !1;
    _sourceValue;
    status;
    lastError;
    isDestroyed = !1;
    _sourceEmitterRef;
    _sourceMapFn;
    _sourceFilterFn;
    _initialComputations;
    data = void 0
    ;
    componentType;
    _reactFC;

    constructor(e, t, i) {
        const n = "function" == typeof t;
        n || (i = t), this._computation = n ? t : void 0;
        const o = i?.description || "",
            s = this.id + (o ? `#${o}` : "");
        this._signalSymbol = Symbol(s), this._finaleValue = i?.finaleValue, void 0 === this._finaleValue
        && (this._finaleSourceValue = i?.finaleSourceValue);
        const { _subscriptionsToDeps: a, _computation: u, _oneOfDepUpdated: l } = this;
        if (this.hasComputation = "function" == typeof u, this._value = "function" == typeof e ? void 0 : e,
            this._sourceValue = i?.initialSourceValue ?? void 0, e = void 0, i) {
            const {
                deps: e,
                sourceEmitter: t,
                sourceEvent: n,
                sourceMap: o,
                sourceFilter: s,
                data: u,
                signal: c,
                componentType: h,
                reactFC: d,
            } = i;
            if (Array.isArray(e) && e.length > 0) {
                for (const { eventName: t } of e) a.add(t), r.on(t, l);
            }
            if (void 0 !== u && (this.data = u), n && t) {
                this._sourceEmitterRef = function(e) {
                    if ("symbol" == typeof e ? V : F) {
                        return new WeakRef(e);
                    }
                    return Object.setPrototypeOf({ __value: e }, C);
                }(t), this._sourceMapFn = o, this._sourceFilterFn = s, this._initialComputations = [],
                    this._hasSourceEmitter = !0;
                const e = Array.isArray(n) ? n : [ n ];
                for (const i of e) {
                    const e = (...e) => {
                        if (e.unshift(i), this._sourceFilterFn && !this._sourceFilterFn.apply(null, e)) {
                            return;
                        }
                        const t = this._sourceMapFn ? this._sourceMapFn.apply(null, e) : e[1];
                        this._setSourceValue(t);
                    };
                    this._initialComputations.push([ i, e ]), b(t, i, e);
                }
            }
            c && (this._abortSignal = c, c.addEventListener("abort", this._abortHandler)), d ? this._reactFC = [ d ] : h
                && (this.componentType = h);
        }
        this.key = this.id.toString(36),
            Object.defineProperty(this.component, "name", {
                value: `EventSignal.component#${this.key}${o
                    ? `(${o})`
                    : ""}`, configurable: !0, writable: !1, enumerable: !0,
            });
    }

    destructor() {
        const {
                _finaleValue: e,
                _finaleSourceValue: t,
                _signalSymbol: i,
                _abortSignal: n,
                _subscriptionsToDeps: o,
                _oneOfDepUpdated: a,
                _initialComputations: u,
                _sourceEmitterRef: l,
            } = this,
            c = void 0 !== e,
            h = void 0 !== t;
        if (this.isDestroyed = !0, c || h) {
            this._setSourceValue(c ? e : t, !0);
            const i = this._calculateValue(c);
            "function" == typeof i?.then && i?.then(null, e => {
                console.error("EventSignal#destructor: async _calculateValue: error:", e);
            }), this._finaleValue = void 0, this._finaleSourceValue = void 0;
        }
        for (const e of o) r.removeListener(e, a);
        if (o.clear(), u && l) {
            const e = l.deref();
            if (e) {
                for (const { 0: t, 1: i } of u) S(e, t, i);
            }
            u.length = 0;
        }
        h
        || (this._sourceValue = void 0), this._hasSourceEmitter = !1, this._sourceEmitterRef = void 0, this._sourceMapFn = void 0, this._sourceFilterFn = void 0, this._initialComputations = void 0, this.lastError = void 0, this.status = void 0, this._computationPromise = null,
        n
        && (n.removeEventListener("abort", this._abortHandler), this._abortSignal = void 0), this._rejectPromiseIfDestroyed(), r.removeAllListeners(i), s.removeAllListeners(i);
    }

    [Symbol.dispose]() {
        this.destructor();
    }

    _abortHandler = () => {
        this.destructor();
    };

    get eventName() {
        return this._signalSymbol;
    }

    async _awaitForCurrentValue(e = this._value, t = !!e && "object" == typeof e && "function" == typeof e.then) {
        t && (this._value = await e);
    }

    _setStatus(e = "default", t) {
        this.status = e, !1 !== t && s.emit(this._signalSymbol, this._value);
    }

    _setErrorState(e) {
        this.lastError = e, this._setStatus("error");
    }

    _calculateValue(e) {
        const { _sourceValue: t } = this;
        if (this.hasComputation && !e) {
            this.lastError = void 0;
            const i = this._value;
            if (i && "object" == typeof i && "function"
                == typeof i.then) {
                return this._setStatus("pending"), this._awaitForCurrentValue(i, !0)
                    .then(() => (this._setStatus(), this._calculateValue(e)), e => {
                        throw this._setErrorState(e), e;
                    });
            }
            if (u === this) {
                throw new Error("Depends on own value")
                    ;
            }
            if (this._nowInComputing) {
                throw new Error("Now in computing state (cycle deps?)");
            }
            const n = this._computation,
                o = u;
            u = this, this._nowInComputing = !0;
            try {
                this._computationsCount++;
                const e = n(i, t, this);
                if (this._updateFlags = 0, this._isNeedToCompute = !1, e && "object" == typeof e && "function"
                == typeof e.then) {
                    this._setStatus("pending");
                    const t = e.then(e => (this._computationPromise !== t
                    || (this._computationPromise = null, this._setStatus("default"),
                        void 0 === e || "object" != typeof e && Object.is(i, e)
                            ? this._setStatus()
                            : (this._version++, this._value = e, this._resolveIfNeeded(e), this._setStatus(void 0, !1), s.emit(this._signalSymbol, e))), e))
                        .catch(e => this._computationPromise !== t
                            ? (console.error("EventSignal: async computation: error:", e), this._value)
                            : (this._computationPromise = null, this._setErrorState(e), console.error("EventSignal: async computation: error:", e), this._value));
                    return this._computationPromise = t, t;
                }
                void 0 === e || "object" != typeof e && Object.is(i, e)
                || (this._version++, this._value = e, this._resolveIfNeeded(e), s.emit(this._signalSymbol, e));
            }
            finally {
                u = o, this._nowInComputing = !1;
            }
        }
        else {
            this._isNeedToCompute = !1;
            const e = this._value;
            let i;
            if (void 0 !== t && (i = t), !this._nowInSettings && void 0 !== i && !Object.is(e, i)) {
                this._version++, this._value = i, this._nowInSettings = !0;
                try {
                    this._resolveIfNeeded(i), s.emit(this._signalSymbol, i);
                }
                finally {
                    this._nowInSettings = !1, this._updateFlags = 0;
                }
            }
        }
    }

    _innerGet()  {
        if (this.isDestroyed) {
            return this._value;
        }
        return this._value;
    }
    get = () => {
        if (this.isDestroyed) {
            return this._value;
        }
        if (u && u !== this && u._subscribeTo(this._signalSymbol), this._isNeedToCompute) {
            const e = this._calculateValue();
            if (e) {
                return e;
            }
        }
        return this._value;
    };
    getSafe = () => {
        try {
            return this.get();
        }
        catch {
            return this._value;
        }
    };
    getLast = () => this._value;
    getSourceValue = () => this._sourceValue;

    getUpdateFlags() {
        return this._updateFlags;
    }

    set(e) {
        if (!this.isDestroyed) {
            if ("function" == typeof e) {
                const t = this._innerGet(), { _sourceValue: i } = this,
                    n = e(t, void 0 !== i ? i : t, this.data)
                ;this._setSourceValue(n, !0) && this._recalculateIfNeeded();
            }
            else {
                this._setSourceValue(e, !0) && this._recalculateIfNeeded();
            }
        }
    }

    _setSourceValue(e, t = !1) {
        const { _sourceValue: i } = this;
        return !(void 0 === e || t && "error" !== this.status && "object" != typeof i && Object.is(e, i)
                || (this._updateFlags |= 4, this._sourceValue = e, this._nowInComputing))
            && (this._isNeedToCompute = !0, r.emit(this._signalSymbol), !0);
    }

    toString() {
        return this.get();
    }

    valueOf() {
        return this.get();
    }

    _recalculateIfNeeded() {
        this._checkPendingState() && (this._recalcPromise || (this._recalcPromise = Promise.resolve().then(async () => {
            this._recalcPromise = void 0, await this._calculateValue(void 0);
        }).catch(e => {
            console.error("EventSignal: #get: error:", e);
        })));
    }

    _checkPendingState() {
        return !(!this._resolve && !s.hasListener(this._signalSymbol));
    }

    _resolveIfNeeded(e) {
        this._resolve && (this._resolve(e), this._resolve = void 0, this._reject = void 0, this._promise = void 0);
    }

    _rejectPromiseIfDestroyed() {
        if (this.isDestroyed && this._reject) {
            const { description: e } = this._signalSymbol;
            this._reject(new Error("EventSignal object is destroyed" + (e
                ? ` (${e})`
                : ""))), this._resolve = void 0, this._reject = void 0, this._promise = void 0;
        }
    }

    toPromise(e, t) {
        let i;
        if (this._promise) {
            i = this._promise;
        }
        else {
            const { resolve: e, reject: t, promise: n } = Promise.withResolvers();
            this._resolve = e, this._reject = t, this._promise = n, i = n;
        }
        return this._rejectPromiseIfDestroyed(), e || t ? i.then(e, t) : i;
    }

    async* [Symbol.asyncIterator]() {
        for (; !this.isDestroyed ;) {
            const e = Symbol(),
                t = this.toPromise(e => e, function() {
                    return e;
                }),
                i = await t;
            if (i === e) {
                return;
            }
            yield i;
        }
    }

    _subscribeTo(e) {
        const { _subscriptionsToDeps: t } = this,
            i = t.has(e);
        this.isDestroyed ? i && t.delete(e) : i || (t.add(e), r.addListener(e, this._oneOfDepUpdated));
    }

    _addListener(e, t, i = !1, n = !1) {
        let o = !1;
        if ("function" == typeof e ? (t = e, e = void 0) : o = !0, this.isDestroyed) {
            return o ? this : {
                unsubscribe: w,
                closed: !0,
            };
        }
        if (E(t), void 0 !== e && "" !== e && "change" !== e && "changed" !== e) {
            if ("error" === e) {
                return this
                    ;
            }
            throw new Error(`Invalid "ignoredEventName". Should be undefined or one of ["", "change", "changed", "error"] but "${String(e)}" found`);
        }
        const r = this._signalSymbol;
        if (i ? n ? s.prependOnceListener(r, t) : s.once(r, t) : n
            ? s.prependListener(r, t)
            : s.on(r, t), o) {
            return this;
        }
        let a = !1;
        return {
            unsubscribe: () => {
                a = !0, this._removeListener(e, t);
            }, get closed() {
                return a;
            },
        };
    }

    _removeListener(e, t) {
        let i = !1;
        if ("function" == typeof e ? (t = e, e = void 0) : i = !0, this.isDestroyed) {
            return i ? this : void 0;
        }
        if (E(t),
        void 0 !== e && "" !== e && "change" !== e && "changed" !== e) {
            if ("error" === e) {
                return;
            }
            throw new Error(`Invalid "ignoredEventName". Should be undefined or one of ["", "change", "changed", "error"] but "${String(e)}" found`);
        }
        s.removeListener(this._signalSymbol, t);
    }

    once(e, t) {
        return this._addListener(e, t, !0);
    }

    on(e, t) {
        return this._addListener(e, t);
    }

    addListener(e, t) {
        return this._addListener(e, t);
    }

    prependListener(e, t) {
        return this._addListener(e, t, !1, !0);
    }

    prependOnceListener(e, t) {
        return this._addListener(e, t, !0, !0);
    }

    off(e, t) {
        return this._removeListener(e, t);
    }

    removeListener(e, t) {
        return this._removeListener(e, t);
    }

    emit(e) {
        let t = !1;
        if (void 0 !== e && (t = !0), this.isDestroyed) {
            return t ? this : void 0;
        }
        if (void 0 !== e && "" !== e && "change" !== e && "changed" !== e) {
            if ("error" === e) {
                return;
            }
            throw new Error(`Invalid "ignoredEventName". Should be undefined or one of ["", "change", "changed", "error"] but "${String(e)}" found`);
        }
        return this.get(), t ? this : void 0;
    }

    subscribe = e => {
        if ("function" != typeof e) {
            return w
                ;
        }
        const { unsubscribe: t } = this._addListener(e);
        return t;
    };
    subscribeOnNextAnimationFrame = this._subscribeOnNextAnimationFrame.bind(this, !1);
    subscribeOnNextRender = this._subscribeOnNextAnimationFrame.bind(this, !0);

    _subscribeOnNextAnimationFrame(e, t) {
        if ("function"
            != typeof requestAnimationFrame) {
            throw new TypeError('"requestAnimationFrame" is not supported in this realm.');
        }
        if ("function" != typeof t) {
            return w;
        }
        const i = f.bind(null, t), { unsubscribe: n } = this._addListener(i);
        let o;
        return e && (o = () => {
            this._componentVersion++, i();
        }, this.componentType && l.on(this.componentType, o)), () => {
            o && this.componentType && l.removeListener(this.componentType, o), p(t), n();
        };
    }

    get version() {
        return this._version;
    }

    getSnapshotVersion = () => {
        let e = `${this._version}`;
        return this.status && (e += `-${this._computationsCount}-${this.status}`), this._componentVersion > 0
        && (e += `=${this._componentVersion}`), e;
    };

    get computationsCount() {
        return this._computationsCount;
    }

    createMethod(e) {
        return t => {
            const i = this._value, { _sourceValue: n } = this,
                o = e(i, t, void 0 !== n ? n : i, this);
            void 0 !== o && this.set(o);
        };
    }

    map(e) {
        return new EventSignal(void 0, () => e(this.get()));
    }

    setReactFC(e) {
        const t = this._reactFC;
        return this._reactFC = [ e ], t;
    }

    component = (e, t) => {
        const { type: i } = this;
        return ("type" in i ? i.type : i)({ eventSignal: this, ...e }, t);
    };

    static createSignal(e, t, i) {
        return new EventSignal(e, t, i);
    }

    static {
        let e,
            i,
            r,
            s,
            a;
        this.initReact = function(t) {
            "useSyncExternalStore" in t && (a = t.useSyncExternalStore,
            t.createElement && (r = t.createElement), t.memo && (s = t.memo, Object.defineProperties(this.prototype, {
                type: {
                    configurable: !0,
                    value: s(h),
                },
            }))), e = Symbol.for("react.fragment"), i = Symbol.for("react.profiler");
        };
        const u = new WeakMap,
            l = function(e) {
                return s ? s(e) : e;
            };

        function h({ eventSignal: h, children: d, sFC: _, ...f }) {
            const p = void 0/*h._isInReactRenders ??= new Set*/,
                g = h.getSafe(), { componentType: b } = h,
                S = void 0 === _ && Boolean(r) ? h._reactFC ?? (void 0 !== b ? function(e, i) {
                    const n = typeof e;
                    if (null === e || "undefined" === n) {
                        return null
                            ;
                    }
                    const o = ("object" === n || "symbol" === n && m && t(e) ? v.get(e) : y.get(e)) || null;
                    return o && ((null != i ? o[i] : null) || o.default) || null;
                }(b, h.status) : void 0) : void 0,
                E = void 0 !== _ ? _ : S?.[0],
                w = null != E && !1 !== E,
                F = w ? S?.[1] : void 0;
            let V;
            if (a) {
                V = a(h.subscribeOnNextRender, h.getSnapshotVersion);
                e:if (w) {
                    if (p?.has(E)) {
                        // console.warn(`warning: recursive render detected while rendering "${E.name}". You may need \`.get()\` to eventSignal?`);
                        // break e;
                    }
                    p?.add(E)
                    ;const { key: e, version: t } = h,
                        n = s && !("$$typeof" in E) ? u.getOrInsertComputed(E, l) : E,
                        o = r(n, {
                            key: e,
                            eventSignal: h,
                            version: t,
                            snapshotVersion: V,
                            componentType: b, ...F, ...f,
                        }, d || null);
                    return r(i, { id: h.key, onRender: p?.delete.bind(p, E) }, o);
                }
            }
            else {
                console.warn('warning: "useSyncExternalStore" for EventSignal is not set. Please use `EventSignal.initReact({ useSyncExternalStore: React.useSyncExternalStore, createElement: React.createElement, memo: React.memo })`.');
            }
            if (d) {
                const { key: t } = h;
                return r(e, { key: t }, d || null);
            }
            return "object" == typeof g && g ? Array.isArray(g) ? n(g, c) : c(g) ? g : o(g) : g;
        }

        Object.defineProperties(this.prototype, {
            $$typeof: { configurable: !0, value: Symbol.for("react.transitional.element") },
            type: { configurable: !0, value: h },
            props: {
                configurable: !0, get() {
                    return { eventSignal: this };
                },
            },
            displayName: { configurable: !0, get: () => String(Math.random()) },
            ref: { configurable: !0, value: null },
        });
    }

    static registerReactComponentForComponentType(e, i, n, o) {
        const r = "string" == typeof n || "number" == typeof n ? n : void 0,
            s = void 0 === r ? n : o,
            a = function(e, i, n, o) {
                const r = typeof e;
                if (null === e || "undefined" === r) {
                    return null;
                }
                const s = n ?? "default",
                    a = "object" === r || "symbol" === r && m && t(e) ? v : y,
                    u = a.get(e) || null,
                    l = u?.[s];
                if (null == i) {
                    null !== u && a.delete(e);
                }
                else {
                    const t = { 0: i, 1: o, __proto__: null };
                    null === u ? a.set(e, { [s]: t, __proto__: null }) : u[s] = t;
                }
                return l || null;
            }(e, i, r, s);
        return !e || (a?.[0] || null) === i && function(e, t) {
            if (e === t || null == e && null == t) {
                return !0;
            }
            if (!e || !t) {
                return !1;
            }
            const i = Object.keys(e),
                n = Object.keys(t);
            if (i.length !== n.length) {
                return !1;
            }
            for (let o = 0, r = i.length ; o < r ; o++) {
                const r = i[o];
                if (n[o] !== r || e[r] !== t[r]) {
                    return !1;
                }
            }
            return !0;
        }(a?.[1], s) || l.emit(e), a?.[0] || null;
    }
}

const l = new i({ listenerOncePerEventType: !0 });

function c(e) {
    return !!e && "object" == typeof e && void 0 !== e.$$typeof && void 0 !== e.type;
}

let h;
const d = [],
    _ = () => {
        h = void 0;
        try {
            for (let e = 0, t = d.length ; e < t ; e++) d[e]();
        }
        catch (e) {
            console.error("EventSignal~subscribeOnNextAnimationFrame~onNextAnimationFrame: error:", e);
        }
        d.length = 0;
    },
    f = e => {
        d.push(e), h || (h = requestAnimationFrame(_));
    },
    p = e => {
        const t = d.indexOf(e)
        ;-1 !== t && d.splice(t, 1);
    },
    m = function() {
        try {
            const e = new WeakMap,
                t = Symbol(),
                i = {};
            return e.set(t, i), e.get(t) === i;
        }
        catch {
            return !1;
        }
    }(),
    v = new WeakMap,
    y = new Map;
const g = Symbol("kTargetListener");

function b(e, t, i, n) {
    if ("function" == typeof e.on) {
        n?.once ? e.once(t, i) : e.on(t, i);
    }
    else {
        if ("function"
            != typeof e.addEventListener) {
            throw new TypeError('Invalid type of "emitter". Should be EventEmitter or EventTarget');
        }
        {
            const o = "symbol" == typeof t ? String(`symbol----${String(t)}`) : t;
            e.addEventListener(o, i, n);
        }
    }
}

function S(e, t, i) {
    if ("function" == typeof e.removeListener) {
        e.removeListener(t, i);
    }
    else {
        if ("function"
            != typeof e.removeEventListener) {
            throw new TypeError('Invalid type of "emitter". Should be EventEmitter or EventTarget');
        }
        {
            const n = "symbol" == typeof t ? String(`symbol----${String(t)}`) : t,
                o = i[g] || i;
            e.removeEventListener(n, o);
        }
    }
}

function E(e) {
    if ("function" != typeof e) {
        throw new TypeError('"listener" argument must be a function')
    }
}

function w() {
}

const F = function() {
        if ("undefined" == typeof WeakRef || "WeakRef" !== WeakRef.prototype[Symbol.toStringTag]) {
            return !1;
        }
        try {
            const e = Object.create(null),
                t = new WeakRef(e);
            if ("WeakRef" !== t[Symbol.toStringTag]) {
                return !1;
            }
            if (t.deref() !== e) {
                return !1
            }
        }
        catch {
            return !1
        }
        try {
            return Object.create(WeakRef.prototype).deref(), !1
        }
        catch {
            return !0
        }
    }(),
    V = F && function() {
        try {
            const e = Symbol("_WeakRef_symbols_support");
            return new WeakRef(e).deref() === e
        }
        catch {
            return !1
        }
    }(),
    C = Object.setPrototypeOf({
        deref() {
            return this.__value
        },
        [Symbol.toStringTag]: "FakeWeakRef"
    }, null);
export const __test__get_signalEventsEmitter = e ? () => r : void 0;
export const __test__get_subscribersEventsEmitter = e ? () => s : void 0;
