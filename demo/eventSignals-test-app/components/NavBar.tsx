'use strict';

import type { MouseEvent } from 'react';

import * as React from 'react';
import { memo, useCallback } from 'react';

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
        <li><a href="/one" onClick={handleClick}>One</a></li>
        <li><a href="/two" onClick={handleClick}>Two</a></li>
        <li><a href="/three" onClick={handleClick}>Three</a></li>
        <li><a href="/four" onClick={handleClick}>Four</a></li>
        <li><a href="/times" onClick={handleClick}>Global Times</a></li>
    </ul>);
});

export default NavBar;
