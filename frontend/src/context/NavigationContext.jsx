import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

import api from '../api/api';
import { useAuth } from './AuthContext';

const NavigationContext = createContext(null);

export const NavigationProvider = ({ children }) => {
    const { user, loading: authLoading } = useAuth();

    const [navigation, setNavigation] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadNavigation = useCallback(async () => {
        if (!user) {
            setNavigation([]);
            setError(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/navigation');

            if (!response.data?.success) {
                throw new Error('Unable to load navigation');
            }

            setNavigation(
                Array.isArray(response.data.navigation)
                    ? response.data.navigation
                    : []
            );
        } catch (error) {
            console.error('Unable to load navigation.', error);

            setNavigation([]);

            if (error.response?.status === 401) {
                setError('Authentication required');
            } else {
                setError('Unable to load navigation');
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (authLoading) {
            return;
        }

        loadNavigation();
    }, [authLoading, loadNavigation]);

    const refreshNavigation = useCallback(async () => {
        await loadNavigation();
    }, [loadNavigation]);

    return (
        <NavigationContext.Provider
            value={{
                navigation,
                loading,
                error,
                refreshNavigation,
            }}
        >
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);

    if (!context) {
        throw new Error(
            'useNavigation must be used inside NavigationProvider'
        );
    }

    return context;
};