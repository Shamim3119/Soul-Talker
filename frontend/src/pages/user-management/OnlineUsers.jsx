
import { useCallback, useEffect, useState } from 'react';

import api from '../../api/api';

import '../../styles/online-users.css';

const REFRESH_INTERVAL = 60000;

const formatDateTime = (value) => {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
};

const OnlineUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [currentUserId, setCurrentUserId] = useState(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const [selectedSession, setSelectedSession] = useState(null);
    const [terminatingSessionId, setTerminatingSessionId] = useState(null);
    const [actionMessage, setActionMessage] = useState('');
    const [actionError, setActionError] = useState('');

    const loadUsers = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) {
                setRefreshing(true);
            }

            const response = await api.get('/user-management/online');

            setUsers(
                Array.isArray(response.data?.data)
                    ? response.data.data
                    : []
            );

            setError('');
        } catch (err) {
            const status = err.response?.status;

            if (status === 403) {
                setError(
                    'You do not have permission to view online users.'
                );
            } else if (status === 401) {
                setError(
                    'Your session has expired. Please sign in again.'
                );
            } else {
                setError(
                    'Unable to load online users. Please try again.'
                );
            }

            setUsers([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        let active = true;

        const loadCurrentUser = async () => {
            try {
                const response = await api.get('/auth/me');

                if (!active) return;

                const currentUser = response.data?.user;

                setCurrentUserId(
                    currentUser?.user_id
                        ? String(currentUser.user_id)
                        : null
                );

                // Requires is_super_admin to be included in /auth/me.
                setIsSuperAdmin(
                    Number(currentUser?.is_super_admin) === 1
                );
            } catch (err) {
                if (active) {
                    setCurrentUserId(null);
                    setIsSuperAdmin(false);
                }
            }
        };

        loadCurrentUser();
        loadUsers();

        const intervalId = setInterval(() => {
            loadUsers();
        }, REFRESH_INTERVAL);

        return () => {
            active = false;
            clearInterval(intervalId);
        };
    }, [loadUsers]);

    const handleForceLogout = async () => {
        if (!selectedSession || terminatingSessionId !== null) {
            return;
        }

        const sessionId = selectedSession.session_id;

        setTerminatingSessionId(sessionId);
        setActionMessage('');
        setActionError('');

        try {
            await api.post(
                `/user-management/online/${sessionId}/force-logout`
            );

            setSelectedSession(null);

            setActionMessage(
                `Session for ${selectedSession.employee_name || selectedSession.user_id} was terminated successfully.`
            );

            await loadUsers(true);
        } catch (err) {
            setActionError(
                err.response?.data?.message ||
                'Unable to terminate the selected session.'
            );
        } finally {
            setTerminatingSessionId(null);
        }
    };

    const onlineCount = users.filter(
        (user) => user.status === 'online'
    ).length;

    const idleCount = users.filter(
        (user) => user.status === 'idle'
    ).length;

    return (
        <div className="online-users-page">
            <div className="online-users-header">
                <div>
                    <h1>Online Users</h1>
                    <p>
                        View authenticated user sessions
                        and recent activity.
                    </p>
                </div>

                <button
                    type="button"
                    className="online-users-refresh"
                    onClick={() => loadUsers(true)}
                    disabled={refreshing || loading}
                >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {actionMessage && (
                <div className="online-users-action-success" role="status">
                    {actionMessage}
                </div>
            )}

            {actionError && (
                <div className="online-users-action-error" role="alert">
                    {actionError}
                </div>
            )}

            {!error && !loading && (
                <div className="online-users-summary">
                    <div className="online-users-summary-card">
                        <span>Total Sessions</span>
                        <strong>{users.length}</strong>
                    </div>

                    <div className="online-users-summary-card">
                        <span>Recently Active</span>
                        <strong>{onlineCount}</strong>
                    </div>

                    <div className="online-users-summary-card">
                        <span>Idle Sessions</span>
                        <strong>{idleCount}</strong>
                    </div>
                </div>
            )}

            <div className="online-users-panel">
                {loading ? (
                    <div className="online-users-message">
                        Loading online users...
                    </div>
                ) : error ? (
                    <div
                        className="online-users-message online-users-error"
                        role="alert"
                    >
                        {error}
                    </div>
                ) : users.length === 0 ? (
                    <div className="online-users-message">
                        No active sessions found.
                    </div>
                ) : (
                    <div className="online-users-table-wrapper">
                        <table className="online-users-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>User ID</th>
                                    <th>Login Time</th>
                                    <th>Last Activity</th>
                                    <th>IP Address</th>
                                    <th>Status</th>
                                    {isSuperAdmin && <th>Action</th>}
                                </tr>
                            </thead>

                            <tbody>
                                {users.map((user) => {
                                    const isOwnAccount =
                                        String(user.user_id) === currentUserId;

                                    return (
                                        <tr key={user.session_id}>
                                            <td>
                                                {user.employee_name || '-'}
                                            </td>

                                            <td>{user.user_id}</td>

                                            <td>
                                                {formatDateTime(user.login_at)}
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    user.last_activity_at
                                                )}
                                            </td>

                                            <td>
                                                {user.ip_address || '-'}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        user.status === 'online'
                                                            ? 'online-users-status online'
                                                            : 'online-users-status idle'
                                                    }
                                                >
                                                    {user.status === 'online'
                                                        ? 'Online'
                                                        : 'Idle'}
                                                </span>
                                            </td>

                                            {isSuperAdmin && (
                                                <td>
                                                    {isOwnAccount ? (
                                                        <span className="online-users-own-session">
                                                            Own Account
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="online-users-force-logout"
                                                            onClick={() => {
                                                                setSelectedSession(user);
                                                                setActionError('');
                                                                setActionMessage('');
                                                            }}
                                                            disabled={terminatingSessionId !== null}
                                                        >
                                                            Force Logout
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedSession && (
                <div
                    className="online-users-modal-backdrop"
                    role="presentation"
                >
                    <div
                        className="online-users-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="force-logout-title"
                    >
                        <h2 id="force-logout-title">
                            Confirm Force Logout
                        </h2>

                        <p>
                            Are you sure you want to terminate the session for{' '}
                            <strong>
                                {selectedSession.employee_name ||
                                    selectedSession.user_id}
                            </strong>
                            ?
                        </p>

                        <p>
                            The user will need to sign in again.
                        </p>

                        <div className="online-users-modal-actions">
                            <button
                                type="button"
                                className="online-users-modal-cancel"
                                onClick={() => setSelectedSession(null)}
                                disabled={terminatingSessionId !== null}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="online-users-force-logout"
                                onClick={handleForceLogout}
                                disabled={terminatingSessionId !== null}
                            >
                                {terminatingSessionId !== null
                                    ? 'Terminating...'
                                    : 'Confirm Force Logout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnlineUsers;
