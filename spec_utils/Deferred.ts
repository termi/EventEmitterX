'use strict';

export class Deferred<T=unknown> extends Promise<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;

    constructor(executor?: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
        let res;
        let rej;
        super((resolve, reject) => {
            res = resolve;
            rej = reject;
            if (typeof executor === 'function') {
                return executor(resolve, reject);
            }
        });

        this.resolve = (res || (() => { })).bind(this);
        this.reject = (rej || (() => { })).bind(this);
    }
}
