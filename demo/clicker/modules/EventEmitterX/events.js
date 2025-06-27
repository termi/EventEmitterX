'use strict';
import {
    createAbortError as e,
    isAbortSignal as t,
    AbortControllersGroup as r,
    AbortSignal as n,
} from "../common/abortable";
import { eventsAsyncIterator as i } from "./eventsAsyncIterator"
    ;

const o = "ERR_INVALID_ARG_TYPE",
    s = "ERR_INVALID_OPTION_TYPE",
    c = "undefined" != typeof DOMException ? 20 : "ABORT_ERR",
    u = Object.prototype.toString,
    a = "object" == typeof process && "function" == typeof require && "[object process]" === u.call(process)
        && ("undefined" != typeof window ? !!window.__fake__ : !process.browser), {
        errorMonitor: f,
        captureRejectionSymbol: l,
        getEventListeners: m,
    } = function() {
        let e,
            t,
            r;
        if (a) {
            try {
                const n = require("events");
                e = n.errorMonitor, t = n.captureRejectionSymbol, r = n.getEventListeners;
            }
            catch {
            }
        }
        return e && "error" !== e || (e = Symbol("events.errorMonitor")), t
        || (t = Symbol.for("nodejs.rejection")), { errorMonitor: e, captureRejectionSymbol: t, getEventListeners: r };
    }(),
    E = "function" == typeof m;
export const kDestroyingEvent = Symbol("kDestroyingEvent");

function p(e) {
    return e === kDestroyingEvent || e === f || "newListener" === e || "removeListener" === e || "error" === e;
}

const v = Symbol(),
    d = Symbol("kCapture"),
    h = Symbol(),
    y = 1024,
    _ = 2048,
    g = 4096,
    b = 8192,
    L = 65536,
    T = 1 << 20,
    w = 1 << 21,
    x = 1 << 25,
    S = 1 << 30;

export class EventEmitterEx {
    isEventEmitterEx = !0;
    isEventEmitterX = !0;
    isEventEmitter = !0;
    [h] = !0;
    _events = Object.create(null);
    _maxListeners = Number.POSITIVE_INFINITY;
    _f = 0;
    _emitCounter;
    __onceWrappers = new Set;

    constructor(e) {
        if (e) {
            const {
                maxListeners: t,
                listenerOncePerEventType: r,
                supportEventListenerObject: n,
                captureRejections: i,
                emitCounter: o,
                listenerWithoutThis: s,
                isDebugTraceListeners: c,
            } = e;
            if (void 0 !== t && (this._maxListeners = t), void 0 !== r && (this._f |= 2), i) {
                if ("boolean"
                    != typeof i) {
                    throw new TypeError(`options.captureRejections should be of type "boolean" but has "${typeof i}" type`);
                }
                this._f |= 4;
            }
            s && (this._f |= 8), n && (this._f |= T), o && (this._emitCounter = o, (o === console || function(e) {
                if (!e || "object" != typeof e) {
                    return !1;
                }
                const t = e,
                    r = "function" == typeof t.assert && "function" == typeof t.clear && "function" == typeof t.info
                        && "function" == typeof t.groupCollapsed && "function" == typeof t.table && "function"
                        == typeof t.dirxml;
                let n = !1,
                    i = !1
                ;"[object console]" === u.call(t) ? n = "function" == typeof t.Console : i = globalThis.console === t;
                return r && (n || i);
            }(o)) && (this._f |= w)), c && (this._f |= x);
        }
    }

    destructor() {
        this._f |= S, this._emitCounter = void 0, this.emit(kDestroyingEvent), this.removeAllListeners(), this._addListener = function(
            e, t, r, n) {
            return console.warn("Attempt to add listener on destroyed emitter", this, {
                event: e,
                once: n,
                prepend: r,
            }), !1;
        };
    }

    [Symbol.dispose]() {
        this.destructor();
    }

    get isDestroyed() {
        return me(this._f, S);
    }

    get [d]() {
        return me(this._f, 4);
    }

    set [d](e) {
        e ? this._f |= 4 : this._f = Ee(this._f, 4);
    }

    emit(e, t, r, n) {
        const i = "error" === e,
            o = this._emitCounter;
        let s = this._events[e];
        const c = arguments.length;
        let u = !1;
        if (s) {
            const { _f: o } = this,
                a = me(o, 4),
                l = me(o, 8);
            if (i && me(o, b)) {
                switch (c) {
                    case 1:
                        this.emit(f);
                        break;
                    case 2:
                        this.emit(f, t);
                        break;
                    case 3:
                        this.emit(f, t, r);
                        break;
                    case 4:
                        this.emit(f, t, r, n);
                        break;
                    default: {
                        const e = pe(arguments, 0);
                        e[0] = f, this.emit.apply(this, e);
                    }
                }
            }
            let m = "function" == typeof s,
                E = l ? void 0 : this;
            if (me(o, T) && !m && "handleEvent" in s && (E = s,
                s = s.handleEvent, m = !0, !s)) {
                return;
            }
            if (m) {
                this._emitWithListenersHook?.apply(this, arguments);
                const i = s;
                let o;
                switch (c) {
                    case 1:
                        o = i.call(E);
                        break;
                    case 2:
                        o = i.call(E, t);
                        break;
                    case 3:
                        o = i.call(E, t, r);
                        break;
                    case 4:
                        o = i.call(E, t, r, n);
                        break;
                    default: {
                        const e = pe(arguments, 1);
                        o = i.apply(E, e);
                    }
                }
                if (a && null != o) {
                    fe(this, o, e, pe(arguments, 1));
                }
                u = !0;
            }
            else {
                const i = s;
                if (i.length > 0) {
                    switch (c) {
                        case 1:
                            a ? te.call(this, i, E, e) : ee(i, E);
                            break;
                        case 2:
                            a ? ne.call(this, i, E, t, e) : re(i, E, t);
                            break;
                        case 3:
                            a ? oe.call(this, i, E, t, r, e) : ie(i, E, t, r);
                            break;
                        case 4:
                            a ? ce.call(this, i, E, t, r, n, e) : se(i, E, t, r, n);
                            break;
                        default: {
                            const t = pe(arguments, 1);
                            a ? ae.call(this, i, E, t, e) : ue(i, E, t);
                        }
                    }
                    u = !0;
                }
            }
        }
        else if (i) {
            const e = arguments[1];
            if (e instanceof Error) {
                throw e;
            }
            {
                const t = new Error(`Uncaught, unspecified "error" event. (${e})`);
                throw t.context = e, t;
            }
        }
        else {
            this._emitWithNoListenersHook?.apply(this, arguments);
        }
        return o && "function" == typeof o.count && (me(this._f, w) ? o.count(String(e)) : o.count(e, u)), u;
    }

