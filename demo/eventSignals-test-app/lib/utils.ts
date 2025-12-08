'use strict';

export function randomNumber(from = 0, to = 2_147_483_647) {
    const value = Math.random() * (to - from);

    return Math.floor(from) + Math.floor(value);
}

export const randomColor = () => `#${Math.floor(Math.random() * 16_777_215).toString(16)}`;
