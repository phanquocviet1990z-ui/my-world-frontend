import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

/* =========================================================
   API
========================================================= */

const API_URL =
    "https://my-world-backend-3xwn.onrender.com";

/* =========================================================
   SAFE JSON RESPONSE
========================================================= */

async function readJsonResponse(response) {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        console.error(
            "INVALID JSON RESPONSE:",
            text
        );

        return null;
    }
}

/* =========================================================
   API ERROR MESSAGE
========================================================= */

function getResponseErrorMessage(
    response,
    data,
    fallback
) {
    if (data?.message) {
        return data.message;
    }

    if (response.status === 401) {
        return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }

    if (response.status === 403) {
        return "Bạn không có quyền thực hiện thao tác này.";
    }

    if (response.status === 404) {
        return "Không tìm thấy API nhắc việc trên máy chủ.";
    }

    if (response.status >= 500) {
        return "Máy chủ đang gặp lỗi. Vui lòng thử lại sau.";
    }

    return fallback;
}

/* =========================================================
   API REQUEST
========================================================= */

async function reminderRequest(
    path,
    options = {}
) {
    const response = await fetch(
        `${API_URL}${path}`,
        {
            ...options,
            credentials: "include",
            headers: {
                Accept:
                    "application/json",
                ...(options.body
                    ? {
                          "Content-Type":
                              "application/json",
                      }
                    : {}),
                ...(options.headers || {}),
            },
        }
    );

    const data =
        await readJsonResponse(response);

    return {
        response,
        data,
    };
}

/* =========================================================
   REMINDERS PAGE
========================================================= */

