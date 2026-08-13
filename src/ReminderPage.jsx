import React, { useEffect, useMemo, useState } from "react";
import "./ReminderPage.css";

/* =========================================================
   API
========================================================= */

const API_URL = "/api/reminders";

/* =========================================================
   HELPERS
========================================================= */

function getEmptyForm() {
    return {
        title: "",
        description: "",
        remind_at: "",
        repeat_type: "none"
    };
}

function pad(number) {
    return String(number).padStart(2, "0");
}

/*
 * Chuyển giá trị từ database:
 * 2026-08-11 14:30:00
 *
 * thành:
 * 2026-08-11T14:30
 *
 * để dùng cho input datetime-local.
 */
function databaseDateToInput(value) {
    if (!value) {
        return "";
    }

    const text = String(value).trim();

    if (!text) {
        return "";
    }

    const match = text.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/
    );

    if (!match) {
        return "";
    }

    const year = match[1];
    const month = match[2];
    const day = match[3];
    const hour = match[4] || "00";
    const minute = match[5] || "00";

    return `${year}-${month}-${day}T${hour}:${minute}`;
}

/*
 * Chuyển datetime-local thành định dạng SQLite.
 */
function inputDateToDatabase(value) {
    if (!value) {
        return "";
    }

    const match = String(value).match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
    );

    if (!match) {
        return value;
    }

    return (
        `${match[1]}-${match[2]}-${match[3]} ` +
        `${match[4]}:${match[5]}:00`
    );
}

function formatReminderDate(value) {
    if (!value) {
        return "Chưa có thời gian";
    }

    const text = String(value).trim();

    const match = text.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/
    );

    if (!match) {
        return text;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4] || 0);
    const minute = Number(match[5] || 0);

    return (
        `${pad(day)}/${pad(month)}/${year} ` +
        `${pad(hour)}:${pad(minute)}`
    );
}

function getReminderTimestamp(value) {
    if (!value) {
        return NaN;
    }

    const text = String(value).trim().replace(" ", "T");

    const timestamp = new Date(text).getTime();

    return Number.isNaN(timestamp)
        ? NaN
        : timestamp;
}

function isOverdue(reminder) {
    if (!reminder) {
        return false;
    }

    if (reminder.status === "completed") {
        return false;
    }

    const timestamp = getReminderTimestamp(
        reminder.remind_at
    );

    if (Number.isNaN(timestamp)) {
        return false;
    }

    return timestamp < Date.now();
}

function getRepeatLabel(type) {
    switch (type) {
        case "daily":
            return "Hàng ngày";

        case "weekly":
            return "Hàng tuần";

        case "monthly":
            return "Hàng tháng";

        default:
            return "Không lặp";
    }
}

function getRepeatIcon(type) {
    switch (type) {
        case "daily":
            return "↻";

        case "weekly":
            return "⟳";

        case "monthly":
            return "⟳";

        default:
            return "•";
    }
}

