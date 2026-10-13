
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

import api, {
    loadCsrfToken,
    clearCsrfToken,
    subscribeToAuthExpiration,
} from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [permissionsLoading, setPermissionsLoading] = useState(true);

    const clearAuthentication = useCallback(() => {
        setUser(null);
        setPermissions([]);
        clearCsrfToken();
    }, []);


    /*
    |--------------------------------------------------------------------------
    | Automatically Clear Revoked Authentication
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const unsubscribe = subscribeToAuthExpiration(() => {
            clearAuthentication();
        });

        return unsubscribe;
    }, [clearAuthentication]);


    /*
    |--------------------------------------------------------------------------
    | Load Current User and Permissions
    |--------------------------------------------------------------------------
    */

    const loadUser = useCallback(async () => {
        setLoading(true);
        setPermissionsLoading(true);
        setPermissions([]);

        try {
            const response = await api.get('/auth/me');
            const authenticatedUser = response.data?.user;

            if (!authenticatedUser?.id) {
                clearAuthentication();
                return null;
            }

            // Load permissions from the dedicated backend endpoint.
            // Never derive action permissions from navigation menus.
            try {
                const permissionResponse = await api.get(
                    '/auth/my-permissions'
                );

                const permissionData =
                    permissionResponse.data?.data;

                if (
                    !permissionResponse.data?.success ||
                    !permissionData
                ) {
                    throw new Error(
                        'Invalid permission API response.'
                    );
                }

                const permissionCodes = Array.isArray(
                    permissionData.permissions
                )
                    ? permissionData.permissions
                    : [];

                setPermissions(permissionCodes);

                // Use the server-confirmed Super Admin status.
                setUser({
                    ...authenticatedUser,
                    is_super_admin:
                        permissionData.is_super_admin === true
                            ? 1
                            : 0,
                });
            } catch (permissionError) {
                console.error(
                    'Unable to load permissions.',
                    permissionError
                );

                // Fail closed: do not grant action permissions
                // when the permission API fails.
                setPermissions([]);

                setUser({
                    ...authenticatedUser,
                    is_super_admin: 0,
                });
            }

            try {
                await loadCsrfToken();
            } catch (csrfError) {
                clearCsrfToken();

                console.error(
                    'Unable to initialize CSRF protection.',
                    csrfError
                );
            }

            return authenticatedUser;
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error(
                    'Unable to load authenticated user.',
                    error
                );
            }

            clearAuthentication();
            return null;
        } finally {
            setPermissionsLoading(false);
            setLoading(false);
        }
    }, [clearAuthentication]);

    /*
    |--------------------------------------------------------------------------
    | Initial Authentication Check
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    /*
    |--------------------------------------------------------------------------
    | Refresh User and Permissions
    |--------------------------------------------------------------------------
    */

    const refreshUser = useCallback(async () => {
        return loadUser();
    }, [loadUser]);

    /*
    |--------------------------------------------------------------------------
    | Permission Helper
    |--------------------------------------------------------------------------
    */

    const hasPermission = useCallback(
        (permissionCode) => {
            if (!user || loading || permissionsLoading) {
                return false;
            }

            if (Number(user.is_super_admin) === 1) {
                return true;
            }

            return permissions.includes(permissionCode);
        },
        [user, permissions, loading, permissionsLoading]
    );

    /*
    |--------------------------------------------------------------------------
    | Logout
    |--------------------------------------------------------------------------
    */

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');

            clearAuthentication();
            return true;
        } catch (error) {
            if (error.response?.status === 401) {
                clearAuthentication();
                return true;
            }

            // Preserve authentication when logout fails,
            // such as an unexpected CSRF failure.
            console.error(
                'Logout request failed.',
                error
            );

            return false;
        }
    }, [clearAuthentication]);

    const value = {
        user,
        loading,
        permissionsLoading,
        authenticated: Boolean(user),
        permissions,
        hasPermission,
        refreshUser,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth must be used inside AuthProvider'
        );
    }

    return context;
}
