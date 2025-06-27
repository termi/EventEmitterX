/* eslint-disable @typescript-eslint/no-explicit-any */

interface ErrorConstructor {
    new (message: string, options: { cause?: Error | string | any }): Error;
}
