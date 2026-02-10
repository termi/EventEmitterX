'use strict';

import * as React from "react";
import { useEffect } from "react";

export default function SignalAsString1({ current$Value, textColor }: { current$Value: any, textColor: string }) {
    useEffect(() => {
        console.log('SignalAsString1 useEffect');

        return () => {
            console.log('SignalAsString1 unmount');
        };
    }, []);

    return (<span className="SignalAsString1">
        <button style={{ color: textColor }}>{String(current$Value)}</button>
    </span>);
}
