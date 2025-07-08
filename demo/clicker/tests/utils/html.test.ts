/**
 * @jest-environment jsdom
 */
'use strict';

import { describe, expect, it } from "@jest/globals";

import { dateToHTMLInputDateTimeLocalValue, formAsObject } from "../../utils/html";
import { assertIsDateObject } from "../../type_guards/base";

const formatDateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
const formatTimeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
const formatDateTimeOptions: Intl.DateTimeFormatOptions = { ...formatDateOptions, ...formatTimeOptions };

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
            const value = dateToHTMLInputDateTimeLocalValue(date, {
                skipSeconds: true,
            });

            expect(value).toBe('2025-07-01T02:30');
        });
    });

    describe('formAsObject', function() {
        it('should return object with form values', function() {
            const shortText = 'test text';
            const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

            document.body.innerHTML = (
                `<form id="::test-form::">
                    <label>
                        <span>Sample text</span>
                        <input name="shortText" type="text" value="${shortText}" />
                    </label>
                    <label>
                        <span>Select type</span>
                        <input name="type" type="radio" value="type 1" />
                        <input name="type" type="radio" value="type 2" checked />
                    </label>
                    <label>
                        <span>Long text</span>
                        <textarea name="longText">${longText}</textarea>
                    </label>
                    <label>
                        <span>Please choose one or more pets:</span>
                        <select name="pets" multiple >
                            <optgroup label="4-legged pets">
                                <option value="dog">Dog</option>
                                <option value="cat" selected>Cat</option>
                                <option value="hamster" disabled>Hamster</option>
                            </optgroup>
                            <optgroup label="Flying pets">
                                <option value="parrot">Parrot</option>
                                <option value="macaw" selected>Macaw</option>
                                <option value="albatross">Albatross</option>
                            </optgroup>
                        </select>
                    </label>
                </form>`
            );

            const $formEl = document.getElementById('::test-form::') as HTMLFormElement;
            const result = formAsObject($formEl);

            expect(result).toEqual({
                shortText,
                type: 'type 2',
                longText,
                pets: [ 'cat', 'macaw' ],
            });
        });

        it(`working with date/time based input's`, function() {
            const dateForDateTime = new Date('2020-10-11T21:45:03.859Z');
            const dateForMonth = new Date('2020-10-01T21:00:00.000Z');
            const dateForWeek = new Date('2020-10-04T21:00:00.000Z');
            const value = dateToHTMLInputDateTimeLocalValue(dateForDateTime);

            document.body.innerHTML = (
                `<form id="::test-form::">
                    <label>
                        <span>Date input</span>
                        <input name="date" type="date" value="${value.split('T')[0]}" />
                    </label>
                    <label>
                        <span>Time input</span>
                        <input name="time" type="time" value="${value.split('T')[1]}" />
                    </label>
                    <label>
                        <span>datetime-local input</span>
                        <input name="datetime" type="datetime-local" value="${value}" />
                    </label>
                    <label>
                        <span>month input</span>
                        <input name="month" type="month" value="${_toLocalISOMonthString(dateForMonth)}" />
                    </label>
                    <label>
                        <span>month input</span>
                        <input name="week" type="week" value="${_toLocalISOWeekString(dateForWeek)}" />
                    </label>
                </form>`
            );

            const $formEl = document.getElementById('::test-form::') as HTMLFormElement;
            const result = formAsObject($formEl) as {
                date: unknown,
                time: unknown,
                datetime: unknown,
                month: unknown,
                week: unknown,
            };

            assertIsDateObject(result.date);
            assertIsDateObject(result.time);
            assertIsDateObject(result.datetime);
            assertIsDateObject(result.month);
            assertIsDateObject(result.week);

            expect(result.date.toLocaleDateString('en', formatDateOptions)).toBe(dateForDateTime.toLocaleDateString('en', formatDateOptions));
            expect(result.time.toLocaleTimeString('en', formatTimeOptions)).toBe(dateForDateTime.toLocaleTimeString('en', formatTimeOptions));
            expect(result.datetime.toLocaleString('en', formatDateTimeOptions)).toBe(dateForDateTime.toLocaleString('en', formatDateTimeOptions));
            expect(_toLocalISOMonthString(result.month)).toBe(_toLocalISOMonthString(dateForMonth));
            expect(_toLocalISOWeekString(result.week)).toBe(_toLocalISOWeekString(dateForWeek));
        });
    })
});

function _toLocalISOMonthString(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function _toLocalISOWeekString(date: Date) {
    return `${date.getFullYear()}-W${String(_simpleGetWeekNumberInYear(date)).padStart(2, '0')}`;
}

/**
 * Get week number corresponding current time zone.
 *
 * @see [stackoverflow / JavaScript Date.getWeek()? / Wrong ANSWER]{@link https://stackoverflow.com/a/28365677/1587897}
 */
function _simpleGetWeekNumberInYear(date: Date) {
    const _date = new Date(date.getTime());

    _date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    _date.setDate(_date.getDate() + 3 - (_date.getDay() + 6) % 7);

    // January 4 is always in week 1.
    const week1 = new Date(_date.getFullYear(), 0, 4);

    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((_date.getTime() - week1.getTime()) / 86400000
        - 3 + (week1.getDay() + 6) % 7) / 7)
    ;
}
