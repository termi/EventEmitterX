'use strict';

type DateValue = Date | number | string;

/**
 * Return ISO string without timeZone.
 *
 * @returns - string like '2023-09-29T08:44:42' or '2023-09-29T08:44:42.000' with {@link withMilliseconds}==true
 */
function _dateToISO(date: Date, withoutTime = false, withMilliseconds = false) {
    const dateString = date.getFullYear()
        + '-' + String(date.getMonth() + 1).padStart(2, '0')
        + '-' + String(date.getDate()).padStart(2, '0')
    ;
    const timeString = withoutTime ? '00:00:00' : String(date.getHours()).padStart(2, '0')
        + ':' + String(date.getMinutes()).padStart(2, '0')
        + ':' + String(date.getSeconds()).padStart(2, '0')
    ;
    const ms = withMilliseconds && !withoutTime ? date.getMilliseconds() : 0;
    const msString: '' | `.${string}` = withMilliseconds
        ? `.${String(ms).padStart(3, '0')}`
        : ''
    ;

    return `${dateString}T${timeString}${msString}`;
}

/**
 * @returns - ISO_8601 string
 * @throws TypeError 'Invalid time value'
 *
 * @see [Temporal.Instant.prototype.toZonedDateTimeISO]{@link https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tozoneddatetimeiso}
 * @see [Temporal.Now.zonedDateTimeISO()]{@link https://tc39.es/proposal-temporal/docs/#Temporal-Now}
 * @see [An Introduction to the JavaScript Temporal API]{@link https://www.sitepoint.com/javascript-temporal-api-introduction/}
 */
export function localISOString(date?: DateValue, withoutTime = false, withoutMilliseconds = false) {
    const _date = date && date instanceof Date ? date : new Date(date ?? Date.now());
    const offsetString = timezoneOffsetToOffsetString(_date.getTimezoneOffset());

    return `${_dateToISO(_date, withoutTime, !withoutMilliseconds)}${offsetString}`;
}

const _TIME_UNIT_60 = 60;

/**
 * Return time string in format '±HH:MM' for input `timezoneOffset` number.
 *
 * * Positive `timezoneOffset` number will produce '-HH:MM' (negative) value.
 * * Negative `timezoneOffset` number will produce '+HH:MM' (positive) value.
 *
 * @returns - string in format '±HH:MM'
 *
 * @see [List of UTC offsets]{@link https://en.wikipedia.org/wiki/List_of_UTC_time_offsets}
 * @see [Date.prototype.getTimezoneOffset()]{@link https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset}
 */
export function timezoneOffsetToOffsetString(timezoneOffset: number) {
    const tzo = Math.abs(timezoneOffset);
    const minutes = (tzo % _TIME_UNIT_60) as Minutes;
    const hours = ((tzo - minutes) / _TIME_UNIT_60) as Hours;

    return hoursMinutesToTimeString({ hours, minutes, isNegative: timezoneOffset > 0 }, true);
}

type Hours =
    | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
    | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23
;
type From_0_To_59 =
    | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19
    | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29
    | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39
    | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49
    | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59
;
type Minutes = From_0_To_59;

type HoursAndMinutes = {
    hours: Hours, // from 0 to 23
    minutes: Minutes, // from 0 to 59
    isNegative?: boolean,
};
// '+03:00'
type TimeZoneHoursMinutesString = `${'-' | '' | '+'}${string}:${string}`;

/**
 * Return time string in format '±HH:MM' for input `hoursAndMinutes`.
 *
 * @returns {string} - string in format '±HH:MM'
 *
 * @see [List of UTC offsets]{@link https://en.wikipedia.org/wiki/List_of_UTC_time_offsets}
 * @see [Date.prototype.getTimezoneOffset()]{@link https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset}
 */
export function hoursMinutesToTimeString(hoursAndMinutes: HoursAndMinutes, forcePlus = false): TimeZoneHoursMinutesString {
    const {
        hours,
        minutes,
        isNegative,
    } = hoursAndMinutes;
    const dif = isNegative ? '-' : (forcePlus ? '+' : '');

    return `${dif}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
