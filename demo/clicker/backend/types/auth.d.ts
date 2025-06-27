//
import type { UserRole } from "@prisma/client";

export namespace currentAuthUser {
    export type UserPayload = {
        userId: number,
        userRole: UserRole,
        userName: string,
        userEmail: string,
    }
}
