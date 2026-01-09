'use strict';

import * as React from "react";

import Counter from "../modules/Counter";

import { mainState } from "../state/AppStates";
import { i18nString$$ } from "../state/i18n";

import css from "./1.one.module.css";

const counterClasses: Parameters<typeof Counter>[0]["classes"] = {
    className: css.counter,
    title: css.counterTitle,
    value: css.counterValue,
    buttons: css.counterButtons,
};

export default function PageOne() {
    console.log('render PageOne');

    return (<>
        <div className={css.pageOne}>
            <div className={css.sectionsContainer}>
                <div className={css.countersSection}>
                    <h2 className={css.sectionTitle}>{i18nString$$('Управление счетчиками')}</h2>

                    <mainState.computed1$.component sFC={Counter} classes={counterClasses}/>

                    <Counter eventSignal={mainState.computed2$} classes={counterClasses}/>

                    {mainState.computed2$}
                </div>

                <div className={css.summarySection}>
                    <h2 className={css.sectionTitle}>{i18nString$$('Текущие значения')}</h2>

                    <div className={css.summaryDisplay}>
                        <div className={css.summaryItem}>
                            <div className={css.summaryLabel}>{mainState.counter1$.data.title}</div>
                            <div className={css.summaryValue}>{mainState.counter1$}</div>
                        </div>

                        <div className={css.summaryItem}>
                            <div className={css.summaryLabel}>{mainState.counter2$.data.title}</div>
                            <div className={css.summaryValue}>{mainState.counter2$}</div>
                        </div>

                        <div className={`${css.summaryItem} ${css.totalDisplay}`}>
                            <div className={css.summaryLabel}>{mainState.countersSum$.data.title}</div>
                            <div className={css.summaryValue}>{mainState.countersSum$}</div>
                        </div>
                    </div>
                </div>

                <div className={css.userCardSection}>
                    {mainState.jsonPlaceholderUser1$}
                    <br/>
                    <button onClick={mainState.jsonPlaceholderUser1$.data.getNextUser}>
                        {mainState.jsonPlaceholderUser1$.data.getNextUser.title}
                    </button>
                </div>
            </div>
        </div>
    </>);
}

Object.freeze(Object.setPrototypeOf(counterClasses, null));
