'use strict';

import { describe, expect, it } from "@jest/globals";

import { append, checkIsPropertyEditable } from "../../utils/object";

describe('utils/object', function() {
    describe('append', function() {
        it('cases', function() {
            const obj1 = { a: 1, b: 2 };
            const obj2 = { b: 3, c: 4 };
            const obj3 = { d: 5 };

            const result = append(obj1, obj2, obj3);

            expect(result.a).toBe(obj1.a);
            expect(result.b).toBe(obj1.b);
            expect(result.c).toBe(obj2.c);
            expect(result.d).toBe(obj3.d);
        });

        it('all params are optional', function() {
            const obj2 = { b: 3, c: 4 };

            const result = append(null, obj2, {}, null, void 0);

            expect(result.b).toBe(obj2.b);
            expect(result.c).toBe(obj2.c);
        });
    });

    describe('checkIsPropertyEditable', function() {
        it('with writable and non configurable prop', function() {
            const objWithWritableAndNonConfigurableProp = Object.defineProperty({}, 'test', { value: 123, writable: true });

            expect(checkIsPropertyEditable(objWithWritableAndNonConfigurableProp, 'test')).toBe(true);
            expect(checkIsPropertyEditable(objWithWritableAndNonConfigurableProp, 'test', { isForDefineProperty: true })).toBe(false);
        });

        it(`sealed obj: can edit existed, can't add new prop`, function() {
            const sealedObj = Object.seal(Object.defineProperty({}, 'test', { value: 123, writable: true }));

            expect(checkIsPropertyEditable(sealedObj, 'test')).toBe(true);
            expect(checkIsPropertyEditable(sealedObj, 'otherProp')).toBe(false);
        });

        it('with get/set', function() {
            const objWithReadonly = Object.defineProperty({}, 'test', { get(){ return 123; } });

            expect(checkIsPropertyEditable(objWithReadonly, 'test')).toBe(false);

            const objWithGetSet = Object.defineProperty({ _test: 123 }, 'test', {
                get() {
                    return this._test;
                },
                set(test) {
                    this._test = test;
                },
            });

            expect(checkIsPropertyEditable(objWithGetSet, 'test')).toBe(true);
        });
    });
});