    on(e, t) {
        return this._addListener(e, t, !1, !1), this;
    }

    once(e, t) {
        return this._addListener(e, t, !1, !0), this;
    }

    _addListener(e, t, r, n) {
        const { _events: i, _maxListeners: o, _f: s, __onceWrappers: c } = this;
        C(t, me(s, T));
        const u = me(s, _),
            a = me(s, x),
            l = c.size > 0,
            m = i[e],
            E = "function" == typeof m;
        let p;
        if (u && this.emit("newListener", e, t), me(s, 2) && m) {
            let r = !1;
            if (E) {
                (m === t || l && m[Q] === t) && (r = !0);
            }
            else {
                const e = m;
                for (let n = e.length ; n-- > 0 ;) {
                    const i = e[n];
                    if (i === t) {
                        r = !0;
                        break;
                    }
                    if (l && i[Q] === t) {
                        r = !0;
                        break;
                    }
                }
            }
            if (r) {
                return me(s, L) && this.emit("duplicatedListener", e, t), !1;
            }
        }
        if ("error" === e ? this._f |= y : e === f ? this._f |= b : "newListener" === e
            ? this._f |= _
            : "removeListener" === e ? this._f |= g : "duplicatedListener" === e && (this._f |= L), n
        && (t = function(e, t, r) {
            const n = { type: t, fired: !1, wrapped: void 0, listener: r, target: e },
                i = Z.bind(n);
            return n.wrapped = i, e.__onceWrappers.add(i), i[Q] = r, i;
        }(this, e, t)), a && (t.__debugTrace = String(new Error("-get-debug-trace-").stack || "")
            .split("\n")), m) {
            if (E) {
                i[e] = r ? [ t, m ] : [ m, t ], p = 2;
            }
            else if (r) {
                const r = function(e, t) {
                    switch (e.length) {
                        case 1:
                            return [ t, e[0] ];
                        case 2:
                            return [ t, e[0], e[1] ];
                        case 3:
                            return [ t, e[0], e[1], e[2] ];
                        case 4:
                            return [ t, e[0], e[1], e[2], e[3] ];
                        case 5:
                            return [ t, e[0], e[1], e[2], e[3], e[4] ];
                        case 6:
                            return [ t, e[0], e[1], e[2], e[3], e[4], e[5] ];
                    }
                    const r = e.slice();
                    return r.unshift(t), r;
                }(m, t);
                p = r.length, i[e] = r;
            }
            else {
                p = m.push(t);
            }
        }
        else {
            i[e] = t, p = 1;
        }
        return o !== Number.POSITIVE_INFINITY && o <= p
        && console.warn(`Maximum event listeners for "${String(e)}" event!`), !0;
    }

    addListener(e, t) {
        return this._addListener(e, t, !1, !1), this;
    }

    removeListener(e, t) {
        const { _events: r, _f: n, __onceWrappers: i } = this;
        C(t, me(n, T));
        const o = r[e];
        if (void 0 === o) {
            return this;
        }
        let s = me(n, g);
        const c = i.size > 0;
        let u;
        if ("function" == typeof o) {
            if (o === t) {
                delete r[e], u = 0;
            }
            else {
                if (!c || o[Q] !== t) {
                    return this;
                }
                i.delete(o), delete r[e], u = 0;
            }
        }
        else {
            const n = o;
            let s = -1;
            if (u = n.length, c) {
                for (let e = n.length ; e-- > 0 ;) {
                    const r = n[e];
                    if (r === t) {
                        s = e;
                        break;
                    }
                    if (r[Q] === t) {
                        i.delete(r), s = e;
                        break;
                    }
                }
            }
            else {
                s = n.indexOf(t);
            }
            if (-1 === s) {
                return this;
            }
            u--, 0 === u ? delete r[e] : r[e] = 1 === u && s < 2 ? n[0 === s ? 1 : 0] : 0 === s ? function(e, t = 0) {
                switch (e.length - t) {
                    case 1:
                        return [ e[t] ];
                    case 2:
                        return [ e[t], e[1 + t] ];
                    case 3:
                        return [ e[t], e[1 + t], e[2 + t] ];
                    case 4:
                        return [ e[t], e[1 + t], e[2 + t], e[3 + t] ];
                    case 5:
                        return [ e[t], e[1 + t], e[2 + t], e[3 + t], e[4 + t] ];
                    case 6:
                        return [ e[t], e[1 + t], e[2 + t], e[3 + t], e[4 + t], e[5 + t] ];
                }
                return e.slice(t);
            }(n, 1) : n.toSpliced(s, 1);
        }
        if (void 0 === u) {
            throw new Error("Normally unreachable error");
        }
        return 0 === u && ("error" === e ? this._f = Ee(n, y) : e === f ? this._f = Ee(n, b) : "newListener" === e
            ? this._f = Ee(n, _)
            : "removeListener" === e ? s && (this._f = Ee(n, g),
                s = !1) : "duplicatedListener" === e && (this._f = Ee(n, L))), s && (void 0 !== t[Q] && (t = t[Q]
            || t), this.emit("removeListener", e, t)), this;
    }

