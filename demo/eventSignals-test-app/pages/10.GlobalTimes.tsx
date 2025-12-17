'use strict';

import type { MouseEvent } from "react";

import * as React from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import {
    mostPopularCities$,
} from "../state/GlobalTimesState";
import { pipPopupWindow$ } from "../state/pipWindowState";
import { i18n$$, i18nString$$ } from "../state/i18n";

import { menuItemTitle$ } from './10.GlobalTimes.metadata';

import styles from './10.GlobalTimes.module.css';

type ViewType$ = ReturnType<typeof makeViewType$>;

const ViewType$Context = createContext(null as ViewType$ | null);
const makeViewType$ = () => {
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
    }), {
        effectWithDestructor: () => {
            return destructor ??= viewType$.destructor.bind(viewType$);
        },
    });

    (globalThis as unknown as Record<string, any>).__test__viewType$ = viewType$;

    return viewType$;
};
const useViewType$ = (viewType?: ReturnType<ViewType$["get"]>) => {
    const viewType$ = useMemo(makeViewType$, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(viewType$.effectWithDestructor, [ viewType$ ]);

    // Только если мы только что создали viewType$ и нужно указать ему первоначальное значение
    if (viewType && viewType$.version === 0) {
        viewType$.set(viewType);
        // Форсируем получение нового значения. Это нужно потому что (на данный момент) viewType$.use() вызывает viewType$.getLastValue().
        viewType$.get();
    }

    return viewType$;
};

export default function PageGlobalTimes({ viewType, filterById }: {
    viewType?: ReturnType<ViewType$["get"]>,
    filterById?: string,
}) {
    const viewType$ = useViewType$(viewType);

    // Получаем актуальное значение и подписываемся на изменения сигнала.
    // Подписка нужна, чтобы обновлять controllable интупы формы, если сигнал viewType$ измениться "снаружи".
    // note: Если гарантировано не будет измениться "снаружи", то можно тут использовать get и сделать инпуты uncontrollable.
    viewType = viewType$.use();

    console.log(PageGlobalTimes.name, 'render');

    return (<>
        <div className={styles.PageGlobalTimes}>
            <section className={styles.container}>
                <header>
                    <h1>🌍 {menuItemTitle$}</h1>
                    <div className={styles.subtitle}>{i18n$$`Локальное время в популярных городах мира`}</div>

                    <div className={styles.controls}>
                        <form className={styles.viewToggle} action="#"
                            onChange={viewType$.data.onFormChange}
                            onSubmit={viewType$.data.onFormSubmit}
                        >
                            {viewType$.data.elements.map(elementDescription => {
                                const checked = elementDescription.value === viewType;

                                return (<label key={elementDescription.value} className={styles.viewLabel}>
                                    <input type="radio"
                                        name={viewType$.data.radioName}
                                        value={elementDescription.value}
                                        checked={checked}
                                        // note: 'readonly' attribute applies to all except type = [hidden, range, color, checkbox, radio, buttons].
                                        // This attribute exists only due React warn: You provided a `checked` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultChecked`. Otherwise, set either `onChange` or `readOnly`.
                                        readOnly={true}
                                    />
                                    <span className={styles.btnText}>{elementDescription.label}</span>
                                </label>);
                            })}
                        </form>
                    </div>
                </header>

                <ViewType$Context.Provider value={viewType$}>
                    <mostPopularCities$.component filterById={filterById}/>
                </ViewType$Context.Provider>

                <footer className={styles.updateTime}>
                    {i18n$$`Время обновляется каждую секунду`}
                </footer>
            </section>
        </div>
    </>);
}

EventSignal.registerReactComponentForComponentType(mostPopularCities$.componentType, function GlobalTimesList({
    eventSignal,
    filterById,
}: {
    eventSignal: typeof mostPopularCities$,
    filterById?: string,
}) {
    const viewType = useContext(ViewType$Context)?.use();
    const classNameMode = viewType === 'grid' ? styles.citiesGrid
        : viewType === 'table' ? styles.citiesTable
        : ''
    ;

    return (<div className={`${styles.citiesContainer} ${classNameMode}`}>
        {filterById
            ? eventSignal.get().filter(item => item.get().id === filterById)
            : eventSignal.get()
        }
    </div>);
});

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

EventSignal.registerReactComponentForComponentType(mostPopularCities$.data.elementsComponentType, function GlobalTimesCity({
    eventSignal,
}: {
    eventSignal: mostPopularCities$.CityDescriptionEventSignal,
}) {
    const {
        // enable,
        id,
        flag,
        name,
        country,
        locale,
        date,
        time,
        dayLightSign,
        timeZone,
        timeZoneName,
    } = eventSignal.get();
    const { data } = eventSignal;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isThisPipOpen = pipPopupWindow$.use().dataId === id;
    const viewType = useContext(ViewType$Context)?.use();

    useLayoutEffect(() => {
        return data.initCanvasAnimation(canvasRef.current);
    }, [ data ]);

    return (<div
        className={styles.cityCard}
        data-id={id}
        data-viewtype={viewType}
    >
        <div className={styles.canvasContainer}>
            <canvas ref={canvasRef}></canvas>
        </div>
        <div className={styles.cityInfo}>
            <div className={styles.cityName}>
                <div title={timeZone}>
                    <span className={styles.flag}>{flag}</span>
                    <span>
                        {i18nString$$(name)}
                        <br className={styles.optionalLineBreak}/>{' '}
                        ({timeZoneName})
                    </span>
                </div>
                <div>
                    <div className={styles.country}>{country}</div>
                    <div className={styles.timezone}>{locale}</div>
                </div>
            </div>
        </div>
        <div className={styles.timeInfo}>
            <div className={styles.localTime}>{time}</div>
            <div className={styles.timeFormat}>
                <span>{date}</span>
                <span>{dayLightSign}️</span>
            </div>
        </div>
        <img className={`${styles.pipIcon} ${isThisPipOpen ? styles.pipIconClose : ''}`}
            data-id={id} data-click-mode={isThisPipOpen ? 'close' : 'open'}
            onClick={_setPopup}
            src="/static/pip.svg" alt="pip" height="24px"
        />
    </div>);
});
