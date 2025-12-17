'use strict';

import type { MouseEvent } from 'react';

import * as React from 'react';
import { memo } from 'react';

import { routersList } from '../state/routers.prebuild';

import css from './NavBar.module.css';

function handleClick(event: MouseEvent<HTMLElement>) {
    const href = event.currentTarget?.getAttribute('href') as string | undefined;

    if (href) {
        event.preventDefault();

        history.pushState(null, null, href);
    }
}

const NavBar = memo(function NavBar() {
    console.log(NavBar.name, 'render');

    return (<ul className={css.NavBar__menu}>
        {routersList.map(router => {
            if (router.menuHidden) {
                return null;
            }

            const {
                routerPath,
                pageTitle,
            } = router;
            const menuItemTitle$ = router.metadata?.menuItemTitle$
                || router.metadata?.menuItemTitle
                || pageTitle
            ;

            return <li key={routerPath}><a href={routerPath} onClick={handleClick}>{menuItemTitle$}</a></li>;
        })}
    </ul>);
});

export default NavBar;
