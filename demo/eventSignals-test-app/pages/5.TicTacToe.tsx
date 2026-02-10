/* eslint-disable @typescript-eslint/no-magic-numbers */
'use strict';

import * as React from 'react';
import { useCallback, useState } from "react";

import { i18nString$$ } from "../state/i18n";

import TicTacToeGameImmutable from "../modules/TicTacToe/TicTacToeGameImmutable";
import TicTacToeGameMutable from "../modules/TicTacToe/TicTacToeGameMutable";
import TicTacToeGameMutablePro from "../modules/TicTacToe/TicTacToeGameMutablePro";

import css from './5.TicTacToe.module.css';

export default function TicTacToe() {
    const [ currentTab, setCurrentTab ] = useState(0);
    const onTabMenuClick = useCallback<React.MouseEventHandler<HTMLElement>>((event) => {
        const { target } = event.nativeEvent;
        const tabIndex = Number((target as HTMLElement | undefined)?.getAttribute?.('data-tab-index') ?? void 0);

        if (Number.isInteger(tabIndex)) {
            setCurrentTab(tabIndex);
        }
    }, []);

    return (<div className={css.TicTacToe}>
        <div className={css.tabsContainer}>
            <div className={css.tabsHeader} onClick={onTabMenuClick}>
                <button className={`${css.tabButton} ${currentTab === 0 ? css.active : ''}`} data-tab-index="0">
                    {i18nString$$('Простой Иммутабельный')}
                </button>
                <button className={`${css.tabButton} ${currentTab === 1 ? css.active : ''}`} data-tab-index="1">
                    {i18nString$$('Простой Мутабельный')}
                </button>
                <button className={`${css.tabButton} ${currentTab === 2 ? css.active : ''}`} data-tab-index="2">
                    {i18nString$$('Продвинутый с экземпляром класса')}
                </button>
            </div>

            <div className={css.tabsContent}>
                <div className={`${css.tabContent} ${currentTab === 0 ? css.active : ''}`}>
                    <TicTacToeGameImmutable />
                </div>

                <div className={`${css.tabContent} ${currentTab === 1 ? css.active : ''}`}>
                    <TicTacToeGameMutable />
                </div>

                <div className={`${css.tabContent} ${currentTab === 2 ? css.active : ''}`}>
                    <TicTacToeGameMutablePro />
                </div>
            </div>
        </div>
    </div>);
}
