import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:3000/api',

    withCredentials: true,

    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

let csrfToken = null;

/*
|--------------------------------------------------------------------------
| Load CSRF Token
|--------------------------------------------------------------------------
*/

export const loadCsrfToken = async () => {
    const response = await api.get(
        '/auth/csrf-token'
    );

    csrfToken =
        response.data.csrfToken;

    return csrfToken;
};

/*
|--------------------------------------------------------------------------
| Clear CSRF Token
|--------------------------------------------------------------------------
*/

export const clearCsrfToken = () => {
    csrfToken = null;
};

/*
|--------------------------------------------------------------------------
| Request Interceptor
|--------------------------------------------------------------------------
|
| Automatically attach CSRF protection to state-changing requests.
|
*/

api.interceptors.request.use(
    (config) => {
        const method =
            config.method?.toLowerCase();

        const protectedMethods = [
            'post',
            'put',
            'patch',
            'delete',
        ];

        if (
            csrfToken &&
            protectedMethods.includes(method)
        ) {
            config.headers['X-CSRF-Token'] =
                csrfToken;
        }

        return config;
    },
    (error) => Promise.reject(error)
);


/*
|--------------------------------------------------------------------------
| Authentication Expiration Notifications
|--------------------------------------------------------------------------
*/

const authExpiredListeners = new Set();

export const subscribeToAuthExpiration = (listener) => {
    authExpiredListeners.add(listener);

    return () => {
        authExpiredListeners.delete(listener);
    };
};

/*
|--------------------------------------------------------------------------
| Response Interceptor
|--------------------------------------------------------------------------
|
| Notify AuthContext when an existing session is revoked.
| Do not treat ordinary permission-denied errors as logout.
|
*/

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message;

        const sessionExpired =
            status === 401 &&
            message ===
                'Your session has expired. Please sign in again.';

        const accountDeactivated =
            status === 403 &&
            message ===
                'Your account has been deactivated.';

        if (sessionExpired || accountDeactivated) {
            authExpiredListeners.forEach((listener) => {
                try {
                    listener();
                } catch (listenerError) {
                    console.error(
                        'Authentication expiration handler failed:',
                        listenerError
                    );
                }
            });
        }

        return Promise.reject(error);
    }
);


export default api;