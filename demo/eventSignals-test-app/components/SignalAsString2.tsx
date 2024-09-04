'use strict';

import * as React from "react";
import { useState } from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

export default function SignalAsString2({ eventSignal }: { eventSignal: EventSignal<any> }) {
    const { 0: counter, 1: setCounter } = useState(0);

    return (<span
        className="SignalAsString2"
        onClick={() => setCounter(prev => prev + 1)}
        data-counter={counter}
        style={{ color: 'red' }}
    >
        <span>{eventSignal.get()}</span>
    </span>);
}
