'use strict';

import * as React from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import css from './AsyncSpinner2.module.css';

export default function AsyncSpinner2({ current$, hint }: { current$?: EventSignal<unknown, unknown, unknown | { currentUserId?: number }>, hint?: string }) {
    return (<span className={css.AsyncSpinner2Loader}>
        <span className={css.AsyncSpinner2Loader__spinner}></span>
        <span className={css.AsyncSpinner2Loader__text}>{hint ?? current$?.data?.["currentUserId"]}</span>
    </span>);
}
