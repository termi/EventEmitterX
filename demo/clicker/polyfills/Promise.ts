'use strict';

import { defineMethodProperty } from "../utils/object";

/**
 * [ECMAScript proposal: Promise.withResolvers](https://github.com/tc39/proposal-promise-with-resolvers)
 ```
 const { promise, resolve, reject } = Promise.withResolvers();
 ```
 */
if (!Promise.withResolvers) {
    defineMethodProperty(Promise, 'withResolvers', function(this: PromiseConstructor) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _PromiseConstructor = this;
        const type = typeof _PromiseConstructor;

        if ((type !== 'object' && type !== 'function') || !this) {
            throw new TypeError('Promise.withResolvers called on non-object');
        }
        if (type !== 'function') {
            throw new TypeError(`Promise.withResolvers: ${this} is not a constructor`);
        }

        let resolve;
        let reject;
        const promise = new _PromiseConstructor((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });

        return {
            promise,
            resolve,
            reject,
        };
    });
}
