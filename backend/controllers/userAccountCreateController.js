const argon2 = require('argon2');
const pool = require('../config/db');

const createUserAccount = async (req, res) => {
    let connection;

    try {
        const {
            user_id,
            emp_id,
            user_type_id,
            password,
            inactive = 0,
        } = req.body || {};

        const loginId =
            typeof user_id === 'string' ? user_id.trim() : '';

        if (
            !loginId ||
            loginId.length > 45 ||
            !/^[A-Za-z0-9._-]+$/.test(loginId)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid login User ID',
            });
        }

        if (
            !Number.isSafeInteger(Number(emp_id)) ||
            Number(emp_id) <= 0 ||
            ![1, 2, 3, 4].includes(Number(user_type_id)) ||
            typeof password !== 'string' ||
            password.length < 8 ||
            Buffer.byteLength(password, 'utf8') > 1024 ||
            ![0, 1].includes(Number(inactive))
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid account information',
            });
        }

        // Never allow privilege escalation through request fields.
        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                'is_super_admin'
            )
        ) {
            return res.status(400).json({
                success: false,
                message: 'Super Admin assignment is not supported',
            });
        }

        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
        });

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Serialize account creation to prevent duplicate assignments.
        // This is a temporary protection until database unique
        // constraints are introduced after legacy-data review.
        const [lockRows] = await connection.query(
            'SELECT id FROM tbl_user ORDER BY id FOR UPDATE'
        );

        const [existing] = await connection.execute(
            `
            SELECT id
            FROM tbl_user
            WHERE user_id = ? OR emp_id = ?
            LIMIT 1
            `,
            [loginId, Number(emp_id)]
        );

        if (existing.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: 'Login ID or employee already has an account',
            });
        }

        const [employees] = await connection.execute(
            `
            SELECT id
            FROM tbl_employee_master
            WHERE id = ?
              AND COALESCE(inactive, 0) = 0
              AND COALESCE(del, 0) = 0
            LIMIT 1
            `,
            [Number(emp_id)]
        );

        if (employees.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Employee not found or inactive',
            });
        }

        const [result] = await connection.execute(
            `
            INSERT INTO tbl_user (
                user_id,
                password,
                password_hash,
                emp_id,
                user_type_id,
                inactive,
                is_super_admin,
                create_date,
                create_by
            )
            VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), ?)
            `,
            [
                loginId,
                '',
                passwordHash,
                Number(emp_id),
                Number(user_type_id),
                Number(inactive),
                req.session.user.id,
            ]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'User account created successfully',
            data: {
                id: result.insertId,
                user_id: loginId,
                emp_id: Number(emp_id),
                user_type_id: Number(user_type_id),
                inactive: Number(inactive),
                is_super_admin: 0,
            },
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
        }

        console.error('Create user account failed:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to create user account',
        });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { createUserAccount };