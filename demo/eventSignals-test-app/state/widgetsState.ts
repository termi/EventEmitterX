/* eslint-disable @typescript-eslint/no-magic-numbers */
'use strict';

import { createRef } from "react";

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import { makePlaceholderUserEventSignal, clearPlaceholderUserEventSignalCache } from "./AppStates";

const _$widgetsList_data = {
    $addWidgetsDisable: new EventSignal(false, {
        componentType: Symbol(),
        description: '$addWidgetsDisable',
        data: {
            title: 'addWidget',
            onClick: () => {
                _$widgetsList_data.addWidgets(true);
            },
        },
    }),
    $clearWidgetsDisable: new EventSignal(true, {
        componentType: Symbol(),
        description: '$clearWidgetsDisable',
        data: {
            title: 'clearWidgets',
            onClick: () => {
                _$widgetsList_data.clearWidgets();
            },
        },
    }),
    get addWidgetBtnDisabled() {
        return this.$addWidgetsDisable.get();
    },
    set addWidgetBtnDisabled(newValue: boolean) {
        this.$addWidgetsDisable.set(newValue);
    },
    addWidgetBtnRef: createRef<HTMLButtonElement>(),
    addWidgets(...ids: (number | true)[]) {
        const list = $widgetsList.getSourceValue();
        const newIds = ids.map(id => {
            return id === true ? randomNumber(0, 15) : id;
        }).filter(id => !list.includes(id));

        if (newIds.length === 0) {
            return;
        }

        if (list.length > 10) {
            if (this.addWidgetBtnRef.current) {
                this.addWidgetBtnRef.current.disabled = true;
            }

            this.addWidgetBtnDisabled = true;
        }

        $widgetsList.set([ ...list, ...newIds ]);
    },
    removeWidget: (id: number) => {
        const list = $widgetsList.getSourceValue();
        const index = list.indexOf(id);

        if (index === -1) {
            return;
        }

        const newList = list.slice();

        newList.splice(index, 1);

        $widgetsList.set(newList);
    },
    clearWidgets() {
        if (this.addWidgetBtnRef.current) {
            this.addWidgetBtnRef.current.disabled = false;
        }

        this.addWidgetBtnDisabled = false;

        $widgetsList.set([]);
    },
    clearCache() {
        clearPlaceholderUserEventSignalCache();
    },
};

export const $widgetsList = new EventSignal<(ReturnType<typeof makePlaceholderUserEventSignal>)[], number[], typeof _$widgetsList_data>([], (_prev, idsList) => {
    _$widgetsList_data.$clearWidgetsDisable.set(idsList.length === 0);

    return idsList.map(id => makePlaceholderUserEventSignal(id));
}, {
    data: _$widgetsList_data,
    initialSourceValue: [],
    finaleSourceValue: [],
    // componentType: 'test',
});

function randomNumber(from = 0, to = 2_147_483_647) {
    return Math.floor(from + Math.random() * (to - from + 1));
}

globalThis.__widgetsState = {
    $widgetsList,
    $addWidgetsDisable: _$widgetsList_data.$addWidgetsDisable,
    $clearWidgetsDisable: _$widgetsList_data.$clearWidgetsDisable,
};
