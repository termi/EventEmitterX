'use strict';

// function pathJoin(...parts: string[]): string {
//     return parts.map(part => part.replace(/^\/|\/$/g, '')).join('/');
// }
export function pathJoin(part1: string, part2?: string) {
    part1 = String(part1 || '');
    part2 = String(part2 || '');

    if (!part2) {
        return part1;
    }

    if (part1.endsWith('/') || part2.startsWith('/')) {
        if (part1.endsWith('/') && part2.startsWith('/')) {
            return `${part1}${part2.substring(1)}`;
        }

        return `${part1}${part2}`;
    }

    return `${part1}/${part2}`;
}

/**
 * @example
 * createRouteWithQuery('https://example.com', '/user/:id'); // требует { id: string | number }
 * createRouteWithQuery('https://example.com', '/user/:id/posts/:postId'); // требует { id: string | number, postId: string | number }
 * createRouteWithQuery('https://example.com', '/static/path'); // не требует параметров
 */
export function createRoute<Path extends string>(
    name: string,
    path: Path,
    ...args: keyof createRoute.ExtractParams<Path> extends never
        // Если параметров нет, props должен быть пустым или undefined
        ? [props?: undefined]
        // Иначе обязателен объект с нужными полями
        : [props: createRoute.ExtractParams<Path>]
): string {
    const props = args[0] || {};

    return pathJoin(name, path).replace(/\/:(\w+)/g, function(_, name: string) {
        return '/' + String((props as Record<string, string | number>)[name] || '');
    });
}

export namespace createRoute {
    export type ExtractParams<Path extends string> =
        Path extends `${string}/:${infer Param}/${infer Rest}`
            ? { [K in Param | keyof ExtractParams<`/${Rest}`>]: string | number }
            : Path extends `${string}/:${infer Param}`
                ? { [K in Param]: string | number }
                // eslint-disable-next-line @typescript-eslint/no-empty-object-type
                : {}
    ;
}

/**
 * @example
 * createRouteWithQuery('https://example.com', '/user/:id'); // требует { id: string | number }
 * createRouteWithQuery('https://example.com', '/user/:id/posts/:postId'); // требует { id: string | number, postId: string | number }
 * createRouteWithQuery('https://example.com', '/search?q=:query'); // требует { query: string | number }
 * createRouteWithQuery('https://example.com', '/filter?type=:type&sort=:sort'); // требует { type: string | number, sort: string | number }
 * createRouteWithQuery('https://example.com', '/user/:id/?type=:type'); // требует { id: string | number, type: string | number })
 * createRouteWithQuery('https://example.com', '/static/path'); // не требует параметров
 */
export function createRouteWithQuery<Path extends string>(
    origin: string,
    path: Path,
    ...args: keyof createRouteWithQuery.ExtractParams<Path> extends never
        // Если параметров нет, props должен быть пустым или undefined
        ? [ props?: undefined ]
        // Иначе обязателен объект с нужными полями
        : [ props: createRouteWithQuery.ExtractParams<Path> ]
): string {
    const props: Record<string, string | number> = args[0] || {};
    const pathParts = path.split('?');

    let result = pathJoin(origin, pathParts[0]).replace(/\/:(\w+)/g, function(_, name: string) {
        return '/' + String((props as Record<string, string | number>)[name] || '');
    });

    // Обработка query-параметров (например, `?name=:name&age=?:age`)
    const queryPart = pathParts[1] || '';

    if (queryPart) {
        const queryPairs = queryPart.split('&').filter(Boolean);
        const queryParams: string[] = [];

        for (const pair of queryPairs) {
            const parts = pair.split('=');
            const key = parts[0];
            const value = parts[1];

            if (value != null) {
                if (value.startsWith('?:')) {// Необязательный параметр (`?:param`)
                    const paramName = value.slice(2);
                    const paramValue = props[paramName];

                    if (paramValue !== void 0) {
                        queryParams.push(`${key}=${String(props[paramName])}`);
                    }
                    // Если параметр не передан — пропускаем
                }
                else if (value.startsWith(':')) {// Обязательный параметр (`:param`)
                    const paramName = value.slice(1);

                    queryParams.push(`${key}=${String(props[paramName] || '')}`);
                }
            }
            else if (key.startsWith(':')) {
                const paramName = key.slice(1);
                // Самый первый параметр БЕЗ названия после '?' (`path?:param`) хоть и является обязательным, но если
                //  является единственным параметром в списке параметров и он имеет Falsy значение, то '?' не должна
                //  одиноко прикрепляться к результирующей строке.
                const paramValue = String(props[paramName]);

                if (paramValue) {
                    queryParams.push(`${props[paramName]}`);
                }
            }
            else {// Обычный query-параметр (без `:`)
                queryParams.push(pair);
            }
        }

        if (queryParams.length > 0) {
            result += '?' + queryParams.join('&');
        }
    }

    return result;
}

export namespace createRouteWithQuery {
    export type ExtractParams<Path extends string> =
        Path extends `${string}/:${infer Param}/${infer Rest}`
            ? { [K in Param | keyof ExtractParams<`/${Rest}`>]: string | number }
            : Path extends `${string}/:${infer Param}?${infer Query}`
                ? { [K in Param | keyof ExtractQueryParams<Query>]: string | number }
                : Path extends `${string}/:${infer Param}`
                    ? { [K in Param]: string | number }
                    : Path extends `${string}?${infer Query}`
                        ? ExtractQueryParams<Query>
                        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
                        : {}
    ;

    export type ExtractQueryParams<Query extends string> =
        Query extends `${infer Part}&${infer Rest}`
            ? ExtractQueryParam<Part> & ExtractQueryParams<Rest>
            : ExtractQueryParam<Query>
    ;

    export type ExtractQueryParam<Part extends string> =
        Part extends `${string}=?:${infer Param}`// Необязательный параметр
            ? { [K in Param]?: string | number }
            : Part extends `${string}=:${infer Param}`
                ? { [K in Param]: string | number }// Обязательный параметр
                : Part extends `:${infer Param}`
                    ? { [K in Param]: string | number }// Параметр без названия
                    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
                    : {}
    ;
}
