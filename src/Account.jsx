import {
    useEffect,
    useRef,
    useState
} from "react";

import "./App.css";

/* =========================================================
ACCOUNT PAGE
========================================================= */

function Account({
    user,
    logout,
    apiUrl,
    onUserUpdated
}) {

    const fileInputRef = useRef(null);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // =====================================================
    // API URL
    // =====================================================

    const serverUrl = String(apiUrl || "").replace(/\/+$/, "");

    // =====================================================
    // PROVIDER
    // =====================================================

    const providerName =
        user?.provider === "google"
            ? "Google"
            : user?.provider === "facebook"
                ? "Facebook"
                : user?.provider === "development"
                    ? "Development"
                    : user?.provider || "Không xác định";

    const providerIcon =
        user?.provider === "google"
            ? "G"
            : user?.provider === "facebook"
                ? "f"
                : "👤";

    // =====================================================
    // USER NAME
    // =====================================================

    function getUserName() {
        return (
            user?.name ||
            user?.displayName ||
            user?.fullName ||
            user?.username ||
            "Người dùng"
        );
    }

    // =====================================================
    // CURRENT AVATAR
    // =====================================================

    function getAvatar() {
        return (
            previewUrl ||
            user?.avatar ||
            user?.avatar_url ||
            user?.avatarUrl ||
            user?.picture ||
            user?.photoURL ||
            user?.profilePicture ||
            user?.image ||
            ""
        );
    }

    // =====================================================
    // CLICK AVATAR
    // =====================================================

    function handleAvatarClick() {
        if (saving) {
            return;
        }

        if (!fileInputRef.current) {
            console.error("AVATAR INPUT KHÔNG TỒN TẠI");
            return;
        }

        fileInputRef.current.click();
    }

    // =====================================================
    // KEYBOARD
    // =====================================================

    function handleAvatarKeyDown(event) {
        if (
            event.key === "Enter" ||
            event.key === " "
        ) {
            event.preventDefault();
            handleAvatarClick();
        }
    }

    // =====================================================
    // SELECT FILE
    // =====================================================

    function handleAvatarSelected(event) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setMessage("");
        setError("");

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (!allowedTypes.includes(file.type)) {
            setError(
                "Chỉ được chọn ảnh JPG, PNG, WEBP hoặc GIF."
            );

            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError(
                "Ảnh không được vượt quá 5MB."
            );

            event.target.value = "";
            return;
        }

        if (previewUrl) {
            try {
                URL.revokeObjectURL(previewUrl);
            } catch (revokeError) {
                console.warn(
                    "REVOKE OLD PREVIEW ERROR:",
                    revokeError
                );
            }
        }

        const reader =
    new FileReader();

reader.onload = function () {

    setSelectedFile(file);

    setPreviewUrl(
        reader.result
    );

};

reader.onerror = function () {

    console.error(
        "KHÔNG THỂ TẠO PREVIEW ẢNH"
    );

    setSelectedFile(null);

    setPreviewUrl(null);

    setError(
        "Không thể đọc ảnh đã chọn."
    );
};

reader.readAsDataURL(file);

        console.log(
            "AVATAR FILE SELECTED:",
            {
                name: file.name,
                type: file.type,
                size: file.size
            }
        );
    }

    // =====================================================
    // CANCEL
    // =====================================================

    function handleCancelAvatar() {
        if (saving) {
            return;
        }

       

        setSelectedFile(null);
        setPreviewUrl(null);
        setMessage("");
        setError("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    // =====================================================
    // SAVE AVATAR
    // =====================================================

    async function handleSaveAvatar() {
        if (saving) {
            return;
        }

        if (!selectedFile) {
            setError("Vui lòng chọn ảnh trước.");
            return;
        }

        if (!serverUrl) {
            setError(
                "Chưa cấu hình địa chỉ máy chủ."
            );

            console.error(
                "API URL KHÔNG TỒN TẠI:",
                apiUrl
            );

            return;
        }

        if (!user?.id) {
            setError(
                "Không xác định được tài khoản hiện tại."
            );

            console.error(
                "USER KHÔNG CÓ ID:",
                user
            );

            return;
        }

        setSaving(true);
        setMessage("");
        setError("");

        try {
            console.log(
                "======================================"
            );

            console.log("START AVATAR UPLOAD");
            console.log("API URL:", serverUrl);
            console.log("USER ID:", user.id);
            console.log("FILE NAME:", selectedFile.name);
            console.log("FILE TYPE:", selectedFile.type);
            console.log("FILE SIZE:", selectedFile.size);

            // =================================================
            // FORM DATA
            // =================================================

            const formData = new FormData();

            formData.append(
                "avatar",
                selectedFile,
                selectedFile.name
            );

            // =================================================
            // UPLOAD
            // =================================================

            const uploadUrl =
                `${serverUrl}/api/auth/avatar`;

            console.log(
                "UPLOAD URL:",
                uploadUrl
            );

            const response = await fetch(
                uploadUrl,
                {
                    method: "POST",
                    credentials: "include",
                    body: formData
                }
            );

            console.log(
                "UPLOAD STATUS:",
                response.status
            );

            console.log(
                "UPLOAD OK:",
                response.ok
            );

            // =================================================
            // READ RESPONSE
            // =================================================

            const contentType =
                response.headers.get("content-type") || "";

            let uploadData = null;

            if (
                contentType
                    .toLowerCase()
                    .includes("application/json")
            ) {
                uploadData = await response.json();
            } else {
                const text = await response.text();

                console.error(
                    "SERVER KHÔNG TRẢ JSON:",
                    text
                );

                throw new Error(
                    text ||
                    `Server trả về HTTP ${response.status}.`
                );
            }

            console.log(
                "UPLOAD RESPONSE:",
                uploadData
            );

            // =================================================
            // CHECK RESPONSE
            // =================================================

            if (
                !response.ok ||
                !uploadData?.success
            ) {
                throw new Error(
                    uploadData?.message ||
                    `Không thể lưu ảnh. HTTP ${response.status}.`
                );
            }

            // =================================================
            // SERVER MUST RETURN AVATAR
            // =================================================

            const uploadedAvatar =
                uploadData?.user?.avatar;

            if (!uploadedAvatar) {
                throw new Error(
                    "Server báo lưu ảnh thành công nhưng không trả về đường dẫn avatar."
                );
            }

            console.log(
                "SERVER AVATAR:",
                uploadedAvatar
            );

            // =================================================
            // GET CURRENT USER
            // =================================================

            console.log(
                "Đang xác nhận avatar từ database..."
            );

            const meResponse = await fetch(
                `${serverUrl}/api/auth/me`,
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store"
                }
            );

            console.log(
                "AUTH ME STATUS:",
                meResponse.status
            );

            const meContentType =
                meResponse.headers.get("content-type") || "";

            let meData = null;

            if (
                meContentType
                    .toLowerCase()
                    .includes("application/json")
            ) {
                meData = await meResponse.json();
            } else {
                const meText = await meResponse.text();

                console.error(
                    "AUTH ME RESPONSE:",
                    meText
                );

                throw new Error(
                    "Không thể xác nhận tài khoản sau khi lưu ảnh."
                );
            }

            console.log(
                "AUTH ME DATA:",
                meData
            );

            // =================================================
            // UPDATED USER
            // =================================================

            let updatedUser = null;

            if (
                meResponse.ok &&
                meData?.success &&
                meData?.loggedIn &&
                meData?.user
            ) {
                updatedUser = meData.user;
            } else if (uploadData?.user) {
                updatedUser = uploadData.user;
            }

            if (!updatedUser) {
                throw new Error(
                    "Ảnh đã được tải lên nhưng không xác nhận được tài khoản sau khi lưu."
                );
            }

            console.log(
                "UPDATED USER:",
                updatedUser
            );

            console.log(
                "UPDATED AVATAR:",
                updatedUser.avatar
            );

            // =================================================
            // UPDATE USER TOÀN APP
            // =================================================

            if (
                typeof onUserUpdated === "function"
            ) {
                console.log(
                    "CALL onUserUpdated()"
                );

                onUserUpdated(updatedUser);
            } else {
                console.warn(
                    "Account.jsx: onUserUpdated chưa được truyền từ App.jsx"
                );
            }

            // =================================================
            // XÓA PREVIEW
            // =================================================

           

            setSelectedFile(null);
            setPreviewUrl(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            // =================================================
            // SUCCESS
            // =================================================

            setMessage(
                "Đã cập nhật ảnh đại diện."
            );

            setError("");

            console.log(
                "======================================"
            );

            console.log(
                "AVATAR UPDATE SUCCESS"
            );

            console.log(
                "======================================"
            );

        } catch (saveError) {
            console.error(
                "======================================"
            );

            console.error(
                "SAVE AVATAR ERROR"
            );

            console.error(saveError);

            console.error(
                "======================================"
            );

            setError(
                saveError?.message ||
                "Không thể lưu ảnh đại diện."
            );

        } finally {
            setSaving(false);
        }
    }

    // =====================================================
    // CLEAN PREVIEW
    // =====================================================

  useEffect(() => {

    return () => {};

}, []);

    // =====================================================
    // DATE
    // =====================================================

    const createdDate =
        formatDate(user?.created_at);

    const lastLogin =
        formatDateTime(user?.last_login);

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="account-page">

            <div className="account-card">

                {/* PROFILE */}

                <div className="account-profile">

                    <div
                        className="account-avatar-wrap account-avatar-clickable"
                        onClick={handleAvatarClick}
                        role="button"
                        tabIndex={0}
                        onKeyDown={handleAvatarKeyDown}
                        title="Đổi ảnh đại diện"
                    >

                        <Avatar
                            user={{
                                ...user,
                                avatar: getAvatar()
                            }}
                            apiUrl={serverUrl}
                        />

                        <span className="account-online-dot" />

                        <div className="account-avatar-overlay">
                            <span>📷</span>
                            <small>Đổi ảnh</small>
                        </div>

                    </div>

                    <input
                        ref={fileInputRef}
                        id="account-avatar-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        hidden
                        onChange={handleAvatarSelected}
                    />

                    <div className="account-profile-info">

                        <h2>
                            {getUserName()}
                        </h2>

                        <p>
                            {user?.email ||
                                "Không có email"}
                        </p>

                        <span className="account-status">
                            <i />
                            Đang hoạt động
                        </span>

                    </div>

                </div>

                {/* AVATAR EDITOR */}

                {selectedFile && (
                    <div className="account-avatar-editor">

                        <div className="account-avatar-editor-info">

                            <strong>
                                Ảnh đại diện mới
                            </strong>

                            <small>
                                {selectedFile.name}
                            </small>

                        </div>

                        <div className="account-avatar-editor-actions">

                            <button
                                type="button"
                                className="account-avatar-cancel"
                                onClick={handleCancelAvatar}
                                disabled={saving}
                            >
                                Hủy
                            </button>

                            <button
                                type="button"
                                className="account-avatar-save"
                                onClick={handleSaveAvatar}
                                disabled={saving}
                            >
                                {saving
                                    ? "Đang lưu..."
                                    : "💾 Lưu ảnh"}
                            </button>

                        </div>

                    </div>
                )}

                {/* MESSAGE */}

                {message && (
                    <div className="account-avatar-message success">
                        ✓ {message}
                    </div>
                )}

                {error && (
                    <div className="account-avatar-message error">
                        ⚠️ {error}
                    </div>
                )}

                <div className="account-divider" />

                {/* ACCOUNT INFO */}

                <div className="account-section">

                    <div className="account-section-title">

                        <span>👤</span>

                        <div>

                            <strong>
                                Thông tin tài khoản
                            </strong>

                            <small>
                                Thông tin đăng nhập của bạn
                            </small>

                        </div>

                    </div>

                    <div className="account-info-grid">

                        <div className="account-info-item">

                            <span className="account-info-icon">
                                ✉️
                            </span>

                            <div>

                                <small>
                                    Email
                                </small>

                                <strong>
                                    {user?.email ||
                                        "Không có email"}
                                </strong>

                            </div>

                        </div>

                        <div className="account-info-item">

                            <span className="account-info-icon">
                                🔐
                            </span>

                            <div>

                                <small>
                                    Phương thức đăng nhập
                                </small>

                                <strong className="provider-value">

                                    <span
                                        className={`provider-icon provider-${user?.provider || "default"}`}
                                    >
                                        {providerIcon}
                                    </span>

                                    {providerName}

                                </strong>

                            </div>

                        </div>

                        <div className="account-info-item">

                            <span className="account-info-icon">
                                📅
                            </span>

                            <div>

                                <small>
                                    Ngày tham gia
                                </small>

                                <strong>
                                    {createdDate}
                                </strong>

                            </div>

                        </div>

                        <div className="account-info-item">

                            <span className="account-info-icon">
                                🕐
                            </span>

                            <div>

                                <small>
                                    Đăng nhập gần nhất
                                </small>

                                <strong>
                                    {lastLogin}
                                </strong>

                            </div>

                        </div>

                    </div>

                </div>

                {/* SECURITY */}

                <div className="account-section">

                    <div className="account-section-title">

                        <span>🛡️</span>

                        <div>

                            <strong>
                                Bảo mật
                            </strong>

                            <small>
                                Tài khoản của bạn được bảo vệ
                            </small>

                        </div>

                    </div>

                    <div className="security-box">

                        <div className="security-icon">
                            ✓
                        </div>

                        <div className="security-content">

                            <strong>
                                Đăng nhập an toàn
                            </strong>

                            <p>
                                Bạn đang sử dụng phương thức
                                đăng nhập an toàn thông qua{" "}
                                {providerName}.
                            </p>

                        </div>

                        <span className="security-badge">
                            Đã bảo vệ
                        </span>

                    </div>

                </div>

                {/* LOGOUT */}

                <div className="account-actions">

                    <button
                        type="button"
                        className="account-logout-button"
                        onClick={logout}
                        disabled={saving}
                    >

                        <span>
                            🚪
                        </span>

                        <div>

                            <strong>
                                Đăng xuất
                            </strong>

                            <small>
                                Kết thúc phiên đăng nhập hiện tại
                            </small>

                        </div>

                        <span className="account-action-arrow">
                            →
                        </span>

                    </button>

                </div>

            </div>

        </div>
    );
}

