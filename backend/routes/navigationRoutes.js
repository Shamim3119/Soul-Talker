const express = require('express');

const {
    getNavigation,
} = require('../controllers/navigationController');

const {
    requireAuth,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, getNavigation);

module.exports = router;