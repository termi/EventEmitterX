/// <reference types="node" />
'use strict';
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseServerTimingsString = parseServerTimingsString;
// see: [Perf-marks - That's the simplest and lightweight solution for User Timing API in Javascript.](https://github.com/willmendesneto/perf-marks)
//       [Cross-platform performance measurements with User Timing API and perf-marks](https://willmendesneto.com/posts/cross-platform-performance-measurements-with-user-timing-apiand-perf-marks/)
//       [User Timing API](https://developer.mozilla.org/en-US/docs/Web/API/User_Timing_API)
// see: [nodejs / perf / usertiming](https://github.com/nodejs/node/blob/main/lib/internal/perf/usertiming.js)
//       [nodetiming](https://github.com/nodejs/node/blob/main/lib/internal/perf/nodetiming.js)
//       [performance](https://github.com/nodejs/node/blob/main/lib/internal/perf/performance.js)
//       [performance_entry](https://github.com/nodejs/node/blob/main/lib/internal/perf/performance_entry.js)
const termi_runEnv_1 = require("termi@runEnv");
const TimeMark_js_1 = require("./TimeMark.cjs");
function _escapeTimingDesc(desc) {
    return desc.replace(/(["',])/g, '\\$1');
}
/**
 * @param string
 * @param charToRemove - one char
 * @param stopChar - one char
 * @param removeStopChar
 * @private
 */
function _removeCharsAtEnd(string, charToRemove, stopChar, removeStopChar = false) {
    const { length } = string;
    let newLength = length;
    const has_stopChar = stopChar !== void 0;
    while (--newLength >= 0) {
        const char = string[newLength];
        if (has_stopChar && char === stopChar) {
            if (removeStopChar) {
                --newLength;
            }
            break;
        }
        if (char !== charToRemove) {
            break;
        }
    }
    newLength++;
    if (newLength !== length) {
        return string.substring(0, newLength);
    }
    return string;
}
const _debug_toLocaleTimeString_options = termi_runEnv_1.isIDEDebugger
    ? Object.freeze(Object.setPrototypeOf({ hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }, null))
    : void 0;
const n0 = typeof BigInt !== 'undefined' ? BigInt(0) : void 0;
/**
 * An implementation of https://developer.mozilla.org/en-US/docs/Web/API/PerformanceServerTiming
 * See https://w3c.github.io/server-timing/#the-performanceservertiming-interface
 *
 * The PerformanceServerTiming interface surfaces server metrics that are sent with the response in the
 * Server-Timing HTTP header.
 *
 * This interface is restricted to the same origin, but you can use the Timing-Allow-Origin header to specify the domains
 * that are allowed to access the server metrics. Note that this interface is only available in secure contexts (HTTPS)
 * in some browsers.
 */
class ServerTimingRecord {
    /**
     * @param name - A DOMString value of the server-specified metric name.
     * @param description - A DOMString value of the server-specified metric description, or an empty string.
     * @param duration - A double that contains the server-specified metric duration, or value 0.0.
     * @param _key - Non-unique **key**. If given, it will be used as the value in {@link ServerTiming#keys} and {@link ServerTiming#entries} function.
     */
    constructor(name, description, duration = 0, _key) {
        this.rawName = name;
        this.name = String(name);
        this.description = description || '';
        this.duration = duration || 0;
        this._key = _key ?? void 0;
        if (termi_runEnv_1.isIDEDebugger) {
            const date = new Date(duration);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
            Object.defineProperty(this, '_duration', {
                value: date.toLocaleTimeString(void 0, _debug_toLocaleTimeString_options),
            });
        }
        Object.freeze(this);
    }
    /**
     * Non-unique **key** of this ServerTimingRecord.
     * * return {@link _key} if defined and not null.
     * * otherwise, return {@link rawName} if defined and not null, and not empty string.
     * * otherwise, return {@link description} if defined and not null, and not empty string, and not `0` number.
     * * otherwise, return memorized randomly-generated string value.
     */
    get key() {
        const { _key } = this;
        if (_key != null) {
            return _key;
        }
        const { rawName } = this;
        if (!!rawName || rawName === 0 || (n0 !== void 0 ? rawName === n0 : false)) {
            return rawName;
        }
        const { description } = this;
        // eslint-disable-next-line no-extra-boolean-cast
        if (!!description) {
            return description;
        }
        const { _rndKey } = this;
        if (_rndKey) {
            return _rndKey;
        }
        const rndKey = _rnd(`_rndKey_`);
        this._rndKey = rndKey;
        return rndKey;
    }
    /**
     * Эта функция возвращает закрытые одно значение для HTTP-заголовка [Server-Timing]{@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing}.
     *
     * @see [W3C Spec / Server Timing / The Server-Timing Header Field]{@link https://w3c.github.io/server-timing/#dfn-server-timing-header-field}
     */
    serverTimingString() {
        const durString = _removeCharsAtEnd(this.duration.toFixed(3), '0', '.', true);
        const { description } = this;
        if (description) {
            return `${this.name};desc="${_escapeTimingDesc(description)}";dur=${durString}`;
        }
        return `${this.name};dur=${durString}`;
    }
    toString() {
        return this.serverTimingString();
    }
    toJSON() {
        return {
            name: this.name,
            duration: this.duration,
            description: this.description,
            __proto__: null,
        };
    }
    toEntry() {
        return [this.key, this.duration, this.rawName, this.description];
    }
}
_a = ServerTimingRecord;
(() => {
    Object.setPrototypeOf(_a.prototype, null);
})();
// eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
// @ts-ignore `TS7053: Element implicitly has an any type because expression of type unique symbol can't be used to index type ServerTimingRecord`
ServerTimingRecord.prototype[Symbol.toStringTag] = 'ServerTimingRecord';
// https://w3c.github.io/server-timing/
class ServerTiming {
    constructor(options = {}) {
        // noinspection JSUnusedGlobalSymbols
        /**
         * flag for object check
         */
        this.isTiming = true;
        this._index = 0;
        this._prefix = '';
        this._endedRecordsMap = new Map();
        this._endedRecords = [];
        this._timeMarksMap = new Map();
        // print to console
        this._pTC = false;
        // update parent index
        this._updPI = false;
        /** Current depth. Used for repeating groupPrefix. */
        this.depth = 0;
        this.logger = void 0;
        this.descPrefix = '';
        this.groupPrefix = '';
        this.prefixSep = '';
        this.consolePrefix = '';
        const {
        // eslint-disable-next-line unicorn/consistent-destructuring
        timing = options.serverTiming, customPerformance, } = options;
        const hasParentTiming = timing ? timing instanceof _b : false;
        const _timing = timing;
        let { startIndex, } = options;
        if (startIndex === void 0 && hasParentTiming) {
            startIndex = _timing.getIndex();
            this._updPI = true;
        }
        const { logger = hasParentTiming ? _timing.logger : void 0, printToConsole = hasParentTiming ? _timing._pTC : void 0, consolePrefix = hasParentTiming ? _timing.consolePrefix : void 0, descPrefix = hasParentTiming ? _timing.descPrefix : void 0, groupPrefix = hasParentTiming ? _timing.groupPrefix : void 0, prefixSep = hasParentTiming ? _timing.prefixSep : void 0, indexPrefix = hasParentTiming ? _timing._prefix : void 0, omitNotExisted = hasParentTiming ? _timing._oNE : void 0, } = options;
        if (customPerformance) {
            this._perf = customPerformance;
        }
        if (hasParentTiming && _timing !== this) {
            this._pTiming = _timing;
        }
        if (logger) {
            this.logger = logger;
        }
        else if (printToConsole) {
            this.logger = console;
        }
        Object.defineProperty(this, 'logger', { enumerable: false, configurable: true, writable: true });
        if (printToConsole !== void 0) {
            this._pTC = printToConsole;
        }
        if (consolePrefix) {
            this.consolePrefix = String(consolePrefix);
        }
        if (descPrefix) {
            this.descPrefix = String(descPrefix);
        }
        if (groupPrefix) {
            this.groupPrefix = String(groupPrefix);
        }
        if (prefixSep) {
            this.prefixSep = String(prefixSep);
        }
        if (startIndex) {
            this._index = startIndex;
        }
        if (indexPrefix) {
            this._prefix = indexPrefix;
        }
        this._oNE = !!omitNotExisted;
    }
    destructor() {
        this.resetTiming();
        this._pTiming = void 0;
        this.logger = void 0;
        this.consolePrefix = '';
        this.consolePrefix = '';
        this.descPrefix = '';
        this.groupPrefix = '';
        this._prefix = '';
    }
    [Symbol.dispose]() {
        this.destructor();
    }
    resetTiming() {
        this._endedRecords = [];
        for (const timeMark of this._timeMarksMap.values()) {
            if (timeMark) {
                timeMark.reset();
            }
        }
        this._timeMarksMap.clear();
        this._endedRecordsMap.clear();
    }
    getIndex() {
        return this._index;
    }
    incIndex() {
        if (this._pTiming && this._updPI) {
            return (this._index = this._pTiming.incIndex());
        }
        return ++this._index;
    }
    /**
     * Starts a timer you can use to track how long an operation takes. You give each timer a unique name.
     * When you call {@link ServerTiming#timeEnd} with the same name, it will output the time, in milliseconds,
     * that elapsed since the timer was started.
     *
     * @param timerName - one or many timer identifiers. Will be used as displayName if {@link displayName} is not defined.
     * @param displayName - if defined, will be used as name in {@link PerformanceServerTiming.name}, otherwise {@link timerName} will be used.
     */
    time(timerName, displayName) {
        // noinspection JSDeprecatedSymbols
        const isArray_displayName = displayName ? Array.isArray(displayName) : false;
        // noinspection JSDeprecatedSymbols
        if (Array.isArray(timerName)) {
            for (let i = 0, len = timerName.length; i < len; i++) {
                const _displayName = isArray_displayName ? (displayName[i] || void 0) : displayName;
                this.time(timerName[i], _displayName);
            }
            return;
        }
        else if (isArray_displayName) {
            throw new TypeError(`Arguments "displayName" can be Array only if argument "timerName" is Array.`);
        }
        if (this._timeMarksMap.has(timerName)) {
            if (this._pTC) {
                // Timer 'A' already exists`
                // todo: Выводить это сообщение только по специальному флагу.
                this.logger?.warn(`${this.consolePrefix}Timer '${String(timerName)}' already exists`);
            }
            return;
        }
        const existsServerTimingRecord = this._endedRecordsMap.get(timerName);
        this._timeMarksMap.set(timerName, new TimeMark_js_1.TimeMark(timerName, {
            __proto__: null,
            data: {
                depth: this.depth,
                // todo: Сделать опцию (getNewIndexOnStart), для присвоения индекса в момент вызова time(), а не в timeEnd()
                // index: this.incIndex(),
            },
            predefinedDuration: existsServerTimingRecord?.duration,
            autoStart: true,
            displayName: typeof displayName !== 'undefined' ? displayName : void 0,
            customPerformance: this._perf,
        }));
    }
    /**
     * Logs the current value of a timer that was previously started by {@link ServerTiming#time}.
     *
     * Do nothing if {@link ServerTiming_Options.printToConsole} was not `true` value then passed to {@link ServerTiming.constructor}.
     */
    timeLog(timerName, omitNotExisted = false) {
        // noinspection JSDeprecatedSymbols
        if (Array.isArray(timerName)) {
            for (const _timerName of timerName) {
                this.timeLog(_timerName, omitNotExisted);
            }
            return;
        }
        const timer = this._timeMarksMap.get(timerName);
        if (!timer) {
            if (omitNotExisted && !this._oNE && this._pTC) {
                this.logger?.warn(`${this.consolePrefix}Timer '${String(timerName)}' does not exist`);
            }
            return;
        }
        if (this._pTC) {
            this.logger?.info(this.consolePrefix + timer.makeDurationMessage(true));
        }
    }
    /**
     * Stops a timer that was previously started by calling {@link ServerTiming#time}.
     */
    timeEnd(timerName, omitNotExisted = false) {
        // noinspection JSDeprecatedSymbols
        if (Array.isArray(timerName)) {
            for (const _timerName of timerName) {
                this.timeEnd(_timerName, omitNotExisted);
            }
            return;
        }
        const timer = this._timeMarksMap.get(timerName);
        if (!timer) {
            if (omitNotExisted && !this._oNE && this._pTC) {
                this.logger?.warn(`${this.consolePrefix}Timer '${String(timerName)}' does not exist`);
            }
            return;
        }
        this._timeMarksMap.delete(timerName);
        timer.end();
        if (this._pTC) {
            this.logger?.info(this.consolePrefix + timer.makeDurationMessage(true));
        }
        const { duration: durationInMS, name, displayName, } = timer;
        const parentTiming = this._pTiming;
        const parentDepth = parentTiming ? parentTiming.depth : 0;
        const timerData = timer.data || {};
        const { depth: saved_depth = this.depth, index: saved_index, } = timerData;
        const existsServerTimingRecord = this._endedRecordsMap.get(name);
        /** Auto-created name */
        const timingName = existsServerTimingRecord
            ? existsServerTimingRecord.name
            : (this._prefix + String(saved_index ?? this.incIndex()).padStart(2, '0'));
        const { descPrefix, groupPrefix, prefixSep } = this;
        const currentDepth = parentDepth + saved_depth;
        const groupPrefix_withDepth = (groupPrefix && currentDepth)
            ? (currentDepth === 1 ? groupPrefix : groupPrefix.repeat(currentDepth))
            : '';
        const timingDesc = descPrefix + groupPrefix_withDepth + prefixSep + displayName;
        const newServerTimingRecord = new ServerTimingRecord(timingName, timingDesc, durationInMS, name);
        if (existsServerTimingRecord) {
            const index = this._endedRecords.indexOf(existsServerTimingRecord);
            if (index === -1) {
                // Что-то явно пошло не так, тут должен быть положительный индекс
                this.logger?.warn(`${this.consolePrefix}Timer '${String(timerName)}' index === -1 wile trying to update existsServerTimingRecord`);
            }
            else {
                /**
                 * Тут не нужно складывать `existsServerTimingRecord.duration + durationInMS` потому что новый таймер
                 *  уже начинался с учетом времени в existsServerTimingRecord.duration в функции {@link time}
                 */
                this._endedRecords[index] = newServerTimingRecord;
            }
        }
        else {
            this._endedRecordsMap.set(name, newServerTimingRecord);
            // todo: Возможно, помимо создания ServerTimingRecord, сам закрытый TimeMark сохранять в отдельном массиве, чтобы
            //  можно было его получить по имени в публичном методе (что-то типа `getTimeMark(timerName: string)`)?
            // eslint-disable-next-line unicorn/consistent-destructuring
            this._endedRecords.push(newServerTimingRecord);
        }
        timer.destructor();
    }
    /**
     * Non-Console method.
     *
     * Get `duration` value of timer that was previously started by calling {@link ServerTiming#time}.
     */
    timeValue(timerName, omitNotExisted = false) {
        return this.timeMarkValue(timerName, omitNotExisted)?.duration;
    }
    /**
     * Non-Console method.
     *
     * Get timer that was previously started by calling {@link ServerTiming#time}.
     */
    timeMarkValue(timerName, omitNotExisted = false) {
        const timer = this._timeMarksMap.get(timerName);
        if (!timer) {
            if (omitNotExisted && !this._oNE && this._pTC) {
                this.logger?.warn(`${this.consolePrefix}Timer '${String(timerName)}' does not exist`);
            }
            return;
        }
        return timer;
    }
    /**
     * Non-Console method
     */
    ensureTimeMark(timerName) {
        const timeMark = this._timeMarksMap.get(timerName);
        if (timeMark) {
            return timeMark;
        }
        this.time(timerName);
        return this._timeMarksMap.get(timerName);
    }
    /**
     * Non-Console method.
     *
     * Stops a timer that was previously started by calling {@link ServerTiming#time}
     *  and remove it from ServerTiming known timers.
     */
    timeClear(timerName, omitNotExisted = false) {
        // noinspection JSDeprecatedSymbols
        if (Array.isArray(timerName)) {
            for (const _timerName of timerName) {
                this.timeEnd(_timerName, omitNotExisted);
            }
            return;
        }
        const timer = this._timeMarksMap.get(timerName);
        if (!timer) {
            if (omitNotExisted && !this._oNE && this._pTC) {
                this.logger?.warn(`${this.consolePrefix}Timer '${String(timerName)}' does not exist`);
            }
            return;
        }
        this._timeMarksMap.delete(timerName);
        timer.reset();
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * @deprecated
     * @use {@link getEndedRecordByName}
     */
    getEndedRecordByDescription(description) {
        return this._endedRecords.find(serverTimingRecord => {
            return serverTimingRecord.description === description;
        });
    }
    getEndedRecordByName(timerName) {
        return this._endedRecords.find(serverTimingRecord => {
            // При создании ServerTimingRecord, timerName сохраняется как key
            return serverTimingRecord.key === timerName;
        });
    }
    /**
     * Add ended timers from input string to this instance ended timers list.
     *
     * @param serverTimingString - a result of [ServerTiming#serverTimingString()]{@link serverTimingString}
     */
    enrichWithServerTimingString(serverTimingString) {
        if (!serverTimingString) {
            return;
        }
        this.enrichWithEndedItems(parseServerTimingsString(serverTimingString));
    }
    /**
     * Add ended timers from input array to this instance ended timers list.
     */
    enrichWithEndedItems(serverTimingItems) {
        for (const serverTimingEndedItem of serverTimingItems) {
            const { 0: nameAsString, 1: duration, 2: description, 3: nameAsInteger, } = serverTimingEndedItem;
            const indexString = this._prefix + String(this.incIndex()).padStart(2, '0');
            // Только если передаваемое имя - это число, заменяем его на следующий индекс
            const name = nameAsInteger
                ? indexString
                : nameAsString;
            const key = `${indexString}-${nameAsString}`;
            const newServerTimingRecord = new ServerTimingRecord(name, description || '', duration, key);
            this._endedRecordsMap.set(name, newServerTimingRecord);
            // todo: Возможно, помимо создания ServerTimingRecord, сам закрытый TimeMark сохранять в отдельном массиве, чтобы
            //  можно было его получить по имени в публичном методе (что-то типа `getTimeMark(timerName: string)`)?
            this._endedRecords.push(newServerTimingRecord);
        }
    }
    group() {
        this.depth++;
    }
    groupEnd() {
        if (this.depth > 0) {
            this.depth--;
        }
    }
    get length() {
        // todo: Учитывать, в том числе, не закрытые в данный момент тайминги?
        return this._endedRecords.length;
    }
    getTimings() {
        // todo: Учитывать, в том числе, не закрытые в данный момент тайминги?
        return this._endedRecords.slice();
    }
    keys() {
        // todo: Учитывать, в том числе, не закрытые в данный момент тайминги?
        return this._endedRecords.map(timing => {
            return timing.key;
        });
    }
    values() {
        // todo: Учитывать, в том числе, не закрытые в данный момент тайминги?
        return this._endedRecords.map(timing => {
            return timing.duration;
        });
    }
    entries() {
        // todo: Учитывать, в том числе, не закрытые в данный момент тайминги?
        return this._endedRecords.map(timing => {
            return timing.toEntry();
        });
    }
    /**
     * Эта функция возвращает закрытые тайминги в виде значения для HTTP-заголовка [Server-Timing]{@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing}.
     *
     * @see [ServerTimingRecord.serverTimingString]{@link ServerTimingRecord.serverTimingString}
     * @see [W3C Spec / Server Timing / The Server-Timing Header Field]{@link https://w3c.github.io/server-timing/#dfn-server-timing-header-field}
     */
    serverTimingString(separator = ', ') {
        return this._endedRecords.map(timing => {
            return timing.serverTimingString();
        }).join(separator);
    }
    toString() {
        // todo: Учитывать, в том числе, не закрытые в данный момент тайминги?
        //  (Конкретно для этой функции можно оставить как есть, даже если для других будет принято решение использовать не закрытые тайминги).
        return this.serverTimingString();
    }
    /**
     * Warning: return value of this method CAN BE changed in future!
     */
    toJSON() {
        // todo: Учитывать, в том числе, не закрытые в данный момент тайминги?
        return this._endedRecords.map(timing => {
            return timing.toJSON();
        });
    }
}
_b = ServerTiming;
(() => {
    Object.setPrototypeOf(_b.prototype, null);
})();
exports.default = ServerTiming;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
// @ts-ignore `TS7053: Element implicitly has an any type because expression of type unique symbol can't be used to index type ServerTiming`
ServerTiming.prototype[Symbol.toStringTag] = 'ServerTiming';
if (ServerTiming.prototype.constructor.name !== 'ServerTiming') {
    // Fix class name after minification (uglifyjs or GCC)
    Object.defineProperty(ServerTiming.prototype.constructor, 'name', { value: 'ServerTiming', configurable: true });
}
function parseServerTimingsString(serverTimingsString) {
    const result = [];
    serverTimingsString = serverTimingsString.trim();
    if (serverTimingsString.endsWith(',')) {
        serverTimingsString = serverTimingsString.substring(0, serverTimingsString.length - 1);
    }
    for (const _timingString of serverTimingsString.split(/,\s/)) {
        const timingString = _timingString.trim();
        const firstSeparatorIndex = timingString.indexOf(';');
        if (firstSeparatorIndex !== -1) {
            // "name" SHOULD not include '"' symbols
            const name = timingString.substring(0, firstSeparatorIndex);
            const indexOfDur = timingString.lastIndexOf(';dur=');
            if (indexOfDur !== -1) {
                const endOfDur = timingString.indexOf(';', indexOfDur + ';dur='.length);
                const durationString = timingString.substring(indexOfDur + ';dur='.length, endOfDur === -1 ? void 0 : endOfDur);
                const duration = Number(durationString);
                if (String(duration) === durationString) {
                    const nameAsInteger = Number.parseInt(name, 10);
                    const nameAsIntegerIsValid = String(nameAsInteger) === name
                        || String(nameAsInteger).padStart(name.length, '0') === name;
                    let description;
                    const indexOfDescStart = timingString.indexOf(';desc="');
                    if (indexOfDescStart !== -1) {
                        const indexOfDescEnd = timingString.indexOf('";', indexOfDescStart + ';desc="'.length);
                        description = timingString.substring(indexOfDescStart + ';desc="'.length, indexOfDescEnd === -1 ? (timingString.length - 1) : indexOfDescEnd);
                    }
                    const serverTimingTuple = [
                        name,
                        duration,
                        description,
                        nameAsIntegerIsValid ? nameAsInteger : void 0,
                    ];
                    result.push(serverTimingTuple);
                }
            }
        }
    }
    return result;
}
function _rnd(prefix = '') {
    return `${prefix}${(Math.floor(Math.random() * 9e9)).toString(36)}${(Date.now()).toString(36)}`;
}
//# sourceMappingURL=index.js.map
