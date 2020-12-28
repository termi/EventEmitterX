export declare function displayValueForTypeGuard(value: unknown): string;
export declare function displayValueForTypeGuard(value: unknown, options?: displayValueForTypeGuard.Options): string;
export declare function displayValueForTypeGuard(value: unknown, type: string, options?: displayValueForTypeGuard.Options): string;
export declare namespace displayValueForTypeGuard {
    type Options = {
        isDisplayValue?: boolean;
        isDisplayType?: boolean;
        isDisplayArray?: boolean;
        valuePrefix?: string;
        valueAsString?: string;
    };
}
export declare function primitiveValueToStringForTypeGuard(value: unknown, type?: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function", options?: {
    isDisplayArray?: boolean;
    valueAsString?: string;
}): string;
