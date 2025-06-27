/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

type TypeGuard<T> = (value: unknown) => value is T;
// Вспомогательный тип для извлечения типа из type guard
type ExtractTypeFromGuard<T> = T extends ((value: unknown) => value is infer U) ? U : never;

export function assertOneOfType<T extends Array<TypeGuard<any>>>(
    value: unknown,
    typeGuards: T,
): asserts value is ExtractTypeFromGuard<T[number]> {
    if (!typeGuards.some(guard => guard(value))) {
        throw new Error(`Value "${value}" does not match any of the expected types`);
    }
}