    hasListeners(e) {
        const t = this._events[e];
        return !!t && ("function" == typeof t || t.length > 0);
    }

    prependListener(e, t) {
        return this._addListener(e, t, !0, !1), this;
    }

    prependOnceListener(e, t) {
        return this._addListener(e, t, !0, !0), this;
    }

    off(e, t) {
        return this.removeListener(e, t);
    }

    removeAllListeners(e) {
        const { _f: t, _events: r, __onceWrappers: n } = this,
            i = void 0 !== e,
            o = me(t, g);
        if (o && "removeListener" !== e) {
            if (i) {
                const t = n.size > 0,
                    i = r[e];
                delete r[e];
                const o = "function" == typeof i ? [ i ] : function(e) {
                    switch (e.length) {
                        case 1:
                            return [ e[0] ];
                        case 2:
                            return [ e[0], e[1] ];
                        case 3:
                            return [ e[0], e[1], e[2] ];
                        case 4:
                            return [ e[0], e[1], e[2], e[3] ];
                        case 5:
                            return [ e[0], e[1], e[2], e[3], e[4] ];
                        case 6:
                            return [ e[0], e[1], e[2], e[3], e[4], e[5] ];
                    }
                    return e.slice();
                }(i);
                for (let r = o.length ; r-- > 0 ;) {
                    const i = o[r],
                        s = t ? i[Q] : void 0;
                    void 0 !== s ? (n.delete(i), this.emit("removeListener", e, s)) : this.emit("removeListener", e, i);
                }
            }
            else {
                for (const e of Object.keys(r)) "removeListener" !== e && this.removeAllListeners(e);
                this.removeAllListeners("removeListener");
            }
        }
        else if (i) {
            if (n.size > 0) {
                const t = r[e];
                if ("function" == typeof t) {
                    void 0 !== t[Q] && n.delete(t);
                }
                else {
                    const e = t;
                    for (let t = e.length ; t-- > 0 ;) {
                        const r = e[t];
                        void 0 !== r[Q] && n.delete(r);
                    }
                }
            }
            delete r[e];
        }
        return i
            ? "error" === e ? this._f = Ee(t, y) : e === f ? this._f = Ee(t, b) : "newListener" === e
                ? this._f = Ee(t, _)
                : "removeListener" === e ? o && (this._f = Ee(t, g)) : "duplicatedListener" === e
                    && (this._f = Ee(t, L))
            : (n.clear(),
                this._events = Object.create(null), this._f = Ee(t, 80896)), this;
    }

    setMaxListeners(e) {
        return this._maxListeners = e, this;
    }

    getMaxListeners() {
        return this._maxListeners;
    }

    hasListener(e, t) {
        const r = this._events[e];
        if (!r) {
            return !1;
        }
        if (!t) {
            return !0;
        }
        const n = this.__onceWrappers.size > 0;
        if ("function" == typeof r) {
            const e = n ? r[Q] : void 0;
            return void 0 === e ? t === r : t === e;
        }
        if (n) {
            for (const e of r) {
                const r = e[Q];
                if (void 0 !== r) {
                    if (t === r) {
                        return !0;
                    }
                }
                else if (t === e) {
                    return !0;
                }
            }
        }
        else {
            for (const e of r) if (t === e) {
                return !0;
            }
        }
        return !1;
    }

    listeners(e) {
        const t = this._events[e];
        if (!t) {
            return [];
        }
        const r = this.__onceWrappers.size > 0;
        if ("function" == typeof t) {
            const e = r ? t[Q] : void 0;
            return void 0 === e ? [ t ] : [ e ];
        }
        return r ? t.map(e => {
            const t = e[Q];
            return void 0 !== t ? t : e;
        }) : [ ...t ];
    }

    rawListeners(e) {
        const t = this._events[e];
        return t ? "function" == typeof t ? [ t ] : [ ...t ] : [];
    }

    eventNames() {
        return Object.keys(this._events);
    }

    listenerCount(e) {
        const t = this._events[e];
        return t ? "function" == typeof t ? 1 : t.length : 0;
    }

    static getEventListeners(e, t) {
        if (isEventEmitterEx(e)) {
            return e.listeners(t)
                ;
        }
        if (E) {
            if (isEventEmitterCompatible(e)) {
                return "function" == typeof e.listeners ? e.listeners(t) : m(e, t);
            }
            if (isEventTargetCompatible(e)) {
                if (a) {
                    return m(e, t);
                }
                {
                    const e = new TypeError('EventEmitterEx.getEventListeners: (node=false)[UNSUPPORTED_EMITTER] The "emitter" argument must be an instance of EventEmitter or EventTarget. This EventTarget is unsupported');
                    throw e.code = "ERR_INVALID_ARG_TYPE", e;
                }
            }
        }
        const r = new TypeError(a
            ? 'EventEmitterEx.getEventListeners: (node=true)[UNSUPPORTED_EMITTER] The "emitter" argument must be an instance of EventEmitter or EventTarget'
            : 'EventEmitterEx.getEventListeners: (node=false)[UNSUPPORTED_EMITTER] The "emitter" argument must be an instance of EventEmitter');
        throw r.code = "ERR_INVALID_ARG_TYPE", r;
    }

