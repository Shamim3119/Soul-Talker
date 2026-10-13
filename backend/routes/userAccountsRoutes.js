const express = require('express');

const router = express.Router();

const {
    getUserAccounts,
} = require('../controllers/userAccountsController');

const {
    createUserAccount,
} = require('../controllers/userAccountCreateController');

const {
    requireAuth,
} = require('../middleware/authMiddleware');

const {
    requirePermission,
} = require('../middleware/permissionMiddleware');

const {
    getAvailableEmployees
} = require('../controllers/userAccountOptionsController');


const {
    updateUserAccount,
} = require('../controllers/userAccountUpdateController');

const {
    resetUserPassword,
} = require('../controllers/userAccountPasswordController');

const {
    getUserPermissions,
    updateUserPermissions,
} = require('../controllers/userAccountPermissionsController');

router.get(
    '/:id/permissions',
    requireAuth,
    requirePermission('user-management.accounts.manage-access'),
    getUserPermissions
);

router.put(
    '/:id/permissions',
    requireAuth,
    requirePermission('user-management.accounts.manage-access'),
    updateUserPermissions
);

router.put(
    '/:id/reset-password',
    requireAuth,
    requirePermission('user-management.accounts.reset-password'),
    resetUserPassword
);

router.put(
    '/:id',
    requireAuth,
    requirePermission('user-management.accounts.update'),
    updateUserAccount
);


router.get(
    '/available-employees',
    requireAuth,
    requirePermission('user-management.accounts.create'),
    getAvailableEmployees
);

// GET - List user accounts
router.get(
    '/',
    requireAuth,
    requirePermission('user-management.accounts.view'),
    getUserAccounts
);

// POST - Create user account
router.post(
    '/',
    requireAuth,
    requirePermission('user-management.accounts.create'),
    createUserAccount
);

module.exports = router;