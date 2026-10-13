
import { useState } from 'react';
import api from '../../api/api';
import '../../styles/edit-user-account.css';

const userTypes = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Sub Admin' },
    { id: 3, name: 'Sub User' },
    { id: 4, name: 'Employe' },
];

export default function EditUserAccount({
    account,
    onClose,
    onUpdated,
}) {
    const [form, setForm] = useState({
        user_id: account.user_id || '',
        user_type_id: String(account.user_type_id ?? 3),
        inactive: String(account.inactive ?? 0),
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const updateField = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const loginId = form.user_id.trim();

        if (!/^[A-Za-z0-9._-]{1,45}$/.test(loginId)) {
            setError('Enter a valid Login User ID.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            await api.put(
                `/user-management/accounts/${account.id}`,
                {
                    user_id: loginId,
                    user_type_id: Number(form.user_type_id),
                    inactive: Number(form.inactive),
                }
            );

            onUpdated?.();
            onClose?.();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to update user account.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="edit-user-overlay">
            <div
                className="edit-user-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-user-title"
            >
                <div className="edit-user-header">
                    <h2 id="edit-user-title">
                        Edit User Account
                    </h2>

                    <button
                        type="button"
                        className="edit-user-close"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="edit-user-body">
                        {error && (
                            <div
                                className="edit-user-error"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        <div className="edit-user-field">
                            <label>Employee</label>
                            <input
                                type="text"
                                value={account.employee_name || '-'}
                                disabled
                            />
                        </div>

                        <div className="edit-user-field">
                            <label htmlFor="edit-login-id">
                                Login User ID *
                            </label>
                            <input
                                id="edit-login-id"
                                type="text"
                                maxLength={45}
                                required
                                value={form.user_id}
                                onChange={(event) =>
                                    updateField(
                                        'user_id',
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="edit-user-grid">
                            <div className="edit-user-field">
                                <label htmlFor="edit-user-type">
                                    User Type *
                                </label>

                                <select
                                    id="edit-user-type"
                                    value={form.user_type_id}
                                    onChange={(event) =>
                                        updateField(
                                            'user_type_id',
                                            event.target.value
                                        )
                                    }
                                >
                                    {userTypes.map((type) => (
                                        <option
                                            key={type.id}
                                            value={type.id}
                                        >
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="edit-user-field">
                                <label htmlFor="edit-user-status">
                                    Account Status *
                                </label>

                                <select
                                    id="edit-user-status"
                                    value={form.inactive}
                                    onChange={(event) =>
                                        updateField(
                                            'inactive',
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="0">Active</option>
                                    <option value="1">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <p className="edit-user-note">
                            Password and access permissions are
                            managed separately. Deactivating an
                            account will terminate its tracked
                            active sessions.
                        </p>
                    </div>

                    <div className="edit-user-footer">
                        <button
                            type="button"
                            className="edit-user-cancel"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="edit-user-save"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
