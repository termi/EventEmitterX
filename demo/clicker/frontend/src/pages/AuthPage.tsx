'use strict';

import AuthForm from '../components/AuthForm';
import './AuthPage.css';

export default function AuthPage() {
    return (
        <div className="auth-page">
            <div className="auth-container">
                <section className="auth-intro">
                    <span className="eyebrow">EventSignal demo · Clicker</span>
                    <h1>Каждый клик считается.</h1>
                    <p>Выберите раунд, следите за временем и набирайте очки. Ваш результат обновляется прямо во время игры.</p>
                    <ol className="auth-steps">
                        <li><span>01</span> Войдите в свой аккаунт</li>
                        <li><span>02</span> Выберите активный раунд</li>
                        <li><span>03</span> Кликайте до окончания таймера</li>
                    </ol>
                </section>
                <AuthForm />
            </div>
        </div>
    );
}
