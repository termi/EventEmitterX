/** For test or debug use only */
export declare const kTimeMarkSetDuration: unique symbol;
export declare class TimeMark {
    readonly name: TimeMark.NameType;
    readonly displayName: string;
    /** Any user-defined data for this TimeMark. */
    readonly data: any;
    /** duration in ms */
    private _finaleDuration;
    private _started;
    private _ended;
    private readonly _startKey;
    private readonly _endKey;
    private readonly _measureKey;
    private readonly _tempKey;
    private readonly _tMeasureKey;
    private readonly _perf;
    /**
     * @param name - The name to give the new timer.
     * @param options
     */
    constructor(name: TimeMark.ConstructorTimeMarkName, options?: TimeMark.ConstructorOptions);
    destructor(): void;
    [Symbol.dispose](): void;
    /**
     * Start timer
     */
    start(): void;
    /**
     * End timer
     */
    end(): void;
    reset(): void;
    /**
     * @deprecated use {@link makeDurationMessage}
     * @see {@link https://console.spec.whatwg.org/#timeend}
     */
    durationMessage(asMilliseconds?: boolean, duration?: number): string;
    /**
     * todo: options for colors for "displayName" and "timeString" (see https://github.com/debug-js/debug)
     *
     * @see {@link https://console.spec.whatwg.org/#timeend}
     */
    makeDurationMessage(asMilliseconds?: boolean, duration?: number): string;
    get started(): boolean;
    get ended(): boolean;
    /** Getter, duration in ms */
    get duration(): number;
    get seconds(): number;
    get format(): string;
    /**
     * For test or debug use only.
     *
     * @param newTestDuration - duration на который хотим перемотать время performance отметки времени
     */
    [kTimeMarkSetDuration](newTestDuration: number): void;
    static startMark(markName: TimeMark.NameType, options?: TimeMark.ConstructorOptions): TimeMark;
}
export declare namespace TimeMark {
    type NameType = bigint | number | string | symbol;
    type CustomPerformance = Pick<typeof performance, 'clearMarks' | 'clearMeasures' | 'getEntriesByName' | 'mark' | 'measure'>;
    type ConstructorTimeMarkName = TimeMark.NameType | {
        toString(): TimeMark.NameType;
    } | {
        valueOf(): TimeMark.NameType;
    };
    interface ConstructorOptions {
        /** Any user-defined data for this TimeMark */
        data?: any;
        predefinedDuration?: number;
        autoStart?: boolean;
        displayName?: TimeMark.NameType | undefined;
        customPerformance?: CustomPerformance | undefined;
        __proto__?: null;
    }
}
