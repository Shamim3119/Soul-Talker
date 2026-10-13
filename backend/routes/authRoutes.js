const express = require('express');
const rateLimit = require('express-rate-limit');

const {
    login,
    me,
    logout,
} = require('../controllers/authController');

const {
    requireAuth,
} = require('../middleware/authMiddleware');

const {
    getCsrfToken,
    verifyCsrfToken,
} = require('../middleware/csrfMiddleware');

const {
    getMyPermissions,
} = require('../controllers/myPermissionsController');


const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message:
            'Too many login attempts. Please try again later.',
    },
});



router.get(
    '/my-permissions',
    requireAuth,
    getMyPermissions
);

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

router.post(
    '/login',
    loginLimiter,
    login
);

/*
|--------------------------------------------------------------------------
| Current User
|--------------------------------------------------------------------------
*/

router.get(
    '/me',
    requireAuth,
    me
);

/*
|--------------------------------------------------------------------------
| CSRF Token
|--------------------------------------------------------------------------
*/

router.get(
    '/csrf-token',
    requireAuth,
    getCsrfToken
);

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

router.post(
    '/logout',
    requireAuth,
    verifyCsrfToken,
    logout
);

module.exports = router;