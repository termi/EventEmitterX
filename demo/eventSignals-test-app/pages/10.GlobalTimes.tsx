'use strict';

import type { MouseEvent } from "react";

import * as React from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import { getCurrentTimeZoneOffsetName } from "../lib/i18n";
import {
    mostPopularCities$,
    nowDate$,
} from "../state/GlobalTimesState";
import { pipPopupWindow$ } from "../state/pipWindowState";
import { currentLocale$, i18n$$, i18nString$$ } from "../state/i18n";

import AnalogClock from "../modules/AnalogClock";

import { menuItemTitle$, unicodeIcon } from './10.GlobalTimes.metadata';

import css from './10.GlobalTimes.module.css';

type ViewType$ = ReturnType<typeof makeViewType$$>;

const ViewType$Context = createContext(null as ViewType$ | null);
const makeViewType$$ = () => {
    const global = (globalThis as unknown as {
        __test__viewType$set: ViewType$[],
    });
    let destructor: (() => void) | undefined;
    const viewType$ = Object.assign(new EventSignal('list' as 'grid' | 'list' | 'table', {
        description: 'viewType$',
        data: {
            onFormSubmit: ((event) => {
                event.preventDefault();
            }) as React.FormEventHandler<HTMLFormElement>,
            onFormChange: ((event) => {
                const target = event.target as HTMLInputElement;

                if (target.name === viewType$.data.radioName && target.value != null) {
                    viewType$.set(target.value as 'grid' | 'list' | 'table');
                }
            }) as React.FormEventHandler<HTMLFormElement>,
            radioName: 'view-type',
            elements: [
                {
                    value: 'list',
                    label: i18nString$$('Список'),
                },
                {
                    value: 'grid',
                    label: i18nString$$('Плитка'),
                },
                {
                    value: 'table',
                    label: i18nString$$('Таблица'),
                },
            ],
        },
        onDestroy() {
            const index = global.__test__viewType$set.indexOf(viewType$);

            if (index !== -1) {
                global.__test__viewType$set.splice(index, 1);
            }
        },
    }), {
        effectWithDestructor: () => {
            return destructor ??= viewType$.destructor.bind(viewType$);
        },
    });

    // Use this global value to emulate viewType$ changes from some other component/place.
    //  set('grid' | 'list' | 'table')
    //  globalThis.__test__viewType$set[0].set('table')
    //  globalThis.__test__viewType$set[0].set(prev => prev === 'table' ? 'grid' : 'table')
    (global.__test__viewType$set ??= []).push(viewType$);

    return viewType$;
};
const useViewType$$ = (viewType?: ReturnType<ViewType$["get"]>) => {
    const viewType$ = useMemo(makeViewType$$, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(viewType$.effectWithDestructor, [ viewType$ ]);

    // Только если мы только что создали viewType$ и нужно указать ему первоначальное значение
    if (viewType && viewType$.version === 0) {
        viewType$.set(viewType);
    }

    return viewType$;
};

export default function PageGlobalTimes({ viewType, filterById }: {
    viewType?: ReturnType<ViewType$["get"]>,
    filterById?: string,
}) {
    const viewType$ = useViewType$$(viewType);

    // Получаем актуальное значение и подписываемся на изменения сигнала.
    // Подписка нужна, чтобы обновлять controllable input's формы, если сигнал viewType$ измениться "снаружи".
    // note: Если гарантировано не будет изменяться "снаружи", то можно тут использовать viewType$.get() и сделать uncontrollable input's.
    viewType = viewType$.use();

    console.log(PageGlobalTimes.name, 'render');

    return (<>
        <div className={css.PageGlobalTimes}>
            <section className={css.container}>
                <header className={css.header}>
                    <div className={css.headerMainContent}>
                        <h1>{unicodeIcon} {menuItemTitle$}</h1>
                        <div className={css.subtitle}>{i18n$$`Локальное время в популярных городах мира`}</div>

                        <div className={css.controls}>
                            <form className={css.viewToggle} action="#"
                                onChange={viewType$.data.onFormChange}
                                onSubmit={viewType$.data.onFormSubmit}
                            >
                                {viewType$.data.elements.map(elementDescription => {
                                    const checked = elementDescription.value === viewType;

                                    return (<label key={elementDescription.value} className={css.viewLabel}>
                                        <input type="radio"
                                            name={viewType$.data.radioName}
                                            value={elementDescription.value}
                                            checked={checked}
                                            // note: 'readonly' attribute applies to all except type = [hidden, range, color, checkbox, radio, buttons].
                                            // This attribute exists only due React warn: You provided a `checked` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultChecked`. Otherwise, set either `onChange` or `readOnly`.
                                            readOnly={true}
                                        />
                                        <span className={css.btnText}>{elementDescription.label}</span>
                                    </label>);
                                })}
                            </form>
                        </div>
                    </div>

                    <div className={css.headerClock}>
                        <AnalogClock current$={nowDate$} onManualTime={nowDate$.set} onResetClick={nowDate$.data.reset}/>
                    </div>
                </header>

                {/* todo: <mostPopularCities$.component.ModContext value={viewType}> */}
                <mostPopularCities$.component.ViewContext value={viewType === 'table' ? {
                    [mostPopularCities$.componentType as string]: GlobalTimesTable,
                    [mostPopularCities$.data.elementsComponentType]: GlobalTimesTableRow,
                } : {
                    [mostPopularCities$.data.elementsComponentType]: GlobalTimesCity,
                }}>
                    <ViewType$Context.Provider value={viewType$}>
                        <mostPopularCities$.component filterById={filterById} sDefaultFC={GlobalTimesList}/>
                    </ViewType$Context.Provider>
                </mostPopularCities$.component.ViewContext>

                <footer className={css.updateTime}>
                    {i18n$$`Время обновляется каждую секунду`}
                    <PageGlobalTimesLegend/>
                </footer>
            </section>
        </div>
    </>);
}

function PageGlobalTimesLegend() {
    const currentLocale = currentLocale$.use();

    return <div className={css.legend}>
        <div className={css.legendItem}>
            <span className={css.legendIcon}>🏛️</span>
            <span>{i18n$$`Столица`}</span>
        </div>
        <div className={css.legendItem}>
            <span className={css.legendIcon}>🌐</span>
            <span>{i18n$$`Выбранная локаль: ${currentLocale}`}</span>
        </div>
        <div className={css.legendItem}>
            <span className={css.legendIcon}>⏰</span>
            <span>{i18n$$`Ваша таймзона: ${getCurrentTimeZoneOffsetName()}`}</span>
        </div>
    </div>;
}

/* todo:
EventSignal.registerView(mostPopularCities$.componentType, GlobalTimesList);
EventSignal.registerView(mostPopularCities$.componentType, GlobalTimesTable, {
    mod: 'table',
    applyView: [
        // [ componentType, reactFC, preDefinedProps? ]
        [ mostPopularCities$.data.elementsComponentType, GlobalTimesTableRow ],
    ],
});
*/

/** @see [Each item component]{@link GlobalTimesCity} */
function GlobalTimesList({
    current$Value,
    filterById,
}: {
    current$Value: typeof mostPopularCities$.value,
    filterById?: string,
}) {
    /** note: for `'table'` value there is another component to render: {@link GlobalTimesTable} */
    const viewType = useContext(ViewType$Context)?.use();
    const classNameMode = viewType === 'grid' ? css.citiesGrid : '';
    const cities = filterById
        ? current$Value.filter(item => item.get().id === filterById)
        : current$Value
    ;

    return (<div className={`${css.citiesContainer} ${classNameMode}`}>
        {cities}
    </div>);
}

function _setPopup(event: MouseEvent<HTMLDivElement>) {
    const { currentTarget } = event;
    const id = (currentTarget as HTMLElement)?.getAttribute?.('data-id') as (string | null);
    const mode = (currentTarget as HTMLElement)?.getAttribute?.('data-click-mode') as (string | null);
    const shouldOpen = mode === 'open';
    const isThisPipOpen = pipPopupWindow$.getLast().dataId === id;
    const shouldIgnore = shouldOpen
        ? isThisPipOpen
        : !isThisPipOpen
    ;

    if (id && !shouldIgnore) {
        pipPopupWindow$.setPopup(shouldOpen ? {
            dataId: id,
            component: PageGlobalTimes,
            componentProps: { filterById: id, viewType: 'grid' },
        } : void 0);
    }
}

function GlobalTimesCity({
    current$,
    current$Value,
}: {
    current$: mostPopularCities$.CityDescription$,
    current$Value: mostPopularCities$.CityDescription$["value"],
}) {
    const {
        // enable,
        id,
        flag,
        name,
        nameLocale,
        isCapital,
        country,
        locale,
        date,
        time,
        dayLightSign,
        timeZone,
        timeZoneName,
        isCurrentOffset,
    } = current$Value;
    const { data } = current$;
    /**
     * * Translated value from default language: `Лондон`
     * * Translated value from custom language: `||es-US||:Pyongyang`
     */
    const translatedCityName = nameLocale ? `||${nameLocale}||:${name}` : name;
    const isCurrentLocale = locale === currentLocale$.get();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isThisPipOpen = pipPopupWindow$.use().dataId === id;
    const viewType = useContext(ViewType$Context)?.use();

    useLayoutEffect(() => {
        return data.initCanvasAnimation(canvasRef.current);
    }, [ data ]);

    return (<div
        data-id={id}
        data-viewtype={viewType}
        className={`${css.cityCard} ${
            isCapital ? css.cityCardCapital : ''} ${
            isCurrentLocale ? css.cityCardCurrentLocale : ''} ${
            isCurrentOffset ? css.cityCardCurrentTimezone : ''}`}
        style={{ "--city-flag-content": `"${flag}"` } as React.CSSProperties}
    >
        <div className={css.canvasContainer}>
            <canvas ref={canvasRef}></canvas>
        </div>
        <div className={css.cityInfo}>
            <div className={css.cityName}>
                <div className={css.cityNameInner} title={timeZone}>
                    <span>
                        {i18nString$$(translatedCityName)}
                        <br className={css.optionalLineBreak}/>{' '}
                        ({timeZoneName})
                    </span>
                </div>
                <div>
                    <div className={css.country}>{country}</div>
                    <div className={css.timezone}>{locale}</div>
                </div>
            </div>
        </div>
        <div className={css.timeInfo}>
            <div className={css.localTime}>{time}</div>
            <div className={css.timeFormat}>
                <span>{date}</span>
                <span>{dayLightSign}️</span>
            </div>
        </div>
        <img className={`${css.pipIcon} ${isThisPipOpen ? css.pipIconClose : ''}`}
            data-id={id} data-click-mode={isThisPipOpen ? 'close' : 'open'}
            onClick={_setPopup}
            src="/pip.svg" alt="pip" height="24px"
        />
    </div>);
}

/** @see [Each item component]{@link GlobalTimesTableRow} */
function GlobalTimesTable({
    current$Value,
    filterById,
}: {
    current$Value: typeof mostPopularCities$.value,
    filterById?: string,
}) {
    const cities = filterById
        ? current$Value.filter(item => item.get().id === filterById)
        : current$Value
    ;

    return (<table className={`${css.citiesContainer} ${css.citiesTable}`}>
        <thead>
            <tr>
                <th></th>
                <th>{i18nString$$('Город')}</th>
                <th>{i18nString$$('Страна')}</th>
                <th>{i18nString$$('Локаль')}</th>
                <th>{i18nString$$('Часовой пояс')}</th>
                <th>{i18nString$$('Часовой пояс')}</th>
                <th>{i18nString$$('Местное время')}</th>
                <th>{i18nString$$('Местная дата')}</th>
            </tr>
        </thead>
        <tbody>
            {cities}
        </tbody>
    </table>);
}

function GlobalTimesTableRow({
    current$Value,
}: {
    current$Value: mostPopularCities$.CityDescription$["value"],
}) {
    const {
        id,
        name,
        nameLocale,
        flag,
        country,
        locale,
        date,
        time,
        dayLightSign,
        timeZone,
        timeZoneName,
    } = current$Value;
    /**
     * * Translated value from default language: `Лондон`
     * * Translated value from custom language: `||es-US||:Pyongyang`
     */
    const translatedCityName = nameLocale ? `||${nameLocale}||:${name}` : name;

    return <tr key={id} data-id={id}>
        <td className={css.cityFlag}>{flag}</td>
        <td className={css.cityName}>{i18nString$$(translatedCityName)}</td>
        <td className={css.country}>{country}</td>
        <td>{locale}</td>
        <td>{timeZone}</td>
        <td>{timeZoneName}</td>
        <td className={css.localTime}>{dayLightSign} {time}</td>
        <td>{date}</td>
    </tr>;
}