function getStatusLabel(status) {
    return status === "completed"
        ? "Đã hoàn thành"
        : "Đang chờ";
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ReminderPage() {
    const [reminders, setReminders] = useState([]);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [actionId, setActionId] = useState(null);

    const [error, setError] = useState("");

    const [successMessage, setSuccessMessage] =
        useState("");

    const [filter, setFilter] =
        useState("all");

    const [search, setSearch] =
        useState("");

    const [showForm, setShowForm] =
        useState(false);

    const [editingId, setEditingId] =
        useState(null);

    const [form, setForm] =
        useState(getEmptyForm());

    /* =====================================================
       LOAD REMINDERS
    ===================================================== */

    async function loadReminders() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                API_URL,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Không thể tải danh sách nhắc việc."
                );
            }

            if (!data.success) {
                throw new Error(
                    data.message ||
                    "Không thể tải danh sách nhắc việc."
                );
            }

            setReminders(
                Array.isArray(data.reminders)
                    ? data.reminders
                    : []
            );
        } catch (err) {
            console.error(
                "LOAD REMINDERS ERROR:",
                err
            );

            setError(
                err.message ||
                "Không thể tải danh sách nhắc việc."
            );
        } finally {
            setLoading(false);
        }
    }

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
        loadReminders();
    }, []);

    /* =====================================================
       AUTO CLEAR MESSAGES
    ===================================================== */

    useEffect(() => {
        if (!successMessage) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setSuccessMessage("");
        }, 3000);

        return () => clearTimeout(timer);
    }, [successMessage]);

    useEffect(() => {
        if (!error) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setError("");
        }, 5000);

        return () => clearTimeout(timer);
    }, [error]);

    /* =====================================================
       FORM
    ===================================================== */

    function openCreateForm() {
        setEditingId(null);

        setForm({
            ...getEmptyForm()
        });

        setError("");

        setShowForm(true);
    }

    function openEditForm(reminder) {
        setEditingId(reminder.id);

        setForm({
            title: reminder.title || "",

            description:
                reminder.description || "",

            remind_at:
                databaseDateToInput(
                    reminder.remind_at
                ),

            repeat_type:
                reminder.repeat_type || "none"
        });

        setError("");

        setShowForm(true);
    }

    function closeForm() {
        if (saving) {
            return;
        }

        setShowForm(false);

        setEditingId(null);

        setForm({
            ...getEmptyForm()
        });
    }

    function handleInputChange(event) {
        const {
            name,
            value
        } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    }

    /* =====================================================
       SAVE
    ===================================================== */

    async function handleSubmit(event) {
        event.preventDefault();

        if (saving) {
            return;
        }

        setError("");

        const title =
            form.title.trim();

        const description =
            form.description.trim();

        const remindAt =
            inputDateToDatabase(
                form.remind_at
            );

        if (!title) {
            setError(
                "Vui lòng nhập tiêu đề nhắc việc."
            );
            return;
        }

        if (!form.remind_at) {
            setError(
                "Vui lòng chọn ngày và giờ nhắc."
            );
            return;
        }

        try {
            setSaving(true);

            const isEditing =
                editingId !== null;

            const url = isEditing
                ? `${API_URL}/${editingId}`
                : API_URL;

            const method = isEditing
                ? "PUT"
                : "POST";

            const response = await fetch(
                url,
                {
                    method,

                    credentials: "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        title,

                        description,

                        remind_at:
                            remindAt,

                        repeat_type:
                            form.repeat_type
                    })
                }
            );

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Không thể lưu nhắc việc."
                );
            }

            if (!data.success) {
                throw new Error(
                    data.message ||
                    "Không thể lưu nhắc việc."
                );
            }

            if (isEditing) {
                setSuccessMessage(
                    "Đã cập nhật nhắc việc."
                );
            } else {
                setSuccessMessage(
                    "Đã tạo nhắc việc."
                );
            }

            closeForm();

            await loadReminders();
        } catch (err) {
            console.error(
                "SAVE REMINDER ERROR:",
                err
            );

            setError(
                err.message ||
                "Không thể lưu nhắc việc."
            );
        } finally {
            setSaving(false);
        }
    }

    /* =====================================================
       COMPLETE
    ===================================================== */

    async function completeReminder(reminder) {
        if (actionId !== null) {
            return;
        }

        try {
            setActionId(reminder.id);

            setError("");

            const response = await fetch(
                `${API_URL}/${reminder.id}/complete`,
                {
                    method: "PATCH",

                    credentials: "include"
                }
            );

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Không thể hoàn thành nhắc việc."
                );
            }

            if (!data.success) {
                throw new Error(
                    data.message ||
                    "Không thể hoàn thành nhắc việc."
                );
            }

            setSuccessMessage(
                data.message ||
                "Đã hoàn thành nhắc việc."
            );

            await loadReminders();
        } catch (err) {
            console.error(
                "COMPLETE REMINDER ERROR:",
                err
            );

            setError(
                err.message ||
                "Không thể hoàn thành nhắc việc."
            );
        } finally {
            setActionId(null);
        }
    }

    /* =====================================================
       REOPEN
    ===================================================== */

    async function reopenReminder(reminder) {
        if (actionId !== null) {
            return;
        }

        try {
            setActionId(reminder.id);

            setError("");

            const response = await fetch(
                `${API_URL}/${reminder.id}/reopen`,
                {
                    method: "PATCH",

                    credentials: "include"
                }
            );

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Không thể mở lại nhắc việc."
                );
            }

            if (!data.success) {
                throw new Error(
                    data.message ||
                    "Không thể mở lại nhắc việc."
                );
            }

            setSuccessMessage(
                data.message ||
                "Đã mở lại nhắc việc."
            );

            await loadReminders();
        } catch (err) {
            console.error(
                "REOPEN REMINDER ERROR:",
                err
            );

            setError(
                err.message ||
                "Không thể mở lại nhắc việc."
            );
        } finally {
            setActionId(null);
        }
    }

    /* =====================================================
       DELETE
    ===================================================== */

    async function deleteReminder(reminder) {
        if (actionId !== null) {
            return;
        }

        const confirmed =
            window.confirm(
                `Bạn có chắc muốn xóa nhắc việc "${reminder.title}" không?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setActionId(reminder.id);

            setError("");

            const response = await fetch(
                `${API_URL}/${reminder.id}`,
                {
                    method: "DELETE",

                    credentials: "include"
                }
            );

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Không thể xóa nhắc việc."
                );
            }

            if (!data.success) {
                throw new Error(
                    data.message ||
                    "Không thể xóa nhắc việc."
                );
            }

            setSuccessMessage(
                data.message ||
                "Đã xóa nhắc việc."
            );

            await loadReminders();
        } catch (err) {
            console.error(
                "DELETE REMINDER ERROR:",
                err
            );

            setError(
                err.message ||
                "Không thể xóa nhắc việc."
            );
        } finally {
            setActionId(null);
        }
    }

    /* =====================================================
       FILTER + SEARCH
    ===================================================== */

    const filteredReminders = useMemo(() => {
        const keyword =
            search.trim().toLowerCase();

        return reminders.filter(
            (reminder) => {
                const matchesFilter =
                    filter === "all" ||
                    (
                        filter === "pending" &&
                        reminder.status !== "completed"
                    ) ||
                    (
                        filter === "completed" &&
                        reminder.status === "completed"
                    );

                if (!matchesFilter) {
                    return false;
                }

                if (!keyword) {
                    return true;
                }

                const title =
                    String(
                        reminder.title || ""
                    ).toLowerCase();

                const description =
                    String(
                        reminder.description || ""
                    ).toLowerCase();

                return (
                    title.includes(keyword) ||
                    description.includes(keyword)
                );
            }
        );
    }, [
        reminders,
        filter,
        search
    ]);

    /* =====================================================
       STATS
    ===================================================== */

    const totalCount =
        reminders.length;

    const pendingCount =
        reminders.filter(
            (item) =>
                item.status !== "completed"
        ).length;

    const completedCount =
        reminders.filter(
            (item) =>
                item.status === "completed"
        ).length;

    const overdueCount =
        reminders.filter(
            (item) =>
                isOverdue(item)
        ).length;

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="reminder-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="reminder-header">

                <div className="reminder-header-left">

                    <div className="reminder-page-icon">
                        🔔
                    </div>

                    <div>
                        <h1>
                            Nhắc việc
                        </h1>

                        <p>
                            Quản lý những việc bạn
                            không muốn bỏ quên.
                        </p>
                    </div>

                </div>

                <button
                    type="button"
                    className="reminder-add-button"
                    onClick={openCreateForm}
                >
                    <span>
                        ＋
                    </span>

                    Thêm nhắc việc
                </button>

            </div>

            {/* =================================================
                ALERTS
            ================================================= */}

            {successMessage && (
                <div className="reminder-alert reminder-alert-success">
                    <span>✓</span>

                    <span>
                        {successMessage}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setSuccessMessage("")
                        }
                    >
                        ×
                    </button>
                </div>
            )}

            {error && (
                <div className="reminder-alert reminder-alert-error">
                    <span>!</span>

                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setError("")
                        }
                    >
                        ×
                    </button>
                </div>
            )}

            {/* =================================================
                STATS
            ================================================= */}

            <div className="reminder-stats">

                <div className="reminder-stat-card">

                    <div className="reminder-stat-icon">
                        🔔
                    </div>

                    <div>
                        <span>
                            Tổng số
                        </span>

                        <strong>
                            {totalCount}
                        </strong>
                    </div>

                </div>

                <div className="reminder-stat-card">

                    <div className="reminder-stat-icon">
                        ⏰
                    </div>

                    <div>
                        <span>
                            Đang chờ
                        </span>

                        <strong>
                            {pendingCount}
                        </strong>
                    </div>

                </div>

                <div className="reminder-stat-card">

                    <div className="reminder-stat-icon">
                        ✓
                    </div>

                    <div>
                        <span>
                            Hoàn thành
                        </span>

                        <strong>
                            {completedCount}
                        </strong>
                    </div>

                </div>

                <div className="reminder-stat-card reminder-stat-overdue">

                    <div className="reminder-stat-icon">
                        !
                    </div>

                    <div>
                        <span>
                            Quá hạn
                        </span>

                        <strong>
                            {overdueCount}
                        </strong>
                    </div>

                </div>

            </div>

            {/* =================================================
                TOOLBAR
            ================================================= */}

            <div className="reminder-toolbar">

                <div className="reminder-search">

                    <span>
                        🔍
                    </span>

                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Tìm kiếm nhắc việc..."
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() =>
                                setSearch("")
                            }
                        >
                            ×
                        </button>
                    )}

                </div>

                <div className="reminder-filters">

                    <button
                        type="button"
                        className={
                            filter === "all"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setFilter("all")
                        }
                    >
                        Tất cả
                    </button>

                    <button
                        type="button"
                        className={
                            filter === "pending"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setFilter("pending")
                        }
                    >
                        Đang chờ
                    </button>

                    <button
                        type="button"
                        className={
                            filter === "completed"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setFilter("completed")
                        }
                    >
                        Đã hoàn thành
                    </button>

                </div>

            </div>

            {/* =================================================
                CONTENT
            ================================================= */}

            <div className="reminder-content">

                {loading ? (
                    <div className="reminder-empty">

                        <div className="reminder-loading">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>

                        <h3>
                            Đang tải nhắc việc...
                        </h3>

                        <p>
                            Vui lòng chờ một chút.
                        </p>

                    </div>
                ) : filteredReminders.length === 0 ? (

                    <div className="reminder-empty">

                        <div className="reminder-empty-icon">
                            🔔
                        </div>

                        <h3>
                            {search
                                ? "Không tìm thấy nhắc việc"
                                : filter === "completed"
                                    ? "Chưa có nhắc việc hoàn thành"
                                    : filter === "pending"
                                        ? "Không có nhắc việc đang chờ"
                                        : "Chưa có nhắc việc"}
                        </h3>

                        <p>
                            {search
                                ? "Hãy thử từ khóa khác."
                                : "Tạo một nhắc việc mới để bắt đầu."}
                        </p>

                        {!search &&
                            filter !== "completed" && (
                                <button
                                    type="button"
                                    className="reminder-empty-button"
                                    onClick={
                                        openCreateForm
                                    }
                                >
                                    ＋ Thêm nhắc việc
                                </button>
                            )}

                    </div>

                ) : (

                    <div className="reminder-list">

                        {filteredReminders.map(
                            (reminder) => {

                                const completed =
                                    reminder.status ===
                                    "completed";

                                const overdue =
                                    isOverdue(
                                        reminder
                                    );

                                const busy =
                                    actionId ===
                                    reminder.id;

                                return (
                                    <article
                                        className={
                                            "reminder-card" +
                                            (
                                                completed
                                                    ? " is-completed"
                                                    : ""
                                            ) +
                                            (
                                                overdue
                                                    ? " is-overdue"
                                                    : ""
                                            )
                                        }
                                        key={
                                            reminder.id
                                        }
                                    >

                                        <div className="reminder-card-check">

                                            <button
                                                type="button"
                                                className={
                                                    completed
                                                        ? "checked"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    completed
                                                        ? reopenReminder(
                                                            reminder
                                                        )
                                                        : completeReminder(
                                                            reminder
                                                        )
                                                }
                                                disabled={
                                                    busy
                                                }
                                                aria-label={
                                                    completed
                                                        ? "Mở lại"
                                                        : "Hoàn thành"
                                                }
                                            >
                                                {completed
                                                    ? "✓"
                                                    : ""}
                                            </button>

                                        </div>

                                        <div className="reminder-card-main">

                                            <div className="reminder-card-top">

                                                <h3>
                                                    {
                                                        reminder.title
                                                    }
                                                </h3>

                                                <div className="reminder-card-actions">

                                                    <button
                                                        type="button"
                                                        title="Sửa"
                                                        onClick={() =>
                                                            openEditForm(
                                                                reminder
                                                            )
                                                        }
                                                        disabled={
                                                            busy
                                                        }
                                                    >
                                                        ✎
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Xóa"
                                                        className="delete"
                                                        onClick={() =>
                                                            deleteReminder(
                                                                reminder
                                                            )
                                                        }
                                                        disabled={
                                                            busy
                                                        }
                                                    >
                                                        🗑
                                                    </button>

                                                </div>

                                            </div>

                                            {reminder.description && (
                                                <p className="reminder-description">
                                                    {
                                                        reminder.description
                                                    }
                                                </p>
                                            )}

                                            <div className="reminder-meta">

                                                <span
                                                    className={
                                                        "reminder-time" +
                                                        (
                                                            overdue
                                                                ? " overdue"
                                                                : ""
                                                        )
                                                    }
                                                >
                                                    <span>
                                                        🕐
                                                    </span>

                                                    {
                                                        formatReminderDate(
                                                            reminder.remind_at
                                                        )
                                                    }

                                                    {overdue && (
                                                        <b>
                                                            Quá hạn
                                                        </b>
                                                    )}

                                                </span>

                                                <span className="reminder-repeat">
                                                    <span>
                                                        {
                                                            getRepeatIcon(
                                                                reminder.repeat_type
                                                            )
                                                        }
                                                    </span>

                                                    {
                                                        getRepeatLabel(
                                                            reminder.repeat_type
                                                        )
                                                    }
                                                </span>

                                                <span
                                                    className={
                                                        "reminder-status " +
                                                        (
                                                            completed
                                                                ? "completed"
                                                                : "pending"
                                                        )
                                                    }
                                                >
                                                    {
                                                        getStatusLabel(
                                                            reminder.status
                                                        )
                                                    }
                                                </span>

                                            </div>

                                            {completed &&
                                                reminder.completed_at && (
                                                    <div className="reminder-completed-time">
                                                        Hoàn thành:{" "}
                                                        {
                                                            formatReminderDate(
                                                                reminder.completed_at
                                                            )
                                                        }
                                                    </div>
                                                )}

                                        </div>

                                    </article>
                                );
                            }
                        )}

                    </div>
                )}

            </div>

            {/* =================================================
                MODAL FORM
            ================================================= */}

            {showForm && (
                <div
                    className="reminder-modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeForm();
                        }
                    }}
                >

                    <div className="reminder-modal">

                        <div className="reminder-modal-header">

                            <div>
                                <div className="reminder-modal-icon">
                                    🔔
                                </div>

                                <div>
                                    <h2>
                                        {editingId !== null
                                            ? "Sửa nhắc việc"
                                            : "Thêm nhắc việc"}
                                    </h2>

                                    <p>
                                        Thiết lập thời gian
                                        bạn muốn được nhắc.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="reminder-modal-close"
                                onClick={
                                    closeForm
                                }
                                disabled={
                                    saving
                                }
                            >
                                ×
                            </button>

                        </div>

                        <form
                            className="reminder-form"
                            onSubmit={
                                handleSubmit
                            }
                        >

                            <div className="reminder-form-group">

                                <label>
                                    Tiêu đề
                                    <span>
                                        *
                                    </span>
                                </label>

                                <input
                                    type="text"
                                    name="title"
                                    value={
                                        form.title
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    placeholder="Ví dụ: Gọi điện cho khách hàng"
                                    maxLength={500}
                                    autoFocus
                                    disabled={
                                        saving
                                    }
                                />

                            </div>

                            <div className="reminder-form-group">

                                <label>
                                    Nội dung
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        form.description
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    placeholder="Thêm ghi chú nếu cần..."
                                    rows={4}
                                    disabled={
                                        saving
                                    }
                                />

                            </div>

                            <div className="reminder-form-row">

                                <div className="reminder-form-group">

                                    <label>
                                        Ngày và giờ nhắc
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <input
                                        type="datetime-local"
                                        name="remind_at"
                                        value={
                                            form.remind_at
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        disabled={
                                            saving
                                        }
                                    />

                                </div>

                                <div className="reminder-form-group">

                                    <label>
                                        Lặp lại
                                    </label>

                                    <select
                                        name="repeat_type"
                                        value={
                                            form.repeat_type
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        disabled={
                                            saving
                                        }
                                    >
                                        <option value="none">
                                            Không lặp
                                        </option>

                                        <option value="daily">
                                            Hàng ngày
                                        </option>

                                        <option value="weekly">
                                            Hàng tuần
                                        </option>

                                        <option value="monthly">
                                            Hàng tháng
                                        </option>
                                    </select>

                                </div>

                            </div>

                            <div className="reminder-form-preview">

                                <span>
                                    🔔
                                </span>

                                <div>
                                    <strong>
                                        {form.title.trim() ||
                                            "Tên nhắc việc"}
                                    </strong>

                                    <small>
                                        {form.remind_at
                                            ? formatReminderDate(
                                                inputDateToDatabase(
                                                    form.remind_at
                                                )
                                            )
                                            : "Chưa chọn thời gian"}

                                        {" • "}

                                        {
                                            getRepeatLabel(
                                                form.repeat_type
                                            )
                                        }
                                    </small>
                                </div>

                            </div>

                            <div className="reminder-modal-footer">

                                <button
                                    type="button"
                                    className="reminder-cancel-button"
                                    onClick={
                                        closeForm
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    Hủy
                                </button>

                                <button
                                    type="submit"
                                    className="reminder-save-button"
                                    disabled={
                                        saving
                                    }
                                >
                                    {saving ? (
                                        <>
                                            <span className="button-spinner"></span>
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            ✓{" "}
                                            {editingId !== null
                                                ? "Lưu thay đổi"
                                                : "Tạo nhắc việc"}
                                        </>
                                    )}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

        </div>
    );
}