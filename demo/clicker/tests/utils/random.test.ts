'use strict';

import { describe, it, expect } from "@jest/globals";

import { makeRandomInteger, makeRandomString } from "../../utils/random";

describe('utils/random', function() {
    describe('makeRandomInteger', function() {
        it('should return number', function() {
            const randomNumber = makeRandomInteger();

            expect(typeof (randomNumber as unknown) === 'number').toBe(true);
        });
        it('cases', function() {
            expect(makeRandomInteger()).toBeGreaterThanOrEqual(0);
            expect(makeRandomInteger(1)).toBeGreaterThan(0);
            expect(makeRandomInteger(0, 0)).toBe(0);
        });
    });

    describe('makeRandomString', function() {
        it('should return string', function() {
            const randomString1 = makeRandomString();

            expect(typeof (randomString1 as unknown) === 'string').toBe(true);

            const randomString2 = makeRandomString('a', 'b');

            expect(typeof (randomString2 as unknown) === 'string').toBe(true);

            const randomString3 = makeRandomString(true);

            expect(typeof (randomString3 as unknown) === 'string').toBe(true);

            const randomString4 = makeRandomString('start', 'end', true);

            expect(typeof (randomString4 as unknown) === 'string').toBe(true);
        });

        it('with prefix/suffix', function() {
            expect(makeRandomString('test').startsWith('test')).toBe(true);
            expect(makeRandomString(void 0, 'test').endsWith('test')).toBe(true);

            const randomString1 = makeRandomString('start', 'end');

            expect(randomString1.startsWith('start')).toBe(true);
            expect(randomString1.endsWith('end')).toBe(true);

            const randomString2 = makeRandomString('start', true);

            expect(randomString2.startsWith('start')).toBe(true);
        });
    });
});
