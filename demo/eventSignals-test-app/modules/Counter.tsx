'use strict';

import type { CSSProperties } from "react";

import * as React from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import type { mainState } from "../state/AppStates";

import { i18nString$$ } from "../state/i18n";

export default function Counter({ eventSignal, classes = {}, style, title = eventSignal.data?.title }: {
    eventSignal: typeof mainState.computed1$ | typeof mainState.computed2$,
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
            {eventSignal}
        </h3>
        <fieldset role="counter-buttons" className={classes.buttons}>
            <button role="decrement" onClick={eventSignal.data._.decrementOne} className={classes.decrementButton}>
                - {i18nString$$('Уменьшить')}
            </button>
            <button role="reset" onClick={eventSignal.data._.resetToZero} className={classes.resetButton}>
                ⟳ {i18nString$$('Сбросить')}
            </button>
            <button role="increment" onClick={eventSignal.data._.incrementOne} className={classes.incrementButton}>
                + {i18nString$$('Увеличить')}
            </button>
        </fieldset>
    </div>);
}
