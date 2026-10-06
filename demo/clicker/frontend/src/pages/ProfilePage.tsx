'use strict';

import { useAuth } from "../hooks/useAuth";

export default function ProfilePage() {
    const { userName, userId, userRole } = useAuth();

    return (
        <div className="page-content">
            <span className="eyebrow">Ваш аккаунт</span>
            <h1 className="page-title">Profile</h1>
            <p className="page-description">Информация об игроке и его роли в демонстрации.</p>
            <div className="profile-card" data-user-id={userId} data-user-role={userRole}>
                <span className="profile-avatar" aria-hidden="true">{userName?.slice(0, 1).toUpperCase() || '?'}</span>
                <div>
                    <h2>{userName}</h2>
                    <p>Игрок #{userId}</p>
                    <span className="profile-badge">{userRole === 'ADMIN' ? 'Администратор' : 'Игрок'}</span>
                </div>
            </div>
        </div>
    );
}
