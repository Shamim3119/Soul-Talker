import {
    useEffect,
    useState,
} from 'react';

import {
    Outlet,
} from 'react-router-dom';

import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

import '../styles/layout.css';

function DashboardLayout() {
    const [collapsed, setCollapsed] =
        useState(() => {
            return (
                localStorage.getItem(
                    'soul-sidebar-collapsed'
                ) === 'true'
            );
        });

    const [mobileOpen, setMobileOpen] =
        useState(false);

    useEffect(() => {
        localStorage.setItem(
            'soul-sidebar-collapsed',
            String(collapsed)
        );
    }, [collapsed]);

    return (
        <div
            className={[
                'app-shell',
                collapsed
                    ? 'sidebar-is-collapsed'
                    : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <Sidebar
                collapsed={collapsed}
                mobileOpen={mobileOpen}
                closeMobile={() =>
                    setMobileOpen(false)
                }
            />

            <div className="app-main">
                <Header
                    toggleSidebar={() =>
                        setCollapsed(
                            (current) => !current
                        )
                    }
                    openMobile={() =>
                        setMobileOpen(true)
                    }
                />

                <main className="app-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default DashboardLayout;