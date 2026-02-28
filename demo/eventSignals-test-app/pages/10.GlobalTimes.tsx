/* eslint-disable unicorn/prefer-dom-node-dataset */
'use strict';

import type { MouseEvent } from "react";

import * as React from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

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

const makeViewType$$ = () => {
    const global = (globalThis as unknown as {
        __test__viewType$set: ViewType$[],
    });
    const viewType$ = new EventSignal('list' as 'grid' | 'list' | 'table', {
        description: 'viewType$',
        data: {
            onFormSubmit: ((event) => {
                event.preventDefault();
            }) as React.FormEventHandler<HTMLFormElement>,
            onFormChange: ((event) => {
                const target = event.target as HTMLInputElement;

                if (target.name === viewType$.data.radioName && target.value != null) {
                    // todo: Передавать в set(v, 'onFormChange') вторым параметром значение reason, а когда форма будет вынесена из PageGlobalTimes
                    //  в отдельном компоненте, в этом новом компоненте можно будет вызывать use с параметром { ignoreUpdateReason: 'onFormChange' }
                    //  чтобы не ререндерить форму если в ней изменилось значение инпута.
                    //  ```
                    //  viewType$.set(target.value as 'grid' | 'list' | 'table', 'onFormChange');
                    //  ...
                    //  function ViewTypeForm() {
                    //    const viewType = viewType$.use({ ignoreUpdateReason: 'onFormChange' });
                    //    ...
                    //  }
                    //  ```
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
    useEffect(viewType$.getDispose, [ viewType$ ]);

    // Только если мы только что создали viewType$ и нужно указать ему первоначальное значение
    if (viewType && viewType$.version === 0) {
        viewType$.set(viewType);
    }

    return viewType$;
};
// Should be default ViewType$ EventSignal to prevent conditional use of `EventSignal.use` (conditional hooks)
const ViewType$Context = createContext(makeViewType$$());

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
        <div className={css.PageGlobalTimes} data-renders-counter={++PageGlobalTimes.rendersCounter}>
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

PageGlobalTimes.rendersCounter = 0;

function PageGlobalTimesLegend() {
    console.log('PageGlobalTimesLegend render');

    const currentLocale = currentLocale$.use();
    const currentLocaleCityInfo$ = mostPopularCities$.use(cityDescription$List => {
        return cityDescription$List.find(cityDescription$ => cityDescription$.get().locale === currentLocale);
    });
    const $ref = useRef<HTMLDivElement | null>(null);

    const cityDescription = currentLocaleCityInfo$.useListener((cityDescription) => {
        const $current = $ref.current;

        if ($current) {
            // note: If 'Столица' is not firstElementChild: $current.queueSelector('data-capital-title')?.title = cityDescription.name;
            if ($current.firstElementChild) {
                // set 'title' for 'Столица' div container element
                ($current.firstElementChild as HTMLElement).title = cityDescription.name;
            }

            $current.setAttribute('data-city-name', cityDescription.name);
            $current.setAttribute('data-city-version', currentLocaleCityInfo$.getSnapshotVersion());
            $current.style.setProperty("--city-dayLightSign", `"${cityDescription.dayLightSign}"`);
        }
    });

    return <div
        ref={$ref}
        className={css.legend}
        data-renders-counter={++PageGlobalTimesLegend.rendersCounter}
    >
        <div className={css.legendItem} title={cityDescription.name}>
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
        <div className={`${css.legendItem} ${css.legendItemCurrentTimezone}`}>
            <span>{i18n$$`Таймзона в выбранной локале: ${getCurrentTimeZoneOffsetName(cityDescription.timeZone)}`}</span>
        </div>
    </div>;
}

/* todo:
EventSignal.registerView(mostPopularCities$.componentType, GlobalTimesList, {
    default: true,
    mod: 'list',
    applyView: [
        // [ componentType, reactFC, preDefinedProps? ]
        [ mostPopularCities$.data.elementsComponentType, GlobalTimesCity ],
    ],
});
EventSignal.registerView(mostPopularCities$.componentType, GlobalTimesTable, {
    mod: 'table',
    applyView: [
        // [ componentType, reactFC, preDefinedProps? ]
        [ mostPopularCities$.data.elementsComponentType, GlobalTimesTableRow ],
    ],
});
*/

PageGlobalTimesLegend.rendersCounter = 0;

/** @see [Each item component]{@link GlobalTimesCity} */
function GlobalTimesList({
    current$Value,
    filterById,
}: {
    current$Value: typeof mostPopularCities$.value,
    filterById?: string,
}) {
    const $containerRef = useRef<HTMLDivElement>(null);

    useContext(ViewType$Context).useListener(viewType => {
        const $container = $containerRef.current;

        if ($container) {
            /** note: for `'table'` value there is another component to render: {@link GlobalTimesTable} */
            $container.classList.toggle(css.citiesGrid, viewType === 'grid');
        }
    });

    const cities = filterById
        ? current$Value.filter(item => item.get().id === filterById)
        : current$Value
    ;

    return (<div ref={$containerRef} className={css.citiesContainer}>
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
    // note: No need to subscribe to currentLocale$ changes due current$ instance (mostPopularCities$.CityDescription$ EventSignal) already has it in dependence list.
    const isCurrentLocale = locale === currentLocale$.get();
    const $containerRef = useRef<HTMLDivElement>(null);
    const $canvasRef = useRef<HTMLCanvasElement>(null);
    const $pipIconRef = useRef<HTMLImageElement>(null);
    const viewType = useContext(ViewType$Context).useListener(viewType => {
        const $container = $containerRef.current;

        if ($container) {
            // note: This attribute value is only for DEBUG. This attribute value is not used in any logic.
            $container.setAttribute('data-viewtype', viewType);
        }
    });

    useLayoutEffect(() => {
        return data.initCanvasAnimation($canvasRef.current);
    }, [ data ]);

    pipPopupWindow$.useListener(pipPopupWindowDescription => {
        const isThisPipOpen = pipPopupWindowDescription.dataId === id;
        const $pipIcon = $pipIconRef.current;

        if ($pipIcon) {
            $pipIcon.classList.toggle(css.pipIconClose, isThisPipOpen);
            $pipIcon.setAttribute('data-click-mode', isThisPipOpen ? 'close' : 'open');
        }
    });

    return (<div
        ref={$containerRef}
        data-id={id}
        data-viewtype={viewType}
        data-renders-counter={++GlobalTimesCity.rendersCounter}
        className={`${css.cityCard} ${
            isCapital ? css.cityCardCapital : ''} ${
            isCurrentLocale ? css.cityCardCurrentLocale : ''} ${
            isCurrentOffset ? css.cityCardCurrentTimezone : ''}`}
        style={{ "--city-flag-content": `"${flag}"` } as React.CSSProperties}
    >
        <div className={css.canvasContainer}>
            <canvas ref={$canvasRef}></canvas>
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
        <img ref={$pipIconRef} className={css.pipIcon}
            data-id={id} data-click-mode=""
            onClick={_setPopup}
            src="/pip.svg" alt="pip" height="24px"
        />
    </div>);
}

GlobalTimesCity.rendersCounter = 0;

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
