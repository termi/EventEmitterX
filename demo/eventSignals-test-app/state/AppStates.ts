'use strict';

import type * as React from "react";

import { randomNumber } from "../lib/utils";
import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

const stringCounterComponentType = '--counter--';
const $counter1 = new EventSignal(0);
const $computed1 = new EventSignal('', () => {
    return `Counter is ${$counter1.get()}`;
}, {
    //todo:
    // methods: {
    //   increment<number | void>(prevValue, arg = 1) { return prevValue + arg; },
    //   decrement<number | void>(prevValue, arg = 1) { return prevValue - arg; },
    //   setFromDOMEvent(prevValue, event: React.ChangeEvent<HTMLInputElement>) { return String(event.target.value || ''); },
    // }
    // // comes to $computed1._.increment and $computed1._.decrement, $computed1._.setFromDOMEvent
    finaleValue: 'Counter is destroyed',
    componentType: stringCounterComponentType,
});

const $counter2 = new EventSignal(0);
const $computed2 = new EventSignal('', () => {
    return `Counter is ${$counter2.get()}`;
}, {
    componentType: stringCounterComponentType,
});

const incrementCounter1 = $counter1.createMethod<number | void>((prevValue, arg = 1) => {
    return prevValue + arg;
});
const decrementCounter1 = $counter1.createMethod<number | void>((prevValue, arg = 1) => {
    return prevValue - arg;
});
const incrementCounter2 = $counter2.createMethod<number | void>((prevValue, arg = 1) => {
    return prevValue + arg;
});
const decrementCounter2 = $counter2.createMethod<number | void>((prevValue, arg = 1) => {
    return prevValue - arg;
});

const style: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
};

const $userFirstName = new EventSignal('Вася', {
    data: {
        title: 'First name',
        cssClasses: 'form-input first-name',
        style,
        onChanges: (event: React.ChangeEvent<HTMLInputElement>) => {
            $userFirstName.set(String(event.target.value || ''));
        },
    },
});
const $userSecondName = new EventSignal('Пупкин', {
    data: {
        title: 'Second name',
        cssClasses: 'form-input seconds-name',
        style,
        onChanges: (event: React.ChangeEvent<HTMLInputElement>) => {
            $userSecondName.set(String(event.target.value || ''));
        },
    },
});
const happySymbols_array = Array.from("🔥😂😊😁🙏😎💪😋😇🎉🙌🤘👍🤑🤩🤪🤠🥳😌🤤😍😀");
const happySymbols_max = happySymbols_array.length - 1;
const userFullNameComponentType = '--UserCard--';
const $userFullNameObject = new EventSignal({
    firstName: '',
    secondName: '',
    fullName: '',
    icon: '',
}, (prevValue) => {
    const raw_firstName = $userFirstName.get();
    const raw_secondName = $userSecondName.get();
    const firstName = `"${raw_firstName.toUpperCase()}"`;
    const isNewIcon = prevValue.firstName !== firstName || !prevValue.icon;

    return {
        firstName,
        secondName: `"${raw_secondName.toUpperCase()}"`,
        fullName: `${raw_firstName} ${raw_secondName}`,
        icon: isNewIcon ? happySymbols_array[randomNumber(0, happySymbols_max)] : prevValue.icon,
    };
}, {
    componentType: userFullNameComponentType,
});

export const mainState = {
    $counter1,
    $computed1,
    $counter2,
    $computed2,

    incrementCounter1,
    decrementCounter1,
    incrementCounter2,
    decrementCounter2,

    $userFirstName,
    $userSecondName,
    $userFullNameObject,

    userFullNameComponentType,
    stringCounterComponentType,
};

globalThis.__mainState = mainState;
