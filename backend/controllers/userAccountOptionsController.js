const pool = require('../config/db');

const getAvailableEmployees = async (req, res) => {
    try {
        const search = String(req.query.search || '').trim().slice(0, 100);

        const [rows] = await pool.execute(
            `
            SELECT
                em.id,
                em.emp_id AS employee_code,
                em.emp_name AS employee_name
            FROM tbl_employee_master em
            WHERE COALESCE(em.inactive, 0) = 0
              AND COALESCE(em.del, 0) = 0
              AND NOT EXISTS (
                  SELECT 1
                  FROM tbl_user u
                  WHERE u.emp_id = em.id
              )
              AND (
                  ? = ''
                  OR em.emp_id LIKE ?
                  OR em.emp_name LIKE ?
              )
            ORDER BY em.emp_name ASC
            LIMIT 50
            `,
            [
                search,
                `%${search.replace(/[\\%_]/g, '\\$&')}%`,
                `%${search.replace(/[\\%_]/g, '\\$&')}%`
            ]
        );

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Available employees error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to load employees'
        });
    }
};

module.exports = { getAvailableEmployees };