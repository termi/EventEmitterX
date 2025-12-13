'use strict';

import type * as React from "react";

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import { randomNumber } from "../lib/utils";

const stringCounterComponentType = '--counter--';
const counter1$ = new EventSignal(0, {
    description: 'counter1$',
});
const computed1$ = new EventSignal('', () => {
    return `Counter is ${counter1$.get()}`;
}, {
    description: 'computed1$',
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

const counter2$ = new EventSignal(0, {
    description: 'counter2$',
});
const computed2$ = new EventSignal('', () => {
    return `Counter is ${counter2$.get()}`;
}, {
    description: 'computed2$',
    componentType: stringCounterComponentType,
});

const incrementCounter1 = counter1$.createMethod<number | void>((prevValue, arg = 1) => {
    return prevValue + arg;
});
const decrementCounter1 = counter1$.createMethod<number | void>((prevValue, arg = 1) => {
    return prevValue - arg;
});
const incrementCounter2 = counter2$.createMethod<number | void>((prevValue, arg = 1) => {
    return prevValue + arg;
});
const decrementCounter2 = counter2$.createMethod<number | void>((prevValue, arg = 1) => {
    return prevValue - arg;
});

const style: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
};

const userFirstName$ = new EventSignal('Вася', {
    data: {
        title: 'First name',
        cssClasses: 'form-input first-name',
        style,
        onChanges: (event: React.ChangeEvent<HTMLInputElement>) => {
            userFirstName$.set(String(event.target.value || ''));
        },
    },
});
const userSecondName$ = new EventSignal('Пупкин', {
    data: {
        title: 'Second name',
        cssClasses: 'form-input seconds-name',
        style,
        onChanges: (event: React.ChangeEvent<HTMLInputElement>) => {
            userSecondName$.set(String(event.target.value || ''));
        },
    },
});
const happySymbols_array = Array.from("🔥😂😊😁🙏😎💪😋😇🎉🙌🤘👍🤑🤩🤪🤠🥳😌🤤😍😀");
const happySymbols_max = happySymbols_array.length - 1;
const userFullNameComponentType = '--UserCard--';
const userFullNameObject$ = new EventSignal({
    firstName: '',
    secondName: '',
    fullName: '',
    icon: '',
}, (prevValue) => {
    const raw_firstName = userFirstName$.get();
    const raw_secondName = userSecondName$.get();
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
    data: { test: 1 },
});

export type JsonPlaceholderUserDTO = {
    id: number, // 1,
    name: string, // "Leanne Graham",
    username: string, // "Bret",
    email: string, // "Sincere@april.biz",
    address: {
        street: string, // "Kulas Light",
        suite: string, // "Apt. 556",
        city: string, // "Gwenborough",
        zipcode: string, // "92998-3874",
        geo: {
            lat: string, // "-37.3159",
            lng: string, // "81.1496",
        },
    },
    phone: string, // "1-770-736-8031 x56442",
    website: string, // "hildegard.org",
    company: {
        name: string, // "Romaguera-Crona",
        catchPhrase: string, // "Multi-layered client-server neural-net",
        bs: string, // "harness real-time e-markets",
    },
};

const jsonPlaceholderUserComponentType = 'jsonPlaceholderUserComponentType';

const _placeholderUserEventSignalCache: Record<number, ReturnType<typeof _makePlaceholderUserEventSignal>> = Object.create(null);

export function clearPlaceholderUserEventSignalCache() {
    for (const key in _placeholderUserEventSignalCache) {
        delete _placeholderUserEventSignalCache[key];
    }
}

export function makePlaceholderUserEventSignal(id: number, eventSignal?: EventSignal<number>) {
    return _placeholderUserEventSignalCache[id] ??= _makePlaceholderUserEventSignal(id, eventSignal);
}

function _makePlaceholderUserEventSignal(id: number, eventSignalSourceId?: EventSignal<number>) {
    // todo: Перенести этот пример EventSignal в тесты EventSignal_spec.ts
    return new EventSignal<Promise<number>, number, {
        currentUserId?: number,
        userDTO?: JsonPlaceholderUserDTO,
        abortController?: AbortController,
    }>(id, async (prevUserId, sourceUserId, eventSignal) => {
        // Нужно безусловно вызывать `eventSignalSourceId?.get()`, чтобы сработали подписки на зависимость
        const _newUserId = eventSignalSourceId?.get();
        const newUserid = ((eventSignal.getStateFlags() & EventSignal.StateFlags.wasSourceSetting) !== 0 ? sourceUserId : null)
            ?? _newUserId
            ?? prevUserId
        ;

        // Синхронизируем sourceValue с актуальным значением
        eventSignal.set(newUserid);

        //todo: Это приводит к ошибке, можно тестировать вместе с ErrorBoundary, когда он будет реализован
        // if (newUserid === prevUserId) {
        //     return;
        // }

        eventSignal.data.currentUserId = newUserid;
        eventSignal.data.abortController?.abort(new Error(`request new userId=${newUserid}`));

        const abortController = new AbortController();

        eventSignal.data.abortController = abortController;

        await new Promise((resolve) => {
            queueMicrotask(() => {
                // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                setTimeout(resolve, newUserid > 10 ? 1000 : 500);
            });
        });

        if (abortController.signal.aborted) {
            return newUserid;
        }

        const response = await fetch(`https://jsonplaceholder.typicode.com/users?id=${newUserid}`, {
            signal: abortController.signal,
        });
        const usersDTO = await response.json();
        const newUserDTO = usersDTO[0];

        if (!newUserDTO) {
            throw new Error(`User not found with userId=${newUserid}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        if (newUserid === 9) {
            newUserDTO["invalidProp"]["invalidProp"] = 'this will cause error';
        }

        // eslint-disable-next-line require-atomic-updates
        eventSignal.data.userDTO = newUserDTO;

        return newUserid;
    }, {
        componentType: jsonPlaceholderUserComponentType,
        data: {},
    });
}

const jsonPlaceholderUser1$ = makePlaceholderUserEventSignal(counter1$.get(), counter1$);

export type JsonPlaceholderUser1$ = typeof jsonPlaceholderUser1$;

export const mainState = {
    counter1$,
    computed1$,
    counter2$,
    computed2$,

    incrementCounter1,
    decrementCounter1,
    incrementCounter2,
    decrementCounter2,

    userFirstName$,
    userSecondName$,
    userFullNameObject$,

    userFullNameComponentType,
    stringCounterComponentType,

    jsonPlaceholderUser1$,
    jsonPlaceholderUserComponentType,
};

globalThis.__mainState = mainState;
globalThis.EventSignal = EventSignal;
