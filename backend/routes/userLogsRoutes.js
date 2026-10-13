const express = require('express');

const router = express.Router();

const {
    getUserLogs,
} = require('../controllers/userLogsController');

const {
    requireAuth,
} = require('../middleware/authMiddleware');

const {
    requirePermission,
} = require('../middleware/permissionMiddleware');

router.get(
    '/',
    requireAuth,
    requirePermission('user-management.logs.view'),
    getUserLogs
);

module.exports = router;