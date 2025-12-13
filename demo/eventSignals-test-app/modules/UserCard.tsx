'use strict';

import * as React from "react";

import { mainState } from "../state/AppStates";

const {
    userFirstName$,
    userSecondName$,
    userFullNameObject$,
    userFullNameComponentType,
} = mainState;

export default function UserCard({ eventSignal }: { eventSignal: typeof userFullNameObject$ }) {
    const {
        firstName,
        secondName,
        icon,
    } = eventSignal.get();

    console.log('render UserCard', icon);

    return (<div className="user-card" data-type="UserCard" style={{ border: '1px solid gray' }}>
        <p>This is UserCard registered for EventSignal componentType={userFullNameComponentType}</p>
        <p title={userFirstName$.get()}>{userFirstName$.data.title}
            <span> ({userFirstName$.version})</span>:{'\u00A0'}
            <span>{firstName}</span>
            {'\u00A0'}{icon}
        </p>
        <p>{userSecondName$.data.title}
            <span> ({userSecondName$.version})</span>:{'\u00A0'}
            <span>{secondName}</span>
        </p>
    </div>);
}
