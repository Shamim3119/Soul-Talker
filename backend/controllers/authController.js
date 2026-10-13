const argon2 = require('argon2');

const pool = require('../config/db');

const {
    getEmployeeProfileImageUrl,
} = require('../services/employeeMediaService');

const {
    recordAuthEvent,
    registerUserSession,
    closeUserSession,
} = require('../services/authAuditService');


const safelyRecordAuthEvent = async (options) => {
    try {
        await recordAuthEvent(options);
    } catch (error) {
        console.error('Authentication audit logging failed:', error);
    }
};

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

const login = async (req, res) => {



    
    try {
        const { username, password } = req.body;

        const attemptedUserId =
            typeof username === 'string'
                ? username.trim().slice(0, 100)
                : null;

        const logFailedLogin = async (userId = null) => {
            await safelyRecordAuthEvent({
                req,
                userId,
                attemptedUserId,
                eventType: 'login_failed',
            });
        };

        /*
        |--------------------------------------------------------------------------
        | Validate Input
        |--------------------------------------------------------------------------
        */

        if (
            typeof username !== 'string' ||
            typeof password !== 'string' ||
            !username.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Find Active User
        |--------------------------------------------------------------------------
        |
        | password_hash is retrieved only for server-side Argon2 verification.
        | It is never returned to the browser.
        |
        */

        const [rows] = await pool.execute(
            `
                SELECT
                    u.id,
                    u.user_id,
                    u.password_hash,
                    u.emp_id,
                    u.user_type_id,
                    u.session_version,

                    em.emp_id AS employee_id,
                    em.emp_name,
                    em.profile_image,
                    em.image_location,

                    d.des_name AS designation,
                    dep.dep_name AS department,

                    ut.tag_name AS user_type,

                    YEAR(NOW()) AS fiscal_year

                FROM tbl_user u

                LEFT JOIN tbl_employee_master em
                    ON em.id = u.emp_id

                LEFT JOIN tbl_designation d
                    ON d.id = em.des_id

                LEFT JOIN tbl_department dep
                    ON dep.id = em.dep_id

                LEFT JOIN tbl_user_type ut
                    ON ut.id = u.user_type_id

                WHERE u.user_id = ?
                  AND u.inactive = 0

                LIMIT 1
            `,
            [username.trim()]
        );

        /*
        |--------------------------------------------------------------------------
        | User Not Found
        |--------------------------------------------------------------------------
        |
        | Keep the error generic so the API does not reveal whether a username
        | exists.
        |
        */

        if (rows.length === 0) {

            await logFailedLogin();

            return res.status(401).json({
                success: false,
                message: 'Invalid username or password',
            });
        }

        const user = rows[0];

        /*
        |--------------------------------------------------------------------------
        | Password Hash Check
        |--------------------------------------------------------------------------
        */

        if (
            typeof user.password_hash !== 'string' ||
            !user.password_hash
        ) {
            await logFailedLogin(user.id);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Verify Argon2id Password
        |--------------------------------------------------------------------------
        */

        let passwordValid = false;

        try {
            passwordValid = await argon2.verify(
                user.password_hash,
                password
            );
        } catch (error) {
            passwordValid = false;
        }

        if (!passwordValid) {
            await logFailedLogin(user.id);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Resolve Employee Profile Image
        |--------------------------------------------------------------------------
        |
        | Priority:
        |
        | 1. profile_image
        | 2. image_location
        | 3. null
        |
        */

        const profileImageUrl =
            getEmployeeProfileImageUrl(
                user.profile_image,
                user.image_location
            );

        /*
        |--------------------------------------------------------------------------
        | Regenerate Session
        |--------------------------------------------------------------------------
        |
        | Regenerating the session ID after successful authentication protects
        | against session fixation.
        |
        */

        req.session.regenerate((error) => {
            if (error) {
                console.error(
                    'Session regeneration failed',
                    error
                );

                return res.status(500).json({
                    success: false,
                    message: 'Unable to complete login',
                });
            }

            /*
            |--------------------------------------------------------------------------
            | Store Minimal Trusted Identity
            |--------------------------------------------------------------------------
            |
            | Do not store password or password_hash in the session.
            |
            */

            req.session.user = {
                id: user.id,
                user_id: user.user_id,
                emp_id: user.emp_id,
                user_type_id: user.user_type_id,
                session_version: Number(user.session_version),
            };

            /*
            |--------------------------------------------------------------------------
            | Save Session
            |--------------------------------------------------------------------------
            */

            req.session.save((error) => {
                if (error) {
                    console.error(
                        'Session save failed',
                        error
                    );

                    return res.status(500).json({
                        success: false,
                        message: 'Unable to complete login',
                    });
                }



                (async () => {
                    try {
                        await registerUserSession(req, user.id);
                    } catch (auditError) {
                        console.error(
                            'Unable to register authenticated session:',
                            auditError
                        );
                    }

                    await safelyRecordAuthEvent({
                        req,
                        userId: user.id,
                        attemptedUserId: user.user_id,
                        eventType: 'login_success',
                    });

                    return res.status(200).json({
                        success: true,
                        message: 'Login successful',
                        user: {
                            id: user.id,
                            user_id: user.user_id,
                            emp_id: user.emp_id,
                            employee_id: user.employee_id,
                            emp_name: user.emp_name,
                            designation: user.designation,
                            department: user.department,
                            user_type: user.user_type,
                            user_type_id: user.user_type_id,
                            fiscal_year: user.fiscal_year,
                            profile_image_url: profileImageUrl,
                        },
                    });
                })().catch((unexpectedError) => {
                    console.error(
                        'Login completion failed:',
                        unexpectedError
                    );

                    if (!res.headersSent) {
                        return res.status(500).json({
                            success: false,
                            message: 'Unable to complete login',
                        });
                    }
                });

 
            });
        });
    } catch (error) {
        console.error('Login error', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};


/*
|--------------------------------------------------------------------------
| Current Authenticated User
|--------------------------------------------------------------------------
*/

const me = async (req, res) => {
    try {
        const userId = req.session.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const [rows] = await pool.execute(
            `
                SELECT
                    u.id,
                    u.user_id,
                    u.emp_id,
                    u.user_type_id,
                    u.is_super_admin,

                    em.emp_id AS employee_id,
                    em.emp_name,
                    em.profile_image,
                    em.image_location,

                    d.des_name AS designation,
                    dep.dep_name AS department,

                    ut.tag_name AS user_type,

                    YEAR(NOW()) AS fiscal_year

                FROM tbl_user u

                LEFT JOIN tbl_employee_master em
                    ON em.id = u.emp_id

                LEFT JOIN tbl_designation d
                    ON d.id = em.des_id

                LEFT JOIN tbl_department dep
                    ON dep.id = em.dep_id

                LEFT JOIN tbl_user_type ut
                    ON ut.id = u.user_type_id

                WHERE u.id = ?
                  AND u.inactive = 0

                LIMIT 1
            `,
            [userId]
        );

        if (rows.length === 0) {
            return req.session.destroy((error) => {
                if (error) {
                    console.error(
                        'Session destroy failed',
                        error
                    );
                }

                res.clearCookie('soul.sid', {
                    httpOnly: true,
                    secure:
                        process.env.NODE_ENV ===
                        'production',
                    sameSite: 'lax',
                });

                return res.status(401).json({
                    success: false,
                    message:
                        'Authentication required',
                });
            });
        }

        const user = rows[0];

        const profileImageUrl =
            getEmployeeProfileImageUrl(
                user.profile_image,
                user.image_location
            );

        return res.status(200).json({
            success: true,

            user: {
                id: user.id,
                user_id: user.user_id,
                emp_id: user.emp_id,

                is_super_admin: Number(user.is_super_admin) === 1,

                employee_id:
                    user.employee_id,

                emp_name:
                    user.emp_name,

                designation:
                    user.designation,

                department:
                    user.department,

                user_type:
                    user.user_type,

                user_type_id:
                    user.user_type_id,

                fiscal_year:
                    user.fiscal_year,

                profile_image_url:
                    profileImageUrl,
            },
        });
    } catch (error) {
        console.error(
            'Current user lookup failed',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};


/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

const logout = (req, res) => {
    if (!req.session) {
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    }

    const sessionId = req.sessionID;
    const userId = req.session.user?.id ?? null;
    const attemptedUserId = req.session.user?.user_id ?? null;

    req.session.destroy((error) => {
        if (error) {
            console.error('Logout session destroy failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to log out',
            });
        }

        res.clearCookie('soul.sid', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        (async () => {
            try {
                await closeUserSession(sessionId);
            } catch (auditError) {
                console.error(
                    'Unable to close tracked user session:',
                    auditError
                );
            }

            await safelyRecordAuthEvent({
                req,
                userId,
                attemptedUserId,
                eventType: 'logout',
            });

            return res.status(200).json({
                success: true,
                message: 'Logged out successfully',
            });
        })().catch((unexpectedError) => {
            console.error('Logout completion failed:', unexpectedError);

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: 'Unable to complete logout',
                });
            }
        });
    });
};


/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
    login,
    me,
    logout,
};