    static on = i;
    static staticOnceEnrichErrorStack = !0;

    static once(n, i, u) {
        const f = u || {},
            l = f.Promise || Promise;
        let m = !1;
        if (!(n instanceof EventEmitterEx || U(n) || (m = W(n),
            m))) {
            return l.reject(new A('The "emitter" argument must be an instance of EventEmitter or EventTarget.', o));
        }
        const E = n,
            p = m && u ? u : void 0,
            d = m && p && (void 0 !== p.passive || void 0 !== p.capture)
                ? { passive: p.passive, capture: p.capture }
                : void 0,
            h = !!f.prepend,
            y = q(f.errorEventName),
            _ = y ? f.errorEventName : "error",
            g = f.timeout || void 0,
            b = ("function" == typeof f.filter ? f.filter : void 0) || ("function" == typeof f.checkFn
                ? f.checkFn
                : void 0),
            L = "function" == typeof f.onDone ? f.onDone : void 0,
            T = f.abortControllers || void 0
        ;let w = f.signal || void 0,
            x = f.timing || void 0,
            S = q(x);
        const k = EventEmitterEx.staticOnceEnrichErrorStack
                ? j(new Error("-enrichStaticOnceErrorsStackBy-(ignore this)-"), !0).stack
                : void 0,
            O = f.debugInfo || void 0,
            P = null != (R = O) && "object" == typeof R;
        var R;
        let I,
            C,
            $;
        if (m) {
            if (h) {
                return l.reject(new A('The "prepend" option is not supported for EventTarget emitter.', s));
            }
            {
                let e;
                if (Array.isArray(i)) {
                    for (const t of i) if ("symbol" == typeof t) {
                        e = t;
                        break;
                    }
                }
                else {
                    "symbol" == typeof i && (e = i)
                    ;
                }
                if (void 0
                    !== e) {
                    return l.reject(new A(`The "${typeof e}" value type of "types" argument is not supported for EventTarget emitter.`, o));
                }
            }
            if ("symbol"
                == typeof _) {
                return l.reject(new A(`The "${typeof _}" value type of "errorEventName" option is not supported for EventTarget emitter.`, s));
            }
        }
        if (w
            && !t(w)) {
            return l.reject(new A("Failed to execute 'once' on emitter: member signal is not of type AbortSignal.", s));
        }
        if (T && Array.isArray(T) && T.length > 0 && (I = new r(T, w ? [ w ] : []), w = I.signal), w) {
            if (w.aborted) {
                return l.reject(e(c, w.reason));
            }
            d && m && function(e) {
                if (!a && X && function(e) {
                    return "number" == typeof e.nodeType && "string" == typeof e.nodeName && "outerHTML" in e;
                }(e)) {
                    return V ??= Y(document.documentElement || document);
                }
                return Y(e);
            }(n) && (d.signal = w);
        }
        if (S && (J(x), x.time(i)), Array.isArray(i)) {
            let e;
            $ = new l((t, r) => {
                const o = [];
                let s = !0;
                C = function() {
                    for (const { 0: t, 1: r } of o) m ? M(n, t, r, d) : E.removeListener(t, r), S && t !== e
                    && (J(x), "function" == typeof x.timeClear ? x.timeClear(t, !0) : x.timeEnd(t, !0))
                    ;
                    s && (m ? y && M(n, _, c, d) : E.removeListener(_, c)), o.length = 0, C = void 0, S
                    && (x = void 0, S = !1);
                };
                for (const c of i) {
                    c === _ && (s = !1);
                    const i = (...n) => {
                        const i = b || L ? [ c, ...n ] : void 0;
                        if (b) {
                            try {
                                if (!b.apply(E, i)) {
                                    return;
                                }
                            }
                            catch (e) {
                                r(e);
                            }
                        }
                        if (L) {
                            try {
                                L.apply(E, i);
                            }
                            catch (e) {
                                r(e);
                            }
                        }
                        e = c, S && (J(x), x.timeEnd(c, !0)), C && C(), t(n);
                    };
                    o.push([ c, i ]), m ? D(n, c, i, d) : h ? E.prependListener(c, i) : E.on(c, i);
                }
                const c = e => {
                        S && (J(x), "function" == typeof x.timeClear
                            ? x.timeClear(i, !0)
                            : x.timeEnd(i, !0), x = void 0, S = !1), C && C(), r(e);
                    }
                ;s && (m ? y && D(n, _, c, d) : h ? E.prependListener(_, c) : E.on(_, c));
            });
        }
        else {
            const e = i,
                t = e !== _;
            $ = new l((r, i) => {
                const o = (...t) => {
                        const n = b || L ? [ e, ...t ] : void 0;
                        if (b) {
                            try {
                                if (!b.apply(E, n)) {
                                    return;
                                }
                            }
                            catch (e) {
                                i(e);
                            }
                        }
                        if (L) {
                            try {
                                L.apply(E, n);
                            }
                            catch (e) {
                                i(e);
                            }
                        }
                        S && (J(x), x.timeEnd(e, !0), x = void 0, S = !1), C && C(), r(t);
                    },
                    s = t => {
                        S && (J(x), x.timeEnd(e, !0), x = void 0, S = !1), C && C(), i(t);
                    };
                C = function() {
                    m ? (M(n, e, o, d), y && t && M(n, _, s, d)) : (E.removeListener(e, o), t
                    && E.removeListener(_, s)), C = void 0;
                }, m ? (D(n, e, o, d),
                y && t && D(n, _, s, d)) : h ? (E.prependListener(e, o), t && E.prependListener(_, s)) : (E.on(e, o), t
                && E.on(_, s));
            });
        }
        if (w || g) {
            let t,
                r;
            const n = w ? new l((r, n) => {
                    t = function(o) {
                        if (t && (J(w), w.removeEventListener("abort", t)), o === v) {
                            r();
                        }
                        else {
                            C && C(), P && console.error("once#Aborted:", O, { types: i, errorEventName: _ });
                            const t = w?.reason,
                                r = e(c, t);
                            j(r), k && N(r, k, i, _), n(r);
                        }
                        t = void 0;
                    }, J(w), w.addEventListener("abort", t);
                }) : void 0,
                o = g ? new l((e, t) => {
                    let n = setTimeout(() => {
                        S && (J(x), x.timeEnd(i, !0), x = void 0, S = !1), C && C(),
                        P && console.error("once#Timeout:", O, {
                            types: i,
                            errorEventName: _,
                        }), n = void 0, t(function({ eventNames: e, errorEventNames: t, cause: r }, n) {
                            const i = `EventEmitterX.once: Waiting of ${K(e, t)} timeout`,
                                o = new TimeoutError(i, void 0 !== r ? { cause: r } : void 0);
                            j(o), n && N(o, n, e, t);
                            return o;
                        }({ eventNames: i, errorEventNames: y ? _ : void 0 }, k));
                    }, g);
                    r = function() {
                        n && (clearTimeout(n), n = void 0), e(), r = void 0;
                    };
                }) : void 0,
                s = [ $ ];
            return n && s.push(n), o && s.push(o), l.race(s)
                .then(e => (C && C(), t && t(v), r && r(), I && (I.close(), I = void 0), S && (J(x),
                    x.timeEnd(i, !0), x = void 0, S = !1), e)).catch(e => {
                    throw C && C(), t && t(v), r && r(), I && (I.close(), I = void 0), S
                    && (J(x), x.timeEnd(i, !0), x = void 0, S = !1), e;
                });
        }
        return $;
    }

