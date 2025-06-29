//
export type ExcludeType<T, U> = T extends U ? never : T;

// todo: Date превратиться в iso string при JSON.stringify, а в Prisma нет(?) такого авто-созданного типа для объектов из schema.prisma.
//  Придумать как это можно автоматизировать.
export type ReplaceDateWithString<T> = T extends Date
    ? string
    : T extends object
        ? {
            [K in keyof T]: ReplaceDateWithString<T[K]>
        }
        : T
;

export type ReplaceNumberWithString<T> = T extends number
    ? string
    : T extends object
        ? {
            [K in keyof T]: ReplaceNumberWithString<T[K]>
        }
        : T
;

export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
