'use strict';

import * as React from "react";
import { useState } from "react";

import type { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

const is_fieldSizing_supported = CSS.supports(`field-sizing: content`);

export default function SignalAsString2({ current$, current$Value, textColor, backgroundColor }: {
    current$: EventSignal<any>,
    current$Value: any,
    textColor?: string,
    backgroundColor?: string,
}) {
    const { 0: counter, 1: setCounter } = useState(0);
    const value = String(current$Value);
    const { key } = current$;

    return (<span
        className="SignalAsString2"
        onClick={() => setCounter(prev => prev + 1)}
        data-counter={counter}
    >
        <input value={value} name={`SignalAsString2-${key}`} readOnly={true} style={{ color: textColor, backgroundColor, width: is_fieldSizing_supported ? void 0 : `${value.length}ch`, [`${"fieldSizing"}`]: 'content' }} />
    </span>);
}
