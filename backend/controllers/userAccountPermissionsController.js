
const pool = require('../config/db');

const getSessionUserId = (req) =>
    Number(req.session?.user?.id);

const isValidId = (value) =>
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0 &&
    /^\d+$/.test(String(value));

const getUserPermissions = async (req, res) => {
    const accountId = Number(req.params.id);

    if (!isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user account ID.',
        });
    }

    try {
        const [accounts] = await pool.execute(
            `
            SELECT
                id,
                user_id,
                user_type_id,
                is_super_admin,
                inactive
            FROM tbl_user
            WHERE id = ?
            LIMIT 1
            `,
            [accountId]
        );

        if (accounts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User account not found.',
            });
        }

        const account = accounts[0];

        if (Number(account.is_super_admin) === 1) {
            return res.status(403).json({
                success: false,
                message: 'Super Admin permissions are protected.',
            });
        }

        const [permissions] = await pool.execute(
            `
            SELECT
                p.id,
                p.module_id,
                p.name,
                p.code,
                p.sort_order,
                CASE
                    WHEN up.id IS NULL THEN 0
                    ELSE 1
                END AS assigned
            FROM access_permissions p
            LEFT JOIN user_permissions up
                ON up.permission_id = p.id
               AND up.user_id = ?
            WHERE p.is_active = 1
            ORDER BY
                p.module_id,
                p.sort_order,
                p.name
            `,
            [accountId]
        );

        return res.json({
            success: true,
            data: {
                account,
                permissions: permissions.map((item) => ({
                    ...item,
                    assigned: Number(item.assigned) === 1,
                })),
            },
        });
    } catch (error) {
        console.error('Get user permissions failed:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to load user permissions.',
        });
    }
};

const updateUserPermissions = async (req, res) => {
    const accountId = Number(req.params.id);
    const actorId = getSessionUserId(req);
    const body = req.body;

    if (!isValidId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user account ID.',
        });
    }

    if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).some(
            (key) => key !== 'permission_ids'
        ) ||
        !Array.isArray(body.permission_ids)
    ) {
        return res.status(400).json({
            success: false,
            message: 'permission_ids must be an array.',
        });
    }

    const permissionIds = body.permission_ids;

    if (
        permissionIds.length > 1000 ||
        permissionIds.some(
            (id) => !isValidId(id) || typeof id !== 'number'
        )
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid permission IDs.',
        });
    }

    const uniqueIds = [...new Set(permissionIds)];

    if (uniqueIds.length !== permissionIds.length) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate permission IDs are not allowed.',
        });
    }

    if (accountId === actorId) {
        return res.status(403).json({
            success: false,
            message: 'You cannot change your own permissions.',
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [accounts] = await connection.execute(
            `
            SELECT id, user_id, is_super_admin
            FROM tbl_user
            WHERE id = ?
            FOR UPDATE
            `,
            [accountId]
        );

        if (accounts.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'User account not found.',
            });
        }

        if (Number(accounts[0].is_super_admin) === 1) {
            await connection.rollback();

            return res.status(403).json({
                success: false,
                message: 'Super Admin permissions cannot be modified.',
            });
        }

        // Validate every submitted permission against active records.
        if (uniqueIds.length > 0) {
            const placeholders = uniqueIds.map(() => '?').join(',');

            const [validPermissions] = await connection.query(
                `
                SELECT id
                FROM access_permissions
                WHERE is_active = 1
                  AND id IN (${placeholders})
                `,
                uniqueIds
            );

            if (validPermissions.length !== uniqueIds.length) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: 'One or more permissions are invalid or inactive.',
                });
            }
        }

        // Replace the user's explicit permissions atomically.
        await connection.execute(
            `
            DELETE FROM user_permissions
            WHERE user_id = ?
            `,
            [accountId]
        );

        if (uniqueIds.length > 0) {
            const placeholders = uniqueIds
                .map(() => '(?, ?)')
                .join(',');

            const values = uniqueIds.flatMap(
                (permissionId) => [accountId, permissionId]
            );

            await connection.query(
                `
                INSERT INTO user_permissions
                    (user_id, permission_id)
                VALUES ${placeholders}
                `,
                values
            );
        }

        await connection.commit();

        return res.json({
            success: true,
            message: 'User permissions updated successfully.',
            data: {
                user_id: accountId,
                assigned_count: uniqueIds.length,
                permission_ids: uniqueIds,
            },
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    'Permission rollback failed:',
                    rollbackError
                );
            }
        }

        console.error('Update user permissions failed:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to update user permissions.',
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getUserPermissions,
    updateUserPermissions,
};
