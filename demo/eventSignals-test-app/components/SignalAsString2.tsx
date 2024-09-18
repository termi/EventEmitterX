'use strict';

import * as React from "react";
import { useState } from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

export default function SignalAsString2({ eventSignal, textColor }: { eventSignal: EventSignal<any>, textColor: string }) {
    const { 0: counter, 1: setCounter } = useState(0);

    return (<span
        className="SignalAsString2"
        onClick={() => setCounter(prev => prev + 1)}
        data-counter={counter}
        style={{ color: textColor }}
    >
        <span>{eventSignal.get()}</span>
    </span>);
}
