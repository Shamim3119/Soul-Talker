
const express = require('express');

const router = express.Router();

const {
    getOnlineUsers,
    forceLogoutSession,
} = require('../controllers/onlineUsersController');

const {
    requireAuth,
} = require('../middleware/authMiddleware');

const {
    requirePermission,
} = require('../middleware/permissionMiddleware');

/*
|--------------------------------------------------------------------------
| Online Users
|--------------------------------------------------------------------------
*/

router.get(
    '/',
    requireAuth,
    requirePermission('user-management.online.view'),
    getOnlineUsers
);

/*
|--------------------------------------------------------------------------
| Force Logout — Super Admin Only
|--------------------------------------------------------------------------
|
| POST /api/user-management/online/:sessionId/force-logout
|
*/

router.post(
    '/:sessionId/force-logout',
    requireAuth,
    forceLogoutSession
);

module.exports = router;