    on2(e, t, r) {
        const n = r?.isRaw ? EventEmitterEx._eventToEventRaw(e) : e;
        return this.on(n, t);
    }

    emit2(e, t, ...r) {
        const n = t?.isRaw ? EventEmitterEx._eventToEventRaw(e) : e;
        return this.emit(n, ...r);
    }

    removeListener2(e, t, r) {
        const n = r?.isRaw ? EventEmitterEx._eventToEventRaw(e) : e;
        return this.removeListener(n, t);
    }

    listenerCount2(e, t) {
        const r = t?.isRaw ? EventEmitterEx._eventToEventRaw(e) : e;
        return this.listenerCount(r);
    }

    static _eventToEventRaw(e) {
        switch (typeof e) {
            case"string":
                return e + "-raw";
            case"number":
                return e << 1;
            default:
                return e;
        }
    }

    static errorMonitor = f;
    static captureRejectionSymbol = l;
    static usingDomains = !1;
    static EventEmitter = EventEmitterEx;
    static EventEmitterEx = EventEmitterEx;
    static EventEmitterX = EventEmitterEx;
    static AbortController = AbortController;
}

EventEmitterEx.prototype[Symbol.toStringTag] = "EventEmitterX"
;const k = "EventEmitterEx";
EventEmitterEx.constructor.name !== k && Object.defineProperty(EventEmitterEx.constructor, "name", {
    value: k,
    configurable: !0,
});
export { EventEmitterEx as EventEmitter, EventEmitterEx as EventEmitterX, EventEmitterEx as default };

function j(e, t = !1) {
    let { stack: r = "" } = e;
    if (!function(e, t, r = {}) {
        if (Object.isFrozen(e)) {
            return !1;
        }
        const n = Object.getOwnPropertyDescriptor(e, t);
        if (!n) {
            return !Object.isSealed(e);
        }
        if (r.isUseDefineProperty && !n.configurable) {
            return !1;
        }
        if (n.get) {
            return !!n.set
                ;
        }
        return !!n.writable;
    }(e, "stack")) {
        return e;
    }
    if (e.originalStack || Object.defineProperty(e, "originalStack", {
        value: r,
        configurable: !0,
        writable: !0,
        enumerable: !1,
    }), t) {
        const e = r.search(/\s*at\s/);
        -1 !== e && (r = r.substring(e));
    }
    return e.stack = r.split(/\n/).filter(e => {
        if (/[/\\]AbortController\./.test(e)) {
            return !1;
        }
        if (/[/\\]events\./.test(e)) {
            return !1;
        }
        if (/[/\\]node_modules[/\\]/.test(e)) {
            if (/[/\\]jest-circus[/\\]/.test(e)) {
                return !1;
            }
            if (/[/\\]jest-runner[/\\]/.test(e)) {
                return !1;
            }
            if (/[/\\]jest-cli[/\\]/.test(e)) {
                return !1
                    ;
            }
            if (/[/\\]@jest[/\\]core[/\\]/.test(e)) {
                return !1;
            }
            if (/[/\\]@sinonjs[/\\]fake-timers[/\\]/.test(e)) {
                return !1;
            }
            if (/[/\\]jsdom[/\\]lib[/\\]jsdom[/\\]/.test(e)) {
                return !1;
            }
        }
        return !e.includes("node:internal/process/task_queues:") && !e.includes("node:async_hooks:")
            && "at new Promise (<anonymous>)" !== e.trim();
    }).join("\n"), e;
}

