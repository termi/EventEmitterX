'use strict';

import * as React from "react";

import type { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

export default function ErrorView({ current$, children }: { current$: EventSignal<any, any, any>, children?: React.ReactNode }) {
    const { lastError } = current$;

    if (!lastError) {
        return null;
    }

    return ErrorViewSimple({ error: lastError as (Error | number | string), children });
}

export function ErrorViewSimple({ error, children }: {
    error?: Error | number | string,
    children?: React.ReactNode,
    resetErrorBoundary?: (...args: any[]) => void,
}) {
    if (!error) {
        return null;
    }

    const hint = (error instanceof Error) ? error.stack : void 0;

    return (<span className="ErrorView" style={{ color: 'red' }} title={hint}>
        <span className="ErrorView__error">⚠️{String(error["message"] || error)}</span>
        {children ? (<span className="ErrorView__children">️{children}</span>) : null}
    </span>);
}
