import { useEffect, useRef, useState } from "react";
import "./App.css";

import WorkPage from "./WorkPage";
import Reminders from "./Reminders";
import Account from "./Account";

/* =========================================================
API
========================================================= */

const API_URL =
    "https://my-world-backend-3xwn.onrender.com";

/* =========================================================
PRIVATE PAGES
========================================================= */

const PRIVATE_PAGES = [
    "work",
    "notes",
    "reminders",
    "documents",
    "calendar",
    "my-world",
    "messages",
    "account"
];

/* =========================================================
PAGES
========================================================= */

const PAGES = {
    home: {
        title: "Trang chủ",
        subtitle:
            "Không gian riêng để quản lý công việc, lưu trữ và thư giãn."
    },

    work: {
        title: "Công việc",
        subtitle:
            "Quản lý những việc cần làm và tiến độ công việc của bạn."
    },

    notes: {
        title: "Ghi chú",
        subtitle:
            "Lưu lại những điều quan trọng mà bạn không muốn quên."
    },

    reminders: {
        title: "Nhắc việc",
        subtitle:
            "Theo dõi hạn công việc và nhận thông báo đúng lúc."
    },

    documents: {
        title: "Giấy tờ",
        subtitle:
            "Không gian lưu trữ và quản lý các tài liệu cá nhân."
    },

    calendar: {
        title: "Lịch",
        subtitle:
            "Theo dõi lịch làm việc, cuộc hẹn và những ngày quan trọng."
    },

    "my-world": {
        title: "Góc của tôi",
        subtitle:
            "Thế giới riêng của bạn để nghỉ ngơi, giải trí và kết nối."
    },

    music: {
        title: "Âm nhạc",
        subtitle:
            "Thưởng thức những bài hát yêu thích."
    },

    movies: {
        title: "Phim",
        subtitle:
            "Không gian giải trí của MY WORLD."
    },

    messages: {
        title: "Tin nhắn",
        subtitle:
            "Trò chuyện và kết nối với những người tham gia MY WORLD."
    },

    account: {
        title: "Tài khoản",
        subtitle:
            "Quản lý thông tin và thiết lập cá nhân."
    }
};

/* =========================================================
APP
========================================================= */

