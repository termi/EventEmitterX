'use strict';

import * as React from "react";
import { memo, createContext, useContext, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import {
    mostPopularCities$,
} from "../state/GlobalTimesState";

import NavBar from "../components/NavBar";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import styles from './PageGlobalTimes.module.css';
import { pipPopupWindow$ } from "../state/pipWindowState";

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

    if (viewType) {
        viewType$.set(viewType);
    }
    else {
        viewType = viewType$.get();
    }

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
                                    <input type="radio" name={viewType$.data.radioName} value={elementDescription.value}
                                        defaultChecked={checked}/>
                                    <span className="btn-text">{elementDescription.label}</span>
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
    const pipWindowUniqueId = useMemo(() => Symbol(), []);
    const $portalContent = (pipWindowInfo.uniqueId === pipWindowUniqueId && pipWindowInfo?.window?.document?.body)
        ? <PipPopupWindow component={PageGlobalTimes} targetContainer={pipWindowInfo.window.document.body} filterById={id} viewType={'grid'} />
        : null
    ;
    const viewType = useContext(ViewType$Context)?.use();

    useLayoutEffect(() => {
        const canvasElement = canvasRef.current;

        data.initCanvasAnimation(canvasElement);

        return () => {
            data.cancelCanvasAnimation(canvasElement);
        };
    }, [ data ]);

    return (<div className={styles.cityCard} data-id={id} data-viewType={viewType} onClick={pipWindowInfo.dataId === id ? null : () => {
        pipPopupWindow$.markNextValueAsForced();
        pipPopupWindow$.set({
            uniqueId: pipWindowUniqueId,
            dataId: id,
        });
    }}>
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
        {$portalContent}
    </div>);
});

let PipPopupWindow = function PipPopupWindow<P extends Record<string, any>>({
    component: Component,
    targetContainer,
    ...props
}: {
    component: React.FC<P> | null,
    targetContainer: HTMLElement | null,
} & P) {
    if (Component == null || targetContainer == null) {
        return null;
    }

    return createPortal(<Component {...props as unknown as P} />, targetContainer);
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
PipPopupWindow = memo(PipPopupWindow);