/* =========================================================
   AVATAR
========================================================= */

function Avatar({
    user,
    apiUrl
}) {

    const avatar =
        user?.avatar ||
        user?.avatar_url ||
        user?.avatarUrl ||
        user?.picture ||
        user?.photoURL ||
        user?.profilePicture ||
        user?.image ||
        "";

    const [imageError, setImageError] =
        useState(false);

    useEffect(() => {

        setImageError(false);

    }, [avatar]);

    // =====================================================
    // NO AVATAR
    // =====================================================

    if (!avatar) {

        return (
            <div className="avatar avatar-fallback">
                👤
            </div>
        );
    }

    let avatarUrl =
        String(avatar).trim();

    // =====================================================
    // ABSOLUTE URL
    // =====================================================

    const isHttpUrl =
        avatarUrl.startsWith("http://") ||
        avatarUrl.startsWith("https://");

    const isDataUrl =
        avatarUrl.startsWith("data:");

    const isBlobUrl =
        avatarUrl.startsWith("blob:");

    // =====================================================
    // CONVERT RELATIVE URL
    // =====================================================

    if (
        !isHttpUrl &&
        !isDataUrl &&
        !isBlobUrl
    ) {

        const cleanApiUrl =
            String(apiUrl || "")
                .replace(/\/+$/, "");

        if (
            avatarUrl.startsWith("/")
        ) {

            avatarUrl =
                `${cleanApiUrl}${avatarUrl}`;

        } else {

            avatarUrl =
                `${cleanApiUrl}/${avatarUrl}`;
        }
    }

    // =====================================================
    // CACHE BUST
    //
    // KHÔNG được thêm ?v= cho:
    // - blob:
    // - data:
    // - Facebook
    // - Google
    // =====================================================

    const isFacebook =
        avatarUrl.includes(
            "platform-lookaside.fbsbx.com"
        ) ||
        avatarUrl.includes(
            "facebook.com"
        );

    const isGoogle =
        avatarUrl.includes(
            "googleusercontent.com"
        ) ||
        avatarUrl.includes(
            "google.com"
        );

    const shouldCacheBust =
        !isBlobUrl &&
        !isDataUrl &&
        !isFacebook &&
        !isGoogle &&
        (
            avatarUrl.includes(
                "/uploads/avatars/"
            )
        );

    const finalAvatarUrl =
        shouldCacheBust
            ? `${avatarUrl}${
                avatarUrl.includes("?")
                    ? "&"
                    : "?"
            }v=${Date.now()}`
            : avatarUrl;

    // =====================================================
    // RENDER
    // =====================================================

    if (imageError) {

        return (
            <div className="avatar avatar-fallback">
                👤
            </div>
        );
    }

    return (
        <img
            className="avatar-image"
            src={finalAvatarUrl}
            alt={
                user?.name ||
                user?.displayName ||
                "Người dùng"
            }
            referrerPolicy={
                isFacebook
                    ? "no-referrer"
                    : undefined
            }
            onError={() => {

                console.error(
                    "======================================"
                );

                console.error(
                    "AVATAR IMAGE ERROR"
                );

                console.error(
                    "AVATAR:",
                    avatar
                );

                console.error(
                    "FINAL URL:",
                    finalAvatarUrl
                );

                console.error(
                    "======================================"
                );

                setImageError(true);
            }}
        />
    );
}

