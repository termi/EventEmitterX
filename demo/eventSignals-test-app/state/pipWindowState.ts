/// <reference types="../types/document-picture-in-picture" />
'use strict';

import type * as React from "react";

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

type NewPipWindowOptions = {
    uniqueId: symbol,
    width?: number,
    height?: number,
    onClose?: (error?: Error | string) => void,
    dataId?: number | string | undefined,
};

const pipUniqueIdNon = Symbol('pipUniqueIdNon');
const emptyPipPopupWindowDescription: PipPopupWindowDescription = {
    uniqueId: pipUniqueIdNon,
    window: null as Window | null,
    dataId: void 0,
};

Object.freeze(Object.setPrototypeOf(emptyPipPopupWindowDescription, null));

type PipPopupWindowDescription = {
    uniqueId: symbol,
    window: Window | null,
    dataId?: number | string | undefined,
};

export const pipPopupWindow$ = new EventSignal({
    uniqueId: pipUniqueIdNon,
    window: null as Window | null,
    dataId: undefined as number | string | undefined,
} satisfies PipPopupWindowDescription, async function(prev, newPipWindowOptions) {
    if (newPipWindowOptions == null) {
        prev.window?.close();

        return emptyPipPopupWindowDescription;
    }

    if (typeof documentPictureInPicture === 'undefined' || typeof document === 'undefined') {
        return emptyPipPopupWindowDescription;
    }

    const {
        uniqueId,
        width = 400,
        height = 300,
        onClose,
        dataId,
    } = newPipWindowOptions;

    try {
        // Запрашиваем PIP окно
        let window: Window | null = await documentPictureInPicture.requestWindow({
            width,
            height,
        });

        // Создаем контейнер для React в PIP окне
        const container = document.createElement('div');

        container.id = 'pip-container';
        window.document.body.append(container);

        // Копируем стили из основного окна в PIP
        const styles = document.querySelectorAll('style, link[rel="stylesheet"]');

        // eslint-disable-next-line unicorn/no-array-for-each
        styles.forEach(style => {
            window.document.head.append(style.cloneNode(true));
        });

        // Обработчик закрытия окна
        window.addEventListener('pagehide', () => {
            onClose?.();
            window = null;

            pipPopupWindow$.set(emptyPipPopupWindowDescription);
        });

        // Обработчик закрытия через Escape
        window.document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                window.close();
                window = null;

                pipPopupWindow$.set(emptyPipPopupWindowDescription);
            }
        });

        return {
            uniqueId,
            get window() {
                return window;
            },
            dataId,
        } as PipPopupWindowDescription;
    }
    catch (error) {
        console.error('Failed to open Picture-in-Picture:', error);
        onClose?.(error);
    }
}, {
    initialSourceValue: null as NewPipWindowOptions | null,
});

(globalThis as unknown as Record<string, any>).__test__pipPopupWindow$ = pipPopupWindow$;
