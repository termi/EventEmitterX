'use strict';

import type { MouseEvent } from 'react';

import * as React from 'react';
import { memo, useCallback } from 'react';

import { routersList } from '../state/routers.prebuild';

document.head.insertAdjacentHTML("beforeend", `<style>
.NavBar__menu {
    li {
        display: inline-block;
        padding-right: 20px;
    }
}
</style>`);

const NavBar = memo(function NavBar() {
    const handleClick = useCallback((event: MouseEvent<HTMLElement>) => {
        const href = event.currentTarget?.getAttribute('href') as string | undefined;

        if (href) {
            event.preventDefault();

            history.pushState(null, null, href);
        }
    }, []);

    console.log(NavBar.name, 'render');

    return (<ul className="NavBar__menu">
        {routersList.map(router => {
            const {
                routerPath,
                pageTitle,
                menuHidden,
            } = router;
            const menuItemTitle$ = router.metadata?.menuItemTitle$
                || router.metadata?.menuItemTitle
                || pageTitle
            ;

            if (menuHidden) {
                return null;
            }

            return <li key={routerPath}><a href={routerPath} onClick={handleClick}>{menuItemTitle$}</a></li>;
        })}
    </ul>);
});

export default NavBar;
