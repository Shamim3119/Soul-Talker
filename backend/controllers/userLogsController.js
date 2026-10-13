const pool = require('../config/db');

const ALLOWED_EVENTS = [
    'login_success',
    'login_failed',
    'logout',
    'session_expired',
    'forced_logout',
];

const getUserLogs = async (req, res) => {
    try {
        const page = Math.max(
            1,
            Math.min(1000000, parseInt(req.query.page, 10) || 1)
        );

        const limit = Math.max(
            1,
            Math.min(100, parseInt(req.query.limit, 10) || 20)
        );

        const offset = (page - 1) * limit;

        const { event_type, user_id, date_from, date_to } =
            req.query;

        const conditions = [];
        const params = [];

        if (event_type) {
            if (!ALLOWED_EVENTS.includes(event_type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid event type',
                });
            }

            conditions.push('l.event_type = ?');
            params.push(event_type);
        }

        if (user_id) {
            conditions.push(
                '(u.user_id = ? OR l.attempted_user_id = ?)'
            );

            params.push(user_id, user_id);
        }

        const isValidDate = (value) =>
            typeof value === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
            new Date(`${value}T00:00:00Z`)
                .toISOString()
                .slice(0, 10) === value;

        if (date_from) {
            if (!isValidDate(date_from)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid start date',
                });
            }

            conditions.push('l.event_at >= ?');
            params.push(`${date_from} 00:00:00`);
        }

        if (date_to) {
            if (!isValidDate(date_to)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid end date',
                });
            }

            conditions.push(
                'l.event_at < DATE_ADD(?, INTERVAL 1 DAY)'
            );

            params.push(`${date_to} 00:00:00`);
        }

        if (date_from && date_to && date_from > date_to) {
            return res.status(400).json({
                success: false,
                message: 'Start date cannot be after end date',
            });
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const [countRows] = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM user_login_logs l
            LEFT JOIN tbl_user u ON u.id = l.user_id
            ${whereClause}
            `,
            params
        );

        const total = Number(countRows[0].total);

        const [rows] = await pool.query(
            `
            SELECT
                l.id,
                l.event_type,
                l.event_at,
                l.attempted_user_id,
                l.ip_address,
                l.user_agent,
                u.user_id,
                em.emp_name AS employee_name
            FROM user_login_logs l
            LEFT JOIN tbl_user u ON u.id = l.user_id
            LEFT JOIN tbl_employee_master em
                ON em.id = u.emp_id
            ${whereClause}
            ORDER BY l.event_at DESC, l.id DESC
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
        console.error('User logs lookup failed:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to load user logs',
        });
    }
};

module.exports = {
    getUserLogs,
};