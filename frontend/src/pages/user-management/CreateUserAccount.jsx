import { useEffect, useState } from 'react';
import api from '../../api/api';
import '../../styles/create-user-account.css';

const initialForm = {
    user_id: '',
    emp_id: '',
    user_type_id: '3',
    password: '',
    confirm_password: '',
    inactive: '0',
};

const userTypes = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Sub Admin' },
    { id: 3, name: 'Sub User' },
    { id: 4, name: 'Employe' },
];

export default function CreateUserAccount({ onClose, onCreated }) {
    const [form, setForm] = useState(initialForm);
    const [employees, setEmployees] = useState([]);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const loadEmployees = async () => {
            setLoadingEmployees(true);

            try {
                const response = await api.get(
                    '/user-management/accounts/available-employees',
                    {
                        params: { search: employeeSearch },
                        signal: controller.signal,
                    }
                );

                setEmployees(response.data.data || []);
            } catch (err) {
                if (err.code !== 'ERR_CANCELED') {
                    setError('Unable to load employees.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingEmployees(false);
                }
            }
        };

        const timer = setTimeout(loadEmployees, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [employeeSearch]);

    const updateForm = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));

        setError('');
    };

    const selectEmployee = (employee) => {
        setSelectedEmployee(employee);

        setForm((prev) => ({
            ...prev,
            emp_id: String(employee.id),
            user_id: employee.employee_code || '',
        }));

        setEmployeeSearch(
            `${employee.employee_code} - ${employee.employee_name}`
        );
        setEmployees([]);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!form.emp_id) {
            setError('Please select an employee.');
            return;
        }

        if (form.password.length < 8) {
            setError('Password must contain at least 12 characters.');
            return;
        }

        if (form.password !== form.confirm_password) {
            setError('Password confirmation does not match.');
            return;
        }

        setSaving(true);

        try {
            await api.post('/user-management/accounts', {
                user_id: form.user_id.trim(),
                emp_id: Number(form.emp_id),
                user_type_id: Number(form.user_type_id),
                password: form.password,
                inactive: Number(form.inactive),
            });

            onCreated?.();
            onClose?.();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to create user account.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="create-user-overlay">
            <div
                className="create-user-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-user-title"
            >
                <div className="create-user-header">
                    <h2 id="create-user-title">Create User Account</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="create-user-close"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="create-user-body">
                        {error && (
                            <div className="create-user-error">
                                {error}
                            </div>
                        )}

                        <div className="create-user-field">
                            <label htmlFor="employee-search">
                                Select Employee *
                            </label>

                            <input
                                id="employee-search"
                                type="text"
                                value={employeeSearch}
                                onChange={(e) => {
                                    setEmployeeSearch(e.target.value);
                                    setSelectedEmployee(null);
                                    updateForm('emp_id', '');
                                }}
                                placeholder="Search by employee name or ID"
                                autoComplete="off"
                            />

                            {loadingEmployees && (
                                <small>Searching employees...</small>
                            )}

                            {!selectedEmployee &&
                                employees.length > 0 && (
                                    <div className="create-user-results">
                                        {employees.map((employee) => (
                                            <button
                                                key={employee.id}
                                                type="button"
                                                onClick={() =>
                                                    selectEmployee(employee)
                                                }
                                            >
                                                <strong>
                                                    {employee.employee_code}
                                                </strong>
                                                {' — '}
                                                {employee.employee_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                        </div>

                        <div className="create-user-field">
                            <label htmlFor="create-login-id">
                                Login User ID *
                            </label>

                            <input
                                id="create-login-id"
                                type="text"
                                maxLength={45}
                                required
                                value={form.user_id}
                                onChange={(e) =>
                                    updateForm('user_id', e.target.value)
                                }
                            />
                        </div>

                        <div className="create-user-grid">
                            <div className="create-user-field">
                                <label htmlFor="create-user-type">
                                    User Type *
                                </label>

                                <select
                                    id="create-user-type"
                                    value={form.user_type_id}
                                    onChange={(e) =>
                                        updateForm(
                                            'user_type_id',
                                            e.target.value
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

                            <div className="create-user-field">
                                <label htmlFor="create-user-status">
                                    Account Status
                                </label>

                                <select
                                    id="create-user-status"
                                    value={form.inactive}
                                    onChange={(e) =>
                                        updateForm(
                                            'inactive',
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="0">Active</option>
                                    <option value="1">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="create-user-grid">
                            <div className="create-user-field">
                                <label htmlFor="create-password">
                                    Password *
                                </label>

                                <input
                                    id="create-password"
                                    type="password"
                                    minLength={8}
                                    required
                                    autoComplete="new-password"
                                    value={form.password}
                                    onChange={(e) =>
                                        updateForm(
                                            'password',
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="create-user-field">
                                <label htmlFor="create-confirm-password">
                                    Confirm Password *
                                </label>

                                <input
                                    id="create-confirm-password"
                                    type="password"
                                    minLength={12}
                                    required
                                    autoComplete="new-password"
                                    value={form.confirm_password}
                                    onChange={(e) =>
                                        updateForm(
                                            'confirm_password',
                                            e.target.value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <p className="create-user-note">
                            Password must contain at least 8 characters.
                            User permissions can be assigned separately.
                        </p>
                    </div>

                    <div className="create-user-footer">
                        <button
                            type="button"
                            className="create-user-cancel"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="create-user-submit"
                            disabled={saving}
                        >
                            {saving
                                ? 'Creating...'
                                : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}