'use strict';

import * as React from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';
import type { JsonPlaceholderUserDTO } from "../state/AppStates";

document.head.insertAdjacentHTML('beforeend', `<style>
.JsonPlaceholderUser {
    table {
        border-spacing: 0;

        th, td {
            border: 1px solid gray;
        }
    }
}
</style>`);

export default function JsonPlaceholderUser({ eventSignal, componentType, version, textColor, backgroundColor }: {
    eventSignal: EventSignal<number, any, {
        userDTO?: JsonPlaceholderUserDTO,
        abortController?: AbortController,
    }>,
    componentType: string,
    version: number,
    textColor: string,
    backgroundColor: string,
}) {
    const { userDTO } = eventSignal.data;

    return (<div
        className="JsonPlaceholderUser"
        data-user-id={eventSignal.get()}
        data-componenttype={componentType}
        data-version={version}
        style={{ color: textColor, backgroundColor }}
    >
        {ObjectToTable({ obj: userDTO })}
    </div>);
}

function ObjectToTable({ obj }: { obj: Object }) {
    const keys = Object.keys(obj);

    return (<table>
        <thead><tr>
            {keys.map(key => <th key={key}>{key}</th>)}
        </tr></thead>
        <tbody><tr>
            {keys.map(key => {
                let value = obj[key];

                if (typeof value === 'object' && value) {
                    value = ObjectToTable({ obj: value });
                }

                return <td key={key}>{value}</td>;
            })}
        </tr></tbody>
    </table>);
}
