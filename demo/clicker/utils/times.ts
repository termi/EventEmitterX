// noinspection JSUnusedGlobalSymbols

'use strict';

export enum TIMES {
    MILLISECONDS = 1,
    SECONDS = 1000,
    MINUTES = 60 * SECONDS,
    HOURS = 60 * MINUTES,
    DAYS = 24 * HOURS,
    WEEKS = 7 * DAYS,
    // average amount of days
    MONTHS = 30 * DAYS,
    // average amount of days
    YEARS = 365 * DAYS,

    SECONDS_5 = SECONDS * 5,
    SECONDS_10 = SECONDS * 10,
    SECONDS_15 = SECONDS * 15,
    SECONDS_20 = SECONDS * 20,
    SECONDS_30 = SECONDS * 30,
    SECONDS_45 = SECONDS * 45,

    MINUTES_2 = MINUTES * 2,
    MINUTES_5 = MINUTES * 5,
    MINUTES_10 = MINUTES * 10,
    MINUTES_15 = MINUTES * 15,
    MINUTES_30 = MINUTES * 30,
    MINUTES_45 = MINUTES * 45,

    HOURS_2 = HOURS * 2,
    HOURS_4 = HOURS * 4,
    HOURS_8 = HOURS * 8,
    HOURS_12 = HOURS * 12,
    HOURS_16 = HOURS * 16,
    HOURS_20 = HOURS * 20,

    WEEKS_2 = WEEKS * 2,
}
