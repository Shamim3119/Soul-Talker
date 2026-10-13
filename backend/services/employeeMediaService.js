const path = require('path');

const PROFILE_MEDIA_URL = '/media/employees/profile';

/**
 * Return only a safe filename.
 *
 * This prevents database values such as:
 * ../../something
 * images/employee/photo.jpg
 * C:\folder\photo.jpg
 *
 * from becoming filesystem paths.
 */
const getSafeFilename = (value) => {
    if (
        typeof value !== 'string' ||
        !value.trim()
    ) {
        return null;
    }

    const normalized = value
        .trim()
        .replace(/\\/g, '/');

    return path.posix.basename(normalized);
};

/**
 * Resolve employee profile image.
 *
 * Priority:
 * 1. profile_image
 * 2. image_location
 * 3. null -> frontend displays default avatar
 */
const getEmployeeProfileImageUrl = (
    profileImage,
    imageLocation
) => {
    const filename =
        getSafeFilename(profileImage) ||
        getSafeFilename(imageLocation);

    if (!filename) {
        return null;
    }

    return `${PROFILE_MEDIA_URL}/${encodeURIComponent(filename)}`;
};

module.exports = {
    getSafeFilename,
    getEmployeeProfileImageUrl,
};