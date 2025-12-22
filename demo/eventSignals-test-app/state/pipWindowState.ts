/// <reference types="../types/document-picture-in-picture" />
'use strict';

import type * as React from "react";

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

type NewPipWindowOptions<P extends Record<string, any>=Record<string, any>> = {
    width?: number,
    height?: number,
    onClose?: (error?: Error | string) => void,
    dataId?: number | string | undefined,
    component?: React.FC<P> | null,
    componentProps?: P | null,
};

const emptyPipPopupWindowDescription: PipPopupWindowDescription = {
    window: null as Window | null,
    dataId: void 0,
    component: null,
    componentProps: null,
};

Object.freeze(Object.setPrototypeOf(emptyPipPopupWindowDescription, null));

type PipPopupWindowDescription = {
    window: Window | null,
    dataId?: number | string | undefined,
    component?: React.FC<Record<string, any>> | null,
    componentProps?: Record<string, any> | null,
};

// import PageGlobalTimes from "../pages/PageGlobalTimes";
//
// // Сделал setPopup, потому что не понял, как заставить Generic работать на методе pipPopupWindow$.set
// pipPopupWindow$.setPopup({
//     component: PageGlobalTimes,
//     componentProps: { filterBydId: '1' }
// });

export const pipPopupWindow$ = Object.assign(new EventSignal({
    window: null as Window | null,
    dataId: undefined as number | string | undefined,
    component: null,
    componentProps: null,
} satisfies PipPopupWindowDescription, async function(prev, newPipWindowOptions) {
    if (newPipWindowOptions == null || !newPipWindowOptions.component) {
        prev.window?.close();

        return emptyPipPopupWindowDescription;
    }

    if (typeof documentPictureInPicture === 'undefined' || typeof document === 'undefined') {
        return emptyPipPopupWindowDescription;
    }

    const {
        width = 400,
        height = 300,
        onClose,
        dataId,
        component,
        componentProps,
    } = newPipWindowOptions;

    try {
        // Запрашиваем PIP окно
        let window: Window | null = await documentPictureInPicture.requestWindow({
            width,
            height,
        });

        if (!window) {
            return emptyPipPopupWindowDescription;
        }

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

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // 'pagehide' callback will be dispatched
                window?.close();
            }
        };

        // Обработчик закрытия окна
        window.addEventListener('pagehide', () => {
            window?.document?.removeEventListener('keydown', onKeyDown);
            onClose?.();
            window = null;

            if (pipPopupWindow$.status !== 'pending') {
                // Только если окно закрывается НЕ ПО ПРИЧИНЕ смены содержимого
                pipPopupWindow$.set(null);
            }
        });

        // Обработчик закрытия через Escape
        window.document.addEventListener('keydown', onKeyDown);

        return {
            get window() {
                return window;
            },
            dataId,
            component,
            componentProps,
        } as PipPopupWindowDescription;
    }
    catch (error) {
        console.error('Failed to open Picture-in-Picture:', error);
        onClose?.(error as Error | string);
    }
}, {
    initialSourceValue: null as NewPipWindowOptions | null,
}), {
    setPopup<P extends Record<string, any>=Record<string, any>>(newValue: NewPipWindowOptions<P> | null | undefined) {
        this.markNextValueAsForced();
        this.set(newValue || null);
    },
});

(globalThis as unknown as Record<string, any>).__test__pipPopupWindow$ = pipPopupWindow$;
