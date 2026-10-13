const pool = require('../config/db');

const getUserAccounts = async (req, res) => {
    try {
        const pageInput = Number(req.query.page ?? 1);
        const limitInput = Number(req.query.limit ?? 20);

        if (
            !Number.isSafeInteger(pageInput) ||
            pageInput < 1 ||
            !Number.isSafeInteger(limitInput) ||
            limitInput < 1
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid pagination parameters',
            });
        }

        const page = pageInput;
        const limit = Math.min(limitInput, 100);
        const offset = (page - 1) * limit;

        if (!Number.isSafeInteger(offset)) {
            return res.status(400).json({
                success: false,
                message: 'Page number is too large',
            });
        }

        const search = String(req.query.search ?? '').trim();
        const status = String(req.query.status ?? 'all');

        if (search.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Search must not exceed 100 characters',
            });
        }

        if (!['all', 'active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid account status',
            });
        }

        const conditions = [];
        const params = [];

        if (search) {
            conditions.push(
                '(u.user_id LIKE ? OR em.emp_name LIKE ?)'
            );

            // Escape SQL LIKE wildcards supplied by users.
            const escaped = search.replace(/[\\%_]/g, '\\$&');
            const pattern = `%${escaped}%`;

            params.push(pattern, pattern);
        }

        if (status === 'active') {
            conditions.push('u.inactive = 0');
        } else if (status === 'inactive') {
            conditions.push('u.inactive = 1');
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const [countRows] = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM tbl_user u
            LEFT JOIN tbl_employee_master em
                ON em.id = u.emp_id
            ${whereClause}
            `,
            params
        );

        const total = Number(countRows[0].total);

        const [rows] = await pool.query(
            `
            SELECT
                u.id,
                u.user_id,
                u.emp_id,
                em.emp_name AS employee_name,
                u.user_type_id,
                u.is_super_admin,
                u.inactive,
                u.create_date,
                u.update_date,
                COALESCE(
                    pc.permissions_count,
                    0
                ) AS permissions_count
            FROM tbl_user u
            LEFT JOIN tbl_employee_master em
                ON em.id = u.emp_id
            LEFT JOIN (
                SELECT
                    user_id,
                    COUNT(*) AS permissions_count
                FROM user_permissions
                GROUP BY user_id
            ) pc
                ON pc.user_id = u.id
            ${whereClause}
            ORDER BY u.id DESC
            LIMIT ? OFFSET ?
            `,
            [...params, limit, offset]
        );

        return res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error(
            'User accounts lookup failed:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to load user accounts',
        });
    }
};

module.exports = {
    getUserAccounts,
};