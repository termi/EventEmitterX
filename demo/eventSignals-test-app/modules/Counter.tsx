'use strict';

import type { CSSProperties } from "react";

import * as React from "react";

import type { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

import type { mainState } from "../state/AppStates";

import { i18nString$$ } from "../state/i18n";

export default function Counter({ current$, classes = {}, style, title = current$.data?.title }: {
    current$: typeof mainState.computed1$ | typeof mainState.computed2$,
    classes?: {
        className?: string,
        title?: string,
        value?: string,
        buttons?: string,
        decrementButton?: string,
        resetButton?: string,
        incrementButton?: string,
    },
    style?: CSSProperties,
    title?: EventSignal<string, unknown, unknown> | string,
}) {
    console.log('render Counter', String(title));

    return (<div style={style} role="counter-wrapper" className={classes.className}>
        <h2 role="counter-title" className={classes.title}>{title}</h2>
        <h3 role="counter-value" className={classes.value}>
            {current$}
        </h3>
        <fieldset role="counter-buttons" className={classes.buttons}>
            <button role="decrement" onClick={current$.data._.decrementOne} className={classes.decrementButton}>
                - {i18nString$$('Уменьшить')}
            </button>
            <button role="reset" onClick={current$.data._.resetToZero} className={classes.resetButton}>
                ⟳ {i18nString$$('Сбросить')}
            </button>
            <button role="increment" onClick={current$.data._.incrementOne} className={classes.incrementButton}>
                + {i18nString$$('Увеличить')}
            </button>
        </fieldset>
    </div>);
}
