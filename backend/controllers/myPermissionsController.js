const pool = require('../config/db');

const getMyPermissions = async (req, res) => {
    try {
        const userId = req.session?.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const [users] = await pool.execute(
            `
            SELECT id, is_super_admin, inactive
            FROM tbl_user
            WHERE id = ?
            LIMIT 1
            `,
            [userId]
        );

        if (
            users.length === 0 ||
            Number(users[0].inactive) === 1
        ) {
            return res.status(401).json({
                success: false,
                message: 'Account is unavailable',
            });
        }

        if (Number(users[0].is_super_admin) === 1) {
            return res.json({
                success: true,
                data: {
                    is_super_admin: true,
                    permissions: [],
                },
            });
        }

        const [rows] = await pool.execute(
            `
            SELECT ap.code
            FROM user_permissions up
            INNER JOIN access_permissions ap
                ON ap.id = up.permission_id
            WHERE up.user_id = ?
              AND ap.is_active = 1
            ORDER BY ap.code
            `,
            [userId]
        );

        return res.json({
            success: true,
            data: {
                is_super_admin: false,
                permissions: rows.map((row) => row.code),
            },
        });
    } catch (error) {
        console.error('My permissions error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to load permissions',
        });
    }
};

module.exports = {
    getMyPermissions,
};