
const argon2 = require('argon2');
const pool = require('../config/db');

const resetUserPassword = async (req, res) => {
    const accountId = Number(req.params.id);
    const { new_password } = req.body || {};

    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid account ID',
        });
    }

    if (
        typeof new_password !== 'string' ||
        new_password.length < 8 ||
        Buffer.byteLength(new_password, 'utf8') > 1024
    ) {
        return res.status(400).json({
            success: false,
            message: 'Password must contain at least 8 characters.',
        });
    }

    if (
        Object.keys(req.body || {}).some(
            (key) => key !== 'new_password'
        )
    ) {
        return res.status(400).json({
            success: false,
            message: 'Unsupported password reset fields.',
        });
    }

    let connection;

    try {
        const passwordHash = await argon2.hash(new_password, {
            type: argon2.argon2id,
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
        });

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
                message: 'Super Admin password cannot be reset here.',
            });
        }

        if (accountId === Number(req.session.user.id)) {
            await connection.rollback();

            return res.status(403).json({
                success: false,
                message: 'Use Change My Password for your own account.',
            });
        }

        await connection.execute(
            `
            UPDATE tbl_user
            SET
                password_hash = ?,
                password = '',
                session_version = session_version + 1,
                update_date = NOW(),
                update_by = ?
            WHERE id = ?
            `,
            [
                passwordHash,
                Number(req.session.user.id),
                accountId,
            ]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'User password reset successfully.',
            data: {
                id: accountId,
                user_id: accounts[0].user_id,
            },
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Password rollback failed:', rollbackError);
            }
        }

        console.error('Reset user password failed:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to reset user password.',
        });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { resetUserPassword };
