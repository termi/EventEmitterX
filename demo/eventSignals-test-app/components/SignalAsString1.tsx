'use strict';

import * as React from "react";
import { useEffect } from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

export default function SignalAsString1({ eventSignal, textColor }: { eventSignal: EventSignal<any>, textColor: string }) {
    useEffect(() => {
        console.log('SignalAsString1 useEffect');

        return () => {
            console.log('SignalAsString1 unmount ');
        };
    }, []);

    return (<span className="SignalAsString1">
        <button style={{ color: textColor }}>{eventSignal.get()}</button>
    </span>);
}
