/* eslint-disable @typescript-eslint/no-magic-numbers,unicorn/prefer-code-point */
'use strict';

import * as React from "react";

import NavBar from "../modules/NavBar";
import { $widgetsList } from "../state/widgetsState";
/*
import type { Signal$jsonPlaceholderUser1 } from "../state/AppStates";
import { mainState } from "../state/AppStates";
*/

const { $addWidgetsDisable, $clearWidgetsDisable } = $widgetsList.data;
// const { jsonPlaceholderUserComponentType } = mainState;

export default function PageFour() {
    console.log('render PageFour');

    return (<>
        <h1>Page PageFour</h1>
        <NavBar/>
        <fieldset>
            <$addWidgetsDisable.component sFC={WidgetButtonDisableSignal}>
                <span style={{ color: 'red' }}> random</span>
            </$addWidgetsDisable.component>
            <button
                ref={$widgetsList.data.addWidgetBtnRef}
                onClick={() => $widgetsList.data.addWidgets(9, 15, 7, 1, 20, 3, 6, 5)}
                disabled={$widgetsList.data.addWidgetBtnDisabled}
            >addWidgets</button>
            <$clearWidgetsDisable.component sFC={WidgetButtonDisableSignal} />
            <button
                onClick={$widgetsList.data.clearCache}
            >clearCache</button>
        </fieldset>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <$widgetsList.component context={{
                //todo: Как оно могло бы быть
                // onWidgetDelete(id) {
                //     $widgetsList.data.removeWidget(id);
                // },
            }} />
            {/*<$widgetsList.component sComponents={new Map([ [ jsonPlaceholderUserComponentType, UserSimpleCart ] ])} />*/}
        </div>
    </>);
}

function WidgetButtonDisableSignal({ eventSignal, onClick, children }: {
    eventSignal: typeof $addWidgetsDisable | typeof $clearWidgetsDisable,
    onClick?: () => void,
    children: React.ReactNode,
}) {
    // const theme = React.useContext(ThemeContext);

    return (<button onClick={onClick ?? eventSignal.data.onClick} disabled={eventSignal.get()}>
        {eventSignal.data.title}
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

function UserSimpleCart({ eventSignal }: { eventSignal: Signal$jsonPlaceholderUser1 }) {
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
