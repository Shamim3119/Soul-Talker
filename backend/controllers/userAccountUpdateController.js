const pool = require('../config/db');

const updateUserAccount = async (req, res) => {
    const accountId = Number(req.params.id);
    const {
        user_id,
        user_type_id,
        inactive,
    } = req.body || {};

    const loginId =
        typeof user_id === 'string' ? user_id.trim() : '';

    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid account ID',
        });
    }

    if (
        !loginId ||
        loginId.length > 45 ||
        !/^[A-Za-z0-9._-]+$/.test(loginId) ||
        ![1, 2, 3, 4].includes(Number(user_type_id)) ||
        ![0, 1].includes(Number(inactive))
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid account information',
        });
    }

    // Prevent unexpected fields from being modified through this API.
    const allowedFields = new Set([
        'user_id',
        'user_type_id',
        'inactive',
    ]);

    if (
        Object.keys(req.body || {}).some(
            (field) => !allowedFields.has(field)
        )
    ) {
        return res.status(400).json({
            success: false,
            message: 'Unsupported account fields',
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [accounts] = await connection.execute(
            `
            SELECT
                id,
                user_id,
                user_type_id,
                inactive,
                is_super_admin
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
                message: 'User account not found',
            });
        }

        const account = accounts[0];

        // Super Admin accounts cannot be modified through this endpoint.
        if (Number(account.is_super_admin) === 1) {
            await connection.rollback();

            return res.status(403).json({
                success: false,
                message: 'Super Admin accounts are protected',
            });
        }

        // Do not allow users to deactivate their own account.
        if (
            accountId === Number(req.session.user.id) &&
            Number(inactive) === 1
        ) {
            await connection.rollback();

            return res.status(403).json({
                success: false,
                message: 'You cannot deactivate your own account',
            });
        }

        const [duplicates] = await connection.execute(
            `
            SELECT id
            FROM tbl_user
            WHERE user_id = ?
              AND id <> ?
            LIMIT 1
            `,
            [loginId, accountId]
        );

        if (duplicates.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: 'Login User ID already exists',
            });
        }

        const oldInactive = Number(account.inactive);
        const newInactive = Number(inactive);

        await connection.execute(
            `
            UPDATE tbl_user
            SET
                user_id = ?,
                user_type_id = ?,
                inactive = ?,
                update_date = NOW(),
                update_by = ?
            WHERE id = ?
            `,
            [
                loginId,
                Number(user_type_id),
                newInactive,
                req.session.user.id,
                accountId,
            ]
        );

        // When deactivating an account, invalidate its active sessions.
        if (oldInactive === 0 && newInactive === 1) {
            const [sessions] = await connection.execute(
                `
                SELECT session_hash
                FROM user_sessions
                WHERE user_id = ?
                  AND logout_at IS NULL
                `,
                [accountId]
            );

            // express_sessions stores the original session ID.
            // Match its SHA256 hash against tracked sessions.
            for (const session of sessions) {
                await connection.execute(
                    `
                    DELETE FROM express_sessions
                    WHERE SHA2(session_id, 256) = ?
                    `,
                    [session.session_hash]
                );
            }

            await connection.execute(
                `
                UPDATE user_sessions
                SET logout_at = NOW()
                WHERE user_id = ?
                  AND logout_at IS NULL
                `,
                [accountId]
            );
        }

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'User account updated successfully',
            data: {
                id: accountId,
                user_id: loginId,
                user_type_id: Number(user_type_id),
                inactive: newInactive,
            },
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Update rollback failed:', rollbackError);
            }
        }

        console.error('Update user account failed:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to update user account',
        });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { updateUserAccount };