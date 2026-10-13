
import { useState } from 'react';
import api from '../../api/api';
import '../../styles/reset-user-password.css';

export default function ResetUserPassword({
    account,
    onClose,
    onSuccess,
}) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must contain at least 8 characters.');
            return;
        }

        if (new TextEncoder().encode(password).length > 1024) {
            setError('Password is too long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSaving(true);

        try {
            await api.put(
                `/user-management/accounts/${account.id}/reset-password`,
                { new_password: password }
            );

            setPassword('');
            setConfirmPassword('');
            onSuccess?.('Password reset successfully.');
            onClose?.();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to reset password.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="reset-password-overlay">
            <div
                className="reset-password-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reset-password-title"
            >
                <div className="reset-password-header">
                    <h2 id="reset-password-title">
                        Reset User Password
                    </h2>
                    <button
                        type="button"
                        className="reset-password-close"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="reset-password-body">
                        <div className="reset-password-account">
                            <strong>{account.user_id}</strong>
                            <span>
                                {account.employee_name || 'Employee'}
                            </span>
                        </div>

                        {error && (
                            <div
                                className="reset-password-error"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        <div className="reset-password-field">
                            <label htmlFor="reset-new-password">
                                New Password *
                            </label>
                            <input
                                id="reset-new-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                minLength={8}
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <div className="reset-password-field">
                            <label htmlFor="reset-confirm-password">
                                Confirm Password *
                            </label>
                            <input
                                id="reset-confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                }
                                minLength={8}
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <label className="reset-password-show">
                            <input
                                type="checkbox"
                                checked={showPassword}
                                onChange={(event) =>
                                    setShowPassword(event.target.checked)
                                }
                            />
                            Show passwords
                        </label>

                        <p className="reset-password-note">
                            Minimum 8 characters. Existing sessions
                            must be revoked separately until session
                            invalidation is implemented.
                        </p>
                    </div>

                    <div className="reset-password-footer">
                        <button
                            type="button"
                            className="reset-password-cancel"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="reset-password-submit"
                            disabled={saving}
                        >
                            {saving ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
