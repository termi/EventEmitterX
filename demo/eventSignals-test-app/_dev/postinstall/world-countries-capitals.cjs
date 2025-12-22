'use strict';

const path = require('node:path');
const fs = require('node:fs');
const url = require('node:url');

const thisFilename = __filename;
const projectRoot = getProjectRootInfo(thisFilename);
const static_data__path = path.join(projectRoot.path, 'static/data');
// 'static/data/countries.json'
const static_data_countries__path = path.join(static_data__path, 'capitals.json');
// 'static/data/countries.info.json'
const static_data_countries_info__path = path.join(static_data__path, 'capitals.info.json');

if (require.main.filename === thisFilename) {
    // Этот файл запускается отдельно (не через `require()`)
    convertCountriesData();
}

function convertCountriesData() {
    const worldCountriesCapitals_path = require.resolve('world-countries-capitals');
    const worldCountriesCapitals_packageJSON_path = getProjectRootInfo(worldCountriesCapitals_path).packageJSONPath;
    /** @type {{ version: string }} */
    const worldCountriesCapitals_packageJSON = require(worldCountriesCapitals_packageJSON_path);
    const { version } = worldCountriesCapitals_packageJSON;

    if (fs.existsSync(static_data_countries__path) && fs.existsSync(static_data_countries_info__path)) {
        const { version: currentVersion } = require(static_data_countries_info__path);

        if (currentVersion === version) {
            // Версия не изменилась, обновлять не нужно
            return;
        }
    }

    const result = {
        // /** @type {string[]} */
        // countriesList: [],
        /** @type {string[]} */
        capitalsList: [],
        /** @type {Record<string, number>} */
        indexByLocale: {},
        /** @type {Record<string, number>} */
        indexByISOv2: {},
        /** @type {string[]} */
        capitalTimezonesList: [],
        /** @type {string[]} */
        timezonePrefixesList: [],
    };
    const {
        // countriesList,
        capitalsList,
        indexByLocale,
        indexByISOv2,
        capitalTimezonesList,
        timezonePrefixesList,
    } = result;
    /** @type {Record<string, number>} */
    const timezonePrefixesMap = Object.create(null);
    /** @type {Record<string, number>} */
    const capitalTimezonesMap = Object.create(null);
    const countriesAndTimezones = require('countries-and-timezones');
    const worldCountriesCapitals = require('world-countries-capitals');
    const countriesAndTimezonesByISOAlpha2 = countriesAndTimezones.getAllCountries();
    /**
     * @type {{
     // 'russia'
     country: string,
     // 'moscow'
     capital: string,
     // 'ruble'
     currency: string,
     // [ 'russian' ]
     native_language: string[],
     // 'vodka, military, matroyshka dolls and cold climate'
     famous_for: string,
     // '+7'
     phone_code: string,
     // 'https://flagpedia.net/data/flags/h80/ru.png'
     flag: string,
     drive_direction: 'right' | 'left',
     // 'none'
     alcohol_prohibition: string,
     // { km2: 17098246, mi2: 6601670 }
     area: { km2: number, mi2: number },
     // 'eu/as'
     continent: string,
     // { numeric: '643', alpha_2: 'ru', alpha_3: 'rus' }
     iso: { numeric: string, alpha_2: string, alpha_3: string },
     // '.ru'
     tld: string,
     // 'republic'
     constitutional_form: string,
     // [ 'ru-RU' ]
     language_codes: string[],
     // false
     is_landlocked: boolean
     }[]}
     */
    const allCountryDetails = worldCountriesCapitals.getAllCountryDetails();
    /**
     * 1. Для некоторых стран в "capital" указано несколько значений через запятую - берём самое первое.
     * 2. Делаем верхний регистр для каждой первой буквы слова.
     * @param {string} capitalName
     * @returns {string}
     */
    const normalizeCapitalCityName = function(capitalName) {// eslint-disable-line unicorn/consistent-function-scoping
        let capital = capitalName.split(',')[0].split(' ').map(part => {
            return part.charAt(0).toUpperCase() + part.substring(1);
        }).join(' ');

        // Исправляем некоторые неточности
        if (capital === 'Washington D.c.') {
            capital = 'Washington D.D.';
        }
        else if (capital === 'Port Moresby Papa') {
            capital = 'Port Moresby';
        }
        else if (capital === 'Port-au-prince') {
            capital = 'Port-au-Prince';
        }
        else if (capital === 'Andorra La Vella') {
            capital = 'Andorra la Vella';
        }

        return capital;
    };

    allCountryDetails.sort((countryInfo1, countryInfo2) => {
        const { iso: { alpha_2: alpha_2_1 } } = countryInfo1;
        const { iso: { alpha_2: alpha_2_2 } } = countryInfo2;

        return alpha_2_1.toLowerCase().localeCompare(alpha_2_2.toUpperCase());
    });

    for (let i = 0, len = allCountryDetails.length ; i < len ; i++) {
        const countryInfo = allCountryDetails[i];
        const {
            // country,
            language_codes = [],
            iso,
        } = countryInfo;
        //
        const capital = normalizeCapitalCityName(countryInfo.capital);
        const ISO_alpha_2 = iso.alpha_2.toUpperCase();
        /** @type { { timezones: string[] } } */
        const timeZonesInfo = countriesAndTimezonesByISOAlpha2[ISO_alpha_2] || { timezones: [] };
        const capitalTimezoneCode = capital.split(' ').join('_');

        // countriesList[i] = country;
        capitalsList[i] = capital;

        for (const locale of language_codes) {
            indexByLocale[locale] = i;
        }

        indexByISOv2[ISO_alpha_2] = i;

        const defaultTimezone = timeZonesInfo.timezones.find(timezone => {
            const pair = timezone.split('/');

            return pair[1] === capitalTimezoneCode;
        }) || timeZonesInfo.timezones[0];

        if (defaultTimezone) {
            const pair = defaultTimezone.split('/');
            const timezonePrefix = pair[0];
            let timezonePrefixIndex = timezonePrefixesMap[timezonePrefix];

            if (timezonePrefixIndex == null) {
                timezonePrefixIndex = timezonePrefixesList.length;
                timezonePrefixesMap[timezonePrefix] = timezonePrefixIndex;
                timezonePrefixesList.push(timezonePrefix);
            }

            const capitalTimezone = `${timezonePrefixIndex}/${pair[1] === capitalTimezoneCode ? '*' : pair[1]}`;
            const existedIndex = capitalTimezonesMap[capitalTimezone];

            if (existedIndex) {
                capitalTimezonesList[i] = existedIndex;
            }
            else {
                capitalTimezonesList[i] = capitalTimezone;
                capitalTimezonesMap[capitalTimezone] = i;
            }
        }
    }

    // Пересоздаём, чтобы ключи были отсортированы
    result.indexByLocale = Object.keys(indexByLocale)
        .sort((key1, key2) => key1.localeCompare(key2))
        .reduce((obj, key) => {
            obj[key] = indexByLocale[key];

            return obj;
        }, /** @type {Record<string, number>} */Object.create(null))
    ;

    fs.writeFileSync(static_data_countries__path, JSON.stringify(result, null, '  '));
    fs.writeFileSync(static_data_countries_info__path, JSON.stringify({
        version,
        buildDate: new Date().toISOString(),
    }));
}

/** @param {string} pathname */
function getProjectRootInfo(pathname) {
    if (pathname.startsWith('file:')) {
        pathname = url.fileURLToPath(new url.URL(pathname));
    }

    // const existed = projectRootsCache[pathname];
    // if (existed !== void 0) {
    //     return existed;
    // }
    let preventInfiniteLoopCounter = 0;
    const MAX_PATH = 100;
    const projectInfo = {
        path: '',
        name: '',
        packageJSONPath: '',
        valid: false,
        __proto__: null,
    };

    // projectRootsCache[pathname] = projectInfo;
    while (preventInfiniteLoopCounter++ < MAX_PATH) {
        const dirname = path.dirname(pathname);

        if (!dirname || dirname === path.sep) {
            return projectInfo;
        }

        const packageJSONPath = path.join(dirname, 'package.json');

        if (fs.existsSync(packageJSONPath)) {
            projectInfo.path = dirname;
            projectInfo.name = path.basename(dirname);
            projectInfo.packageJSONPath = packageJSONPath;
            projectInfo.valid = true;

            return projectInfo;
        }

        pathname = dirname;
    }

    return projectInfo;
}

module.exports = {
    convertCountriesData,
};
