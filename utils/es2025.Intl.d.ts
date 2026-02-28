//
declare namespace Intl {
    /**
     * An integer between 1 and 7.
     * Compatible with `(new Intl.Locale("en")).getWeekInfo().firstDay`.
     */
    type _WeekDayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

    type _Intl_Locale_WeekInfo = {
        firstDay: _WeekDayNumber,
        weekend: [ weekendStart: _WeekDayNumber, weekendEnd: _WeekDayNumber ],
        minimalDays: _WeekDayNumber,
    };
    type _Intl_Locale_deprecated_WeekInfo = {
        firstDay: _WeekDayNumber,
        weekendStart: number,
        weekendEnd: number,
        minimalDays: _WeekDayNumber,
    };

    interface Locale extends LocaleOptions {
        /**
         * @deprecated use {@link getCalendars}
         */
        calendars?: string[];
        /**
         * The `getCalendars()` method of `Intl.Locale` instances returns a list of one or more unique calendar identifiers for this locale.
         *
         * > Note: In some versions of some browsers, this method was implemented as an accessor property called `calendars`.
         * > However, because it returns a new array on each access, it is now implemented as a method to prevent the
         * > situation of `locale.calendars === locale.calendars` returning false.
         *
         * @see [MDN / Intl.Locale.prototype.getCalendars()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getCalendars}
         */
        getCalendars?: () => string[];
        /**
         * @deprecated use {@link getCollations}
         */
        collations?: string[];
        /**
         * The `getCollations()` method of `Intl.Locale` instances returns a list of one or more [collation types](https://www.unicode.org/reports/tr35/tr35-collation.html#CLDR_collation)
         * for this locale.
         *
         * > Note: In some versions of some browsers, this method was implemented as an accessor property called `collations`.
         * > However, because it returns a new array on each access, it is now implemented as a method to prevent the
         * > situation of `locale.collations === locale.collations` returning false.
         *
         * @see [MDN / Intl.Locale.prototype.getCollations()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getCollations}
         */
        getCollations?: () => string[];
        /**
         * @deprecated use {@link getHourCycles}
         */
        hourCycles?: ('h11' | 'h12' | 'h23' | 'h24')[];
        /**
         * The `getHourCycles()` method of `Intl.Locale` instances returns a list of one or more unique hour cycle identifiers for this locale.
         *
         * > Note: In some versions of some browsers, this method was implemented as an accessor property called `hourCycles`.
         * > However, because it returns a new array on each access, it is now implemented as a method to prevent the
         * > situation of `locale.hourCycles === locale.hourCycles` returning false.
         *
         * @see [MDN / Intl.Locale.prototype.getHourCycles()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getHourCycles}
         */
        getHourCycles?: () => ('h11' | 'h12' | 'h23' | 'h24')[];
        /**
         * @deprecated use {@link getNumberingSystems}
         */
        numberingSystems?: string[];
        /**
         * The `getNumberingSystems()` method of `Intl.Locale` instances returns a list of one or more unique [numbering system](https://en.wikipedia.org/wiki/Numeral_system)
         * identifiers for this locale.
         *
         * > Note: In some versions of some browsers, this method was implemented as an accessor property called `numberingSystems`.
         * > However, because it returns a new array on each access, it is now implemented as a method to prevent the
         * > situation of `locale.numberingSystems === locale.numberingSystems` returning false.
         *
         * @see [MDN / Intl.Locale.prototype.getNumberingSystems()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getNumberingSystems}
         */
        getNumberingSystems?: () => string[];
        /**
         * @deprecated use {@link getTextInfo}
         */
        textInfo?: { direction: 'ltr' | 'rtl' };
        /**
         * The `getTextInfo()` method of `Intl.Locale` instances returns the ordering of characters indicated by
         * either `ltr` (left-to-right) or by `rtl` (right-to-left) for this locale.
         *
         * > Note: In some versions of some browsers, this method was implemented as an accessor property called `textInfo`.
         * > However, because it returns a new array on each access, it is now implemented as a method to prevent the
         * > situation of `locale.textInfo === locale.textInfo` returning false.
         *
         * @see [MDN / Intl.Locale.prototype.getTextInfo()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getTextInfo}
         */
        getTextInfo?: () => { direction: 'ltr' | 'rtl' };
        /**
         * @deprecated use {@link getTimeZones}
         */
        timeZones?: string[];
        /**
         * The `getTimeZones()` method of `Intl.Locale` instances returns a list of supported time zones for this locale.
         *
         * > Note: In some versions of some browsers, this method was implemented as an accessor property called `timeZones`.
         * > However, because it returns a new array on each access, it is now implemented as a method to prevent the
         * > situation of `locale.timeZones === locale.timeZones` returning false.
         *
         * @see [MDN / Intl.Locale.prototype.getTimeZones()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getTimeZones}
         */
        getTimeZones?: () => string[];
        /**
         * @deprecated use {@link getWeekInfo}
         */
        weekInfo?: _Intl_Locale_deprecated_WeekInfo | _Intl_Locale_WeekInfo;
        /**
         * The `getWeekInfo()` method of `Intl.Locale` instances returns a `weekInfo` object with the properties
         * `firstDay`, `weekend` and `minimalDays` for this locale.
         *
         * > Note: In some versions of some browsers, this method was implemented as an accessor property called `weekInfo`.
         * > However, because it returns a new object on each access, it is now implemented as a method to prevent the
         * > situation of `locale.weekInfo === locale.weekInfo` returning `false`.
         *
         * @see [MDN / Intl.Locale.prototype.getWeekInfo()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getWeekInfo}
         */
        getWeekInfo?: () => _Intl_Locale_WeekInfo;
    }
}
