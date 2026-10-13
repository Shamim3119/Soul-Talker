
const pool = require('../config/db');

const {
    recordAuthEvent,
} = require('../services/authAuditService');

const getOnlineUsers = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                us.id AS session_id,
                u.user_id,
                em.emp_name AS employee_name,
                us.login_at,
                us.last_activity_at,
                us.ip_address,
                CASE
                    WHEN us.last_activity_at >=
                         DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                    THEN 'online'
                    ELSE 'idle'
                END AS status

            FROM user_sessions us

            INNER JOIN express_sessions es
                ON us.session_hash = SHA2(es.session_id, 256)

            INNER JOIN tbl_user u
                ON u.id = us.user_id

            LEFT JOIN tbl_employee_master em
                ON em.id = u.emp_id

            WHERE us.logout_at IS NULL

              -- Express session must not be expired
              AND es.expires > UNIX_TIMESTAMP()

              -- Account must be active
              AND u.inactive = 0

              -- Session data must contain valid JSON
              AND JSON_VALID(es.data) = 1

              -- Stored session version must be an integer
              AND JSON_TYPE(
                  JSON_EXTRACT(
                      CASE
                          WHEN JSON_VALID(es.data) THEN es.data
                          ELSE '{}'
                      END,
                      '$.user.session_version'
                  )
              ) = 'INTEGER'

              -- Session version must match current database version
              AND JSON_EXTRACT(
                  CASE
                      WHEN JSON_VALID(es.data) THEN es.data
                      ELSE '{}'
                  END,
                  '$.user.session_version'
              ) = u.session_version

            ORDER BY us.last_activity_at DESC
        `);

        return res.status(200).json({
            success: true,
            data: rows,
        });

    } catch (error) {
        console.error(
            'Online users lookup failed:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to load online users',
        });
    }
};



/**
 * Super Admin Force Logout.
 *
 * Terminates one selected Express session.
 * Does not reset the user's password.
 */
const forceLogoutSession = async (req, res) => {
    const sessionId = Number(req.params.sessionId);

    if (
        !Number.isSafeInteger(sessionId) ||
        sessionId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid session ID',
        });
    }

    // requireAuth must have populated req.authUser.
    if (Number(req.authUser?.is_super_admin) !== 1) {
        return res.status(403).json({
            success: false,
            message: 'Super Admin access required',
        });
    }

    const adminUserId = Number(req.authUser.id);

    try {
        const [rows] = await pool.execute(
            `
            SELECT
                us.id,
                us.user_id,
                es.session_id AS express_session_id
            FROM user_sessions us
            INNER JOIN express_sessions es
                ON us.session_hash = SHA2(
                    es.session_id,
                    256
                )
            WHERE us.id = ?
              AND us.logout_at IS NULL
              AND es.expires > UNIX_TIMESTAMP()
            LIMIT 1
            `,
            [sessionId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Active session not found',
            });
        }

        const target = rows[0];

        // Prevent the administrator from terminating
        // their own session through this endpoint.
        if (
            Number(target.user_id) === adminUserId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    'You cannot force logout your own account',
            });
        }

        // Destroy the actual Express session.
        // The browser cookie will no longer authenticate.
        await new Promise((resolve, reject) => {
            req.sessionStore.destroy(
                target.express_session_id,
                (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                }
            );
        });

        // Close its audit record.
        await pool.execute(
            `
            UPDATE user_sessions
            SET logout_at = NOW()
            WHERE id = ?
              AND logout_at IS NULL
            `,
            [sessionId]
        );

        // Record who performed the force logout.
        try {
            await recordAuthEvent({
                req,
                userId: adminUserId,
                eventType: 'force_logout',
                details: {
                    target_user_id: Number(target.user_id),
                    target_session_audit_id: sessionId,
                },
            });
        } catch (auditError) {
            console.error(
                'Force logout audit logging failed:',
                auditError
            );
        }

        return res.status(200).json({
            success: true,
            message: 'User session terminated successfully',
        });

    } catch (error) {
        console.error(
            'Force logout failed:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to terminate user session',
        });
    }
};


module.exports = {
    getOnlineUsers,
    forceLogoutSession,
};
