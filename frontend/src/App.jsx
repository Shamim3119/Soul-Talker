import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import OnlineUsers from './pages/user-management/OnlineUsers';
import UserLogs from './pages/user-management/UserLogs';
import UserAccounts from './pages/user-management/UserAccounts';

import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';


function App() {
    return (
        <Routes>
            <Route
                path="/login"
                element={<Login />}
            />

            <Route
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route
                    path="/dashboard"
                    element={<Dashboard />}
                />

                <Route
                    path="/user-management/online"
                    element={<OnlineUsers />}
                />

                <Route
                    path="/user-management/logs"
                    element={<UserLogs />}
                />
                
                <Route
                    path="/user-management/accounts"
                    element={<UserAccounts />}
                />
            </Route>

            <Route
                path="/"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />

            <Route
                path="*"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />
        </Routes>
    );
}

export default App;