export class EventEmitterSimpleProxy extends EventEmitterEx {
    _eventEmitter;
    _proxyHandlers = Object.create(null);
    _paused = !1;

    constructor(e) {
        super(e);
        const { emitter: t } = e || {}
        ;
        if (!U(t)) {
            throw new TypeError('compatible "emitter" required');
        }
        this._eventEmitter = t;
    }

    destructor() {
        super.destructor(), this._eventEmitter = void 0;
    }

    pause() {
        this._paused = !0;
    }

    unpause() {
        this._paused = !1;
    }

    _onEventEmitterEvent(e, ...t) {
        if (!this._paused) {
            switch (t.length) {
                case 0:
                    super.emit(e);
                    break;
                case 1:
                    super.emit(e, t[0]);
                    break;
                case 2:
                    super.emit(e, t[0], t[1]);
                    break;
                case 3:
                    super.emit(e, t[0], t[1], t[2]);
                    break;
                default:
                    super.emit(e, ...t);
            }
        }
    }

    emit(e, ...t) {
        return p(e) ? super.emit(e, ...t) : !!this._eventEmitter && this._eventEmitter.emit(e, ...t);
    }

    emitSelf(e, ...t) {
        return super.emit(e, ...t);
    }

    _addListener(e, t, r, n) {
        const i = super._addListener(e, t, r, n);
        if (p(e)) {
            return i;
        }
        const { _eventEmitter: o, _proxyHandlers: s } = this;
        if (!o) {
            return i;
        }
        let c = s[e];
        return c ? o.removeListener(e, c) : (c = this._onEventEmitterEvent.bind(this, e), s[e] = c), J(c), r ? n
            ? o.prependOnceListener(e, c)
            : o.prependListener(e, c) : n ? o.once(e, c) : o.on(e, c), i;
    }

    removeListener(e, t) {
        const r = super.removeListener(e, t)
        ;
        if (0 === this.listenerCount(e)) {
            const { _eventEmitter: t, _proxyHandlers: r } = this,
                n = r[e];
            if (delete r[e], t && n && n) {
                try {
                    t.removeListener(e, n);
                }
                catch {
                }
            }
        }
        return r;
    }

    removeAllListeners(e) {
        const { _eventEmitter: t, _proxyHandlers: r } = this;
        for (const n of Object.keys(r)) {
            if (e && e !== n) {
                continue;
            }
            const i = r[n];
            if (delete r[n], t && i && i) {
                try {
                    t.removeListener(n, i);
                }
                catch {
                }
            }
        }
        return e || (this._proxyHandlers = Object.create(null)), super.removeAllListeners(e);
    }
}

const O = "EventEmitterSimpleProxy"
;EventEmitterSimpleProxy.constructor.name !== O
&& Object.defineProperty(EventEmitterSimpleProxy.constructor, "name", { value: O, configurable: !0 });

export class EventEmitterProxy extends EventEmitterEx {
    _getSourceEmitter = void 0;
    _getTargetEmitter = void 0;
    _sourceEmitter;
    _targetEmitter;
    _allowDirectEmitToTarget;
    _hasProxyHandlers = Object.create(null);
    _antiLoopingInfoMap = Object.create(null);
    _knownSubscriptions = [];

    constructor(e) {
        super(e)
        ;const {
            getSourceEmitter: t,
            getTargetEmitter: r,
            sourceEmitter: n,
            targetEmitter: i,
            allowDirectEmitToTarget: o = !1,
        } = e || {};
        this.setGetSourceEmitter(t), this.setGetTargetEmitter(r), this._sourceEmitter = U(n)
            ? n
            : void 0, this._targetEmitter = isEventEmitterCompatible(i) ? i : void 0, this._allowDirectEmitToTarget = o;
    }

    destructor() {
        super.destructor(), this._sourceEmitter = void 0, this._targetEmitter = void 0, this._getSourceEmitter = void 0, this._getTargetEmitter = void 0;
    }

    setGetSourceEmitter(e) {
        this._getSourceEmitter = "function" == typeof e ? e : void 0;
    }

    setGetTargetEmitter(e) {
        this._getTargetEmitter = "function" == typeof e ? e : void 0;
    }

    _detectSourceEmitter(e) {
        const t = this._sourceEmitter || void 0,
            r = this._getSourceEmitter ? this._getSourceEmitter(t, e) : void 0;
        if (null === r) {
            return null;
        }
        const n = r || t;
        return n || void 0;
    }

    _detectTargetEmitter(e, t) {
        const r = this._targetEmitter || void 0,
            n = this._getTargetEmitter ? this._getTargetEmitter(r, e, t) : void 0;
        if (null === n) {
            return null;
        }
        const i = n || r;
        return i || void 0;
    }

    _emitToTarget(e, t, r) {
        const n = !!this._hasProxyHandlers[e];
        if (n) {
            const r = { args: t };
            if (this._antiLoopingInfoMap[e]) {
                throw new Error(`[EventEmitterProxy][#emit]: potentially multiply synchronously nested emit for event "${String(e)}"`);
            }
            this._antiLoopingInfoMap[e] = r;
        }
        const i = r.emit(e, ...t);
        return n && delete this._antiLoopingInfoMap[e], i;
    }

    _onEventEmitterEvent(e, t, ...r) {
        if (this._antiLoopingInfoMap[t]) {
            return;
        }
        const n = this._detectTargetEmitter(t, r);
        if (null !== n && (super.emit(t, ...r), n)) {
            if (e === n) {
                return
                    ;
            }
            this._emitToTarget(t, r, n);
        }
    }

