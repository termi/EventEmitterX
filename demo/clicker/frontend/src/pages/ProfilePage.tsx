'use strict';

import { currentUserStore } from "../../../logic/currentUserStore.ts";

export default function ProfilePage() {
    currentUserStore

    return (
        <div className="page-content">
            <h1 className="page-title">Profile</h1>
            <p className="page-description">This is your profile page.</p>
        </div>
    );
}
