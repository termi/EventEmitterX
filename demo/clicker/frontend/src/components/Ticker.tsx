'use strict';

import React, { useEffect, useState } from 'react';

const globalTickTimerApi = getGlobalTickTimerApi('tickerGroup');

interface TickerProps {
    timestamp: number;
    isBackward?: boolean;
    alwaysShowHours?: boolean;
    className?: string;
    timestampOffset?: number;
    tickerGroup?: string;
    tickerGroupIntervalMS?: number;
    children?: React.ReactNode | ((props: { timestamp: number, currentTimestamp: number }) => React.ReactNode);
}

type TickerHandler = (now: number) => void;

const df1 = new Intl.DateTimeFormat(void 0, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});
const df2 = new Intl.DateTimeFormat(void 0, {
    minute: '2-digit',
    second: '2-digit',
});

function durationString(duration: number, alwaysShowHours?: boolean) {
    const date = new Date(0);

    date.setHours(0, 0, 0, duration);

    if (alwaysShowHours || date.getHours() > 0) {
        return df1.format(date);
    }

    return df2.format(date);
}

export default function Ticker(props: TickerProps) {
    const {
        className = 'ticker',
        isBackward = false,
        timestamp,
        tickerGroup = void 0,
        alwaysShowHours = false,
        tickerGroupIntervalMS = 1000,
        timestampOffset,
        children,
    } = props;

    const newNowState = useState(0);

    useEffect(() => {
        return globalTickTimerApi.addTickerHandler(
            newNowState[1],
            tickerGroup,
            tickerGroupIntervalMS,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ tickerGroup, tickerGroupIntervalMS ]);

    if (!timestamp) {
        return <span />;
    }

    const now = newNowState[0] || Date.now();
    let duration = isBackward
        ? timestamp - now
        : now - timestamp
    ;

    if (timestampOffset) {
        duration = duration - timestampOffset;
    }

    if (duration < 0) {
        duration = 0;
    }

    const timeString = durationString(duration, alwaysShowHours);

    return (<>
        <span className={className}>
            {timeString}
        </span>
        {typeof children === 'function'
            ? children({ timestamp, currentTimestamp: now })
            : children
        }
    </>);
}

function getGlobalTickTimerApi(_tickerGroupPropName = 'tickerGroup') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    const requestAnimationFrame = window.requestAnimationFrame || window["mozRequestAnimationFrame"]
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore
        || window["webkitRequestAnimationFrame"] || window["msRequestAnimationFrame"]
        || setTimeout
    ;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    const cancelAnimationFrame = window.cancelAnimationFrame || window["mozCancelAnimationFrame"]
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore
        || window["webkitCancelAnimationFrame"] || window["msCancelAnimationFrame"]
        || clearTimeout
    ;
    const tickerGroupPropName = _tickerGroupPropName;
    const indexPropName = Symbol('globalIndex');
    const globalTickersList = new Set<TickerHandler>();
    const globalTickersGroups = [] as string[];
    const globalGroupedTickers = new Map<string, Set<TickerHandler>>();
    let globalTickInterval: ReturnType<typeof setInterval> | void;
    let globalTickInterval_ms: number | void;
    let requestAnimationIndex: number | void;

    const nextTick = function() {
        requestAnimationIndex = void 0;

        const now = Date.now();

        for (const tickerHandler of globalTickersList) {
            tickerHandler(now);
        }

        for (const tickersGroup of globalTickersGroups) {
            const tickersList = globalGroupedTickers.get(tickersGroup);

            if (tickersList) {
                for (const tickerHandler of tickersList) {
                    tickerHandler(now);
                }
            }
        }
    };

    const globalTickTimer = function() {
        if (requestAnimationIndex) {
            cancelAnimationFrame(requestAnimationIndex);
        }

        requestAnimationIndex = requestAnimationFrame(nextTick);
        // nextTick();
    };

    const addTickerHandler = function(
        tickerHandler: TickerHandler,
        tickerGroup: string | undefined,
        tickerGroupIntervalMS = 1000,
    ) {
        if (!globalTickInterval || globalTickInterval_ms !== tickerGroupIntervalMS) {
            if (globalTickInterval) {
                clearTimeout(globalTickInterval);
            }

            globalTickInterval = setInterval(globalTickTimer, tickerGroupIntervalMS);
            globalTickInterval_ms = tickerGroupIntervalMS;
        }

        if (tickerGroup) {
            let tickersList = globalGroupedTickers.get(tickerGroup);

            if (!tickersList) {
                tickersList = new Set();
                tickersList.add(tickerHandler);
                globalGroupedTickers.set(tickerGroup, tickersList);
            }
            else {
                tickersList.add(tickerHandler);
            }
        }
        else {
            globalTickersList.add(tickerHandler);
        }

        return () => {
            removeTickerInstance(tickerHandler, tickerGroup);
        };
    };

    const removeTickerInstance = function(tickerHandler: TickerHandler, tickerGroup: string | undefined) {
        if (tickerGroup) {
            const tickersList = globalGroupedTickers.get(tickerGroup);

            if (tickersList) {
                tickersList.delete(tickerHandler);
            }
        }
        else {
            globalTickersList.delete(tickerHandler);
        }

        if (globalTickersList.size === 0 && globalTickersGroups.length === 0) {
            if (globalTickInterval) {
                clearTimeout(globalTickInterval);
            }

            globalTickInterval = void 0;

            if (requestAnimationIndex !== void 0) {
                cancelAnimationFrame(requestAnimationIndex);
                requestAnimationIndex = void 0;
            }
        }
    };

    return {
        addTickerHandler,
        removeTickerInstance,
        tickerGroupPropName,
        indexPropName,
        __proto__: null,
    };
}
