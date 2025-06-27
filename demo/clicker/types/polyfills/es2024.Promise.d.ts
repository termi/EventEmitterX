/* eslint-disable @typescript-eslint/no-explicit-any */
//
// see https://github.com/microsoft/TypeScript/blob/main/src/lib/es2024.promise.d.ts
interface PromiseConstructor {
    withResolvers<T>(): {
        resolve: (value: PromiseLike<T> | T) => void,
        reject: (reason?: any) => void,
        promise: Promise<T>,
    };
}
