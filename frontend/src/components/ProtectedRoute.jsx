import { Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
    const {
        authenticated,
        loading,
    } = useAuth();

    if (loading) {
        return (
            <div className="app-loading">
                <div className="app-loading-spinner" />

                <p>Loading Soul Talker...</p>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return children;
}

export default ProtectedRoute;