/* =========================================================
DATE
========================================================= */

function formatDate(value) {

    if (!value) {
        return "Chưa có thông tin";
    }

    const date =
        parseDate(value);

    if (!date) {
        return "Chưa có thông tin";
    }

    return date.toLocaleDateString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

/* =========================================================
DATE TIME
========================================================= */

function formatDateTime(value) {

    if (!value) {
        return "Chưa có thông tin";
    }

    const date =
        parseDate(value);

    if (!date) {
        return "Chưa có thông tin";
    }

    return date.toLocaleString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    );
}

/* =========================================================
PARSE DATE
========================================================= */

function parseDate(value) {

    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? null
            : value;
    }

    const text =
        String(value).trim();

    if (!text) {
        return null;
    }

    // ISO có timezone:
    // 2026-08-12T10:30:00Z
    // 2026-08-12T10:30:00+07:00

    if (
        /[zZ]$/.test(text) ||
        /[+-]\d{2}:?\d{2}$/.test(text)
    ) {

        const parsed =
            new Date(text);

        return Number.isNaN(
            parsed.getTime()
        )
            ? null
            : parsed;
    }

    // ISO không timezone:
    // 2026-08-12T10:30:00
    // 2026-08-12 10:30:00
    //
    // Trường hợp này coi là giờ local của trình duyệt.

    const match =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/
        );

    if (match) {

        const year =
            Number(match[1]);

        const month =
            Number(match[2]);

        const day =
            Number(match[3]);

        const hour =
            Number(match[4]);

        const minute =
            Number(match[5]);

        const second =
            Number(match[6] || 0);

        const millisecond =
            Number(
                (match[7] || "0")
                    .padEnd(3, "0")
            );

        const localDate =
            new Date(
                year,
                month - 1,
                day,
                hour,
                minute,
                second,
                millisecond
            );

        return Number.isNaN(
            localDate.getTime()
        )
            ? null
            : localDate;
    }

    // Fallback

    const fallback =
        new Date(text);

    return Number.isNaN(
        fallback.getTime()
    )
        ? null
        : fallback;
}

export default Account;