'use strict';

import * as React from "react";
import { useState } from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

export default function SignalAsString2({ eventSignal, textColor, backgroundColor }: { eventSignal: EventSignal<any>, textColor?: string, backgroundColor?: string }) {
    const { 0: counter, 1: setCounter } = useState(0);
    const value = String(eventSignal.get());

    return (<span
        className="SignalAsString2"
        onClick={() => setCounter(prev => prev + 1)}
        data-counter={counter}
    >
        <input value={value} readOnly={true} style={{ width: `${value.length}ch`, color: textColor, backgroundColor }} />
    </span>);
}
