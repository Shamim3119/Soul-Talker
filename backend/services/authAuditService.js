

const crypto = require('crypto');
const pool = require('../config/db');


const hashSessionId = (sessionId) => {
    if (typeof sessionId !== 'string' || !sessionId) {
        throw new Error('Valid session ID is required');
    }

    return crypto
        .createHash('sha256')
        .update(sessionId)
        .digest('hex');
};

const getRequestMetadata = (req) => ({
    ipAddress: req.ip || null,
    userAgent:
        typeof req.get('user-agent') === 'string'
            ? req.get('user-agent').slice(0, 512)
            : null,
});

/**
 * Record an authentication event.
 *
 * Never store passwords, raw session IDs, cookies,
 * CSRF tokens, or password hashes.
 */
const recordAuthEvent = async ({
    req,
    userId = null,
    attemptedUserId = null,
    eventType,
    details = null,
}) => {
    const { ipAddress, userAgent } =
        getRequestMetadata(req);

    await pool.execute(
        `
        INSERT INTO user_login_logs
        (
            user_id,
            attempted_user_id,
            event_type,
            ip_address,
            user_agent,
            details
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            userId,
            attemptedUserId,
            eventType,
            ipAddress,
            userAgent,
            details === null
                ? null
                : JSON.stringify(details),
        ]
    );
};

/**
 * Register a successfully authenticated session.
 */
const registerUserSession = async (req, userId) => {
    const sessionHash = hashSessionId(req.sessionID);

    const { ipAddress, userAgent } =
        getRequestMetadata(req);

    await pool.execute(
        `
        INSERT INTO user_sessions
        (
            user_id,
            session_hash,
            login_at,
            last_activity_at,
            ip_address,
            user_agent
        )
        VALUES
        (
            ?, ?, NOW(), NOW(), ?, ?
        )
        `,
        [
            userId,
            sessionHash,
            ipAddress,
            userAgent,
        ]
    );
};

/**
 * Update the activity time for an existing session.
 */
const updateSessionActivity = async (
    sessionId,
    intervalSeconds = 60
) => {
    const sessionHash = hashSessionId(sessionId);

    const interval = Math.max(
        1,
        Math.min(3600, Math.floor(Number(intervalSeconds) || 60))
    );

    await pool.execute(
        `
        UPDATE user_sessions
        SET last_activity_at = NOW()
        WHERE session_hash = ?
          AND logout_at IS NULL
          AND last_activity_at <=
              DATE_SUB(NOW(), INTERVAL ? SECOND)
        `,
        [sessionHash, interval]
    );
};

/**
 * Mark a session as logged out.
 *
 * The actual Express session must also be destroyed
 * by the authentication controller.
 */
const closeUserSession = async (sessionId) => {
    const sessionHash = hashSessionId(sessionId);

    await pool.execute(
        `
        UPDATE user_sessions
        SET logout_at = NOW()
        WHERE session_hash = ?
          AND logout_at IS NULL
        `,
        [sessionHash]
    );
};

module.exports = {
    hashSessionId,
    recordAuthEvent,
    registerUserSession,
    updateSessionActivity,
    closeUserSession,
};