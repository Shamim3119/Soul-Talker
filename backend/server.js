require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const navigationRoutes = require('./routes/navigationRoutes');
const onlineUsersRoutes = require('./routes/onlineUsersRoutes');
const userLogsRoutes = require('./routes/userLogsRoutes');
const userAccountsRoutes = require('./routes/userAccountsRoutes');

const trackSessionActivity = require(
    './middleware/sessionActivityMiddleware'
);

const {
    cleanupExpiredSessionAudits,
} = require('./services/sessionCleanupService');
 

const app = express();

/*
|--------------------------------------------------------------------------
| Required Environment Configuration
|--------------------------------------------------------------------------
*/

if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required');
}

if (!process.env.FRONTEND_ORIGIN) {
    throw new Error('FRONTEND_ORIGIN is required');
}

/*
|--------------------------------------------------------------------------
| Basic Security
|--------------------------------------------------------------------------
*/

// Do not advertise Express.
app.disable('x-powered-by');

// Security-related HTTP headers.
app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: 'cross-origin',
        },
    })
);


const employeeProfileDirectory = path.join(
    __dirname,
    'storage',
    'employees',
    'profile'
);

app.use(
    '/media/employees/profile',
    express.static(employeeProfileDirectory, {
        fallthrough: true,
        dotfiles: 'deny',
        index: false,
        maxAge:
            process.env.NODE_ENV === 'production'
                ? '1d'
                : 0,
    })
);

// Handle missing employee profile images without
// forwarding an ENOENT error to the global error handler.
app.use('/media/employees/profile', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Employee profile image not found',
    });
});


/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
|
| Only our configured React frontend is allowed to make credentialed
| browser requests.
|
*/

app.use(
    cors({
        origin: process.env.FRONTEND_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type','Accept','X-CSRF-Token'],
    })
);

/*
|--------------------------------------------------------------------------
| Request Body
|--------------------------------------------------------------------------
|
| Keep JSON request bodies reasonably small.
|
*/

app.use(
    express.json({
        limit: '100kb',
    })
);

app.use(
    express.urlencoded({
        extended: false,
        limit: '100kb',
    })
);


const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    createDatabaseTable: true,

    schema: {
        tableName: 'express_sessions',
    },

    expiration: 8 * 60 * 60 * 1000,

    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
});

/*
|--------------------------------------------------------------------------
| MySQL-Backed Session Authentication
|--------------------------------------------------------------------------
|
| Express sessions are stored in MySQL.
| Session lifetime: 8 hours.
| Expired Express sessions are cleaned every 15 minutes.
| Session audit records are cleaned by our separate service.
|
*/

app.use(
    session({


        
        name: 'soul.sid',

        secret: process.env.SESSION_SECRET,

        store: sessionStore,

        resave: false,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000,
        },
    })
);

app.use(trackSessionActivity);


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use('/api/health', healthRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/navigation', navigationRoutes);

app.use('/api/user-management/online', onlineUsersRoutes);

app.use('/api/user-management/logs', userLogsRoutes);

app.use('/api/user-management/accounts',userAccountsRoutes);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
|
| Must remain AFTER all valid routes.
|
*/

app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

/*
|--------------------------------------------------------------------------
| Final Error Handler
|--------------------------------------------------------------------------
|
| Never send database errors, stack traces, file paths or other internal
| information to the browser.
|
*/

app.use((err, req, res, next) => {
    console.error('Unexpected server error:', err);

    return res.status(500).json({
        success: false,
        message: 'Internal server error',
    });
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/


const PORT = Number(process.env.PORT) || 3000;

const AUDIT_CLEANUP_INTERVAL =
    15 * 60 * 1000; // 15 minutes

let auditCleanupRunning = false;

const runSessionAuditCleanup = async () => {
    if (auditCleanupRunning) {
        return;
    }

    auditCleanupRunning = true;

    try {
        const closedCount =
            await cleanupExpiredSessionAudits();

        if (closedCount > 0) {
            console.log(
                `[Session Cleanup] Closed ${closedCount} stale audit session(s).`
            );
        }
    } catch (error) {
        console.error(
            '[Session Cleanup] Failed:',
            error
        );
    } finally {
        auditCleanupRunning = false;
    }
};

app.listen(PORT, '127.0.0.1', () => {
    console.log(
        `Soul Talker API running on http://127.0.0.1:${PORT}`
    );

    // Initial cleanup after server startup.
    void runSessionAuditCleanup();

    // Repeat every 15 minutes.
    const cleanupTimer = setInterval(
        runSessionAuditCleanup,
        AUDIT_CLEANUP_INTERVAL
    );

    // Do not keep Node.js running solely for this timer.
    cleanupTimer.unref();
});


 