function App() {
    const [activePage, setActivePage] = useState("home");

    const [loginOpen, setLoginOpen] = useState(false);

    /*
     * =====================================================
     * USER DUY NHẤT CỦA TOÀN APP
     *
     * Account.jsx không tạo user riêng.
     *
     * Khi avatar thay đổi:
     *
     * Account
     *    ↓
     * onUserUpdated(updatedUser)
     *    ↓
     * setUser(current => ({ ...current, ...updatedUser }))
     *    ↓
     * Sidebar / Topbar / Account cập nhật
     *
     * Quan trọng:
     * Không thay toàn bộ user bằng updatedUser một cách mù quáng.
     * Merge với user cũ để tránh mất các field khác.
     * =====================================================
     */
    const [user, setUser] = useState(null);

    const [checkingLogin, setCheckingLogin] = useState(true);

    /* =====================================================
    NOTIFICATIONS
    ===================================================== */

    const [notifications, setNotifications] = useState([]);

    const [unreadCount, setUnreadCount] = useState(0);

    const [notificationOpen, setNotificationOpen] =
        useState(false);

    const notificationRef = useRef(null);

    /* =====================================================
    NOTIFICATION AUDIO
    ===================================================== */

    const audioContextRef = useRef(null);

    const audioUnlockedRef = useRef(false);

    const knownNotificationIdsRef = useRef(new Set());

    const notificationInitializedRef = useRef(false);

    /* =====================================================
    AUTH
    ===================================================== */

    async function checkLogin() {
        try {
            const response = await fetch(
                `${API_URL}/api/me`,
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        Accept: "application/json"
                    }
                }
            );

            if (!response.ok) {
                setUser(null);
                return;
            }

            const data = await response.json();

            if (
                data.success &&
                data.loggedIn &&
                data.user
            ) {
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error(
                "AUTH CHECK ERROR:",
                error
            );

            setUser(null);
        } finally {
            setCheckingLogin(false);
        }
    }

    /* =====================================================
    INITIALIZE AUTH
    ===================================================== */

    useEffect(() => {
        async function initializeAuth() {
            const params =
                new URLSearchParams(
                    window.location.search
                );

            const loginStatus =
                params.get("login");

            if (loginStatus === "success") {
                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname
                );

                await checkLogin();

                return;
            }

            if (
                loginStatus ===
                "facebook_error"
            ) {
                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname
                );

                alert(
                    "Đăng nhập Facebook thất bại. Vui lòng thử lại."
                );

                await checkLogin();

                return;
            }

            if (
                loginStatus ===
                "google_error"
            ) {
                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname
                );

                alert(
                    "Đăng nhập Google thất bại. Vui lòng thử lại."
                );

                await checkLogin();

                return;
            }

            await checkLogin();
        }

        initializeAuth();
    }, []);

    /* =====================================================
    UNLOCK AUDIO
    ===================================================== */

    function unlockNotificationAudio() {
        try {
            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContext) {
                return;
            }

            if (!audioContextRef.current) {
                audioContextRef.current =
                    new AudioContext();
            }

            const context =
                audioContextRef.current;

            if (
                context.state ===
                "suspended"
            ) {
                context.resume();
            }

            audioUnlockedRef.current = true;
        } catch (error) {
            console.warn(
                "NOTIFICATION AUDIO UNLOCK ERROR:",
                error
            );
        }
    }

    /* =====================================================
    USER INTERACTION -> UNLOCK AUDIO
    ===================================================== */

    useEffect(() => {
        function handleUserInteraction() {
            unlockNotificationAudio();
        }

        window.addEventListener(
            "pointerdown",
            handleUserInteraction,
            {
                passive: true
            }
        );

        window.addEventListener(
            "keydown",
            handleUserInteraction,
            {
                passive: true
            }
        );

        window.addEventListener(
            "touchstart",
            handleUserInteraction,
            {
                passive: true
            }
        );

        return () => {
            window.removeEventListener(
                "pointerdown",
                handleUserInteraction
            );

            window.removeEventListener(
                "keydown",
                handleUserInteraction
            );

            window.removeEventListener(
                "touchstart",
                handleUserInteraction
            );
        };
    }, []);

    /* =====================================================
    PLAY NOTIFICATION SOUND
    ===================================================== */

    function playNotificationSound() {
        try {
            if (!audioUnlockedRef.current) {
                unlockNotificationAudio();
            }

            const context =
                audioContextRef.current;

            if (!context) {
                return;
            }

            if (
                context.state ===
                "suspended"
            ) {
                context.resume().catch(() => {});
            }

            const now =
                context.currentTime;

            createNotificationTone(
                context,
                now,
                880,
                0.0,
                0.11,
                0.055
            );

            createNotificationTone(
                context,
                now,
                1320,
                0.075,
                0.16,
                0.06
            );

            createNotificationTone(
                context,
                now,
                1760,
                0.09,
                0.08,
                0.018
            );
        } catch (error) {
            console.warn(
                "PLAY NOTIFICATION SOUND ERROR:",
                error
            );
        }
    }

    function createNotificationTone(
        context,
        startTime,
        frequency,
        delay,
        duration,
        volume
    ) {
        try {
            const oscillator =
                context.createOscillator();

            const gain =
                context.createGain();

            oscillator.type = "sine";

            oscillator.frequency.setValueAtTime(
                frequency,
                startTime + delay
            );

            gain.gain.setValueAtTime(
                0,
                startTime + delay
            );

            gain.gain.linearRampToValueAtTime(
                volume,
                startTime +
                    delay +
                    0.008
            );

            gain.gain.exponentialRampToValueAtTime(
                0.001,
                startTime +
                    delay +
                    duration
            );

            oscillator.connect(gain);

            gain.connect(
                context.destination
            );

            oscillator.start(
                startTime + delay
            );

            oscillator.stop(
                startTime +
                    delay +
                    duration +
                    0.02
            );
        } catch (error) {
            console.warn(
                "CREATE NOTIFICATION TONE ERROR:",
                error
            );
        }
    }

    /* =====================================================
    DESKTOP NOTIFICATION
    ===================================================== */

    async function showDesktopNotification(
        notification
    ) {
        try {
            if (
                !("Notification" in window)
            ) {
                return;
            }

            if (
                Notification.permission ===
                "default"
            ) {
                const permission =
                    await Notification.requestPermission();

                if (
                    permission !==
                    "granted"
                ) {
                    return;
                }
            }

            if (
                Notification.permission !==
                "granted"
            ) {
                return;
            }

            const title =
                notification?.title ||
                "MY WORLD";

            const body =
                notification?.content ||
                "Bạn có thông báo mới.";

            const desktop =
                new Notification(
                    title,
                    {
                        body,
                        icon: "/favicon.ico",
                        tag:
                            "my-world-notification-" +
                            notification.id
                    }
                );

            desktop.onclick = () => {
                window.focus();

                desktop.close();

                setNotificationOpen(true);
            };
        } catch (error) {
            console.warn(
                "DESKTOP NOTIFICATION ERROR:",
                error
            );
        }
    }

    /* =====================================================
    NOTIFICATION STORAGE KEY
    ===================================================== */

    function getNotificationStorageKey() {
        const userKey =
            user?.id ||
            user?.email ||
            user?.username ||
            "guest";

        return (
            "my-world-known-notifications-" +
            String(userKey)
        );
    }

    /* =====================================================
    LOAD KNOWN NOTIFICATION IDS
    ===================================================== */

    function loadKnownNotificationIds() {
        try {
            const key =
                getNotificationStorageKey();

            const saved =
                localStorage.getItem(key);

            if (!saved) {
                knownNotificationIdsRef.current =
                    new Set();

                return;
            }

            const ids =
                JSON.parse(saved);

            if (
                Array.isArray(ids)
            ) {
                knownNotificationIdsRef.current =
                    new Set(
                        ids.map((id) =>
                            String(id)
                        )
                    );
            }
        } catch (error) {
            console.warn(
                "LOAD KNOWN NOTIFICATION IDS ERROR:",
                error
            );

            knownNotificationIdsRef.current =
                new Set();
        }
    }

    /* =====================================================
    SAVE KNOWN NOTIFICATION IDS
    ===================================================== */

    function saveKnownNotificationIds() {
        try {
            const key =
                getNotificationStorageKey();

            const ids =
                Array.from(
                    knownNotificationIdsRef.current
                );

            const trimmed =
                ids.slice(-300);

            localStorage.setItem(
                key,
                JSON.stringify(trimmed)
            );
        } catch (error) {
            console.warn(
                "SAVE KNOWN NOTIFICATION IDS ERROR:",
                error
            );
        }
    }

    /* =====================================================
    REGISTER NOTIFICATIONS
    ===================================================== */

    function processIncomingNotifications(
        incomingNotifications
    ) {
        if (
            !Array.isArray(
                incomingNotifications
            )
        ) {
            return;
        }

        if (
            !notificationInitializedRef.current
        ) {
            incomingNotifications.forEach(
                (notification) => {
                    if (
                        notification?.id !==
                        undefined
                    ) {
                        knownNotificationIdsRef.current.add(
                            String(
                                notification.id
                            )
                        );
                    }
                }
            );

            notificationInitializedRef.current =
                true;

            saveKnownNotificationIds();

            return;
        }

        const newNotifications =
            incomingNotifications.filter(
                (notification) => {
                    if (
                        notification?.id ===
                        undefined
                    ) {
                        return false;
                    }

                    return !knownNotificationIdsRef.current.has(
                        String(
                            notification.id
                        )
                    );
                }
            );

        if (!newNotifications.length) {
            return;
        }

        newNotifications.forEach(
            (notification) => {
                knownNotificationIdsRef.current.add(
                    String(
                        notification.id
                    )
                );
            }
        );

        saveKnownNotificationIds();

        playNotificationSound();

        const newestNotification =
            newNotifications[
                newNotifications.length - 1
            ];

        showDesktopNotification(
            newestNotification
        );
    }

    /* =====================================================
    FETCH NOTIFICATIONS
    ===================================================== */

    async function fetchNotifications() {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);

            return;
        }

        try {
            const response =
                await fetch(
                    `${API_URL}/api/notifications`,
                    {
                        method: "GET",
                        credentials: "include",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            if (
                response.status ===
                401
            ) {
                return;
            }

            const data =
                await response.json();

            if (
                data.success &&
                Array.isArray(
                    data.notifications
                )
            ) {
                processIncomingNotifications(
                    data.notifications
                );

                setNotifications(
                    data.notifications
                );

                const count =
                    data.notifications.filter(
                        (item) =>
                            Number(
                                item.is_read
                            ) === 0
                    ).length;

                setUnreadCount(count);
            }
        } catch (error) {
            console.error(
                "FETCH NOTIFICATIONS ERROR:",
                error
            );
        }
    }

    /* =====================================================
    LOAD NOTIFICATIONS WHEN LOGIN
    ===================================================== */

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            setNotificationOpen(false);

            notificationInitializedRef.current =
                false;

            knownNotificationIdsRef.current =
                new Set();

            return;
        }

        loadKnownNotificationIds();

        notificationInitializedRef.current =
            false;

        fetchNotifications();
    }, [user]);

    /* =====================================================
    POLLING 5 SECONDS
    ===================================================== */

    useEffect(() => {
        if (!user) {
            return;
        }

        const notificationInterval =
            setInterval(() => {
                fetchNotifications();
            }, 5000);

        return () => {
            clearInterval(
                notificationInterval
            );
        };
    }, [user]);

    /* =====================================================
    CLOSE NOTIFICATION DROPDOWN
    ===================================================== */

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                notificationRef.current &&
                !notificationRef.current.contains(
                    event.target
                )
            ) {
                setNotificationOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    /* =====================================================
    OPEN NOTIFICATIONS
    ===================================================== */

    async function openNotifications() {
        unlockNotificationAudio();

        const nextState =
            !notificationOpen;

        setNotificationOpen(nextState);

        if (nextState) {
            await fetchNotifications();
        }
    }

    /* =====================================================
    MARK ONE NOTIFICATION AS READ
    ===================================================== */

    async function markNotificationRead(
        notificationId
    ) {
        try {
            const target =
                notifications.find(
                    (item) =>
                        String(item.id) ===
                        String(notificationId)
                );

            const wasUnread =
                target &&
                Number(target.is_read) === 0;

            const response =
                await fetch(
                    `${API_URL}/api/notifications/${notificationId}/read`,
                    {
                        method: "PATCH",
                        credentials: "include",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const data =
                await response.json();

            if (data.success) {
                setNotifications(
                    (current) =>
                        current.map(
                            (notification) =>
                                String(
                                    notification.id
                                ) ===
                                String(
                                    notificationId
                                )
                                    ? {
                                          ...notification,
                                          is_read: 1
                                      }
                                    : notification
                        )
                );

                if (wasUnread) {
                    setUnreadCount(
                        (current) =>
                            Math.max(
                                0,
                                current - 1
                            )
                    );
                }
            }
        } catch (error) {
            console.error(
                "MARK NOTIFICATION READ ERROR:",
                error
            );
        }
    }

    /* =====================================================
    MARK ALL AS READ
    ===================================================== */

    async function markAllNotificationsRead() {
        if (unreadCount === 0) {
            return;
        }

        try {
            const response =
                await fetch(
                    `${API_URL}/api/notifications/read-all`,
                    {
                        method: "PATCH",
                        credentials: "include",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const data =
                await response.json();

            if (data.success) {
                setNotifications(
                    (current) =>
                        current.map(
                            (notification) => ({
                                ...notification,
                                is_read: 1
                            })
                        )
                );

                setUnreadCount(0);
            }
        } catch (error) {
            console.error(
                "MARK ALL NOTIFICATIONS READ ERROR:",
                error
            );
        }
    }

    /* =====================================================
    DELETE NOTIFICATION
    ===================================================== */

    async function deleteNotification(
        notificationId
    ) {
        try {
            const notification =
                notifications.find(
                    (item) =>
                        String(item.id) ===
                        String(notificationId)
                );

            const response =
                await fetch(
                    `${API_URL}/api/notifications/${notificationId}`,
                    {
                        method: "DELETE",
                        credentials: "include",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const data =
                await response.json();

            if (data.success) {
                setNotifications(
                    (current) =>
                        current.filter(
                            (item) =>
                                String(item.id) !==
                                String(
                                    notificationId
                                )
                        )
                );

                if (
                    notification &&
                    Number(
                        notification.is_read
                    ) === 0
                ) {
                    setUnreadCount(
                        (current) =>
                            Math.max(
                                0,
                                current - 1
                            )
                    );
                }
            }
        } catch (error) {
            console.error(
                "DELETE NOTIFICATION ERROR:",
                error
            );
        }
    }

    /* =====================================================
    OPEN PAGE
    ===================================================== */

    function openPage(page) {
        if (
            PRIVATE_PAGES.includes(page) &&
            !user
        ) {
            setLoginOpen(true);

            return;
        }

        setActivePage(page);
    }

    function openPublicPage(page) {
        setActivePage(page);
    }

    /* =====================================================
    FACEBOOK LOGIN
    ===================================================== */

    function loginWithFacebook() {
        window.location.href =
            `${API_URL}/api/auth/facebook`;
    }

    /* =====================================================
    GOOGLE LOGIN
    ===================================================== */

    function loginWithGoogle() {
        window.location.href =
            `${API_URL}/api/auth/google`;
    }

    /* =====================================================
    LOGOUT
    ===================================================== */

    async function logout() {
        try {
            const response =
                await fetch(
                    `${API_URL}/api/auth/logout`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const data =
                await response.json();

            if (data.success) {
                setUser(null);

                setLoginOpen(false);

                setNotificationOpen(false);

                setNotifications([]);

                setUnreadCount(0);

                notificationInitializedRef.current =
                    false;

                knownNotificationIdsRef.current =
                    new Set();

                setActivePage("home");
            }
        } catch (error) {
            console.error(
                "LOGOUT ERROR:",
                error
            );
        }
    }

    /* =====================================================
    LOADING
    ===================================================== */

    if (checkingLogin) {
        return (
            <div className="app-loading">
                <div className="loading-orb">
                    🌎
                </div>

                <div className="loading-title">
                    MY WORLD
                </div>

                <div className="loading-text">
                    Đang chuẩn bị không gian của bạn...
                </div>

                <div className="loading-line">
                    <span />
                </div>
            </div>
        );
    }

    /* =====================================================
    APP
    ===================================================== */

    return (
        <div className="app">
            {/* ================= SIDEBAR ================= */}

            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-logo">
                        🌎
                    </div>

                    <div className="brand-text">
                        <strong>
                            MY WORLD
                        </strong>

                        <span>
                            PHAN VIỆT
                        </span>
                    </div>
                </div>

                <div className="sidebar-scroll">
                    <div className="menu-title">
                        KHÔNG GIAN CỦA TÔI
                    </div>

                    <nav className="menu">
                        <MenuItem
                            icon="⌂"
                            label="Trang chủ"
                            active={
                                activePage ===
                                "home"
                            }
                            onClick={() =>
                                openPublicPage(
                                    "home"
                                )
                            }
                        />

                        <MenuItem
                            icon="💼"
                            label="Công việc"
                            locked={!user}
                            active={
                                activePage ===
                                "work"
                            }
                            onClick={() =>
                                openPage("work")
                            }
                        />

                        <MenuItem
                            icon="📝"
                            label="Ghi chú"
                            locked={!user}
                            active={
                                activePage ===
                                "notes"
                            }
                            onClick={() =>
                                openPage("notes")
                            }
                        />

                        <MenuItem
                            icon="⏰"
                            label="Nhắc việc"
                            locked={!user}
                            active={
                                activePage ===
                                "reminders"
                            }
                            onClick={() =>
                                openPage(
                                    "reminders"
                                )
                            }
                        />

                        <MenuItem
                            icon="📁"
                            label="Giấy tờ"
                            locked={!user}
                            active={
                                activePage ===
                                "documents"
                            }
                            onClick={() =>
                                openPage(
                                    "documents"
                                )
                            }
                        />

                        <MenuItem
                            icon="📅"
                            label="Lịch"
                            locked={!user}
                            active={
                                activePage ===
                                "calendar"
                            }
                            onClick={() =>
                                openPage(
                                    "calendar"
                                )
                            }
                        />
                    </nav>

                    <div className="menu-title">
                        GÓC CỦA TÔI
                    </div>

                    <nav className="menu">
                        <MenuItem
                            icon="🌙"
                            label="Góc của tôi"
                            special
                            locked={!user}
                            active={
                                activePage ===
                                "my-world"
                            }
                            onClick={() =>
                                openPage(
                                    "my-world"
                                )
                            }
                        />

                        <MenuItem
                            icon="🎵"
                            label="Âm nhạc"
                            active={
                                activePage ===
                                "music"
                            }
                            onClick={() =>
                                openPublicPage(
                                    "music"
                                )
                            }
                        />

                        <MenuItem
                            icon="🎬"
                            label="Phim"
                            active={
                                activePage ===
                                "movies"
                            }
                            onClick={() =>
                                openPublicPage(
                                    "movies"
                                )
                            }
                        />

                        <MenuItem
                            icon="💬"
                            label="Tin nhắn"
                            locked={!user}
                            active={
                                activePage ===
                                "messages"
                            }
                            onClick={() =>
                                openPage(
                                    "messages"
                                )
                            }
                        />
                    </nav>

                    <div className="sidebar-mini-card">
                        <div className="mini-card-icon">
                            ✦
                        </div>

                        <div>
                            <strong>
                                MY WORLD
                            </strong>

                            <span>
                                Không gian của riêng bạn
                            </span>
                        </div>
                    </div>
                </div>

                <div className="sidebar-bottom">
                    {user ? (
                        <button
                            type="button"
                            className="profile-button"
                            onClick={() =>
                                openPage(
                                    "account"
                                )
                            }
                        >
                            <Avatar
                                user={user}
                            />

                            <div className="profile-text">
                                <strong>
                                    {getUserName(
                                        user
                                    )}
                                </strong>

                                <span>
                                    <i />
                                    Đang hoạt động
                                </span>
                            </div>

                            <span className="profile-arrow">
                                ›
                            </span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="profile-button guest"
                            onClick={() =>
                                setLoginOpen(
                                    true
                                )
                            }
                        >
                            <div className="avatar">
                                👤
                            </div>

                            <div className="profile-text">
                                <strong>
                                    Khách
                                </strong>

                                <span>
                                    Đăng nhập khi cần
                                </span>
                            </div>

                            <span className="profile-arrow">
                                ›
                            </span>
                        </button>
                    )}
                </div>
            </aside>

            {/* ================= MAIN ================= */}

            <main className="main">
                <header className="topbar">
                    <div className="breadcrumb">
                        <span>
                            MY WORLD
                        </span>

                        <b>
                            /
                        </b>

                        <strong>
                            {
                                PAGES[
                                    activePage
                                ]?.title
                            }
                        </strong>
                    </div>

                    <div className="top-actions">
                        <div className="top-date">
                            <span>
                                {new Date().toLocaleDateString(
                                    "vi-VN",
                                    {
                                        weekday:
                                            "long",
                                        day:
                                            "2-digit",
                                        month:
                                            "2-digit",
                                        year:
                                            "numeric"
                                    }
                                )}
                            </span>
                        </div>

                        {/* ================= NOTIFICATION ================= */}

                        {user && (
                            <div
                                className="notification-wrapper"
                                ref={
                                    notificationRef
                                }
                            >
                                <button
                                    type="button"
                                    className={[
                                        "notification-button",
                                        notificationOpen
                                            ? "active"
                                            : ""
                                    ]
                                        .filter(
                                            Boolean
                                        )
                                        .join(
                                            " "
                                        )}
                                    onClick={
                                        openNotifications
                                    }
                                    aria-label="Thông báo"
                                    title="Thông báo"
                                >
                                    <span className="notification-bell">
                                        🔔
                                    </span>

                                    {unreadCount >
                                        0 && (
                                        <span className="notification-badge">
                                            {unreadCount >
                                            99
                                                ? "99+"
                                                : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {notificationOpen && (
                                    <NotificationDropdown
                                        notifications={
                                            notifications
                                        }
                                        unreadCount={
                                            unreadCount
                                        }
                                        onMarkRead={
                                            markNotificationRead
                                        }
                                        onMarkAllRead={
                                            markAllNotificationsRead
                                        }
                                        onDelete={
                                            deleteNotification
                                        }
                                    />
                                )}
                            </div>
                        )}

                        {/* ================= USER ================= */}

                        {user ? (
                            <div className="social-profile">
                                <div className="social-avatar-wrap">
                                    <Avatar
                                        user={user}
                                    />

                                    <span className="online-dot" />
                                </div>

                                <div className="social-user-info">
                                    <strong>
                                        {getUserName(
                                            user
                                        )}
                                    </strong>

                                    <span>
                                        <i />
                                        Đang hoạt động
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="social-logout"
                                    onClick={
                                        logout
                                    }
                                    title="Đăng xuất"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M10 17L15 12L10 7"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />

                                        <path
                                            d="M15 12H3"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />

                                        <path
                                            d="M21 19V5C21 3.89543 20.1046 3 19 3H13"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="top-button"
                                onClick={() =>
                                    setLoginOpen(
                                        true
                                    )
                                }
                            >
                                🔐
                                <span>
                                    Đăng nhập
                                </span>
                            </button>
                        )}
                    </div>
                </header>

                <section className="content">
                    {activePage ===
                    "home" ? (
                        <HomePage
                            user={user}
                            openPage={
                                openPage
                            }
                            openPublicPage={
                                openPublicPage
                            }
                            setLoginOpen={
                                setLoginOpen
                            }
                        />
                    ) : (
                        <InnerPage
                            page={
                                activePage
                            }
                            user={user}
                            setUser={setUser}
                            logout={
                                logout
                            }
                            setLoginOpen={
                                setLoginOpen
                            }
                            apiUrl={
                                API_URL
                            }
                        />
                    )}
                </section>
            </main>

            {/* ================= LOGIN MODAL ================= */}

            {loginOpen && (
                <div
                    className="modal-overlay"
                    onClick={() =>
                        setLoginOpen(
                            false
                        )
                    }
                >
                    <div
                        className="login-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <button
                            type="button"
                            className="modal-close"
                            onClick={() =>
                                setLoginOpen(
                                    false
                                )
                            }
                        >
                            ×
                        </button>

                        <div className="login-header">
                            <div className="login-logo">
                                🌎
                            </div>

                            <div className="login-kicker">
                                MY WORLD
                            </div>

                            <h2>
                                Chào mừng trở lại
                            </h2>

                            <p>
                                Đăng nhập để bước
                                vào không gian
                                riêng của bạn.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="oauth-button facebook"
                            onClick={
                                loginWithFacebook
                            }
                        >
                            <span className="oauth-icon facebook-icon">
                                f
                            </span>

                            <span className="oauth-text">
                                Tiếp tục với Facebook
                            </span>

                            <span className="oauth-arrow">
                                →
                            </span>
                        </button>

                        <button
                            type="button"
                            className="oauth-button google"
                            onClick={
                                loginWithGoogle
                            }
                        >
                            <span className="oauth-icon google-icon">
                                G
                            </span>

                            <span className="oauth-text">
                                Tiếp tục với Google
                            </span>

                            <span className="oauth-arrow">
                                →
                            </span>
                        </button>

                        <div className="login-divider">
                            <span />

                            <small>
                                hoặc
                            </small>

                            <span />
                        </div>

                        <button
                            type="button"
                            className="guest-login-button"
                            onClick={() =>
                                setLoginOpen(
                                    false
                                )
                            }
                        >
                            Tiếp tục với tư cách khách
                        </button>

                        <div className="login-note">
                            <span>
                                🔒
                            </span>

                            <span>
                                Đăng nhập an toàn.
                                <br />
                                Bạn có thể đăng xuất
                                bất cứ lúc nào.
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* =====================================================
NOTIFICATION DROPDOWN
===================================================== */

function NotificationDropdown({
    notifications,
    unreadCount,
    onMarkRead,
    onMarkAllRead,
    onDelete
}) {
    return (
        <div className="notification-dropdown">
            <div className="notification-dropdown-header">
                <div className="notification-header-left">
                    <div className="notification-header-icon">
                        🔔
                    </div>

                    <div className="notification-header-text">
                        <strong>
                            Thông báo
                        </strong>

                        <span>
                            {unreadCount > 0
                                ? `${unreadCount} chưa đọc`
                                : "Tất cả đã đọc"}
                        </span>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <button
                        type="button"
                        className="notification-read-all"
                        onClick={
                            onMarkAllRead
                        }
                    >
                        Đánh dấu đã đọc
                    </button>
                )}
            </div>

            <div className="notification-list">
                {!notifications.length ? (
                    <div className="notification-empty">
                        <div className="notification-empty-icon">
                            🔔
                        </div>

                        <strong>
                            Chưa có thông báo
                        </strong>

                        <p>
                            Khi có thông báo mới,
                            chúng sẽ xuất hiện ở đây.
                        </p>
                    </div>
                ) : (
                    notifications.map(
                        (notification) => (
                            <NotificationItem
                                key={
                                    notification.id
                                }
                                notification={
                                    notification
                                }
                                onMarkRead={
                                    onMarkRead
                                }
                                onDelete={
                                    onDelete
                                }
                            />
                        )
                    )
                )}
            </div>

            {notifications.length > 0 && (
                <div className="notification-dropdown-footer">
                    Hiển thị tối đa 50 thông báo gần nhất
                </div>
            )}
        </div>
    );
}

/* =====================================================
NOTIFICATION ITEM
===================================================== */

function NotificationItem({
    notification,
    onMarkRead,
    onDelete
}) {
    const isUnread =
        Number(notification.is_read) === 0;

    return (
        <div
            className={[
                "notification-item",
                isUnread ? "unread" : ""
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <button
                type="button"
                className="notification-main"
                onClick={() => {
                    if (isUnread) {
                        onMarkRead(
                            notification.id
                        );
                    }
                }}
            >
                <div className="notification-item-icon">
                    {notification.type ===
                    "reminder"
                        ? "⏰"
                        : "🔔"}
                </div>

                <div className="notification-item-content">
                    <div className="notification-item-title-row">
                        <strong>
                            {notification.title ||
                                "Thông báo"}
                        </strong>

                        {isUnread && (
                            <span className="notification-unread-dot" />
                        )}
                    </div>

                    <p>
                        {notification.content ||
                            "Bạn có một thông báo mới."}
                    </p>

                    <span className="notification-time">
                        {formatNotificationDate(
                            notification.created_at
                        )}
                    </span>
                </div>
            </button>

            <button
                type="button"
                className="notification-delete"
                onClick={(event) => {
                    event.stopPropagation();

                    onDelete(
                        notification.id
                    );
                }}
                title="Xóa thông báo"
                aria-label="Xóa thông báo"
            >
                ×
            </button>
        </div>
    );
}

/* =====================================================
PARSE NOTIFICATION DATE
===================================================== */

function parseNotificationDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(
            value.getTime()
        )
            ? null
            : value;
    }

    const text =
        String(value).trim();

    /*
     * ISO có timezone rõ ràng.
     */

    if (
        /[zZ]$/.test(text) ||
        /[+-]\d{2}:?\d{2}$/.test(text)
    ) {
        const parsed =
            new Date(text);

        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {
            return parsed;
        }
    }

    /*
     * Database:
     *
     * 2026-08-12 00:49:12
     * 2026-08-12T00:49:12
     * 2026-08-12 00:49:12.123
     *
     * được xem là UTC.
     */

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

        const utcTime =
            Date.UTC(
                year,
                month - 1,
                day,
                hour,
                minute,
                second,
                millisecond
            );

        const utcDate =
            new Date(utcTime);

        if (
            !Number.isNaN(
                utcDate.getTime()
            )
        ) {
            return utcDate;
        }
    }

    const fallback =
        new Date(text);

    return Number.isNaN(
        fallback.getTime()
    )
        ? null
        : fallback;
}

/* =====================================================
FORMAT NOTIFICATION DATE
===================================================== */

function formatNotificationDate(
    value
) {
    if (!value) {
        return "";
    }

    const date =
        parseNotificationDate(value);

    if (!date) {
        return String(value);
    }

    const now =
        new Date();

    const diff =
        now.getTime() -
        date.getTime();

    const minute =
        60 * 1000;

    const hour =
        60 * minute;

    const day =
        24 * hour;

    if (
        diff >= 0 &&
        diff < minute
    ) {
        return "Vừa xong";
    }

    if (
        diff >= minute &&
        diff < hour
    ) {
        return `${Math.floor(
            diff / minute
        )} phút trước`;
    }

    if (
        diff >= hour &&
        diff < day
    ) {
        return `${Math.floor(
            diff / hour
        )} giờ trước`;
    }

    if (
        diff >= day &&
        diff < 2 * day
    ) {
        return "Hôm qua";
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

/* =====================================================
HOME PAGE
===================================================== */

function HomePage({
    user,
    openPage,
    openPublicPage,
    setLoginOpen
}) {
    return (
        <>
            <section className="hero">
                <div className="hero-content">
                    <div className="hero-label">
                        <span>
                            ✦
                        </span>

                        YOUR PERSONAL WORLD
                    </div>

                    <h1>
                        Chào mừng{" "}
                        {user
                            ? getFirstName(
                                  user
                              )
                            : "bạn"}
                        <br />
                        đến với{" "}
                        <span>
                            MY WORLD
                        </span>
                    </h1>

                    <p>
                        Một không gian duy nhất để
                        quản lý công việc, ghi chú,
                        giấy tờ và tận hưởng thời gian
                        riêng của bạn.
                    </p>

                    <div className="hero-actions">
                        <button
                            type="button"
                            className="primary-button"
                            onClick={() =>
                                user
                                    ? openPage(
                                          "work"
                                      )
                                    : setLoginOpen(
                                          true
                                      )
                            }
                        >
                            🚀
                            {user
                                ? " Vào MY WORLD"
                                : " Bắt đầu sử dụng"}
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                                openPublicPage(
                                    "music"
                                )
                            }
                        >
                            🎵
                            Thư giãn
                        </button>
                    </div>

                    <div className="hero-status">
                        <span className="status-dot" />

                        <span>
                            Hệ thống đang hoạt động
                        </span>

                        <b>
                            •
                        </b>

                        <span>
                            MY WORLD
                        </span>
                    </div>
                </div>

                <div className="hero-orbit">
                    <div className="orbit-glow" />

                    <div className="orbit-ring ring-one" />
                    <div className="orbit-ring ring-two" />
                    <div className="orbit-ring ring-three" />

                    <div className="orbit-card card-one">
                        <span>
                            💼
                        </span>

                        Công việc
                    </div>

                    <div className="orbit-card card-two">
                        <span>
                            📝
                        </span>

                        Ghi chú
                    </div>

                    <div className="orbit-card card-three">
                        <span>
                            🎵
                        </span>

                        Âm nhạc
                    </div>

                    <div className="orbit-card card-four">
                        <span>
                            🌙
                        </span>

                        Góc của tôi
                    </div>

                    <div className="world-core">
                        🌎
                    </div>
                </div>
            </section>

            <section className="dashboard-stats">
                <StatCard
                    icon="💼"
                    number="0"
                    label="Công việc"
                    text="Việc cần xử lý"
                />

                <StatCard
                    icon="📝"
                    number="0"
                    label="Ghi chú"
                    text="Ghi chú của bạn"
                />

                <StatCard
                    icon="⏰"
                    number="0"
                    label="Nhắc việc"
                    text="Đang chờ"
                />

                <StatCard
                    icon="📁"
                    number="0"
                    label="Tài liệu"
                    text="Tài liệu lưu trữ"
                />
            </section>

            <section className="section">
                <div className="section-heading">
                    <div>
                        <span className="section-kicker">
                            MY SPACE
                        </span>

                        <h2>
                            Mọi thứ bạn cần
                        </h2>
                    </div>

                    <p>
                        Những công cụ quan trọng được
                        tập trung tại một nơi.
                    </p>
                </div>

                <div className="feature-grid">
                    <FeatureCard
                        icon="💼"
                        title="Công việc"
                        text="Theo dõi công việc và tiến độ."
                        locked={!user}
                        onClick={() =>
                            openPage(
                                "work"
                            )
                        }
                    />

                    <FeatureCard
                        icon="📝"
                        title="Ghi chú"
                        text="Viết và lưu những điều quan trọng."
                        locked={!user}
                        onClick={() =>
                            openPage(
                                "notes"
                            )
                        }
                    />

                    <FeatureCard
                        icon="⏰"
                        title="Nhắc việc"
                        text="Không bỏ quên những việc quan trọng."
                        locked={!user}
                        onClick={() =>
                            openPage(
                                "reminders"
                            )
                        }
                    />

                    <FeatureCard
                        icon="📁"
                        title="Giấy tờ"
                        text="Quản lý tài liệu và hồ sơ."
                        locked={!user}
                        onClick={() =>
                            openPage(
                                "documents"
                            )
                        }
                    />
                </div>
            </section>

            <section className="home-columns">
                <div className="recent-card">
                    <div className="card-heading">
                        <div>
                            <span>
                                OVERVIEW
                            </span>

                            <h3>
                                Hoạt động gần đây
                            </h3>
                        </div>

                        <button type="button">
                            Xem tất cả
                        </button>
                    </div>

                    <div className="empty-activity">
                        <div className="empty-icon">
                            ✦
                        </div>

                        <strong>
                            Chưa có hoạt động
                        </strong>

                        <p>
                            Những hoạt động của bạn sẽ
                            xuất hiện tại đây.
                        </p>
                    </div>
                </div>

                <div className="calendar-card">
                    <div className="card-heading">
                        <div>
                            <span>
                                TODAY
                            </span>

                            <h3>
                                Lịch của bạn
                            </h3>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                openPage(
                                    "calendar"
                                )
                            }
                        >
                            →
                        </button>
                    </div>

                    <div className="calendar-empty">
                        <div className="calendar-big">
                            📅
                        </div>

                        <strong>
                            Chưa có lịch
                        </strong>

                        <p>
                            Thêm lịch hoặc cuộc hẹn đầu
                            tiên của bạn.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                openPage(
                                    "calendar"
                                )
                            }
                        >
                            Mở lịch
                        </button>
                    </div>
                </div>
            </section>

            <section className="relax-section">
                <div className="relax-content">
                    <span className="section-kicker">
                        AFTER WORK
                    </span>

                    <h2>
                        Về nhà rồi,
                        <br />
                        hãy vào{" "}
                        <span>
                            Góc của tôi.
                        </span>
                    </h2>

                    <p>
                        Nghe nhạc, xem phim, trò chuyện
                        hoặc đơn giản là tận hưởng khoảng
                        thời gian của riêng bạn.
                    </p>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                            user
                                ? openPage(
                                      "my-world"
                                  )
                                : setLoginOpen(
                                      true
                                  )
                        }
                    >
                        🌙 Khám phá Góc của tôi
                    </button>
                </div>

                <div className="relax-visual">
                    <div className="stars">
                        ✦　·　✧　　·　✦
                    </div>

                    <div className="moon">
                        🌙
                    </div>

                    <div className="relax-orbit" />
                </div>
            </section>
        </>
    );
}

/* =====================================================
INNER PAGE
===================================================== */

function InnerPage({
    page,
    user,
    setUser,
    logout,
    setLoginOpen,
    apiUrl
}) {
    const pageData = PAGES[page];

    function handleUserUpdated(updatedUser) {
        if (!updatedUser) {
            return;
        }

        setUser((currentUser) => {
            const nextUser = {
                ...(currentUser || {}),
                ...updatedUser
            };

            return nextUser;
        });
    }

    return (
        <section className="inner-page">
            <div className="inner-header">
                <div>
                    <span className="section-kicker">
                        MY WORLD
                    </span>

                    <h1>
                        {pageData?.title}
                    </h1>

                    <p>
                        {pageData?.subtitle}
                    </p>
                </div>

                <div className="inner-icon">
                    {getPageIcon(page)}
                </div>
            </div>

            {page === "work" && user ? (
                <WorkPage
                    apiUrl={apiUrl}
                />
            ) : page === "reminders" && user ? (
                <Reminders
                    apiUrl={apiUrl}
                />
            ) : page === "account" && user ? (
                <Account
                    user={user}
                    logout={logout}
                    apiUrl={apiUrl}
                    onUserUpdated={handleUserUpdated}
                />
            ) : (
                <div className="coming-card">
                    <div className="coming-icon">
                        {getPageIcon(page)}
                    </div>

                    <h2>
                        Không gian{" "}
                        {pageData?.title}
                    </h2>

                    <p>
                        Khu vực này đã sẵn sàng
                        để phát triển tiếp.
                    </p>

                    {!user &&
                        PRIVATE_PAGES.includes(page) && (
                            <button
                                type="button"
                                className="primary-button"
                                onClick={() =>
                                    setLoginOpen(true)
                                }
                            >
                                🔐 Đăng nhập để tiếp tục
                            </button>
                        )}
                </div>
            )}
        </section>
    );
}

/* =====================================================
MENU ITEM
===================================================== */

function MenuItem({
    icon,
    label,
    active = false,
    locked = false,
    special = false,
    onClick
}) {
    return (
        <button
            type="button"
            className={[
                "menu-item",
                active
                    ? "active"
                    : "",
                special
                    ? "special"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={onClick}
        >
            <span className="menu-icon">
                {icon}
            </span>

            <span className="menu-label">
                {label}
            </span>

            {locked && (
                <span className="menu-lock">
                    🔒
                </span>
            )}
        </button>
    );
}

/* =====================================================
AVATAR
===================================================== */

function Avatar({ user }) {
    const rawAvatar =
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
    }, [rawAvatar]);

    /*
     * Không có avatar
     */
    if (!rawAvatar || imageError) {
        return (
            <div className="avatar avatar-fallback">
                👤
            </div>
        );
    }

    let avatarUrl =
        String(rawAvatar).trim();

    /*
     * Avatar local từ backend:
     *
     * /uploads/avatars/avatar-1-xxx.jpg
     *
     * phải luôn lấy từ BACKEND Render,
     * không lấy từ domain frontend.
     */
    if (
        !avatarUrl.startsWith("http://") &&
        !avatarUrl.startsWith("https://") &&
        !avatarUrl.startsWith("data:") &&
        !avatarUrl.startsWith("blob:")
    ) {
        if (!avatarUrl.startsWith("/")) {
            avatarUrl = `/${avatarUrl}`;
        }

        avatarUrl =
            `${API_URL}${avatarUrl}`;
    }

    /*
     * Chỉ thêm cache-busting dựa trên URL avatar.
     *
     * KHÔNG dùng Date.now() vì Avatar có thể
     * render lại rất nhiều lần.
     */
    const separator =
        avatarUrl.includes("?")
            ? "&"
            : "?";

    const finalAvatarUrl =
        `${avatarUrl}${separator}v=${encodeURIComponent(
            String(rawAvatar)
        )}`;

    return (
        <img
            className="avatar-image"
            src={finalAvatarUrl}
            alt={getUserName(user)}
            referrerPolicy="no-referrer"
            onError={() => {
                console.warn(
                    "AVATAR IMAGE LOAD ERROR:",
                    finalAvatarUrl
                );

                setImageError(true);
            }}
        />
    );
}

/* =====================================================
FEATURE CARD
===================================================== */

function FeatureCard({
    icon,
    title,
    text,
    locked = false,
    onClick
}) {
    return (
        <button
            type="button"
            className="feature-card"
            onClick={onClick}
        >
            <div className="feature-icon">
                {icon}
            </div>

            <div className="feature-content">
                <h3>
                    {title}
                </h3>

                <p>
                    {text}
                </p>

                <span className="feature-link">
                    Mở không gian

                    <b>
                        →
                    </b>
                </span>
            </div>

            {locked && (
                <span className="feature-lock">
                    🔒
                </span>
            )}
        </button>
    );
}

/* =====================================================
STAT CARD
===================================================== */

function StatCard({
    icon,
    number,
    label,
    text
}) {
    return (
        <div className="stat-card">
            <div className="stat-icon">
                {icon}
            </div>

            <div className="stat-info">
                <strong>
                    {number}
                </strong>

                <span>
                    {label}
                </span>

                <small>
                    {text}
                </small>
            </div>
        </div>
    );
}

/* =====================================================
HELPERS
===================================================== */

function getUserName(user) {
    return (
        user?.name ||
        user?.displayName ||
        user?.fullName ||
        user?.username ||
        "Người dùng"
    );
}

function getFirstName(user) {
    const name =
        getUserName(user);

    return name.split(" ")[0];
}

function getPageIcon(page) {
    const icons = {
        work: "💼",
        notes: "📝",
        reminders: "⏰",
        documents: "📁",
        calendar: "📅",
        "my-world": "🌙",
        music: "🎵",
        movies: "🎬",
        messages: "💬",
        account: "👤"
    };

    return (
        icons[page] ||
        "🌎"
    );
}

export default App;