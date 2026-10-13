const {
    updateSessionActivity,
} = require('../services/authAuditService');

const ACTIVITY_INTERVAL_SECONDS = 60;

const trackSessionActivity = async (req, res, next) => {
    try {
        // Ignore unauthenticated requests.
        if (!req.session?.user?.id || !req.sessionID) {
            return next();
        }

        // Only track activity after authentication.
        // The SQL condition prevents unnecessary writes.
        const sessionId = req.sessionID;

        await updateSessionActivity(
            sessionId,
            ACTIVITY_INTERVAL_SECONDS
        );

        return next();
    } catch (error) {
        // Activity logging should not break the application.
        console.error('Session activity tracking failed:', error);
        return next();
    }
};

module.exports = trackSessionActivity;