require('dotenv').config();

const argon2 = require('argon2');
const pool = require('../config/db');

async function setTestPasswords() {
    try {
        const testPassword = 'Soul@123';

        const passwordHash = await argon2.hash(
            testPassword,
            {
                type: argon2.argon2id,
            }
        );

        const [result] = await pool.execute(
            `
                UPDATE tbl_user
                SET password_hash = ?
            `,
            [passwordHash]
        );

        console.log(
            `Updated password_hash for ${result.affectedRows} users.`
        );

        console.log(
            'Test passwords were hashed using Argon2id.'
        );
    } catch (error) {
        console.error('Unable to create test password hashes.');
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

setTestPasswords();