/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

import type { EventSignal } from "../../../modules/EventEmitterX/EventSignal";

import { stringifyError } from "../../../utils/error";

export default function ErrorView({ eventSignal, children }: { eventSignal: EventSignal<any, any, any>, children: React.ReactNode }) {
    const { lastError } = eventSignal;

    if (!lastError) {
        return null;
    }

    const hint = (lastError instanceof Error) ? lastError.stack : void 0;

    return (<span className="ErrorView" style={{ color: 'red' }} title={hint}>
        <span className="ErrorView__error">⚠️{stringifyError(lastError)}</span>
        {children ? (<span className="ErrorView__children">️{children}</span>) : null}
    </span>);
}
