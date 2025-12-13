'use strict';

import type { MouseEvent } from "react";

import * as React from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import {
    mostPopularCities$,
} from "../state/GlobalTimesState";
import { pipPopupWindow$ } from "../state/pipWindowState";

import NavBar from "../modules/NavBar";
import { menuItemTitle$ } from './10.GlobalTimes.metadata';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import styles from './PageGlobalTimes.module.css';

const ViewType$Context = createContext(null as ReturnType<typeof makeViewType$> | null);
const makeViewType$ = () => {
    const viewType$ = new EventSignal('list' as 'grid' | 'list' | 'table', {
        description: 'viewType$',
        data: {
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
                    label: 'Список',
                },
                {
                    value: 'grid',
                    label: 'Плитка',
                },
                {
                    value: 'table',
                    label: 'Таблица',
                },
            ],
        },
    });

    (globalThis as unknown as Record<string, any>).__test__viewType$ = viewType$;

    return viewType$;
};

export default function PageGlobalTimes({ viewType, filterById }: {
    viewType?: ReturnType<ReturnType<typeof makeViewType$>["get"]>,
    filterById?: string,
}) {
    const viewType$ = useMemo(makeViewType$, []);

    useEffect(() => {
        return () => viewType$.destructor();
    }, [ viewType$ ]);

    if (viewType) {
        viewType$.set(viewType);
    }

    // Получаем актуальное значение и подписываемся на изменения сигнала.
    // Подписка нужна, чтобы обновлять controllable интупы формы, если сигнал viewType$ измениться "снаружи".
    // note: Если гарантировано не будет измениться "снаружи", то можно тут использовать get и сделать инпуты uncontrollable.
    viewType = viewType$.use();

    console.log(PageGlobalTimes.name, 'render');

    return (<>
        <div className={styles.pageHeaderForPageGlobalTimes}>
            <h1>PageGlobalTimes</h1>
            <NavBar/>
        </div>
        <div className={styles.PageGlobalTimes}>
            <section className={styles.container}>
                <header>
                    <h1>🌍 Мировое время</h1>
                    <div className={styles.subtitle}>Локальное время в популярных городах мира</div>

                    <div className={styles.controls}>
                        <form className={styles.viewToggle} action="#" onChange={viewType$.data.onFormChange}>
                            {viewType$.data.elements.map(elementDescription => {
                                const checked = elementDescription.value === viewType;

                                return (<label key={elementDescription.value} className={styles.viewLabel}>
                                    <input type="radio"
                                        name={viewType$.data.radioName}
                                        value={elementDescription.value}
                                        checked={checked}
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
                    Время обновляется каждую секунду
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

    if (id) {
        pipPopupWindow$.setPopup({
            dataId: id,
            component: PageGlobalTimes,
            componentProps: { filterById: id, viewType: 'grid' },
        });
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
    const pipWindowInfo = pipPopupWindow$.use();
    const viewType = useContext(ViewType$Context)?.use();

    useLayoutEffect(() => {
        const canvasElement = canvasRef.current;

        data.initCanvasAnimation(canvasElement);

        return () => {
            data.cancelCanvasAnimation(canvasElement);
        };
    }, [ data ]);

    return (<div
        className={styles.cityCard}
        data-id={id}
        data-viewType={viewType}
        onClick={pipWindowInfo.dataId === id ? null : _setPopup}
    >
        <div className={styles.canvasContainer}>
            <canvas ref={canvasRef}></canvas>
        </div>
        <div className={styles.cityInfo}>
            <div className={styles.cityName}>
                <div>
                    <span className={styles.flag}>{flag}</span>
                    <div className={styles.country}>{country}</div>
                    <div className={styles.timezone}>{locale}</div>
                </div>
                <span title={timeZone}>{name} <br className={styles.optionalLineBreak}/>({timeZoneName})</span>
            </div>
        </div>
        <div className={styles.timeInfo}>
            <div className={styles.localTime}>{time}</div>
            <div className={styles.timeFormat}>
                <span>{date}</span>
                <span>{dayLightSign}️</span>
            </div>
        </div>
    </div>);
});
