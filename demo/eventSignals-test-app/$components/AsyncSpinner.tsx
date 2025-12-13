'use strict';

import * as React from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import css from './AsyncSpinner.module.css';

export default function AsyncSpinner({ eventSignal, hint }: { eventSignal?: EventSignal<unknown, unknown, unknown | { currentUserId?: number }>, hint?: string }) {
    return (<span className={css.AsyncSpinnerLoader}>
        <span className={css.AsyncSpinnerLoader__spinner}></span>
        <span className={css.AsyncSpinnerLoader__text}>{hint ?? eventSignal?.data?.["currentUserId"]}</span>
    </span>);
}
