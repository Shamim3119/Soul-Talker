
const pool = require('../config/db');

const {
    closeUserSession,
} = require('../services/authAuditService');

/**
 * Destroy an invalid session and clear its cookie.
 */


/**
 * Destroy an invalid Express session and close
 * its corresponding user_sessions audit record.
 */
const invalidateSession = (req, res, status, message) => {
    const sessionId = req.sessionID;
    const authenticatedUserId = req.session?.user?.id;

    const respond = () => {
        res.clearCookie('soul.sid', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return res.status(status).json({
            success: false,
            message,
        });
    };

    if (!req.session) {
        return respond();
    }

    return req.session.destroy(async (error) => {
        if (error) {
            console.error(
                'Invalid session cleanup failed:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Unable to complete session cleanup.',
            });
        }

        if (sessionId && authenticatedUserId) {
            try {
                await closeUserSession(sessionId);
            } catch (auditError) {
                console.error(
                    'Unable to close session audit record:',
                    auditError
                );
            }
        }

        return respond();
    });
};


/**
 * Require an authenticated, active user
 * with the current session version.
 */
const requireAuth = async (req, res, next) => {
    try {
        const sessionUser = req.session?.user;

        if (!sessionUser?.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const [users] = await pool.execute(
            `
            SELECT
                id,
                user_id,
                inactive,
                is_super_admin,
                session_version
            FROM tbl_user
            WHERE id = ?
            LIMIT 1
            `,
            [sessionUser.id]
        );

        if (users.length === 0) {
            return invalidateSession(
                req,
                res,
                401,
                'User account no longer exists.'
            );
        }

        const user = users[0];

        if (Number(user.inactive) === 1) {
            return invalidateSession(
                req,
                res,
                403,
                'Your account has been deactivated.'
            );
        }

        const currentSessionVersion =
            sessionUser.session_version;

        const databaseSessionVersion =
            Number(user.session_version);

        if (
            !Number.isSafeInteger(currentSessionVersion) ||
            currentSessionVersion !== databaseSessionVersion
        ) {
            return invalidateSession(
                req,
                res,
                401,
                'Your session has expired. Please sign in again.'
            );
        }

        req.authUser = {
            id: Number(user.id),
            user_id: user.user_id,
            is_super_admin: Number(user.is_super_admin),
        };

        return next();
    } catch (error) {
        console.error(
            'Authentication verification failed:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to verify authentication',
        });
    }
};

module.exports = {
    requireAuth,
};