function Reminders() {
    /* =====================================================
       STATE
    ===================================================== */

    const [reminders, setReminders] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [actionId, setActionId] =
        useState(null);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [showForm, setShowForm] =
        useState(false);

    const [editingId, setEditingId] =
        useState(null);

    const [form, setForm] = useState({
        title: "",
        description: "",
        remind_at: "",
        repeat_type: "none",
    });

    /* =====================================================
       LOAD REMINDERS
    ===================================================== */

    async function loadReminders() {
        try {
            setLoading(true);
            setError("");

            const {
                response,
                data,
            } = await reminderRequest(
                "/api/reminders",
                {
                    method: "GET",
                }
            );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    getResponseErrorMessage(
                        response,
                        data,
                        "Không thể tải danh sách nhắc việc."
                    )
                );
            }

            setReminders(
                Array.isArray(
                    data.reminders
                )
                    ? data.reminders
                    : []
            );
        } catch (err) {
            console.error(
                "LOAD REMINDERS ERROR:",
                err
            );

            setError(
                err?.message ||
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
       AUTO CLEAR SUCCESS
    ===================================================== */

    useEffect(() => {
        if (!success) {
            return;
        }

        const timer =
            setTimeout(() => {
                setSuccess("");
            }, 3000);

        return () =>
            clearTimeout(timer);
    }, [success]);

    /* =====================================================
       FORM
    ===================================================== */

    function resetForm() {
        setForm({
            title: "",
            description: "",
            remind_at: "",
            repeat_type: "none",
        });

        setEditingId(null);
    }

    function openCreateForm() {
        setError("");
        setSuccess("");

        resetForm();

        setShowForm(true);
    }

    function openEditForm(reminder) {
        setError("");
        setSuccess("");

        setEditingId(reminder.id);

        setForm({
            title:
                reminder.title || "",

            description:
                reminder.description || "",

            remind_at:
                convertDatabaseDateToInput(
                    reminder.remind_at
                ),

            repeat_type:
                reminder.repeat_type ||
                "none",
        });

        setShowForm(true);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function closeForm() {
        if (saving) {
            return;
        }

        setShowForm(false);

        resetForm();
    }

    function handleInputChange(
        event
    ) {
        const {
            name,
            value,
        } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    /* =====================================================
       CREATE / UPDATE
    ===================================================== */

    async function handleSubmit(
        event
    ) {
        event.preventDefault();

        setError("");
        setSuccess("");

        const title =
            form.title.trim();

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
                ? `/api/reminders/${editingId}`
                : "/api/reminders";

            const method = isEditing
                ? "PUT"
                : "POST";

            /*
             * GIỮ NGUYÊN LOCAL TIME
             *
             * Không dùng:
             *
             * new Date(
             *     form.remind_at
             * ).toISOString()
             */

            const remindAt =
                convertInputToDatabaseDate(
                    form.remind_at
                );

            if (!remindAt) {
                throw new Error(
                    "Thời gian nhắc không hợp lệ."
                );
            }

            const {
                response,
                data,
            } = await reminderRequest(
                url,
                {
                    method,
                    body: JSON.stringify({
                        title,

                        description:
                            form.description.trim(),

                        remind_at:
                            remindAt,

                        repeat_type:
                            form.repeat_type,
                    }),
                }
            );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    getResponseErrorMessage(
                        response,
                        data,
                        "Không thể lưu nhắc việc."
                    )
                );
            }

            setSuccess(
                isEditing
                    ? "Đã cập nhật nhắc việc."
                    : "Đã tạo nhắc việc."
            );

            setShowForm(false);

            resetForm();

            await loadReminders();
        } catch (err) {
            console.error(
                "SAVE REMINDER ERROR:",
                err
            );

            setError(
                err?.message ||
                    "Không thể lưu nhắc việc."
            );
        } finally {
            setSaving(false);
        }
    }

    /* =====================================================
       COMPLETE
    ===================================================== */

    async function completeReminder(
        reminder
    ) {
        if (!reminder?.id) {
            return;
        }

        try {
            setActionId(reminder.id);

            setError("");
            setSuccess("");

            const {
                response,
                data,
            } = await reminderRequest(
                `/api/reminders/${reminder.id}/complete`,
                {
                    method: "PATCH",
                }
            );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    getResponseErrorMessage(
                        response,
                        data,
                        "Không thể hoàn thành nhắc việc."
                    )
                );
            }

            setSuccess(
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
                err?.message ||
                    "Không thể hoàn thành nhắc việc."
            );
        } finally {
            setActionId(null);
        }
    }

    /* =====================================================
       REOPEN
    ===================================================== */

    async function reopenReminder(
        reminder
    ) {
        if (!reminder?.id) {
            return;
        }

        try {
            setActionId(reminder.id);

            setError("");
            setSuccess("");

            const {
                response,
                data,
            } = await reminderRequest(
                `/api/reminders/${reminder.id}/reopen`,
                {
                    method: "PATCH",
                }
            );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    getResponseErrorMessage(
                        response,
                        data,
                        "Không thể mở lại nhắc việc."
                    )
                );
            }

            setSuccess(
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
                err?.message ||
                    "Không thể mở lại nhắc việc."
            );
        } finally {
            setActionId(null);
        }
    }

    /* =====================================================
       DELETE
    ===================================================== */

    async function deleteReminder(
        reminder
    ) {
        if (!reminder?.id) {
            return;
        }

        const confirmed =
            window.confirm(
                `Bạn có chắc muốn xóa nhắc việc "${reminder.title}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setActionId(reminder.id);

            setError("");
            setSuccess("");

            const {
                response,
                data,
            } = await reminderRequest(
                `/api/reminders/${reminder.id}`,
                {
                    method: "DELETE",
                }
            );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    getResponseErrorMessage(
                        response,
                        data,
                        "Không thể xóa nhắc việc."
                    )
                );
            }

            setSuccess(
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
                err?.message ||
                    "Không thể xóa nhắc việc."
            );
        } finally {
            setActionId(null);
        }
    }

    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatReminderDate(
        value
    ) {
        if (!value) {
            return "Chưa xác định";
        }

        const date =
            parseDatabaseDate(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return String(value);
        }

        return new Intl.DateTimeFormat(
            "vi-VN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            }
        ).format(date);
    }

    /* =====================================================
       STATUS
    ===================================================== */

    function getStatusLabel(
        reminder
    ) {
        if (
            reminder.status ===
            "completed"
        ) {
            return "Đã hoàn thành";
        }

        const date =
            parseDatabaseDate(
                reminder.remind_at
            );

        if (
            !Number.isNaN(
                date.getTime()
            ) &&
            date.getTime() <=
                Date.now()
        ) {
            return "Đã đến hạn";
        }

        return "Đang chờ";
    }

    function getStatusClass(
        reminder
    ) {
        if (
            reminder.status ===
            "completed"
        ) {
            return "completed";
        }

        const date =
            parseDatabaseDate(
                reminder.remind_at
            );

        if (
            !Number.isNaN(
                date.getTime()
            ) &&
            date.getTime() <=
                Date.now()
        ) {
            return "due";
        }

        return "pending";
    }

    /* =====================================================
       REPEAT LABEL
    ===================================================== */

    function getRepeatLabel(
        repeatType
    ) {
        switch (repeatType) {
            case "daily":
                return "🔁 Hàng ngày";

            case "weekly":
                return "🔁 Hàng tuần";

            case "monthly":
                return "🔁 Hàng tháng";

            default:
                return "⏰ Một lần";
        }
    }

    /* =====================================================
       SUMMARY
    ===================================================== */

    const summary =
        useMemo(() => {
            const pending =
                reminders.filter(
                    (item) =>
                        item.status ===
                        "pending"
                ).length;

            const completed =
                reminders.filter(
                    (item) =>
                        item.status ===
                        "completed"
                ).length;

            const due =
                reminders.filter(
                    (item) => {
                        if (
                            item.status !==
                            "pending"
                        ) {
                            return false;
                        }

                        const date =
                            parseDatabaseDate(
                                item.remind_at
                            );

                        return (
                            !Number.isNaN(
                                date.getTime()
                            ) &&
                            date.getTime() <=
                                Date.now()
                        );
                    }
                ).length;

            return {
                total:
                    reminders.length,
                pending,
                completed,
                due,
            };
        }, [reminders]);

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="reminders-page">

            {/* HEADER */}

            <div className="reminders-header">

                <div>
                    <div className="reminders-eyebrow">
                        PERSONAL PLANNER
                    </div>

                    <h1>
                        🔔 Nhắc việc
                    </h1>

                    <p>
                        Quản lý những việc bạn
                        không muốn bỏ quên.
                    </p>
                </div>

                <button
                    type="button"
                    className="reminder-add-button"
                    onClick={
                        openCreateForm
                    }
                >
                    <span>＋</span>
                    Thêm nhắc việc
                </button>

            </div>

            {/* MESSAGES */}

            {error && (
                <div className="reminder-message reminder-message-error">
                    <span>⚠️</span>

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

            {success && (
                <div className="reminder-message reminder-message-success">
                    <span>✓</span>

                    <span>
                        {success}
                    </span>
                </div>
            )}

            {/* SUMMARY */}

            <div className="reminder-summary">

                <div className="summary-card">
                    <div className="summary-icon">
                        📋
                    </div>

                    <div>
                        <strong>
                            {summary.total}
                        </strong>

                        <span>
                            Tổng số
                        </span>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        ⏳
                    </div>

                    <div>
                        <strong>
                            {summary.pending}
                        </strong>

                        <span>
                            Đang chờ
                        </span>
                    </div>
                </div>

                <div className="summary-card summary-card-due">
                    <div className="summary-icon">
                        🔔
                    </div>

                    <div>
                        <strong>
                            {summary.due}
                        </strong>

                        <span>
                            Đã đến hạn
                        </span>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        ✓
                    </div>

                    <div>
                        <strong>
                            {summary.completed}
                        </strong>

                        <span>
                            Hoàn thành
                        </span>
                    </div>
                </div>

            </div>

            {/* FORM */}

            {showForm && (
                <div className="reminder-form-card">

                    <div className="reminder-form-header">

                        <div>
                            <h2>
                                {editingId
                                    ? "Chỉnh sửa nhắc việc"
                                    : "Thêm nhắc việc"}
                            </h2>

                            <p>
                                Điền thông tin bên
                                dưới để tạo lời nhắc.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="reminder-close-button"
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
                        onSubmit={
                            handleSubmit
                        }
                    >

                        <div className="reminder-form-grid">

                            <div className="reminder-field reminder-field-full">

                                <label>
                                    Tiêu đề
                                    <span>*</span>
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
                                    maxLength={
                                        500
                                    }
                                    autoFocus
                                    disabled={
                                        saving
                                    }
                                />

                            </div>

                            <div className="reminder-field reminder-field-full">

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

                            <div className="reminder-field">

                                <label>
                                    Thời gian nhắc
                                    <span>*</span>
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

                                <small>
                                    Chọn ngày và giờ bạn
                                    muốn nhận nhắc việc.
                                </small>

                            </div>

                            <div className="reminder-field">

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

                                <small>
                                    Sau khi hoàn thành,
                                    hệ thống sẽ chuyển
                                    sang lần nhắc tiếp theo.
                                </small>

                            </div>

                        </div>

                        <div className="reminder-form-actions">

                            <button
                                type="button"
                                className="reminder-secondary-button"
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
                                className="reminder-primary-button"
                                disabled={
                                    saving
                                }
                            >
                                {saving
                                    ? "Đang lưu..."
                                    : editingId
                                        ? "Lưu thay đổi"
                                        : "Tạo nhắc việc"}
                            </button>

                        </div>

                    </form>

                </div>
            )}

            {/* LIST HEADER */}

            <div className="reminders-list-header">

                <div>
                    <h2>
                        Danh sách nhắc việc
                    </h2>

                    <span>
                        {summary.total} mục
                    </span>
                </div>

                <button
                    type="button"
                    className="reminder-refresh-button"
                    onClick={
                        loadReminders
                    }
                    disabled={loading}
                >
                    ↻ Làm mới
                </button>

            </div>

            {/* LOADING */}

            {loading ? (
                <div className="reminder-empty-state">

                    <div className="reminder-spinner" />

                    <h3>
                        Đang tải nhắc việc...
                    </h3>

                    <p>
                        Vui lòng chờ một chút.
                    </p>

                </div>
            ) : reminders.length ===
              0 ? (

                <div className="reminder-empty-state">

                    <div className="reminder-empty-icon">
                        🔔
                    </div>

                    <h3>
                        Chưa có nhắc việc
                    </h3>

                    <p>
                        Tạo nhắc việc đầu tiên
                        để không bỏ quên những
                        công việc quan trọng.
                    </p>

                    <button
                        type="button"
                        className="reminder-primary-button"
                        onClick={
                            openCreateForm
                        }
                    >
                        ＋ Thêm nhắc việc
                    </button>

                </div>

            ) : (

                <div className="reminders-list">

                    {reminders.map(
                        (reminder) => {

                            const statusClass =
                                getStatusClass(
                                    reminder
                                );

                            const isActionLoading =
                                actionId ===
                                reminder.id;

                            return (
                                <article
                                    className={`reminder-card ${statusClass}`}
                                    key={
                                        reminder.id
                                    }
                                >

                                    <div className="reminder-card-main">

                                        <div className="reminder-status-dot">
                                            {statusClass ===
                                            "completed"
                                                ? "✓"
                                                : statusClass ===
                                                    "due"
                                                    ? "!"
                                                    : "•"}
                                        </div>

                                        <div className="reminder-card-content">

                                            <div className="reminder-card-top">

                                                <h3>
                                                    {
                                                        reminder.title
                                                    }
                                                </h3>

                                                <span
                                                    className={`reminder-status-badge ${statusClass}`}
                                                >
                                                    {
                                                        getStatusLabel(
                                                            reminder
                                                        )
                                                    }
                                                </span>

                                            </div>

                                            {reminder.description && (
                                                <p className="reminder-description">
                                                    {
                                                        reminder.description
                                                    }
                                                </p>
                                            )}

                                            <div className="reminder-meta">

                                                <span>
                                                    🕐{" "}
                                                    {
                                                        formatReminderDate(
                                                            reminder.remind_at
                                                        )
                                                    }
                                                </span>

                                                <span>
                                                    {
                                                        getRepeatLabel(
                                                            reminder.repeat_type
                                                        )
                                                    }
                                                </span>

                                            </div>

                                        </div>

                                    </div>

                                    <div className="reminder-card-actions">

                                        {reminder.status !==
                                            "completed" && (
                                            <button
                                                type="button"
                                                className="reminder-action-complete"
                                                onClick={() =>
                                                    completeReminder(
                                                        reminder
                                                    )
                                                }
                                                disabled={
                                                    isActionLoading
                                                }
                                            >
                                                {isActionLoading
                                                    ? "..."
                                                    : "✓ Hoàn thành"}
                                            </button>
                                        )}

                                        {reminder.status ===
                                            "completed" && (
                                            <button
                                                type="button"
                                                className="reminder-action-reopen"
                                                onClick={() =>
                                                    reopenReminder(
                                                        reminder
                                                    )
                                                }
                                                disabled={
                                                    isActionLoading
                                                }
                                            >
                                                {isActionLoading
                                                    ? "..."
                                                    : "↶ Mở lại"}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            className="reminder-action-edit"
                                            onClick={() =>
                                                openEditForm(
                                                    reminder
                                                )
                                            }
                                            disabled={
                                                isActionLoading
                                            }
                                        >
                                            ✎ Sửa
                                        </button>

                                        <button
                                            type="button"
                                            className="reminder-action-delete"
                                            onClick={() =>
                                                deleteReminder(
                                                    reminder
                                                )
                                            }
                                            disabled={
                                                isActionLoading
                                            }
                                        >
                                            🗑 Xóa
                                        </button>

                                    </div>

                                </article>
                            );
                        }
                    )}

                </div>
            )}

            {/* =================================================
                LOCAL CSS
            ================================================= */}

            <style>{`

                .reminders-page {
                    width: 100%;
                    max-width: 1180px;
                    margin: 0 auto;
                    padding: 30px 24px 60px;
                    box-sizing: border-box;
                }

                .reminders-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                    margin-bottom: 28px;
                }

                .reminders-eyebrow {
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 1.8px;
                    color: #1769c2;
                    margin-bottom: 7px;
                }

                .reminders-header h1 {
                    margin: 0;
                    color: #172033;
                    font-size: 32px;
                    line-height: 1.2;
                    font-weight: 800;
                }

                .reminders-header p {
                    margin: 8px 0 0;
                    color: #687386;
                    font-size: 14px;
                }

                .reminder-add-button,
                .reminder-primary-button {
                    border: 0;
                    border-radius: 12px;
                    padding: 12px 18px;
                    background: #1769c2;
                    color: white;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow:
                        0 7px 18px
                        rgba(
                            23,
                            105,
                            194,
                            0.2
                        );
                    transition:
                        transform 0.18s ease,
                        box-shadow 0.18s ease,
                        opacity 0.18s ease;
                }

                .reminder-add-button:hover,
                .reminder-primary-button:hover {
                    transform: translateY(-1px);
                    box-shadow:
                        0 10px 24px
                        rgba(
                            23,
                            105,
                            194,
                            0.27
                        );
                }

                .reminder-add-button span {
                    font-size: 18px;
                    margin-right: 5px;
                }

                .reminder-add-button:disabled,
                .reminder-primary-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .reminder-message {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 13px 15px;
                    margin-bottom: 18px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                }

                .reminder-message button {
                    margin-left: auto;
                    border: 0;
                    background: transparent;
                    font-size: 22px;
                    cursor: pointer;
                    color: inherit;
                }

                .reminder-message-error {
                    background: #fff1f1;
                    color: #b42318;
                    border: 1px solid #ffd1d1;
                }

                .reminder-message-success {
                    background: #edfdf3;
                    color: #16794c;
                    border: 1px solid #c9f0d8;
                }

                .reminder-summary {
                    display: grid;
                    grid-template-columns:
                        repeat(4, 1fr);
                    gap: 14px;
                    margin-bottom: 28px;
                }

                .summary-card {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    min-height: 86px;
                    padding: 16px;
                    box-sizing: border-box;
                    border: 1px solid #e6eaf0;
                    border-radius: 15px;
                    background: #ffffff;
                    box-shadow:
                        0 4px 18px
                        rgba(
                            20,
                            31,
                            50,
                            0.045
                        );
                }

                .summary-icon {
                    width: 42px;
                    height: 42px;
                    display: grid;
                    place-items: center;
                    flex-shrink: 0;
                    border-radius: 12px;
                    background: #eef5ff;
                    font-size: 20px;
                }

                .summary-card strong {
                    display: block;
                    color: #172033;
                    font-size: 22px;
                    line-height: 1;
                    margin-bottom: 5px;
                }

                .summary-card span {
                    display: block;
                    color: #788294;
                    font-size: 12px;
                    font-weight: 600;
                }

                .reminder-form-card {
                    margin-bottom: 30px;
                    padding: 24px;
                    border: 1px solid #e1e6ed;
                    border-radius: 18px;
                    background: #ffffff;
                    box-shadow:
                        0 8px 28px
                        rgba(
                            20,
                            31,
                            50,
                            0.07
                        );
                }

                .reminder-form-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 22px;
                }

                .reminder-form-header h2 {
                    margin: 0;
                    font-size: 21px;
                    color: #172033;
                }

                .reminder-form-header p {
                    margin: 6px 0 0;
                    color: #788294;
                    font-size: 13px;
                }

                .reminder-close-button {
                    width: 34px;
                    height: 34px;
                    border: 0;
                    border-radius: 9px;
                    background: #f1f3f6;
                    color: #566070;
                    font-size: 22px;
                    cursor: pointer;
                }

                .reminder-form-grid {
                    display: grid;
                    grid-template-columns:
                        1fr 1fr;
                    gap: 18px;
                }

                .reminder-field {
                    min-width: 0;
                }

                .reminder-field-full {
                    grid-column: 1 / -1;
                }

                .reminder-field label {
                    display: block;
                    margin-bottom: 7px;
                    color: #313b4d;
                    font-size: 13px;
                    font-weight: 700;
                }

                .reminder-field label span {
                    color: #e5484d;
                    margin-left: 3px;
                }

                .reminder-field input,
                .reminder-field textarea,
                .reminder-field select {
                    width: 100%;
                    box-sizing: border-box;
                    border: 1px solid #dce2ea;
                    border-radius: 10px;
                    background: #fbfcfe;
                    color: #172033;
                    font-family: inherit;
                    font-size: 14px;
                    outline: none;
                    transition:
                        border-color 0.18s ease,
                        box-shadow 0.18s ease,
                        background 0.18s ease;
                }

                .reminder-field input,
                .reminder-field select {
                    height: 45px;
                    padding: 0 13px;
                }

                .reminder-field textarea {
                    min-height: 105px;
                    padding: 12px 13px;
                    resize: vertical;
                }

                .reminder-field input:focus,
                .reminder-field textarea:focus,
                .reminder-field select:focus {
                    border-color: #1769c2;
                    background: #ffffff;
                    box-shadow:
                        0 0 0 3px
                        rgba(
                            23,
                            105,
                            194,
                            0.1
                        );
                }

                .reminder-field small {
                    display: block;
                    margin-top: 6px;
                    color: #8993a3;
                    font-size: 11px;
                    line-height: 1.45;
                }

                .reminder-form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 22px;
                    padding-top: 20px;
                    border-top: 1px solid #edf0f4;
                }

                .reminder-secondary-button {
                    border: 1px solid #d8dee7;
                    border-radius: 10px;
                    padding: 11px 17px;
                    background: #ffffff;
                    color: #4c5667;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .reminder-secondary-button:hover {
                    background: #f6f8fa;
                }

                .reminders-list-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 15px;
                    margin-bottom: 14px;
                }

                .reminders-list-header > div {
                    display: flex;
                    align-items: baseline;
                    gap: 10px;
                }

                .reminders-list-header h2 {
                    margin: 0;
                    color: #172033;
                    font-size: 19px;
                }

                .reminders-list-header span {
                    color: #8993a3;
                    font-size: 12px;
                }

                .reminder-refresh-button {
                    border: 1px solid #dce2ea;
                    border-radius: 9px;
                    padding: 8px 12px;
                    background: #ffffff;
                    color: #4f5b6c;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .reminder-refresh-button:hover {
                    background: #f7f9fb;
                }

                .reminder-refresh-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .reminders-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .reminder-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    padding: 17px 18px;
                    border: 1px solid #e3e7ed;
                    border-radius: 15px;
                    background: #ffffff;
                    box-shadow:
                        0 3px 14px
                        rgba(
                            20,
                            31,
                            50,
                            0.04
                        );
                    transition:
                        transform 0.18s ease,
                        box-shadow 0.18s ease,
                        border-color 0.18s ease;
                }

                .reminder-card:hover {
                    transform: translateY(-1px);
                    border-color: #d4dce6;
                    box-shadow:
                        0 7px 22px
                        rgba(
                            20,
                            31,
                            50,
                            0.07
                        );
                }

                .reminder-card.due {
                    border-left:
                        4px solid #e5484d;
                }

                .reminder-card.completed {
                    opacity: 0.72;
                    background: #fafbfc;
                }

                .reminder-card-main {
                    display: flex;
                    align-items: flex-start;
                    gap: 13px;
                    min-width: 0;
                    flex: 1;
                }

                .reminder-status-dot {
                    width: 36px;
                    height: 36px;
                    display: grid;
                    place-items: center;
                    flex-shrink: 0;
                    border-radius: 50%;
                    background: #eef5ff;
                    color: #1769c2;
                    font-size: 17px;
                    font-weight: 800;
                }

                .reminder-card.due
                    .reminder-status-dot {
                    background: #fff0f0;
                    color: #d92d35;
                }

                .reminder-card.completed
                    .reminder-status-dot {
                    background: #eaf8f0;
                    color: #16824d;
                }

                .reminder-card-content {
                    min-width: 0;
                    flex: 1;
                }

                .reminder-card-top {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .reminder-card-top h3 {
                    margin: 0;
                    color: #172033;
                    font-size: 15px;
                    line-height: 1.4;
                    font-weight: 750;
                    word-break: break-word;
                }

                .reminder-card.completed h3 {
                    text-decoration:
                        line-through;
                }

                .reminder-status-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 8px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 800;
                    white-space: nowrap;
                }

                .reminder-status-badge.pending {
                    background: #eef5ff;
                    color: #1769c2;
                }

                .reminder-status-badge.due {
                    background: #fff0f0;
                    color: #d92d35;
                }

                .reminder-status-badge.completed {
                    background: #eaf8f0;
                    color: #16824d;
                }

                .reminder-description {
                    margin: 6px 0 9px;
                    color: #667085;
                    font-size: 13px;
                    line-height: 1.5;
                    word-break: break-word;
                }

                .reminder-meta {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    flex-wrap: wrap;
                    color: #7b8696;
                    font-size: 11px;
                    font-weight: 600;
                }

                .reminder-card-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 7px;
                    flex-wrap: wrap;
                    flex-shrink: 0;
                }

                .reminder-card-actions button {
                    border-radius: 8px;
                    padding: 8px 10px;
                    font-family: inherit;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    transition:
                        background 0.18s ease,
                        border-color 0.18s ease,
                        opacity 0.18s ease;
                }

                .reminder-card-actions
                    button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .reminder-action-complete {
                    border: 1px solid #bde5cd;
                    background: #effaf3;
                    color: #177245;
                }

                .reminder-action-complete:hover {
                    background: #e0f6e8;
                }

                .reminder-action-reopen {
                    border: 1px solid #cfdced;
                    background: #f2f6fb;
                    color: #1769c2;
                }

                .reminder-action-edit {
                    border: 1px solid #d9dee6;
                    background: #ffffff;
                    color: #536071;
                }

                .reminder-action-edit:hover {
                    background: #f5f7f9;
                }

                .reminder-action-delete {
                    border: 1px solid #f0caca;
                    background: #fff7f7;
                    color: #c4343b;
                }

                .reminder-action-delete:hover {
                    background: #fff0f0;
                }

                .reminder-empty-state {
                    min-height: 300px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 35px 20px;
                    box-sizing: border-box;
                    border: 1px dashed #dce2ea;
                    border-radius: 18px;
                    background: #ffffff;
                }

                .reminder-empty-icon {
                    width: 64px;
                    height: 64px;
                    display: grid;
                    place-items: center;
                    margin-bottom: 15px;
                    border-radius: 20px;
                    background: #eef5ff;
                    font-size: 30px;
                }

                .reminder-empty-state h3 {
                    margin: 0;
                    color: #253047;
                    font-size: 17px;
                }

                .reminder-empty-state p {
                    max-width: 420px;
                    margin: 7px 0 18px;
                    color: #7c8797;
                    font-size: 13px;
                    line-height: 1.6;
                }

                .reminder-spinner {
                    width: 32px;
                    height: 32px;
                    margin-bottom: 15px;
                    border:
                        3px solid #e5ebf2;
                    border-top-color:
                        #1769c2;
                    border-radius: 50%;
                    animation:
                        reminderSpin
                        0.75s linear infinite;
                }

                @keyframes reminderSpin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                @media (max-width: 900px) {
                    .reminder-summary {
                        grid-template-columns:
                            repeat(2, 1fr);
                    }

                    .reminder-card {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .reminder-card-actions {
                        width: 100%;
                        justify-content: flex-start;
                    }
                }

                @media (max-width: 650px) {
                    .reminders-page {
                        padding:
                            20px
                            14px
                            40px;
                    }

                    .reminders-header {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .reminder-add-button {
                        width: 100%;
                    }

                    .reminder-summary {
                        grid-template-columns:
                            1fr 1fr;
                    }

                    .reminder-form-grid {
                        grid-template-columns:
                            1fr;
                    }

                    .reminder-field-full {
                        grid-column: auto;
                    }

                    .reminder-form-card {
                        padding: 17px;
                    }

                    .reminder-form-actions {
                        flex-direction:
                            column-reverse;
                    }

                    .reminder-form-actions button {
                        width: 100%;
                    }

                    .reminder-card-main {
                        width: 100%;
                    }

                    .reminders-list-header {
                        align-items: flex-start;
                    }
                }

                @media (max-width: 420px) {
                    .reminder-summary {
                        grid-template-columns:
                            1fr;
                    }

                    .reminder-card-actions button {
                        flex: 1;
                    }
                }

            `}</style>
        </div>
    );
}

/* =========================================================
   DATE HELPERS
========================================================= */

/* =========================================================
   PARSE DATABASE DATE
========================================================= */

function parseDatabaseDate(
    value
) {
    if (!value) {
        return new Date(NaN);
    }

    if (
        value instanceof Date
    ) {
        return value;
    }

    if (
        typeof value !== "string"
    ) {
        return new Date(value);
    }

    const text =
        value.trim();

    if (!text) {
        return new Date(NaN);
    }

    /*
     * PostgreSQL / SQLite:
     *
     * 2026-08-13 15:30:00
     *
     * Không thêm Z.
     * Browser hiểu là LOCAL TIME.
     */

    if (
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(
            text
        )
    ) {
        return new Date(
            text.replace(
                " ",
                "T"
            )
        );
    }

    /*
     * ISO không timezone:
     *
     * 2026-08-13T15:30:00
     */

    if (
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(
            text
        )
    ) {
        return new Date(text);
    }

    /*
     * ISO có timezone:
     *
     * 2026-08-13T08:30:00.000Z
     *
     * Để JavaScript tự xử lý.
     */

    return new Date(text);
}

/* =========================================================
   DATABASE -> DATETIME LOCAL
========================================================= */

function convertDatabaseDateToInput(
    value
) {
    if (!value) {
        return "";
    }

    if (
        typeof value === "string"
    ) {
        const text =
            value.trim();

        const databaseMatch =
            text.match(
                /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
            );

        if (databaseMatch) {
            const [
                ,
                year,
                month,
                day,
                hours,
                minutes,
            ] = databaseMatch;

            return (
                `${year}-${month}-${day}` +
                `T${hours}:${minutes}`
            );
        }
    }

    const date =
        parseDatabaseDate(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    const hours =
        String(
            date.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            date.getMinutes()
        ).padStart(2, "0");

    return (
        `${year}-${month}-${day}` +
        `T${hours}:${minutes}`
    );
}

/* =========================================================
   DATETIME LOCAL -> DATABASE
========================================================= */

function convertInputToDatabaseDate(
    value
) {
    if (!value) {
        return "";
    }

    const text =
        String(value).trim();

    const match =
        text.match(
            /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/
        );

    if (!match) {
        return "";
    }

    const [
        ,
        datePart,
        hours,
        minutes,
    ] = match;

    return (
        `${datePart} ` +
        `${hours}:${minutes}:00`
    );
}

/* =========================================================
   EXPORT
========================================================= */

export default Reminders;