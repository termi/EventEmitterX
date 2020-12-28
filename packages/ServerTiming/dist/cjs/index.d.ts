import { TimeMark } from "./TimeMark.js";
export type TimingsLike = {
    time(timingName: number | string | symbol): void;
    timeEnd(timingName: number | string | symbol): void;
    timeClear(timingName: number | string | symbol): void;
    timeValue?(timingName: number | string | symbol): number | undefined;
};
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
declare class ServerTimingRecord implements PerformanceServerTiming {
    /** A raw value of the server-specified metric name. */
    readonly rawName: TimeMark.NameType;
    /** A DOMString value of the server-specified metric name. */
    readonly name: string;
    /** A double that contains the server-specified metric duration, or value 0.0. */
    readonly duration: number;
    /** A DOMString value of the server-specified metric description, or an empty string. */
    readonly description: string;
    /** Non-unique key. If given will be used as the value in {@link ServerTiming#keys} and {@link ServerTiming#entries} functions */
    private readonly _key;
    /** Random-generated key replacer. Do not se default value undefined for debugging reason. */
    private _rndKey;
    /**
     * @param name - A DOMString value of the server-specified metric name.
     * @param description - A DOMString value of the server-specified metric description, or an empty string.
     * @param duration - A double that contains the server-specified metric duration, or value 0.0.
     * @param _key - Non-unique **key**. If given, it will be used as the value in {@link ServerTiming#keys} and {@link ServerTiming#entries} function.
     */
    constructor(name: TimeMark.NameType, description: string, duration?: number, _key?: TimeMark.NameType);
    /**
     * Non-unique **key** of this ServerTimingRecord.
     * * return {@link _key} if defined and not null.
     * * otherwise, return {@link rawName} if defined and not null, and not empty string.
     * * otherwise, return {@link description} if defined and not null, and not empty string, and not `0` number.
     * * otherwise, return memorized randomly-generated string value.
     */
    get key(): TimeMark.NameType;
    /**
     * Эта функция возвращает закрытые одно значение для HTTP-заголовка [Server-Timing]{@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing}.
     *
     * @see [W3C Spec / Server Timing / The Server-Timing Header Field]{@link https://w3c.github.io/server-timing/#dfn-server-timing-header-field}
     */
    serverTimingString(): string;
    toString(): string;
    toJSON(): {
        name: string;
        duration: number;
        description: string;
        __proto__: null;
    };
    toEntry(): [key: TimeMark.NameType, duration: number, name: TimeMark.NameType, description: string];
}
interface ServerTiming_Options {
    logger?: Console;
    /** Output some messages to [`logger`]{@link ServerTiming_Options.logger}. */
    printToConsole?: boolean;
    /** string prefix for "desc" part in PerformanceServerTiming string */
    descPrefix?: string;
    /** one string char for "desc" part in PerformanceServerTiming string.
     * @example { groupPrefix: '-' }
     * */
    groupPrefix?: string;
    consolePrefix?: string;
    prefixSep?: string;
    startIndex?: number;
    indexPrefix?: string;
    omitNotExisted?: boolean;
    /** Parent instance of ServerTiming class (or class with same interface). */
    timing?: ServerTiming;
    /** Alias for {@link ServerTiming_Options.timing} */
    serverTiming?: ServerTiming;
    /** Use it if you need to replace performance */
    customPerformance?: TimeMark.CustomPerformance | undefined;
}
export default class ServerTiming {
    /**
     * flag for object check
     */
    readonly isTiming: boolean;
    private _index;
    private _prefix;
    /** Parent ServerTiming instance */
    private _pTiming;
    private _endedRecordsMap;
    private _endedRecords;
    private _timeMarksMap;
    private readonly _pTC;
    private readonly _oNE;
    private readonly _updPI;
    /** Current depth. Used for repeating groupPrefix. */
    private depth;
    /** Use it if you need to replace performance */
    private readonly _perf;
    logger: Console | undefined;
    descPrefix: string;
    groupPrefix: string;
    prefixSep: string;
    consolePrefix: string;
    constructor(options?: ServerTiming_Options);
    destructor(): void;
    [Symbol.dispose](): void;
    resetTiming(): void;
    getIndex(): number;
    incIndex(): number;
    /**
     * Starts a timer you can use to track how long an operation takes. You give each timer a unique name.
     * When you call {@link ServerTiming#timeEnd} with the same name, it will output the time, in milliseconds,
     * that elapsed since the timer was started.
     *
     * @param timerName - one or many timer identifiers. Will be used as displayName if {@link displayName} is not defined.
     * @param displayName - if defined, will be used as name in {@link PerformanceServerTiming.name}, otherwise {@link timerName} will be used.
     */
    time(timerName: TimeMark.NameType | TimeMark.NameType[], displayName?: (TimeMark.NameType | undefined)[] | TimeMark.NameType): void;
    /**
     * Logs the current value of a timer that was previously started by {@link ServerTiming#time}.
     *
     * Do nothing if {@link ServerTiming_Options.printToConsole} was not `true` value then passed to {@link ServerTiming.constructor}.
     */
    timeLog(timerName: TimeMark.NameType | TimeMark.NameType[], omitNotExisted?: boolean): void;
    /**
     * Stops a timer that was previously started by calling {@link ServerTiming#time}.
     */
    timeEnd(timerName: TimeMark.NameType | TimeMark.NameType[], omitNotExisted?: boolean): void;
    /**
     * Non-Console method.
     *
     * Get `duration` value of timer that was previously started by calling {@link ServerTiming#time}.
     */
    timeValue(timerName: TimeMark.NameType, omitNotExisted?: boolean): number | undefined;
    /**
     * Non-Console method.
     *
     * Get timer that was previously started by calling {@link ServerTiming#time}.
     */
    timeMarkValue(timerName: TimeMark.NameType, omitNotExisted?: boolean): TimeMark | undefined;
    /**
     * Non-Console method
     */
    ensureTimeMark(timerName: TimeMark.NameType): TimeMark;
    /**
     * Non-Console method.
     *
     * Stops a timer that was previously started by calling {@link ServerTiming#time}
     *  and remove it from ServerTiming known timers.
     */
    timeClear(timerName: TimeMark.NameType | TimeMark.NameType[], omitNotExisted?: boolean): void;
    /**
     * @deprecated
     * @use {@link getEndedRecordByName}
     */
    getEndedRecordByDescription(description: string): ServerTimingRecord | undefined;
    getEndedRecordByName(timerName: TimeMark.NameType): ServerTimingRecord | undefined;
    /**
     * Add ended timers from input string to this instance ended timers list.
     *
     * @param serverTimingString - a result of [ServerTiming#serverTimingString()]{@link serverTimingString}
     */
    enrichWithServerTimingString(serverTimingString: string | undefined): void;
    /**
     * Add ended timers from input array to this instance ended timers list.
     */
    enrichWithEndedItems(serverTimingItems: ServerTimingItemTuple[]): void;
    group(): void;
    groupEnd(): void;
    get length(): number;
    getTimings(): ServerTimingRecord[];
    keys(): TimeMark.NameType[];
    values(): number[];
    entries(): [key: TimeMark.NameType, duration: number, name: TimeMark.NameType, description: string][];
    /**
     * Эта функция возвращает закрытые тайминги в виде значения для HTTP-заголовка [Server-Timing]{@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing}.
     *
     * @see [ServerTimingRecord.serverTimingString]{@link ServerTimingRecord.serverTimingString}
     * @see [W3C Spec / Server Timing / The Server-Timing Header Field]{@link https://w3c.github.io/server-timing/#dfn-server-timing-header-field}
     */
    serverTimingString(separator?: string): string;
    toString(): string;
    /**
     * Warning: return value of this method CAN BE changed in future!
     */
    toJSON(): {
        name: string;
        duration: number;
        description: string;
        __proto__: null;
    }[];
}
export type ServerTimingItemTuple = [
    name: string,
    duration: number,
    description?: string,
    nameAsInteger?: number
];
export declare function parseServerTimingsString(serverTimingsString: string): ServerTimingItemTuple[];
export {};
