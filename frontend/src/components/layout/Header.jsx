import {
    useLocation,
} from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import UserAvatar from './UserAvatar';

const pageTitles = {
    '/dashboard': 'Dashboard',
    '/employees': 'Employees',
    '/attendance': 'Attendance',
    '/leave': 'Leave Management',
    '/payroll': 'Payroll',
    '/parameters': 'Parameters',
    '/reports': 'Reports',
    '/settings': 'Settings',
};

function Header({
    toggleSidebar,
    openMobile,
}) {
    const location = useLocation();

    const { user } = useAuth();

    const {
        theme,
        toggleTheme,
    } = useTheme();

    const pageTitle =
        pageTitles[location.pathname] ||
        'Soul Talker';

    return (
        <header className="app-header">
            <div className="header-left">
                <button
                    type="button"
                    className="header-menu-button desktop-menu-button"
                    onClick={toggleSidebar}
                    aria-label="Toggle sidebar"
                >
                    ☰
                </button>

                <button
                    type="button"
                    className="header-menu-button mobile-menu-button"
                    onClick={openMobile}
                    aria-label="Open navigation"
                >
                    ☰
                </button>

                <div>
                    <h1>{pageTitle}</h1>

                    <p>
                        Soul Talker Human Resource
                        Management System
                    </p>
                </div>
            </div>

            <div className="header-actions">
                <button
                    type="button"
                    className="theme-toggle"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                    title={
                        theme === 'dark'
                            ? 'Use light mode'
                            : 'Use dark mode'
                    }
                >
                    {theme === 'dark'
                        ? '☀'
                        : '☾'}
                </button>

                <div className="header-user">
                    <UserAvatar
                        user={user}
                        size="small"
                    />

                    <div className="header-user-text">
                        <strong>
                            {user?.emp_name ||
                                user?.user_id}
                        </strong>

                        <span>
                            {user?.designation ||
                                user?.user_type}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;