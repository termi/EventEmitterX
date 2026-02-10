'use strict';

import * as React from "react";
import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import type { PlaceholderUser$ } from "../state/AppStates";

import { i18nString$$ } from "../state/i18n";

import css from './JsonPlaceholderUser.module.css';

export default function JsonPlaceholderUser({
    current$,
    current$Value,
    version,
    textColor,
    backgroundColor,
    forceRenderType,
}: {
    current$: PlaceholderUser$,
    current$Value: ReturnType<typeof current$.getSync>,
    // todo: rename to 'current$Version'?
    version: number,
    textColor?: string,
    backgroundColor?: string,
    forceRenderType?: 'card' | 'table',
}) {
    const { userDTO, type = 'card' } = current$.data;
    const style = {
        color: textColor,
        "--backgroundColor": backgroundColor ? `${backgroundColor}` : void 0,
    } as React.CSSProperties;
    const isUserCardRender = (forceRenderType ?? type) === 'card';
    const $content = isUserCardRender
        ? UserCard(userDTO, current$)
        : ObjectToTable(userDTO, current$)
    ;

    return (<div
        className={css.JsonPlaceholderUser}
        data-user-id={current$Value}
        data-componenttype={current$.componentType}
        data-version={version}
        style={style}
    >
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-expect-error fixme: [TYPINGS / typings] Исправить тут типизацию */}
        <current$.component.ViewContext value={{
            [current$.componentType as unknown as string]: isUserCardRender
                ? [ JsonPlaceholderUser, { forceRenderType: 'table' } ]
                : [ JsonPlaceholderUser, { forceRenderType: 'card' } ]
            ,
        }}>
            {$content}
        </current$.component.ViewContext>
    </div>);
}

function UserCard(userDTO: PlaceholderUser$["data"]["userDTO"], user$: PlaceholderUser$) {
    const [ popupShow, setPopupShow ] = useState(false);
    const {
        id,
        name,
        username,
        company,
        address,
        email,
        phone,
        website,
    } = userDTO;
    const companyName = company.name;
    const userCardProps = [
        { title: i18nString$$('Электронная почта'), key: 'email', value: email, iconClassName: css.miniIconEmail, __proto__: null },
        { title: i18nString$$('Телефон'), key: 'phone', value: phone, iconClassName: css.miniIconTelephone, __proto__: null },
        { title: i18nString$$('Веб-сайт'), key: 'website', value: website, iconClassName: css.miniIconWeb, __proto__: null },
        { title: i18nString$$('Город'), key: 'address.city', value: address.city, iconClassName: css.miniIconCity, __proto__: null },
        { title: i18nString$$('Улица'), key: 'address.street', value: address.street, iconClassName: css.miniIconStreet, __proto__: null },
        { title: i18nString$$('Сфера деятельности'), key: 'company.bs', value: company.bs, iconClassName: css.miniIconScope, __proto__: null },
    ] satisfies {
        title: EventSignal<string, string, unknown>,
        iconClassName: string,
        key: string,
        value: string,
        __proto__: null,
    }[];

    return (<div className={css.miniCardContainer} data-user-id={id}>
        <div className={css.miniCard}>
            <div className={css.miniHeader}>
                <div className={`${css.miniAvatar} ${css.miniAvatarIconUser}`} />
                <div>
                    <h3 className={css.miniName}>{name} ({id})</h3>
                    <p className={css.miniUsername}>{username} • {companyName}</p>
                </div>
            </div>
            <div className={css.miniDetails}>
                {userCardProps.map(prop => {
                    return <div className={css.miniInfo} key={prop.key}>
                        <div className={`${css.miniIcon} ${prop.iconClassName}`} />
                        <div>
                            <div style={ { fontSize: '14px', color: '#7f8c8d' } }>{prop.title}</div>
                            <div>{prop.value}</div>
                        </div>
                    </div>;
                })}
            </div>
            <div>
                <button onClick={() => setPopupShow(v => !v)}>{
                    popupShow
                        ? i18nString$$('Скрыть пользователя')
                        : i18nString$$('Отрендерить пользователя ещё раз||<en-US>||:Render the user again')
                }</button>
                {popupShow ? <user$.component sIgnoreRecursive={true} /> : null}
            </div>
        </div>
    </div>);
}

function ObjectToTable(obj: Object, user$?: PlaceholderUser$) {
    const [ popupShow, setPopupShow ] = useState(false);
    const keys = Object.keys(obj);

    return (<div>
        <table>
            <thead>
                <tr>
                    {keys.map(key => <th key={key}>{key}</th>)}
                </tr>
            </thead>
            <tbody>
                <tr>
                    {keys.map(key => {
                        let value = obj[key];

                        if (typeof value === 'object' && value) {
                            value = ObjectToTable(value);
                        }

                        return <td key={key}>{value}</td>;
                    })}
                </tr>
            </tbody>
        </table>
        <div>
            {user$ ? <>
                <button onClick={() => setPopupShow(v => !v)}>{
                    popupShow
                        ? i18nString$$('Скрыть пользователя')
                        : i18nString$$('Отрендерить пользователя ещё раз||<en-US>||:Render the user again')
                }</button>
                {popupShow ? <user$.component sIgnoreRecursive={true}/> : null}
            </> : null}
        </div>
    </div>);
}
