import { useCallback, useEffect, useState } from 'react';
import api from '../../api/api';
import '../../styles/user-accounts.css';
import CreateUserAccount from './CreateUserAccount';
import EditUserAccount from './EditUserAccount';
import ResetUserPassword from './ResetUserPassword';
import ManageUserAccess from './ManageUserAccess';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 10;

const formatDate = (value) => {
    if (!value) return '-';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          });
};

const UserAccounts = () => {

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);

    const [resetPasswordAccount, setResetPasswordAccount] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const [manageAccessAccount, setManageAccessAccount] = useState(null);

    const [refreshKey, setRefreshKey] = useState(0);

    const [accounts, setAccounts] = useState([])


    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        total_pages: 1,
    });

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');


    const { hasPermission } = useAuth();

    const canCreate = hasPermission(
        'user-management.accounts.create'
    );

    const canEdit = hasPermission(
        'user-management.accounts.update'
    );

    const canResetPassword = hasPermission(
        'user-management.accounts.reset-password'
    );

    const canManageAccess = hasPermission(
        'user-management.accounts.manage-access'
    );


    const loadAccounts = useCallback(async (signal) => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get(
                '/user-management/accounts',
                {
                    params: {
                        page,
                        limit: PAGE_SIZE,
                        ...filters,
                    },
                    signal,
                }
            );

            setAccounts(
                Array.isArray(response.data.data)
                    ? response.data.data
                    : []
            );

            setPagination({
                total: response.data.pagination?.total ?? 0,
                total_pages: Math.max(
                    1,
                    response.data.pagination?.total_pages ?? 1
                ),
            });
        } catch (err) {
            if (err.code === 'ERR_CANCELED') return;

            setAccounts([]);

            if (err.response?.status === 403) {
                setError(
                    'You do not have permission to view user accounts.'
                );
            } else if (err.response?.status === 401) {
                setError(
                    'Your session has expired. Please sign in again.'
                );
            } else {
                setError('Unable to load user accounts.');
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [page, filters]);

    useEffect(() => {
        const controller = new AbortController();

        loadAccounts(controller.signal);

        return () => controller.abort();
    }, [loadAccounts, refreshKey]);

    const handleSearch = (event) => {
        event.preventDefault();

        setPage(1);
        setFilters({
            search: search.trim(),
            status,
        });
    };

    const handleReset = () => {
        setSearch('');
        setStatus('all');
        setPage(1);
        setFilters({
            search: '',
            status: 'all',
        });
    };

    return (
        <div className="user-accounts-page">
            <div className="user-accounts-header">

                
                <div>
                    <h1>User Accounts</h1>
                    <p>
                        Manage HRM login accounts and access permissions.
                    </p>
                </div>

                

                <div className="user-accounts-header-actions">
                    {canCreate && (
                        <button
                            type="button"
                            className="user-accounts-create-btn"
                            onClick={() => setShowCreateForm(true)}
                        >
                            + Create User
                        </button>
                    )}
                    <div className="user-accounts-total">
                        Total Accounts: <strong>{pagination.total}</strong>
                    </div>
                </div>
            </div>

            <form
                className="user-accounts-filters"
                onSubmit={handleSearch}
            >
                <input
                    type="text"
                    placeholder="Search User ID or Employee"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    maxLength={100}
                />

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>

                <button type="submit">
                    Search
                </button>

                <button
                    type="button"
                    className="user-accounts-reset"
                    onClick={handleReset}
                >
                    Reset
                </button>
            </form>

            <div className="user-accounts-panel">
                {loading ? (
                    <div className="user-accounts-message">
                        Loading accounts...
                    </div>
                ) : error ? (
                    <div
                        className="user-accounts-message user-accounts-error"
                        role="alert"
                    >
                        {error}
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="user-accounts-message">
                        No matching user accounts found.
                    </div>
                ) : (
                    <div className="user-accounts-table-wrapper">
                        <table className="user-accounts-table">
                            <thead>
                                <tr>
                                    <th>User ID</th>
                                    <th>Employee Name</th>
                                    <th>User Type</th>
                                    <th>Account Status</th>
                                    <th>Super Admin</th>
                                    <th>Permissions</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {accounts.map((account) => (
                                    <tr key={account.id}>
                                        <td>
                                            <strong>{account.user_id}</strong>
                                        </td>

                                        <td>
                                            {account.employee_name || '-'}
                                        </td>

                                        <td>
                                            {account.user_type_id ?? '-'}
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    Number(account.inactive) === 0
                                                        ? 'user-accounts-badge active'
                                                        : 'user-accounts-badge inactive'
                                                }
                                            >
                                                {Number(account.inactive) === 0
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </td>

                                        <td>
                                            {Number(account.is_super_admin) === 1
                                                ? 'Yes'
                                                : 'No'}
                                        </td>

                                        <td>
                                            {Number(account.is_super_admin) === 1
                                                ? 'Full Access'
                                                : account.permissions_count}
                                        </td>

                                        <td>
                                            {formatDate(account.create_date)}
                                        </td>
                                        <td>
                                            {Number(account.is_super_admin) === 1 ? (
                                                <span className="user-accounts-protected">
                                                    Protected
                                                </span>
                                            ) : (

                                                <div className="user-accounts-row-actions">
                                                     {canEdit && (
                                                        <button
                                                            type="button"
                                                            className="user-accounts-edit-btn"
                                                            onClick={() => setEditingAccount(account)}
                                                        >
                                                            Edit
                                                        </button>
                                                     )}
                                                     {canResetPassword && (
                                                        <button
                                                            type="button"
                                                            className="user-accounts-reset-password-btn"
                                                            onClick={() => {
                                                                setSuccessMessage('');
                                                                setResetPasswordAccount(account);
                                                            }}
                                                        >
                                                            Reset Password
                                                        </button>
                                                    )}
                                                    {canManageAccess && (
                                                        <button
                                                            type="button"
                                                            className="user-accounts-manage-access-btn"
                                                            onClick={() => setManageAccessAccount(account)}
                                                            >
                                                            Manage Access
                                                        </button>
                                                    )}
                                                </div>


                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="user-accounts-pagination">
                <span>
                    Page {page} of {pagination.total_pages}
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
                        disabled={
                            page >= pagination.total_pages || loading
                        }
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>

            {canCreate && showCreateForm && (
                <CreateUserAccount
                    onClose={() => setShowCreateForm(false)}
                    onCreated={() => {
                        setPage(1);
                        setRefreshKey((value) => value + 1);
                    }}
                />
            )}


            {canEdit && editingAccount && (
                <EditUserAccount
                    account={editingAccount}
                    onClose={() => setEditingAccount(null)}
                    onUpdated={() => {
                        setRefreshKey((value) => value + 1);
                    }}
                />
            )}


            {canResetPassword && resetPasswordAccount && (
                <ResetUserPassword
                    account={resetPasswordAccount}
                    onClose={() => setResetPasswordAccount(null)}
                    onSuccess={(message) => {
                        setSuccessMessage(message);
                    }}
                />
            )}

            {successMessage && (
                <div className="user-accounts-success" role="status">
                    {successMessage}
                </div>
            )}




            {canManageAccess && manageAccessAccount && (
                <ManageUserAccess
                    account={manageAccessAccount}
                    onClose={() => setManageAccessAccount(null)}
                    onSuccess={(message) => {
                        setSuccessMessage(message);
                        setRefreshKey((previous) => previous + 1);
                    }}
                />
            )}

        </div>
    );
};

export default UserAccounts;