'use strict';

import * as React from 'react';
import { useCallback } from 'react';

export default function NavBar() {
    const handleClick = useCallback((event) => {
        const href = event.target?.getAttribute('href') as string | undefined;

        if (href) {
            event.preventDefault();

            history.pushState(null, null, href);
        }
    }, []);

    return (<ul>
        <li><a href="/one" onClick={handleClick}>One</a></li>
        <li><a href="/two" onClick={handleClick}>Two</a></li>
    </ul>);
}
