/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-function-type,@typescript-eslint/no-wrapper-object-types */
/**
 * @see [WebReflection/flatted]{@link https://github.com/WebReflection/flatted}
 */
export declare function stringifyWithCircularHandle(item: any, mapValueOrAutoHandle?: boolean | ((key: string, val: unknown) => unknown)): string;
export declare function arrayContentStringify(list: (Function | Object | bigint | number | string | symbol)[], excludeObjectFn?: (object: {
    [key: string]: unknown;
}) => boolean): any[];
