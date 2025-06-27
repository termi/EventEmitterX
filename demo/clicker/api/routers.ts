'use strict';

import { User, Prisma, Round, UserRole } from '@prisma/client';

import type { createRouteWithQuery } from "../utils/path";
import { ReplaceDateWithString, ReplaceNumberWithString } from "../types/generics";

/**
 * [RequestGenericInterface]{@link import('../backend/node_modules/.pnpm/fastify@5.4.0/node_modules/fastify/types/request.d.ts')}
 *
 * ```typescript
 * export interface RequestGenericInterface {
 *   Body?: RequestBodyDefault;
 *   Querystring?: RequestQuerystringDefault;
 *   Params?: RequestParamsDefault;
 *   Headers?: RequestHeadersDefault;
 * }
 * ```
 */
/**
 * [ReplyGenericInterface]{@link import('../backend/node_modules/.pnpm/fastify@5.4.0/node_modules/fastify/types/reply.d.ts')}
 *
 * ```typescript
 * export interface ReplyGenericInterface {
 *   Reply?: ReplyDefault;
 * }
 * ```
 */

/**
 *
 */
type RouterDescription = {
    method?: 'get' | 'post' | 'put' | 'delete' | 'option',
    url: string,
    description: string,
    roles?: string[],
}

type RouterErrorResponse = {
    success: false,
    error: string,
    errorCause?: string,
}

type ApplicationJsonHeader = 'application/json' | 'application/json; charset=utf-8';

export const auth_register = {
    method: 'post',
    url: '/auth/register',
    description: 'Регистрация - создание нового пользователя',
} as const satisfies RouterDescription;

export namespace auth_register {
    export type Types = {
        Body: {
            email: Prisma.UserCreateInput["email"],
            name: Prisma.UserCreateInput["name"],
            password: Prisma.UserCreateInput["passwordHash"],
        },
        Reply: {
            success: true,
            userId: number,
            userRole: UserRole,
            accessToken: string,
            refreshToken: string,
        } | RouterErrorResponse,
        Headers: {
            'Content-Type': ApplicationJsonHeader,
        },
    };
}

export const auth_login = {
    method: 'post',
    url: '/auth/login',
    description: 'Вход',
} as const satisfies RouterDescription;

export namespace auth_login {
    export type Types = {
        Body: {
            email: string,
            password: string,
        },
        Reply: {
            success: true,
            userId: number,
            userRole: UserRole,
            accessToken: string,
            refreshToken: string,
        } | RouterErrorResponse,
        Headers: {
            'Content-Type': ApplicationJsonHeader,
        },
    };
}

export const auth_check = {
    method: 'post',
    url: '/auth/check?allowRefresh=?:allowRefresh',
    description: `Проверяет токены. Если выставлен allowRefresh и не содержит значение 'false',
    и refreshToken валидный: обновит accessToken.`,
} as const satisfies RouterDescription;

export namespace auth_check {
    export type Types = {
        Body: {
            refreshToken?: string,
        },
        Querystring: {
            allowRefresh?: 'true' | 'false' | '',
        },
        Reply: {
            success: true,
            userId: number,
            userRole: UserRole,
        } | RouterErrorResponse,
        Headers: {
            'Authorization'?: `Bearer ${string}`,
            'Content-Type': ApplicationJsonHeader,
        },
    };
}

export const auth_refresh = {
    method: 'post',
    url: '/auth/refresh',
    description: 'Обновление JWT',
} as const satisfies RouterDescription;

export namespace auth_refresh {
    export type Types = {
        Body: {
            refreshToken: string,
        },
        Reply: {
            success: true,
            userId: number,
            userRole: UserRole,
            accessToken: string,
            refreshToken: string,
        } | RouterErrorResponse,
        Headers: {
            'Content-Type': ApplicationJsonHeader,
        },
    };
}

export const auth_logout = {
    method: 'post',
    url: '/auth/logout',
    description: 'Разлогин',
} as const satisfies RouterDescription;

export namespace auth_logout {
    export type Types = {
        Body: {
            refreshToken: string,
        },
        Headers: {
            'Content-Type': ApplicationJsonHeader,
        },
        Reply: {
            success: true,
            userId: number,
            userRole: UserRole,
            accessToken: '',
            refreshToken: '',
        } | RouterErrorResponse,
    };
}

export const users = {
    method: 'get',
    url: '/users',
    description: 'Получение всех users',
    roles: [ 'ADMIN' ],
} as const satisfies RouterDescription;

export namespace users {
    export type Types = {
        Params: { id?: string },
        Reply: {
            items: User[],
        },
    };
}

