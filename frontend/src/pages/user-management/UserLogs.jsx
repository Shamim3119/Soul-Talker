import { useCallback, useEffect, useState } from 'react';
import api from '../../api/api';
import '../../styles/user-logs.css';

const PAGE_SIZE = 20;

const eventLabels = {
    login_success: 'Login Success',
    login_failed: 'Login Failed',
    logout: 'Logout',
    session_expired: 'Session Expired',
    forced_logout: 'Forced Logout',
};

const formatDateTime = (value) => {
    if (!value) return '-';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleString('en-GB', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
          });
};

const UserLogs = () => {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [eventType, setEventType] = useState('');
    const [userId, setUserId] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [appliedFilters, setAppliedFilters] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadLogs = useCallback(async (signal) => {
        setLoading(true);

        try {
            const response = await api.get('/user-management/logs', {
                params: {
                    page,
                    limit: PAGE_SIZE,
                    ...appliedFilters,
                },
                signal,
            });

            setLogs(response.data.data || []);
            setTotal(response.data.pagination?.total || 0);
            setTotalPages(
                Math.max(1, response.data.pagination?.total_pages || 1)
            );
            setError('');
        } catch (err) {
            if (err.code === 'ERR_CANCELED') return;

            setLogs([]);

            if (err.response?.status === 403) {
                setError('You do not have permission to view user logs.');
            } else if (err.response?.status === 401) {
                setError('Your session has expired. Please sign in again.');
            } else {
                setError('Unable to load user logs.');
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [page, appliedFilters]);

    useEffect(() => {
        const controller = new AbortController();

        loadLogs(controller.signal);

        return () => controller.abort();
    }, [loadLogs]);

    const applyFilters = (event) => {
        event.preventDefault();

        if (dateFrom && dateTo && dateFrom > dateTo) {
            setError('Start date cannot be after end date.');
            return;
        }

        setPage(1);
        setAppliedFilters({
            ...(eventType && { event_type: eventType }),
            ...(userId.trim() && { user_id: userId.trim() }),
            ...(dateFrom && { date_from: dateFrom }),
            ...(dateTo && { date_to: dateTo }),
        });
    };

    const resetFilters = () => {
        setEventType('');
        setUserId('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
        setAppliedFilters({});
    };

    return (
        <div className="user-logs-page">
            <div className="user-logs-header">
                <div>
                    <h1>User Logs</h1>
                    <p>Authentication history and user security events.</p>
                </div>

                <div className="user-logs-count">
                    Total Records: <strong>{total}</strong>
                </div>
            </div>

            <form className="user-logs-filters" onSubmit={applyFilters}>
                <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                >
                    <option value="">All Events</option>
                    {Object.entries(eventLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder="User ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    maxLength={100}
                />

                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    aria-label="Start date"
                />

                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    aria-label="End date"
                />

                <button type="submit">Search</button>

                <button
                    type="button"
                    className="user-logs-reset"
                    onClick={resetFilters}
                >
                    Reset
                </button>
            </form>

            <div className="user-logs-panel">
                {loading ? (
                    <div className="user-logs-message">Loading logs...</div>
                ) : error ? (
                    <div className="user-logs-message user-logs-error" role="alert">
                        {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="user-logs-message">
                        No matching records found.
                    </div>
                ) : (
                    <div className="user-logs-table-wrapper">
                        <table className="user-logs-table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>User ID</th>
                                    <th>Employee</th>
                                    <th>Event</th>
                                    <th>IP Address</th>
                                    <th>Browser / Device</th>
                                </tr>
                            </thead>

                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id}>
                                        <td>{formatDateTime(log.event_at)}</td>
                                        <td>
                                            {log.user_id ||
                                                log.attempted_user_id ||
                                                '-'}
                                        </td>
                                        <td>{log.employee_name || '-'}</td>
                                        <td>
                                            <span
                                                className={`user-logs-event event-${log.event_type}`}
                                            >
                                                {eventLabels[log.event_type] ||
                                                    log.event_type}
                                            </span>
                                        </td>
                                        <td>{log.ip_address || '-'}</td>
                                        <td
                                            className="user-logs-agent"
                                            title={log.user_agent || ''}
                                        >
                                            {log.user_agent || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="user-logs-pagination">
                <span>
                    Page {page} of {totalPages}
                </span>

                <div>
                    <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        Previous
                    </button>

                    <button
                        type="button"
                        disabled={page >= totalPages || loading}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserLogs;