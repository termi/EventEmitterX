/* eslint-disable @typescript-eslint/no-magic-numbers,unicorn/prefer-code-point */
'use strict';

import * as React from "react";

import { widgetsList$ } from "../state/widgetsState";
import { i18n$$ } from '../state/i18n';
import css from './examples.module.css';
/*
import type { JsonPlaceholderUser1$ } from "../state/AppStates";
import { mainState } from "../state/AppStates";
*/

const { addWidgetsDisable$, clearWidgetsDisable$ } = widgetsList$.data;
const emptyWidgetsLabel$ = i18n$$`Здесь появятся виджеты. Добавьте пользователя или готовый набор.||en-US||:Widgets will appear here. Add a user or a preset batch.`;
// const { jsonPlaceholderUserComponentType } = mainState;

export default function PageFour() {
    const emptyWidgetsLabel = emptyWidgetsLabel$.use();
    console.log('render PageFour');

    return (<div className={css.lesson}>
        <header className={css.intro}>
            <span className={css.eyebrow}>EventSignal · Shared widgets</span>
            <h2>{i18n$$`Коллекция реактивных виджетов||en-US||:A collection of reactive widgets`}</h2>
            <p>{i18n$$`Добавляйте пользователей по одному или набором. Каждый виджет показывает независимую загрузку и результат общего кеша.||en-US||:Add users one at a time or as a batch. Each widget shows its loading state and the result from the shared cache.`}</p>
        </header>
        <fieldset className={`${css.panel} ${css.toolbar}`}>
            <legend>{i18n$$`Управление коллекцией||en-US||:Collection controls`}</legend>
            <addWidgetsDisable$.component sFC={WidgetButtonDisableSignal}>
                <span> random</span>
            </addWidgetsDisable$.component>
            <button
                ref={widgetsList$.data.addWidgetBtnRef}
                onClick={() => widgetsList$.data.addWidgets(9, 15, 7, 1, 20, 3, 6, 5)}
                disabled={widgetsList$.data.addWidgetBtnDisabled}
            >addWidgets</button>
            <clearWidgetsDisable$.component sFC={WidgetButtonDisableSignal} />
            <button
                onClick={widgetsList$.data.clearCache}
            >clearCache</button>
        </fieldset>
        <div className={css.widgets} data-empty-label={emptyWidgetsLabel}>
            <widgetsList$.component context={{
                //todo: Как оно могло бы быть
                // onWidgetDelete(id) {
                //     $widgetsList.data.removeWidget(id);
                // },
            }} />
            {/*<$widgetsList.component sComponents={new Map([ [ jsonPlaceholderUserComponentType, UserSimpleCart ] ])} />*/}
        </div>
    </div>);
}

function WidgetButtonDisableSignal({ current$, current$Value, onClick, children }: {
    current$: typeof addWidgetsDisable$ | typeof clearWidgetsDisable$,
    current$Value: typeof addWidgetsDisable$.value | typeof clearWidgetsDisable$.value,
    onClick?: () => void,
    children: React.ReactNode,
}) {
    // const theme = React.useContext(ThemeContext);

    return (<button onClick={onClick ?? current$.data.onClick} disabled={current$Value}>
        {current$.data.title}
        {children}
    </button>);
}

/*
document.head.insertAdjacentHTML('beforeend', `<style>
.UserSimpleCart {
    position: relative;
    display: inline-block;
}
</style>`);

function UserSimpleCart({ current$ }: { current$: JsonPlaceholderUser1$ }) {
    const userId = eventSignal.get();
    const { userDTO } = eventSignal.data;
    const onWidgetDelete = useContext($widgetsList)?.onWidgetDelete;

    if (!userDTO) {
        throw new Error('userDTO is not defined');
    }

    return (<div className="UserSimpleCart" data-user-id={userId}>
        {([ 'name', 'username', 'email', 'phone' ] as (keyof typeof userDTO)[]).map(key => {
            return <div key={key} className="UserSimpleCart__field">
                <span className="UserSimpleCart__field__title">{key}</span>
                <span className="UserSimpleCart__field__value">{String(userDTO[key])}</span>
            </div>;
        })}
    </div>);
}
*/
