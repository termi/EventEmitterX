'use strict';

import '../../polyfills';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AppLayout from "./layouts/AppLayout";
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import DemoPage from './pages/DemoPage';

import './config/globals';
import './registerComponents';

console.log((globalThis as unknown as { __BACKEND_PORT__?: string }).__BACKEND_PORT__);

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route element={<AppLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<DemoPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
