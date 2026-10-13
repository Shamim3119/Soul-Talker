
const pool = require('../config/db');

/**
 * Close audit records for:
 *
 * 1. Missing Express sessions
 * 2. Expired Express sessions
 * 3. Revoked sessions (session_version mismatch)
 *
 * Does not delete Express sessions.
 * Does not modify valid active sessions.
 */
const cleanupExpiredSessionAudits = async () => {
    const [result] = await pool.execute(`
        UPDATE user_sessions us

        LEFT JOIN express_sessions es
            ON us.session_hash = SHA2(es.session_id, 256)

        LEFT JOIN tbl_user u
            ON u.id = us.user_id

        SET us.logout_at = COALESCE(
            us.last_activity_at,
            us.login_at
        )

        WHERE us.logout_at IS NULL
          AND (
              es.session_id IS NULL

              OR es.expires <= UNIX_TIMESTAMP()

              OR u.id IS NULL

              OR u.inactive <> 0

              OR (
                  es.session_id IS NOT NULL
                  AND es.expires > UNIX_TIMESTAMP()
                  AND u.id IS NOT NULL
                  AND (
                      JSON_VALID(es.data) = 0

                      OR JSON_TYPE(
                          JSON_EXTRACT(
                              CASE
                                  WHEN JSON_VALID(es.data)
                                  THEN es.data
                                  ELSE '{}'
                              END,
                              '$.user.session_version'
                          )
                      ) <> 'INTEGER'

                      OR NOT (
                          JSON_EXTRACT(
                              CASE
                                  WHEN JSON_VALID(es.data)
                                  THEN es.data
                                  ELSE '{}'
                              END,
                              '$.user.session_version'
                          ) <=> u.session_version
                      )
                  )
              )
          )
    `);

    return result.affectedRows;
};

module.exports = {
    cleanupExpiredSessionAudits,
};
