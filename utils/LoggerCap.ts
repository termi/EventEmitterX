'use strict';

// todo: implement console wrapper
import * as console from "node:console";

// @ts-ignore
export default class LoggerCap implements Console {
    private readonly _useConsole: boolean;

    constructor(options?: {
        // todo: use
        addTime?: boolean,
        useConsole?: boolean,
    }) {
        this._useConsole = options?.useConsole ?? true;
    }

    // @ts-ignore
    declare assert(condition?: boolean, ...data: any[]): void;

    // @ts-ignore
    declare clear(): void;

    private _countMap = new Map<Parameters<typeof this.count>[0], number>();
    private _count = console.count;
    private _countReset = console.countReset;

    count(label?: string | number | symbol) {
        const value = this._countMap.get(label);

        this._countMap.set(label, (value || 0) + 1);

        if (this._useConsole) {
            this._count(label != null ? String(label) : label);
        }
    }

    countReset(label?: string | number | symbol) {
        this._countMap.delete(label);

        if (this._useConsole) {
            this._countReset(label != null ? String(label) : label);
        }
    }

    countValue(label?: string | number | symbol) {
        return this._countMap.get(label);
    }

    // @ts-ignore
    declare debug(...data: any[]): void;

    // @ts-ignore
    declare dir(item?: any, options?: any): void;

    // @ts-ignore
    declare dirxml(...data: any[]): void;

    // @ts-ignore
    declare error(...data: any[]): void;

    // @ts-ignore
    declare group(...data: any[]): void;

    // @ts-ignore
    declare groupCollapsed(...data: any[]): void;

    // @ts-ignore
    declare groupEnd(): void;

    // @ts-ignore
    declare info(...data: any[]): void;

    // @ts-ignore
    declare log(...data: any[]): void;

    // @ts-ignore
    declare table(tabularData?: any, properties?: string[]): void;

    // @ts-ignore
    declare time(label?: string): void;

    // @ts-ignore
    declare timeEnd(label?: string): void;

    // @ts-ignore
    declare timeLog(label?: string, ...data: any[]): void;

    // @ts-ignore
    declare timeStamp(label?: string): void;

    // @ts-ignore
    declare trace(...data: any[]): void;

    // @ts-ignore
    declare warn(...data: any[]): void;

    [key: string | symbol]: unknown;

    static {
        Object.setPrototypeOf(this, console);
    }
}


