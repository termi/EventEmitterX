'use strict';

import { currentUserStore } from "../../../logic/currentUserStore.ts";

export default function ProfilePage() {
    const { userName, userId, userRole } = currentUserStore;

    return (
        <div className="page-content">
            <h1 className="page-title">Profile</h1>
            <p className="page-description" data-user-id={userId} data-user-role={userRole}>
                Вы: {userName}
            </p>
        </div>
    );
}
