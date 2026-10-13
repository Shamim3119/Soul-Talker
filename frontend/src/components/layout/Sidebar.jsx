import {
    NavLink,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import { useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';

import UserAvatar from './UserAvatar';

/*
 * Temporary icon mapping.
 *
 * access_modules.icon contains semantic names such as:
 * dashboard, users, reports, etc.
 *
 * Later we can replace these characters with a proper icon library
 * without changing the navigation logic.
 */
const getMenuIcon = (icon, code) => {
    const icons = {
        dashboard: '⌂',
        users: '♙',
        attendance: '◷',
        leave: '▣',
        payroll: '৳',
        reports: '▤',
        settings: '⚙',
    };

    if (icon && icons[icon]) {
        return icons[icon];
    }

    if (code === 'dashboard') {
        return '⌂';
    }

    if (code === 'employee-management') {
        return '♙';
    }

    if (code === 'attendance') {
        return '◷';
    }

    if (code === 'leave') {
        return '▣';
    }

    if (code === 'payroll') {
        return '৳';
    }

    if (code === 'reports') {
        return '▤';
    }

    return '•';
};

/*
 * Determine whether the current URL belongs to this module
 * or one of its descendants.
 */
const moduleContainsPath = (module, pathname) => {
    if (module.route) {
        if (pathname === module.route) {
            return true;
        }

        if (
            module.route !== '/' &&
            pathname.startsWith(`${module.route}/`)
        ) {
            return true;
        }
    }

    return (module.children || []).some((child) =>
        moduleContainsPath(child, pathname)
    );
};

/*
 * Sidebar only displays modules explicitly marked for sidebar use.
 *
 * A child can still exist in the navigation tree for tabs even when
 * show_in_sidebar is false.
 */
const getSidebarChildren = (module) => {
    return (module.children || []).filter(
        (child) => child.show_in_sidebar
    );
};

function SidebarMenuItem({
    item,
    collapsed,
    closeMobile,
    level = 0,
}) {
    const location = useLocation();

    const sidebarChildren = (item.children || []).filter(
        (child) => child.show_in_sidebar
    );

    const hasChildren = sidebarChildren.length > 0;

    const routeIsInside = moduleContainsPath(
        item,
        location.pathname
    );

    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (routeIsInside) {
            setExpanded(true);
        }
    }, [routeIsInside]);

    // Parent/container menu
    if (hasChildren) {
        return (
            <div
                className={`sidebar-menu-group ${
                    expanded ? 'expanded' : ''
                }`}
            >
                <button
                    type="button"
                    className={`sidebar-link sidebar-menu-toggle ${
                        routeIsInside ? 'active' : ''
                    }`}
                    onClick={() => {
                        setExpanded((current) => !current);
                    }}
                    title={
                        collapsed
                            ? item.name
                            : undefined
                    }
                >
                    <span className="sidebar-link-icon">
                        {getMenuIcon(
                            item.icon,
                            item.code
                        )}
                    </span>

                    {!collapsed && (
                        <>
                            <span className="sidebar-link-label">
                                {item.name}
                            </span>

                            <span className="sidebar-menu-arrow">
                                {expanded ? '▲' : '▼'}
                            </span>
                        </>
                    )}
                </button>

                {expanded && !collapsed && (
                    <div className="sidebar-submenu">
                        {sidebarChildren.map((child) => (
                            <SidebarMenuItem
                                key={child.id}
                                item={child}
                                collapsed={collapsed}
                                closeMobile={closeMobile}
                                level={level + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Normal clickable menu
    if (item.route) {
        return (
            <NavLink
                to={item.route}
                onClick={closeMobile}
                title={
                    collapsed
                        ? item.name
                        : undefined
                }
                className={({ isActive }) =>
                    `sidebar-link ${
                        level > 0
                            ? 'sidebar-child-link'
                            : ''
                    } ${
                        isActive
                            ? 'active'
                            : ''
                    }`
                }
            >
                <span className="sidebar-link-icon">
                    {level === 0
                        ? getMenuIcon(
                              item.icon,
                              item.code
                          )
                        : '•'}
                </span>

                {!collapsed && (
                    <span className="sidebar-link-label">
                        {item.name}
                    </span>
                )}
            </NavLink>
        );
    }

    return null;
}

function Sidebar({
    collapsed,
    mobileOpen,
    closeMobile,
}) {
    const navigate = useNavigate();

    const {
        user,
        logout,
    } = useAuth();

    const {
        navigation,
        loading: navigationLoading,
        error: navigationError,
    } = useNavigation();

    const handleLogout = async () => {
        const success = await logout();

        if (success) {
            navigate('/login', {
                replace: true,
            });
        }
    };

    /*
     * Only top-level modules marked for sidebar display
     * are rendered.
     */
    const sidebarNavigation = navigation.filter(
        (item) => item.show_in_sidebar
    );

    return (
        <>
            {mobileOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop"
                    onClick={closeMobile}
                    aria-label="Close navigation"
                />
            )}

            <aside
                className={[
                    'app-sidebar',
                    collapsed
                        ? 'app-sidebar-collapsed'
                        : '',
                    mobileOpen
                        ? 'app-sidebar-mobile-open'
                        : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                <div className="sidebar-brand">
                    <div className="sidebar-brand-logo">
                        ST
                    </div>

                    {!collapsed && (
                        <div className="sidebar-brand-text">
                            <strong>
                                Soul Talker
                            </strong>

                            <span>
                                HR Management
                            </span>
                        </div>
                    )}
                </div>

                <div className="sidebar-user">
                    <UserAvatar
                        user={user}
                        size="medium"
                    />

                    {!collapsed && (
                        <div className="sidebar-user-info">
                            <strong>
                                {user?.emp_name ||
                                    user?.user_id ||
                                    'User'}
                            </strong>

                            <span>
                                {user?.designation ||
                                    'No designation'}
                            </span>

                            <small>
                                {user?.department ||
                                    'No department'}
                            </small>
                        </div>
                    )}
                </div>

                <nav className="sidebar-navigation">
                    {navigationLoading && !collapsed && (
                        <div className="sidebar-navigation-status">
                            Loading menu...
                        </div>
                    )}

                    {!navigationLoading &&
                        navigationError &&
                        !collapsed && (
                            <div className="sidebar-navigation-status">
                                Unable to load menu
                            </div>
                        )}

                    {!navigationLoading &&
                        !navigationError &&
                        sidebarNavigation.map((item) => (
                            <SidebarMenuItem
                                key={item.id}
                                item={item}
                                collapsed={collapsed}
                                closeMobile={closeMobile}
                            />
                        ))}
                </nav>

                <div className="sidebar-footer">
                    <button
                        type="button"
                        className="sidebar-logout"
                        onClick={handleLogout}
                        title={
                            collapsed
                                ? 'Logout'
                                : undefined
                        }
                    >
                        <span className="sidebar-link-icon">
                            ↪
                        </span>

                        {!collapsed && (
                            <span>Logout</span>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;