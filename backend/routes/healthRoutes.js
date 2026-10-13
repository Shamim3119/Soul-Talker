const express = require('express');

const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Soul-Talker API is running',
    });
});

router.get(
    '/permission-test',
    requireAuth,
    requirePermission('dashboard.view'),
    (req, res) => {
        return res.status(200).json({
            success: true,
            message: 'Permission granted',
        });
    }
);

module.exports = router;