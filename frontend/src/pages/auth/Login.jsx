import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import '../../styles/login.css';

import { useAuth } from '../../context/AuthContext';

function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { refreshUser } = useAuth();

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading) return;

        setError('');

        if (!username.trim() || !password) {
            setError('Please enter your username and password.');
            return;
        }

        setLoading(true);

        try {
            await api.post('/auth/login', {
                username: username.trim(),
                password,
            });

            await refreshUser();

            setPassword('');

            navigate('/dashboard', {
                replace: true,
            });
        } catch (err) {
            setPassword('');

            if (err.response?.status === 401) {
                setError('Invalid username or password.');
            } else if (err.response?.status === 429) {
                setError(
                    'Too many login attempts. Please try again later.'
                );
            } else {
                setError('Unable to sign in. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-page">
            <section className="brand-panel">
                <div className="brand-content">
                    <div className="brand-logo">ST</div>

                    <h1>Soul Talker</h1>

                    <p className="brand-title">
                        Human Resource Management System
                    </p>

                    <div className="welcome-text">
                        <h2>Welcome back</h2>

                        <p>
                            Manage employees, attendance, leave,
                            payroll and organizational operations
                            from one secure platform.
                        </p>
                    </div>
                </div>
            </section>

            <section className="form-panel">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Sign in</h2>

                        <p>
                            Enter your account credentials to continue.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="username">
                                Username
                            </label>

                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) =>
                                    setUsername(e.target.value)
                                }
                                placeholder="Enter your username"
                                autoComplete="username"
                                maxLength={100}
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">
                                Password
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                maxLength={100}
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div
                                className="login-error"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading
                                ? 'Signing in...'
                                : 'Sign in'}
                        </button>
                    </form>

                    <div className="login-footer">
                        Soul Talker HRM · Secure Access
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Login;
