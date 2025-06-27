/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

import type { ExcludeType } from "../types/generics";

import { pathJoin } from "../utils/path";
import { getDefaultBaseURI } from "./methods";
import { mainProcessJTWStorage } from "../logic/mainProcessJTWStorage";
import { auth_refresh } from "./routers";
import { stringifyError } from "../utils/error";

type RequestOptions = Omit<RequestInit, 'body'> & {
    body?: object | RequestInit["body"],
    returnFetchResponse?: boolean,
    doNotUpdateToken?: boolean,
}

type FetchResponse<T> = {
    readonly data: T,
    readonly contentType: string,
    readonly headers: Headers,
    readonly ok: boolean,
    readonly redirected: boolean,
    readonly status: number,
    readonly statusText: string,
    readonly type: ResponseType,
    readonly url: string,

    __proto__?: null,
}

function _isRelativePath(url: string): boolean {
    // Проверяем, что строка не начинается с http://, https://, // или других абсолютных указателей
    return !/^(?:[a-z]+:)?\/\//i.test(url) && !url.startsWith('data:') && !url.startsWith('blob:');
}

export async function request(
    endpoint: string,
    options: RequestOptions & { returnFetchResponse: true },
): ReturnType<typeof fetch>;
export async function request<T = any>(
    endpoint: string,
    options?: RequestOptions & { returnFetchResponse?: false },
): Promise<FetchResponse<T>>;
/**
 * Wrap of [`fetch`]{@link fetch} with checking JWT.
 */
export async function request<T = any>(
    endpoint: string,
    options: RequestOptions = {},
): Promise<FetchResponse<T> | Awaited<ReturnType<typeof fetch>>> {
    const { returnFetchResponse, doNotUpdateToken } = options;
    const url = _isRelativePath(endpoint)
        ? pathJoin(getDefaultBaseURI(), endpoint)
        : endpoint
    ;
    let retryCount = 0;
    const maxRetries = 1; // Максимальное количество попыток обновления токена

    return (async function fetchCall(doNotUpdateToken = false): Promise<FetchResponse<T> | Awaited<ReturnType<typeof fetch>>> {
        // Подготовка заголовков
        const headers = new Headers(options.headers);

        if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        {
            let passedAuthorizationHeader = headers.get('Authorization');

            if (passedAuthorizationHeader === 'Bearer ') {
                passedAuthorizationHeader = null;
            }

            if (!passedAuthorizationHeader) {
                const accessToken = mainProcessJTWStorage.getAccessToken();

                if (accessToken) {
                    headers.set('Authorization', `Bearer ${accessToken}`);
                }
            }
        }

        // Подготовка тела запроса
        let body: RequestInit["body"] | null = null;

        if (options.body) {
            if (typeof options.body !== 'string') {
                body = options.body instanceof FormData
                    ? options.body
                    : headers.has('Content-Type')
                        ? JSON.stringify(options.body)
                        : options.body as ExcludeType<typeof options.body, object>
                ;
            }
            else {
                body = options.body;
            }
        }

        // Выполнение запроса
        const response = await fetch(url, {
            ...options,
            headers,
            body,
        });

        // Обработка 401 ошибки (не авторизован)
        if (response.status === 401 && !doNotUpdateToken && retryCount < maxRetries) {
            retryCount++;

            try {
                // Пытаемся обновить токен
                const refreshResponse = await fetch(pathJoin(getDefaultBaseURI(), auth_refresh.url), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    } as const satisfies auth_refresh.Types["Headers"],
                    body: JSON.stringify({
                        refreshToken: mainProcessJTWStorage.getRefreshToken(),
                    } as const satisfies auth_refresh.Types["Body"]),
                });

                if (!refreshResponse.ok) {
                    const errorData = await refreshResponse.json().catch(() => ({}));

                    // noinspection ExceptionCaughtLocallyJS
                    throw new Error('Token refresh failed', {
                        cause: {
                            status: response.status,
                            statusText: response.statusText,
                            data: errorData,
                        },
                    });
                }

                const tokens = await refreshResponse.json() as auth_refresh.Types["Reply"];

                if (!tokens.success) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new Error('Token refresh failed', {
                        cause: {
                            status: response.status,
                            statusText: response.statusText,
                            data: tokens.error,
                        },
                    });
                }

                mainProcessJTWStorage.setTokens(tokens);

                // Повторяем оригинальный запрос с новым токеном
                return fetchCall(true);
            }
            catch (refreshError) {
                // Очищаем токены при неудачном обновлении
                mainProcessJTWStorage.clearTokens();

                // noinspection ExceptionCaughtLocallyJS
                throw new Error('Session expired. Please login again.', {
                    cause: refreshError,
                });
            }
        }

        if (returnFetchResponse) {
            return response;
        }

        const contentType = response.headers.get('Content-Type')?.toLowerCase();
        // 'application/json' | 'application/json; charset=utf-8'
        const isJsonResponseBody = contentType?.startsWith('application/json');

        // Обработка ответа
        if (!response.ok) {
            const errorData = isJsonResponseBody
                ? await response.json().catch(() => ({}))
                : { error: await response.text() }
            ;

            // noinspection ExceptionCaughtLocallyJS
            throw new Error(stringifyError(errorData?.error) || 'Request failed', {
                cause: {
                    ...errorData,
                    status: response.status,
                    statusText: response.statusText,
                },
            });
        }

        if (isJsonResponseBody) {
            const data = await response.json();

            return Object.freeze({
                data,
                contentType: contentType || 'unknown',
                headers: response.headers,
                ok: response.ok,
                redirected: response.redirected,
                status: response.status,
                statusText: response.statusText,
                type: response.type,
                url: response.url,

                __proto__: null as null,
            } satisfies FetchResponse<T>);
        }

        return Object.freeze({
            data: response.body as T,
            contentType: contentType || 'unknown',
            headers: response.headers,
            ok: response.ok,
            redirected: response.redirected,
            status: response.status,
            statusText: response.statusText,
            type: response.type,
            url: response.url,

            __proto__: null as null,
        }) satisfies FetchResponse<T>;
    })(doNotUpdateToken);
}
//
// // Вспомогательные методы
// export const api = {
//     get<T = any>(endpoint: string, options?: RequestOptions) {
//         return request<T>(endpoint, { ...options, method: 'GET' });
//     },
//
//     post<T = any>(endpoint: string, body?: object, options?: RequestOptions) {
//         return request<T>(endpoint, { ...options, method: 'POST', body });
//     },
//
//     put<T = any>(endpoint: string, body?: object, options?: RequestOptions) {
//         return request<T>(endpoint, { ...options, method: 'PUT', body });
//     },
//
//     delete<T = any>(endpoint: string, options?: RequestOptions) {
//         return request<T>(endpoint, { ...options, method: 'DELETE' });
//     },
//
//     patch<T = any>(endpoint: string, body?: object, options?: RequestOptions) {
//         return request<T>(endpoint, { ...options, method: 'PATCH', body })
//     }
// }
