'use strict';

import * as React from "react";
import { useEffect } from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

export default function SignalAsString1({ eventSignal }: { eventSignal: EventSignal<any> }) {
    useEffect(() => {
        console.log('SignalAsString1 useEffect');

        return () => {
            console.log('SignalAsString1 unmount ');
        };
    }, []);

    return (<span className="SignalAsString1">
        <button style={{ color: 'green' }}>{eventSignal.get()}</button>
    </span>);
}