    emit(e, ...t) {
        if (p(e)) {
            return super.emit(e, ...t);
        }
        if (!this._allowDirectEmitToTarget) {
            throw new Error("[EventEmitterProxy][emit]: emitting events to targetEmitter is not allowed");
        }
        const r = this._detectTargetEmitter(e, t);
        let n = !1;
        r && (n = this._emitToTarget(e, t, r));
        const i = super.emit(e, ...t);
        return n || i;
    }

    emitSelf(e, ...t) {
        return super.emit(e, ...t);
    }

    _addListener(e, t, r, n) {
        const i = super._addListener(e, t, r, n);
        if (p(e)) {
            return i;
        }
        const o = this._detectSourceEmitter(e);
        if (!o) {
            return i
                ;
        }
        const { _knownSubscriptions: s } = this,
            c = this._knownSubscriptions.find(([ t, r ]) => e === t && r === o);
        let u;
        return c ? (u = c[2], o.removeListener(e, u)) : u = this._onEventEmitterEvent.bind(this, o, e), J(u), r ? n
            ? o.prependOnceListener(e, u)
            : o.prependListener(e, u) : n ? o.once(e, u) : o.on(e, u), c
        || (this._hasProxyHandlers[e] = !0, this._knownSubscriptions.push([ e, o, u ])), i;
    }

    _removeListenerFromTargets(e, t) {
        const r = void 0 !== e,
            n = void 0 !== t,
            i = Object.create(null), { _knownSubscriptions: o } = this;
        for (let s = 0, c = o.length ; s < c ; s++) {
            const u = o[s], { 0: a, 1: f, 2: l } = u;
            let m = (i[a] || 0) + 1;
            if (!(r && a !== e || n && t !== f)) {
                m--;
                try {
                    f.removeListener(a, l);
                }
                catch {
                }
                o.splice(s, 1), s--, c--;
            }
            i[a] = m;
        }
        for (const e of Object.keys(i)) {
            0 === i[e] && delete this._hasProxyHandlers[e];
        }
    }

    removeListener(e, t) {
        const r = super.removeListener(e, t);
        return 0 === this.listenerCount(e) && this._removeListenerFromTargets(e, void 0), r;
    }

    removeAllListeners(e) {
        return this._removeListenerFromTargets(e, void 0), super.removeAllListeners(e);
    }

    static ABORT_ERR = c;
}

const P = "EventEmitterProxy"
;EventEmitterProxy.constructor.name !== P && Object.defineProperty(EventEmitterProxy.constructor, "name", {
    value: P,
    configurable: !0,
});
export { f as errorMonitor, l as captureRejectionSymbol, c as ABORT_ERR };
export const { once: once, on: on, getEventListeners: getEventListeners } = EventEmitterEx;

class A extends TypeError {
    code;

    constructor(e = "", t) {
        super((e = String(e || "")) && t ? `[${t}]: ${e}` : e || (t || "")), this.code = t
            ? String(t)
            : void 0, this.message = e;
    }

    toString() {
        const { code: e, message: t } = this
        ;
        return e ? `TypeError [${e}]: ${t}` : `TypeError: ${t}`;
    }

    static fromObject(e) {
        if (e instanceof A) {
            return e;
        }
        {
            const { code: t, message: r } = e;
            return new A(r, t);
        }
    }
}

const R = "EventsTypeError";
A.constructor.name !== R && Object.defineProperty(A.constructor, "name", { value: R, configurable: !0 });

export class TimeoutError extends Error {
    name = "TimeoutError";
    code = "ETIMEDOUT";

    constructor(...e) {
        super(...e), this.stack || (this.stack = new Error("-get-stack-").stack);
    }

    static ETIMEDOUT = "ETIMEDOUT";
}

const I = "TimeoutError"
;

function N(e, t, r, n) {
    const i = `{ signal${n ? `, errorEventName: ${K(n)}` : ""} }`;
    e.stack += `\n    (emulated async stack) (EventEmitterX.once(emitter, ${K(r)}, ${i}))`, e.stack += t;
}

function C(e, t = !1) {
    if ("function" != typeof e) {
        if (!t) {
            throw new TypeError('"listener" argument must be a function');
        }
        if ("object" != typeof e
            || !e) {
            throw new TypeError('"listener" argument must be a function or Object.{handleEvent: Function|void}');
        }
    }
}

function D(e, t, r, n) {
    let i = t;
    "symbol" != typeof i || H(e) || (i = String(i)),
        e.addEventListener(i, r, n);
}

function M(e, t, r, n) {
    let i = t;
    "symbol" != typeof i || H(e) || (i = String(i)), e.removeEventListener(i, r, n);
}

TimeoutError.constructor.name !== I && Object.defineProperty(TimeoutError.constructor, "name", {
    value: I,
    configurable: !0,
});
const $ = Symbol("kEventTargetSupportSymbolAsType");

function H(e) {
    if (void 0 !== e[$]) {
        return e[$];
    }
    let t = !1;
    const r = () => {
    };
    try {
        e.addEventListener($, r), e.removeEventListener($, r), t = !0;
    }
    catch {
    }
    return e[$] = t, t;
}

function U(e) {
    return !!e && "function" == typeof e.on && "function" == typeof e.prependListener && "function"
        == typeof e.removeListener;
}

export function isEventEmitterCompatible(e) {
    return U(e) && "function" == typeof e.addListener && "function" == typeof e.once && "function"
        == typeof e.prependOnceListener && "function" == typeof e.emit;
}

