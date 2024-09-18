'use strict';

import * as React from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

export default function ErrorView({ eventSignal }: { eventSignal: EventSignal<any> }) {
    const { lastError } = eventSignal;

    if (!lastError) {
        return null;
    }

    return (<span className="ErrorView" style={{color: 'red'}}>
        {String(lastError["message"] || lastError)}
    </span>);
}
