
const pool = require('../config/db');

/**
 * Verify an active user's permission against MySQL.
 *
 * Super Admin bypasses permission checks,
 * but must still have an active account.
 */
const requirePermission = (permissionCode) => {
    return async (req, res, next) => {
        try {
            const sessionUser = req.session?.user;

            if (!sessionUser?.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
            }

            const [users] = await pool.execute(
                `
                SELECT
                    id,
                    is_super_admin,
                    inactive
                FROM tbl_user
                WHERE id = ?
                LIMIT 1
                `,
                [sessionUser.id]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'User account not found',
                });
            }

            const user = users[0];

            if (Number(user.inactive) === 1) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been deactivated',
                });
            }

            // Active Super Admin bypasses permission checks.
            if (Number(user.is_super_admin) === 1) {
                return next();
            }

            const [permissions] = await pool.execute(
                `
                SELECT up.id
                FROM user_permissions up
                INNER JOIN access_permissions ap
                    ON ap.id = up.permission_id
                WHERE up.user_id = ?
                  AND ap.code = ?
                  AND ap.is_active = 1
                LIMIT 1
                `,
                [sessionUser.id, permissionCode]
            );

            if (permissions.length === 0) {
                return res.status(403).json({
                    success: false,
                    message:
                        'You do not have permission to perform this action',
                });
            }

            return next();
        } catch (error) {
            console.error('Permission check failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to verify permission',
            });
        }
    };
};

module.exports = {
    requirePermission,
};
