import {
    useEffect,
    useState,
} from 'react';

const API_ORIGIN =
    'http://127.0.0.1:3000';

function getInitials(name) {
    if (!name) {
        return 'U';
    }

    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 1) {
        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}

function UserAvatar({
    user,
    size = 'medium',
}) {
    const [imageFailed, setImageFailed] =
        useState(false);

    const imageUrl =
        user?.profile_image_url
            ? `${API_ORIGIN}${user.profile_image_url}`
            : null;

    useEffect(() => {
        setImageFailed(false);
    }, [imageUrl]);

    if (imageUrl && !imageFailed) {
        return (
            <img
                className={`user-avatar user-avatar-${size}`}
                src={imageUrl}
                alt=""
                onError={() =>
                    setImageFailed(true)
                }
            />
        );
    }

    return (
        <div
            className={`user-avatar user-avatar-${size} user-avatar-fallback`}
            aria-hidden="true"
        >
            {getInitials(user?.emp_name)}
        </div>
    );
}

export default UserAvatar;