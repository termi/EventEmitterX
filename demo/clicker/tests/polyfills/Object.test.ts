'use strict';

import { describe, it, expect } from "@jest/globals";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
// @ts-ignore ignore `TS2790: The operand of a 'delete' operator must be optional.`
delete Object.groupBy;

import "../../polyfills/Object";

describe('polyfills/Object', function() {
    describe('Object.groupBy', function() {
        it('should group', function() {
            const evenKey = 'even';
            const oddKey = Symbol('odd');
            const array = [ 1, 2, 3, 4, 5 ];
            const indexValues: number[] = [];

            // `Object.groupBy` groups items by arbitrary key.
            // In this case, we're grouping by even/odd keys
            const result = Object.groupBy(array, (num, index) => {
                indexValues.push(index);

                return num % 2 === 0 ? evenKey : oddKey;
            });

            expect(result).toEqual({
                [oddKey]: [ 1, 3, 5 ],
                [evenKey]: [ 2, 4 ],
            });
            expect(indexValues).toEqual([ 0, 1, 2, 3, 4 ]);
        });

        it('should group iterable', function() {
            const evenKey = 'even';
            const oddKey = Symbol('odd');
            const iterable = {
                [Symbol.iterator]() {
                    return this;
                },
                _index: 0,
                _length: 5,
                next() {
                    const index = this._index++;
                    const done = index >= this._length;

                    if (done) {
                        return { done, value: Number.NaN };
                    }

                    return { done, value: index + 1 };
                },
            };
            const indexValues: number[] = [];

            // `Object.groupBy` groups items by arbitrary key.
            // In this case, we're grouping by even/odd keys
            const result = Object.groupBy(iterable, (num: number, index) => {
                indexValues.push(index);

                return num % 2 === 0 ? evenKey : oddKey;
            });

            expect(result).toEqual({
                [oddKey]: [ 1, 3, 5 ],
                [evenKey]: [ 2, 4 ],
            });
            expect(indexValues).toEqual([ 0, 1, 2, 3, 4 ]);
        });
    });
});
