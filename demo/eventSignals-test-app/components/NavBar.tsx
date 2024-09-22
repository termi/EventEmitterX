'use strict';

import * as React from 'react';
import { useCallback } from 'react';

document.head.insertAdjacentHTML("beforeend", `<style>
.NavBar__menu {
    li {
        display: inline-block;
        padding-right: 20px;
    }
}
</style>`);

export default function NavBar() {
    const handleClick = useCallback((event) => {
        const href = event.target?.getAttribute('href') as string | undefined;

        if (href) {
            event.preventDefault();

            history.pushState(null, null, href);
        }
    }, []);

    return (<ul className="NavBar__menu">
        <li><a href="/one" onClick={handleClick}>One</a></li>
        <li><a href="/two" onClick={handleClick}>Two</a></li>
        <li><a href="/three" onClick={handleClick}>Three</a></li>
    </ul>);
}
