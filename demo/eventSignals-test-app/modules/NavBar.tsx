'use strict';

import type { MouseEvent } from 'react';

import * as React from 'react';

import type { NavigationRouter } from "../state/routing";
import { currentNavigatorPage$ } from "../state/routing";
// import { applicationRoot } from "../lib/history_navigation";

import css from './NavBar.module.css';

function handleClick(event: MouseEvent<HTMLElement>) {
    const href = event.currentTarget?.getAttribute('href') as string | undefined;

    if (href) {
        event.preventDefault();

        history.pushState(null, null, href);
    }
}

const NavBar = React.memo(function NavBar() {
    console.log(NavBar.name, 'render');

    const currentPageRouter = currentNavigatorPage$.use();
    const { routersList } = currentNavigatorPage$.data;

    return (<div className={css.navContainer} role="navigation" aria-label="Main" aria-haspopup="true">
        <menu className={css.navMenu}>
            {routersList.map(router => {
                if (router.menuHidden) {
                    return null;
                }

                return <MenuItem key={router.key} router={router} currentPageRouter={currentPageRouter} />;
            })}
        </menu>
    </div>);
});

export default NavBar;

function MenuItem({ className, linkClassName, router, currentPageRouter }: {
    className?: string,
    linkClassName?: string,
    router: NavigationRouter,
    currentPageRouter: NavigationRouter,
}) {
    const {
        routerPath,
        pageTitle,
        subItems,
    } = router;
    const menuItemTitle$ = router.metadata?.menuItemTitle$
        || router.metadata?.menuItemTitle
        || pageTitle
    ;
    const isCurrent = router === currentPageRouter;
    const $submenu = subItems ? <div className={css.submenu}>
        {subItems.map(router => {
            if (router.menuHidden) {
                return null;
            }

            return <MenuItem
                key={router.key} className={css.submenuItem} linkClassName={css.submenuLink}
                router={router} currentPageRouter={currentPageRouter}
            />;
        })}
    </div> : null;
    /* todo: use `absolutePath` instead of `routerPath` in `<a href={routerPath}`, because in some cases `routerPath`
        can be relative and it can cause incorrect navigation. For example, if `applicationRoot` is `/app/` and `routerPath` is `page1`, then the link will navigate to `/page1` instead of `/app/page1`.
        The `absolutePath` will be `/app/page1` in this case, which is correct.
    const absolutePath = /\w{1,5}:/.test(routerPath) || routerPath.startsWith('/')
        ? routerPath
        : applicationRoot + routerPath
    ;
    */

    return <li
        key={routerPath}
        className={`${css.navItem} ${isCurrent ? css.navItemActive : ''} ${className || ''}`}
    >
        <a href={routerPath} onClick={$submenu ? null : handleClick} className={`${css.navLink} ${linkClassName || ''}`}>
            {menuItemTitle$}
            {$submenu}
        </a>
    </li>;
}
