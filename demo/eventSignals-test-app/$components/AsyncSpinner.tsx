'use strict';

import * as React from "react";

import type { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

import css from './AsyncSpinner.module.css';

export default function AsyncSpinner({ current$, hint }: { current$?: EventSignal<unknown, unknown, unknown | { currentUserId?: number }>, hint?: string }) {
    return (<span className={css.AsyncSpinnerLoader}>
        <span className={css.AsyncSpinnerLoader__spinner}></span>
        <span className={css.AsyncSpinnerLoader__text}>{hint ?? current$?.data?.["currentUserId"]}</span>
    </span>);
}