// export const createUser = {
//     backend: '/createUser',
//     frontend: '/createUser',
//     description: 'Создание нового user при авторизации',
//     roles: [],
// } as const satisfies RouterDescription;
//
// export namespace createUser {
//     export type Types = {
//         Body: {
//             email: Prisma.UserCreateInput["email"],
//             name: Prisma.UserCreateInput["name"],
//             passwordHash?: Prisma.UserCreateInput["passwordHash"],
//         },
//         Reply: {
//             item: User,
//         },
//     };
// }

export const rounds = {
    method: 'get',
    url: '/rounds?isActive=?:isActive',
    description: 'Получение всех раундов',
    roles: [],
} as const satisfies RouterDescription;

export namespace rounds {
    export type Types = {
        Body: {
            limit?: number,
        },
        Querystring: {
            isActive?: string,
        },
        Reply: {
            success: true,
            limit: number,
            now: number,
            items: ReplaceDateWithString<Round>[],
        } | RouterErrorResponse,
    };
}

export const getRound = {
    method: 'get',
    url: '/round/:id',
    description: 'Получение информации о раунде',
} as const satisfies RouterDescription;

export namespace getRound {
    export type Types = {
        Params: {
            id: number | string,
        },
        Headers: {
            'Authorization': `Bearer ${string}`,
            'Content-Type': ApplicationJsonHeader,
            [other: string]: string,
        },
        Reply: {
            success: true,
            now: number,
            item: Round,
        } | RouterErrorResponse,
    };
}

export const createRound = {
    method: 'post',
    url: '/createRound',
    description: 'Создание нового раунда',
    roles: [ 'ADMIN' ] as string[],
} as const satisfies RouterDescription;

export namespace createRound {
    export type Types = {
        Body: {
            title: string,
            description?: string,
            startedAt: number | string,
            endedAt?: number | string,
            cooldownSec?: number,
        },
        Headers: {
            'Authorization': `Bearer ${string}`,
            'Content-Type': ApplicationJsonHeader,
            "X-Idempotent-Id": string,
            [other: string]: string,
        },
        Reply: {
            success: true,
            now: number,
            item: Round,
        } | RouterErrorResponse,
    };
}

/**
 * Use with [SSEClient]{@link import('./SSEClient').SSEClient}
 */
export const roundsSSEUpdate = {
    method: 'get',
    url: '/roundsSSEUpdate?forceDelays=?:forceDelays',
    description: 'Получение обновлений round через Server Side Events',
    roles: [],
} as const satisfies RouterDescription;

export namespace roundsSSEUpdate {
    export type Types = {
        Querystring: ReplaceNumberWithString<createRouteWithQuery.ExtractParams<typeof roundsSSEUpdate.url>>,
    };
}

export const makeRoundTap = {
    // todo: Если тут выставить 'put' то в тестовом приложении (когда у клиента и сервера порты разные)
    //  возвращается `CORS error`, хотя cosr настроен. С 'post' такой проблемы нет.
    method: 'post',
    url: '/rounds/:id/tap',
    description: 'Тап',
} as const satisfies RouterDescription;

export namespace makeRoundTap {
    export type Types = {
        Body: {
            // Browser local timestamp
            timestamp: number,
            // min - 1, max - 100
            count: number,
        },
        Params: {
            id: number | string,
        },
        Headers: {
            'Authorization': `Bearer ${string}`,
            'Content-Type': ApplicationJsonHeader,
            "X-Idempotent-Id": string,
            [other: string]: string,
        },
        Reply: {
            roundId: Round["id"],
            userId: User["id"],
            success: true,
            count: number,
            userCount?: number,
            userHiddenCount?: number,
            userScore?: number,
            roundCount: number,
            roundHiddenTapsCount: number,
            roundScore: number,
        } | RouterErrorResponse,
    };
}

export const currentUserInfo = {
    method: 'get',
    url: '/me',
    description: 'Карточка текущего пользователя',
} as const satisfies RouterDescription;

export namespace currentUserInfo {
    export type Types = {
        Reply: {
            success: true,
            item: User,
        } | RouterErrorResponse,
    };
}

export const dev_mode_process_exit = {
    method: 'post',
    url: '/dev_mode_process_exit',
    description: 'Роутер для dev-режима. Роут для принудительного завершения процесса который запустил текущий backend.',
    roles: [],
} as const satisfies RouterDescription;

export namespace dev_mode_process_exit {
    export type Types = {
        Body: object,
        Reply: string,
    };
}
