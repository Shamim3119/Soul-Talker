const crypto = require('crypto');

/*
|--------------------------------------------------------------------------
| Generate / Return CSRF Token
|--------------------------------------------------------------------------
*/

const getCsrfToken = (req, res) => {
    if (!req.session) {
        return res.status(500).json({
            success: false,
            message: 'Session unavailable',
        });
    }

    if (!req.session.csrfToken) {
        req.session.csrfToken =
            crypto.randomBytes(32).toString('hex');
    }

    return req.session.save((error) => {
        if (error) {
            console.error(
                'Unable to save CSRF token:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to initialize security token',
            });
        }

        return res.status(200).json({
            success: true,
            csrfToken: req.session.csrfToken,
        });
    });
};

/*
|--------------------------------------------------------------------------
| Verify CSRF Token
|--------------------------------------------------------------------------
*/

const verifyCsrfToken = (req, res, next) => {
    const sessionToken =
        req.session?.csrfToken;

    const requestToken =
        req.get('X-CSRF-Token');

    if (
        !sessionToken ||
        !requestToken ||
        typeof requestToken !== 'string'
    ) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token',
        });
    }

    const sessionBuffer =
        Buffer.from(sessionToken, 'utf8');

    const requestBuffer =
        Buffer.from(requestToken, 'utf8');

    if (
        sessionBuffer.length !==
        requestBuffer.length
    ) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token',
        });
    }

    const valid =
        crypto.timingSafeEqual(
            sessionBuffer,
            requestBuffer
        );

    if (!valid) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token',
        });
    }

    next();
};

module.exports = {
    getCsrfToken,
    verifyCsrfToken,
};