export function isEventEmitterEx(e) {
    return !(!e || !e.isEventEmitterX) && (!0 === e[h] || function(e, t) {
        let r = e && "object" == typeof e && Object.getPrototypeOf(e) || void 0;
        for (; r ;) {
            if (r.constructor.name === t) {
                return !0
                    ;
            }
            r = Object.getPrototypeOf(r);
        }
        return !1;
    }(e, "EventEmitterEx"));
}

function W(e) {
    return !!e && "function" == typeof e.addEventListener && "function" == typeof e.removeEventListener;
}

export function isEventTargetCompatible(e) {
    return W(e) && "function" == typeof e.dispatchEvent;
}

export const isEventEmitterLifecycleEvent = p;
const F = Symbol("kEventTargetSignalSupport"),
    z = n.abort(),
    G = function() {
    },
    X = "undefined" != typeof document && !!document;
let V;

function Y(e) {
    const t = e[F];
    if (void 0 !== t) {
        return t;
    }
    let r = !1
    ;const n = Object.defineProperty({ _v: void 0 }, "signal", {
            get() {
                return r = !0, void 0 !== this._v ? this._v : z;
            }, set(e) {
                this._v = e;
            },
        }),
        i = "signalTest";
    return e.addEventListener(i, G, n), e.removeEventListener(i, G, n), e[F] = r, r;
}

const B = "undefined" != typeof BigInt ? BigInt(0) : void 0;

function q(e) {
    return null != e;
}

function J(e) {
    if (null == e) {
        throw new Error("value should be defined");
    }
}

function K(e, t) {
    if (e || 0 === e || void 0 !== B && e === B || (e = []), t || 0 === t || void 0 !== B && t === B) {
        const r = Array.isArray(t) ? t : [ t ]
        ;e = Array.isArray(e) ? [ ...e, ...r ] : [ e, ...r ]
    }
    if (Array.isArray(e)) {
        return JSON.stringify(e.map(e => {
            const t = typeof e;
            return "bigint" === t ? `${String(e)}n` : "symbol" === t ? String(e) : e
        }));
    }
    const r = e,
        n = typeof r,
        i = "bigint" === n ? `${String(r)}n` : "symbol" === n ? String(r) : r;
    return JSON.stringify([ i ])
}

const Q = Symbol("kOnceListenerWrappedHandler");

function Z(...e) {
    if (this.target.__onceWrappers.delete(this.wrapped), this.target.removeListener(this.type, this.wrapped), !this.fired) {
        this.fired = !0
        ;const t = this.listener.apply(this.target, e);
        t && "function" == typeof t.catch && t.catch(e => {
            console.error(e)
        })
    }
}

function ee(e, t) {
    const r = e.length;
    for (let n = 0 ; n < r ; ++n) e[n].call(t)
}

function te(e, t, r) {
    const n = e.length;
    for (let i = 0 ; i < n ; ++i) {
        const n = e[i].call(t);
        null != n && fe(this, n, r, [])
    }
}

function re(e, t, r) {
    const n = e.length;
    for (let i = 0 ; i < n ; ++i) e[i].call(t, r)
}

function ne(e, t, r, n) {
    const i = e.length;
    for (let o = 0 ; o < i ; ++o) {
        const i = e[o].call(t, r);
        null != i && fe(this, i, n, [ r ])
    }
}

function ie(e, t, r, n) {
    const i = e.length
    ;
    for (let o = 0 ; o < i ; ++o) e[o].call(t, r, n)
}

function oe(e, t, r, n, i) {
    const o = e.length;
    for (let s = 0 ; s < o ; ++s) {
        const o = e[s].call(t, r, n);
        null != o && fe(this, o, i, [ r, n ])
    }
}

function se(e, t, r, n, i) {
    const o = e.length;
    for (let s = 0 ; s < o ; ++s) e[s].call(t, r, n, i)
}

function ce(e, t, r, n, i, o) {
    const s = e.length;
    for (let c = 0 ; c < s ; ++c) {
        const s = e[c].call(t, r, n, i);
        null != s && fe(this, s, o, [ r, n, i ])
    }
}

function ue(e, t, r) {
    const n = e.length;
    for (let i = 0 ; i < n ; ++i) e[i].apply(t, r)
}

function ae(e, t, r, n) {
    const i = e.length;
    for (let o = 0 ; o < i ; ++o) {
        const i = e[o].apply(t, r);
        null != i && fe(this, i, n, r)
    }
}

function fe(e, t, r, n) {
    try {
        const { then: i } = t;
        "function" == typeof i && i.call(t, void 0, function(t) {
            setImmediate(le, e, t, r, n)
        })
    }
    catch (t) {
        e.emit("error", t)
    }
}

function le(e, t, r, n) {
    const i = e[l];
    if ("function" == typeof i) {
        i(t, r, ...n);
    }
    else {
        const r = e[d];
        try {
            e[d] = !1, e.emit("error", t)
        }
        finally {
            e[d] = r
        }
    }
}

function me(e, t) {
    return 0 !== (e & t)
}

function Ee(e, t) {
    return e & ~t
}

function pe(e, t = 0) {
    switch (e.length - t) {
        case 5:
            return [ e[t], e[1 + t], e[2 + t], e[3 + t], e[4 + t] ];
        case 6:
            return [ e[t], e[1 + t], e[2 + t], e[3 + t], e[4 + t], e[5 + t] ];
        case 7:
            return [ e[t], e[1 + t], e[2 + t], e[3 + t], e[4 + t], e[5 + t], e[6 + t] ]
    }
    return Array.prototype.slice.call(e, t)
}
