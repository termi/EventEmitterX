'use strict';

import { describe, expect, it } from "@jest/globals";

import { dateToHTMLInputDateTimeLocalValue } from "../../utils/html";

describe('utils/html', function() {
    const date = new Date('2025-07-01T02:30:45.249+03:00');

    describe('dateToHTMLInputDateTimeLocalValue', function() {
        it('default value', function() {
            const value = dateToHTMLInputDateTimeLocalValue();

            expect(typeof (value as unknown) === 'string').toBeTruthy();
        });

        it('with seconds', function() {
            const value = dateToHTMLInputDateTimeLocalValue(date);

            expect(value).toBe('2025-07-01T02:30:45');
        });

        it('without seconds', function() {
            const value = dateToHTMLInputDateTimeLocalValue(date, true);

            expect(value).toBe('2025-07-01T02:30');
        });
    });
});
