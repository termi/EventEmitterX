'use strict';

import * as React from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

export default function ErrorView({ eventSignal, children }: { eventSignal: EventSignal<any, any, any>, children: React.ReactNode }) {
    const { lastError } = eventSignal;

    if (!lastError) {
        return null;
    }

    return (<span className="ErrorView" style={{ color: 'red' }}>
        <span className="ErrorView__error">⚠️{String(lastError["message"] || lastError)}</span>
        {children ? (<span className="ErrorView__children">️{children}</span>) : null}
    </span>);
}
