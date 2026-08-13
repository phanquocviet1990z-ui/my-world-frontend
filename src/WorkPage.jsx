
import { useEffect, useMemo, useState } from "react";
import "./WorkPage.css";

/* =========================================================
   EMPTY FORM
========================================================= */

const EMPTY_FORM = {
    title: "",
    description: "",
    status: "pending",
    priority: "normal",
    due_date: "",
    due_time: ""
};

/* =========================================================
   OPTIONS
========================================================= */

const STATUS_OPTIONS = [
    {
        value: "pending",
        label: "Chờ xử lý"
    },
    {
        value: "in_progress",
        label: "Đang thực hiện"
    },
    {
        value: "completed",
        label: "Hoàn thành"
    },
    {
        value: "cancelled",
        label: "Đã hủy"
    }
];

const PRIORITY_OPTIONS = [
    {
        value: "low",
        label: "Thấp"
    },
    {
        value: "normal",
        label: "Bình thường"
    },
    {
        value: "high",
        label: "Cao"
    },
    {
        value: "urgent",
        label: "Khẩn cấp"
    }
];

/* =========================================================
   WORK PAGE
========================================================= */

function WorkPage({ apiUrl }) {
    const [tasks, setTasks] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");

    /* =====================================================
       DATE FILTER
    ===================================================== */

    const [dateFilter, setDateFilter] = useState("all");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const [form, setForm] = useState({
        ...EMPTY_FORM
    });

    const [deleteTask, setDeleteTask] = useState(null);
    const [deleting, setDeleting] = useState(false);

    /* =====================================================
       LOAD TASKS
    ===================================================== */

    async function loadTasks(showLoading = true) {
        if (showLoading) {
            setLoading(true);
        }

        setError("");

        try {
            const response = await fetch(
                `${apiUrl}/api/tasks`,
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        Accept: "application/json"
                    }
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Không thể tải danh sách công việc."
                );
            }

            setTasks(
                Array.isArray(data.tasks)
                    ? data.tasks
                    : []
            );
        } catch (err) {
            console.error(
                "LOAD TASKS ERROR:",
                err
            );

            setError(
                err.message ||
                "Không thể kết nối tới máy chủ."
            );
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        loadTasks();
    }, []);

    /* =====================================================
       TOAST
    ===================================================== */

    function showSuccess(message) {
        setSuccessMessage(message);

        window.setTimeout(() => {
            setSuccessMessage("");
        }, 3000);
    }

    /* =====================================================
       FORM
    ===================================================== */

    function openCreateModal() {
        setEditingTask(null);

        setForm({
            ...EMPTY_FORM
        });

        setError("");
        setModalOpen(true);
    }

    function openEditModal(task) {
        const dueParts =
            splitDateTime(task.due_date);

        setEditingTask(task);

        setForm({
            title: task.title || "",
            description: task.description || "",
            status: task.status || "pending",
            priority: task.priority || "normal",
            due_date: dueParts.date,
            due_time: dueParts.time
        });

        setError("");
        setModalOpen(true);
    }

    function closeModal() {
        if (saving) {
            return;
        }

        setModalOpen(false);
        setEditingTask(null);

        setForm({
            ...EMPTY_FORM
        });
    }

    function handleFormChange(event) {
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
       CLEAR DUE DATE
    ===================================================== */

    function clearDueDate() {
        setForm((previous) => ({
            ...previous,
            due_date: "",
            due_time: ""
        }));
    }

    /* =====================================================
       CREATE / UPDATE
    ===================================================== */

    async function handleSubmit(event) {
        event.preventDefault();

        const title =
            form.title.trim();

        if (!title) {
            setError(
                "Vui lòng nhập tên công việc."
            );

            return;
        }

        if (title.length > 500) {
            setError(
                "Tên công việc không được vượt quá 500 ký tự."
            );

            return;
        }

        /*
         * Nếu chọn ngày nhưng chưa chọn giờ,
         * mặc định hạn hoàn thành là 23:59.
         */
        let dueDate = null;

        if (form.due_date) {
            const selectedTime =
                form.due_time || "23:59";

            dueDate =
                `${form.due_date}T${selectedTime}`;
        }

        setSaving(true);
        setError("");

        try {
            const payload = {
                title,
                description:
                    form.description.trim(),
                status: form.status,
                priority: form.priority,
                due_date: dueDate
            };

            const url = editingTask
                ? `${apiUrl}/api/tasks/${editingTask.id}`
                : `${apiUrl}/api/tasks`;

            const method = editingTask
                ? "PUT"
                : "POST";

            const response = await fetch(
                url,
                {
                    method,
                    credentials: "include",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Accept:
                            "application/json"
                    },
                    body:
                        JSON.stringify(payload)
                }
            );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Không thể lưu công việc."
                );
            }

            if (editingTask) {
                setTasks((previous) =>
                    previous.map((task) =>
                        task.id ===
                        editingTask.id
                            ? data.task
                            : task
                    )
                );

                showSuccess(
                    "Đã cập nhật công việc."
                );
            } else {
                setTasks((previous) => [
                    data.task,
                    ...previous
                ]);

                showSuccess(
                    "Đã tạo công việc mới."
                );
            }

            closeModal();
        } catch (err) {
            console.error(
                "SAVE TASK ERROR:",
                err
            );

            setError(
                err.message ||
                "Không thể lưu công việc."
            );
        } finally {
            setSaving(false);
        }
    }

    /* =====================================================
       COMPLETE TASK
    ===================================================== */

    async function handleComplete(task) {
        if (
            task.status === "completed"
        ) {
            return;
        }

        try {
            const response =
                await fetch(
                    `${apiUrl}/api/tasks/${task.id}/complete`,
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

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Không thể hoàn thành công việc."
                );
            }

            setTasks((previous) =>
                previous.map((item) =>
                    item.id === task.id
                        ? data.task
                        : item
                )
            );

            showSuccess(
                "✓ Đã hoàn thành công việc."
            );
        } catch (err) {
            console.error(
                "COMPLETE TASK ERROR:",
                err
            );

            setError(
                err.message ||
                "Không thể hoàn thành công việc."
            );
        }
    }

    /* =====================================================
       DELETE TASK
    ===================================================== */

    async function handleDelete() {
        if (!deleteTask) {
            return;
        }

        setDeleting(true);
        setError("");

        try {
            const response =
                await fetch(
                    `${apiUrl}/api/tasks/${deleteTask.id}`,
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

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Không thể xóa công việc."
                );
            }

            setTasks((previous) =>
                previous.filter(
                    (task) =>
                        task.id !==
                        deleteTask.id
                )
            );

            showSuccess(
                "Đã xóa công việc."
            );

            setDeleteTask(null);
        } catch (err) {
            console.error(
                "DELETE TASK ERROR:",
                err
            );

            setError(
                err.message ||
                "Không thể xóa công việc."
            );
        } finally {
            setDeleting(false);
        }
    }

    /* =====================================================
       DATE FILTER HELPERS
    ===================================================== */

    function getDateFilterType(
        date,
        completed = false
    ) {
        if (!date) {
            return "none";
        }

        const parsed =
            new Date(date);

        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {
            return "none";
        }

        const now =
            new Date();

        const todayStart =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            );

        const tomorrowStart =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1
            );

        const dayAfterTomorrowStart =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 2
            );

        /*
         * Đã hoàn thành thì không tính quá hạn.
         */
        if (
            !completed &&
            parsed < now
        ) {
            return "overdue";
        }

        /*
         * Hôm nay
         */
        if (
            parsed >= todayStart &&
            parsed < tomorrowStart
        ) {
            return "today";
        }

        /*
         * Ngày mai
         */
        if (
            parsed >= tomorrowStart &&
            parsed < dayAfterTomorrowStart
        ) {
            return "tomorrow";
        }

        /*
         * Sau ngày mai
         */
        if (
            parsed >= dayAfterTomorrowStart
        ) {
            return "upcoming";
        }

        return "none";
    }

    /* =====================================================
       FILTER
    ===================================================== */

    const filteredTasks = useMemo(() => {
        const keyword =
            search.trim().toLowerCase();

        return tasks.filter((task) => {
            const matchesSearch =
                !keyword ||
                String(
                    task.title || ""
                )
                    .toLowerCase()
                    .includes(keyword) ||
                String(
                    task.description || ""
                )
                    .toLowerCase()
                    .includes(keyword);

            const matchesStatus =
                statusFilter === "all" ||
                task.status ===
                    statusFilter;

            const matchesPriority =
                priorityFilter === "all" ||
                task.priority ===
                    priorityFilter;

            const dateType =
                getDateFilterType(
                    task.due_date,
                    task.status === "completed"
                );

            const matchesDate =
                dateFilter === "all" ||
                dateType === dateFilter;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesPriority &&
                matchesDate
            );
        });
    }, [
        tasks,
        search,
        statusFilter,
        priorityFilter,
        dateFilter
    ]);

    /* =====================================================
       STATISTICS
    ===================================================== */

    const statistics = useMemo(() => {
        const total =
            tasks.length;

        const completed =
            tasks.filter(
                (task) =>
                    task.status ===
                    "completed"
            ).length;

        const inProgress =
            tasks.filter(
                (task) =>
                    task.status ===
                    "in_progress"
            ).length;

        const pending =
            tasks.filter(
                (task) =>
                    task.status ===
                    "pending"
            ).length;

        const urgent =
            tasks.filter(
                (task) =>
                    task.priority ===
                        "urgent" &&
                    task.status !==
                        "completed"
            ).length;

        return {
            total,
            completed,
            inProgress,
            pending,
            urgent
        };
    }, [tasks]);

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <section className="work-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="work-header">

                <div className="work-header-content">

                    <div className="work-kicker">
                        <span>💼</span>
                        MY WORKSPACE
                    </div>

                    <h1>
                        Công việc
                    </h1>

                    <p>
                        Quản lý công việc,
                        theo dõi tiến độ và
                        không bỏ quên những
                        việc quan trọng.
                    </p>

                </div>

                <button
                    type="button"
                    className="work-add-button"
                    onClick={
                        openCreateModal
                    }
                >
                    <span>＋</span>

                    <div>
                        <strong>
                            Thêm công việc
                        </strong>

                        <small>
                            Tạo việc mới
                        </small>
                    </div>
                </button>

            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
                <div className="work-alert error">

                    <span>⚠</span>

                    <div>
                        <strong>
                            Có lỗi xảy ra
                        </strong>

                        <p>
                            {error}
                        </p>
                    </div>

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
                SUCCESS
            ================================================= */}

            {successMessage && (
                <div className="work-alert success">

                    <span>✓</span>

                    <div>
                        <strong>
                            Thành công
                        </strong>

                        <p>
                            {successMessage}
                        </p>
                    </div>

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

            {/* =================================================
                STATISTICS
            ================================================= */}

            <div className="work-stats">

                <WorkStat
                    icon="📋"
                    value={
                        statistics.total
                    }
                    label="Tổng công việc"
                    type="total"
                />

                <WorkStat
                    icon="⏳"
                    value={
                        statistics.pending
                    }
                    label="Chờ xử lý"
                    type="pending"
                />

                <WorkStat
                    icon="⚡"
                    value={
                        statistics.inProgress
                    }
                    label="Đang thực hiện"
                    type="progress"
                />

                <WorkStat
                    icon="✓"
                    value={
                        statistics.completed
                    }
                    label="Đã hoàn thành"
                    type="completed"
                />

                <WorkStat
                    icon="🔥"
                    value={
                        statistics.urgent
                    }
                    label="Khẩn cấp"
                    type="urgent"
                />

            </div>

            {/* =================================================
                TOOLBAR
            ================================================= */}

            <div className="work-toolbar">

                <div className="work-search">

                    <span>
                        🔎
                    </span>

                    <input
                        type="search"
                        placeholder="Tìm công việc..."
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
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

                <div className="work-filters">

                    <select
                        value={
                            statusFilter
                        }
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="all">
                            Tất cả trạng thái
                        </option>

                        {STATUS_OPTIONS.map(
                            (item) => (
                                <option
                                    key={
                                        item.value
                                    }
                                    value={
                                        item.value
                                    }
                                >
                                    {item.label}
                                </option>
                            )
                        )}
                    </select>

                    <select
                        value={
                            priorityFilter
                        }
                        onChange={(event) =>
                            setPriorityFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="all">
                            Tất cả ưu tiên
                        </option>

                        {PRIORITY_OPTIONS.map(
                            (item) => (
                                <option
                                    key={
                                        item.value
                                    }
                                    value={
                                        item.value
                                    }
                                >
                                    {item.label}
                                </option>
                            )
                        )}
                    </select>

                    <button
                        type="button"
                        className="work-refresh-button"
                        onClick={() =>
                            loadTasks(false)
                        }
                        title="Làm mới"
                    >
                        ↻
                    </button>

                </div>

                {/* =================================================
                    DATE FILTER
                ================================================= */}

                <div className="work-date-filters">

                    <button
                        type="button"
                        className={
                            dateFilter === "all"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setDateFilter("all")
                        }
                    >
                        Tất cả
                    </button>

                    <button
                        type="button"
                        className={
                            dateFilter === "today"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setDateFilter("today")
                        }
                    >
                        📅 Hôm nay
                    </button>

                    <button
                        type="button"
                        className={
                            dateFilter === "tomorrow"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setDateFilter("tomorrow")
                        }
                    >
                        🌅 Ngày mai
                    </button>

                    <button
                        type="button"
                        className={
                            dateFilter === "upcoming"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setDateFilter("upcoming")
                        }
                    >
                        📆 Sắp tới
                    </button>

                    <button
                        type="button"
                        className={
                            dateFilter === "overdue"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setDateFilter("overdue")
                        }
                    >
                        ⚠️ Quá hạn
                    </button>

                </div>

            </div>

            {/* =================================================
                TASK LIST
            ================================================= */}

            <div className="work-list-card">

                <div className="work-list-header">

                    <div>
                        <span>
                            TASKS
                        </span>

                        <h2>
                            Danh sách công việc
                        </h2>
                    </div>

                    <div className="work-result-count">
                        {filteredTasks.length}

                        <small>
                            / {tasks.length}
                        </small>
                    </div>

                </div>

                {loading ? (
                    <TaskLoading />
                ) : filteredTasks.length === 0 ? (
                    <TaskEmpty
                        hasFilters={
                            Boolean(
                                search ||
                                statusFilter !==
                                    "all" ||
                                priorityFilter !==
                                    "all" ||
                                dateFilter !==
                                    "all"
                            )
                        }
                        onAdd={
                            openCreateModal
                        }
                        onClear={() => {
                            setSearch("");
                            setStatusFilter(
                                "all"
                            );
                            setPriorityFilter(
                                "all"
                            );
                            setDateFilter(
                                "all"
                            );
                        }}
                    />
                ) : (
                    <div className="task-list">

                        {filteredTasks.map(
                            (task) => (
                                <TaskItem
                                    key={
                                        task.id
                                    }
                                    task={task}
                                    onComplete={
                                        handleComplete
                                    }
                                    onEdit={
                                        openEditModal
                                    }
                                    onDelete={
                                        setDeleteTask
                                    }
                                />
                            )
                        )}

                    </div>
                )}

            </div>

            {/* =================================================
                CREATE / EDIT MODAL
            ================================================= */}

            {modalOpen && (
                <div
                    className="work-modal-overlay"
                    onMouseDown={() =>
                        !saving &&
                        closeModal()
                    }
                >

                    <div
                        className="work-modal"
                        onMouseDown={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="work-modal-header">

                            <div>

                                <span className="work-modal-icon">
                                    {editingTask
                                        ? "✏️"
                                        : "＋"}
                                </span>

                                <div>
                                    <span>
                                        MY WORK
                                    </span>

                                    <h2>
                                        {editingTask
                                            ? "Chỉnh sửa công việc"
                                            : "Thêm công việc"}
                                    </h2>
                                </div>

                            </div>

                            <button
                                type="button"
                                className="work-modal-close"
                                onClick={
                                    closeModal
                                }
                                disabled={
                                    saving
                                }
                            >
                                ×
                            </button>

                        </div>

                        <form
                            className="work-form"
                            onSubmit={
                                handleSubmit
                            }
                        >

                            {/* TITLE */}

                            <div className="work-form-group">

                                <label>
                                    Tên công việc
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
                                        handleFormChange
                                    }
                                    placeholder="Ví dụ: Hoàn thành báo cáo..."
                                    maxLength={
                                        500
                                    }
                                    autoFocus
                                />

                            </div>

                            {/* DESCRIPTION */}

                            <div className="work-form-group">

                                <label>
                                    Mô tả
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        form.description
                                    }
                                    onChange={
                                        handleFormChange
                                    }
                                    placeholder="Thêm mô tả cho công việc..."
                                    rows="4"
                                />

                            </div>

                            {/* STATUS / PRIORITY */}

                            <div className="work-form-row">

                                <div className="work-form-group">

                                    <label>
                                        Trạng thái
                                    </label>

                                    <select
                                        name="status"
                                        value={
                                            form.status
                                        }
                                        onChange={
                                            handleFormChange
                                        }
                                    >
                                        {STATUS_OPTIONS.map(
                                            (
                                                item
                                            ) => (
                                                <option
                                                    key={
                                                        item.value
                                                    }
                                                    value={
                                                        item.value
                                                    }
                                                >
                                                    {
                                                        item.label
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>

                                </div>

                                <div className="work-form-group">

                                    <label>
                                        Mức ưu tiên
                                    </label>

                                    <select
                                        name="priority"
                                        value={
                                            form.priority
                                        }
                                        onChange={
                                            handleFormChange
                                        }
                                    >
                                        {PRIORITY_OPTIONS.map(
                                            (
                                                item
                                            ) => (
                                                <option
                                                    key={
                                                        item.value
                                                    }
                                                    value={
                                                        item.value
                                                    }
                                                >
                                                    {
                                                        item.label
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>

                                </div>

                            </div>

                            {/* DUE DATE */}

                            <div className="work-form-group">

                                <label>
                                    Hạn hoàn thành
                                </label>

                                <div className="work-due-wrapper">

                                    <div className="work-due-field">

                                        <span className="work-due-icon">
                                            📅
                                        </span>

                                        <input
                                            type="date"
                                            name="due_date"
                                            value={
                                                form.due_date
                                            }
                                            onChange={
                                                handleFormChange
                                            }
                                            title="Chọn ngày, tháng, năm"
                                        />

                                    </div>

                                    <div className="work-due-field">

                                        <span className="work-due-icon">
                                            🕐
                                        </span>

                                        <input
                                            type="time"
                                            name="due_time"
                                            value={
                                                form.due_time
                                            }
                                            onChange={
                                                handleFormChange
                                            }
                                            disabled={
                                                !form.due_date
                                            }
                                            title="Chọn giờ và phút"
                                        />

                                    </div>

                                    {(form.due_date ||
                                        form.due_time) && (
                                        <button
                                            type="button"
                                            className="work-due-clear"
                                            onClick={
                                                clearDueDate
                                            }
                                            disabled={
                                                saving
                                            }
                                            title="Xóa hạn hoàn thành"
                                        >
                                            ×
                                        </button>
                                    )}

                                </div>

                                <div className="work-due-help">

                                    <span>
                                        {form.due_date
                                            ? form.due_time
                                                ? `Hạn: ${formatInputDate(form.due_date)} lúc ${form.due_time}`
                                                : `Đã chọn ngày ${formatInputDate(form.due_date)} — chưa chọn giờ`
                                            : "Chọn ngày trước, sau đó chọn giờ nếu cần."}
                                    </span>

                                </div>

                            </div>

                            {/* FOOTER */}

                            <div className="work-form-footer">

                                <button
                                    type="button"
                                    className="work-cancel-button"
                                    onClick={
                                        closeModal
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    Hủy
                                </button>

                                <button
                                    type="submit"
                                    className="work-save-button"
                                    disabled={
                                        saving
                                    }
                                >
                                    {saving ? (
                                        <>
                                            <span className="button-spinner" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <span>
                                                ✓
                                            </span>

                                            {editingTask
                                                ? "Lưu thay đổi"
                                                : "Tạo công việc"}
                                        </>
                                    )}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* =================================================
                DELETE CONFIRM
            ================================================= */}

            {deleteTask && (
                <div
                    className="work-modal-overlay"
                    onMouseDown={() =>
                        !deleting &&
                        setDeleteTask(null)
                    }
                >

                    <div
                        className="delete-modal"
                        onMouseDown={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="delete-icon">
                            🗑️
                        </div>

                        <h2>
                            Xóa công việc?
                        </h2>

                        <p>
                            Bạn có chắc muốn xóa
                            công việc:
                        </p>

                        <strong>
                            {deleteTask.title}
                        </strong>

                        <small>
                            Hành động này không
                            thể hoàn tác.
                        </small>

                        <div className="delete-actions">

                            <button
                                type="button"
                                onClick={() =>
                                    setDeleteTask(
                                        null
                                    )
                                }
                                disabled={
                                    deleting
                                }
                            >
                                Hủy
                            </button>

                            <button
                                type="button"
                                className="danger"
                                onClick={
                                    handleDelete
                                }
                                disabled={
                                    deleting
                                }
                            >
                                {deleting
                                    ? "Đang xóa..."
                                    : "Xóa công việc"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </section>
    );
}

/* =========================================================
   STAT
========================================================= */

function WorkStat({
    icon,
    value,
    label,
    type
}) {
    return (
        <div
            className={`work-stat work-stat-${type}`}
        >
            <div className="work-stat-icon">
                {icon}
            </div>

            <div className="work-stat-info">
                <strong>
                    {value}
                </strong>

                <span>
                    {label}
                </span>
            </div>
        </div>
    );
}

/* =========================================================
   TASK ITEM
========================================================= */

function TaskItem({
    task,
    onComplete,
    onEdit,
    onDelete
}) {
    const completed =
        task.status === "completed";

    return (
        <article
            className={[
                "task-item",
                completed
                    ? "is-completed"
                    : "",
                task.priority
                    ? `priority-${task.priority}`
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
        >

            <button
                type="button"
                className={[
                    "task-check",
                    completed
                        ? "checked"
                        : ""
                ]
                    .filter(Boolean)
                    .join(" ")}
                onClick={() =>
                    onComplete(task)
                }
                disabled={completed}
                title={
                    completed
                        ? "Đã hoàn thành"
                        : "Đánh dấu hoàn thành"
                }
            >
                {completed
                    ? "✓"
                    : ""}
            </button>

            <div className="task-main">

                <div className="task-title-row">

                    <h3>
                        {task.title}
                    </h3>

                    <PriorityBadge
                        priority={
                            task.priority
                        }
                    />

                </div>

                {task.description && (
                    <p className="task-description">
                        {task.description}
                    </p>
                )}

                <div className="task-meta">

                    <StatusBadge
                        status={
                            task.status
                        }
                    />

                    {task.due_date && (
                        <DueDate
                            date={
                                task.due_date
                            }
                            completed={
                                completed
                            }
                        />
                    )}

                    <span className="task-created">
                        Tạo{" "}
                        {formatDate(
                            task.created_at
                        )}
                    </span>

                </div>

            </div>

            <div className="task-actions">

                {!completed && (
                    <button
                        type="button"
                        className="task-action complete"
                        onClick={() =>
                            onComplete(task)
                        }
                        title="Hoàn thành"
                    >
                        ✓
                    </button>
                )}

                <button
                    type="button"
                    className="task-action edit"
                    onClick={() =>
                        onEdit(task)
                    }
                    title="Chỉnh sửa"
                >
                    ✎
                </button>

                <button
                    type="button"
                    className="task-action delete"
                    onClick={() =>
                        onDelete(task)
                    }
                    title="Xóa"
                >
                    🗑
                </button>

            </div>

        </article>
    );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
    const data =
        STATUS_OPTIONS.find(
            (item) =>
                item.value === status
        );

    const label =
        data?.label || status;

    return (
        <span
            className={`status-badge status-${status}`}
        >
            <i />

            {label}
        </span>
    );
}

/* =========================================================
   PRIORITY BADGE
========================================================= */

function PriorityBadge({
    priority
}) {
    const data =
        PRIORITY_OPTIONS.find(
            (item) =>
                item.value === priority
        );

    const label =
        data?.label || priority;

    return (
        <span
            className={`priority-badge priority-badge-${priority}`}
        >
            {priority ===
                "urgent" && "🔥"}

            {priority ===
                "high" && "▲"}

            {priority ===
                "normal" && "●"}

            {priority ===
                "low" && "▽"}

            {" "}
            {label}
        </span>
    );
}

/* =========================================================
   DUE DATE
========================================================= */

function DueDate({
    date,
    completed
}) {
    const parsed =
        new Date(date);

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return null;
    }

    const now =
        new Date();

    const overdue =
        !completed &&
        parsed < now;

    return (
        <span
            className={[
                "task-due",
                overdue
                    ? "overdue"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {overdue
                ? "⚠ Quá hạn "
                : "📅 "}

            {formatDateTime(date)}
        </span>
    );
}

/* =========================================================
   EMPTY
========================================================= */

function TaskEmpty({
    hasFilters,
    onAdd,
    onClear
}) {
    return (
        <div className="task-empty">

            <div className="task-empty-icon">
                {hasFilters
                    ? "🔎"
                    : "📋"}
            </div>

            <h3>
                {hasFilters
                    ? "Không tìm thấy công việc"
                    : "Chưa có công việc"}
            </h3>

            <p>
                {hasFilters
                    ? "Thử thay đổi từ khóa hoặc bộ lọc."
                    : "Hãy tạo công việc đầu tiên của bạn."}
            </p>

            {hasFilters ? (
                <button
                    type="button"
                    onClick={
                        onClear
                    }
                >
                    Xóa bộ lọc
                </button>
            ) : (
                <button
                    type="button"
                    onClick={
                        onAdd
                    }
                >
                    ＋ Thêm công việc
                </button>
            )}

        </div>
    );
}

/* =========================================================
   LOADING
========================================================= */

function TaskLoading() {
    return (
        <div className="task-loading">

            <div className="task-loading-spinner" />

            <strong>
                Đang tải công việc...
            </strong>

            <span>
                Đang đồng bộ với máy chủ
            </span>

        </div>
    );
}

/* =========================================================
   HELPERS
========================================================= */

function formatDate(date) {
    if (!date) {
        return "";
    }

    const parsed =
        new Date(date);

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return "";
    }

    return parsed.toLocaleDateString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function formatDateTime(date) {
    if (!date) {
        return "";
    }

    const parsed =
        new Date(date);

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return "";
    }

    return parsed.toLocaleString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

/* =========================================================
   SPLIT DATE + TIME
========================================================= */

function splitDateTime(date) {
    if (!date) {
        return {
            date: "",
            time: ""
        };
    }

    const parsed =
        new Date(date);

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return {
            date: "",
            time: ""
        };
    }

    const year =
        parsed.getFullYear();

    const month =
        String(
            parsed.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            parsed.getDate()
        ).padStart(2, "0");

    const hours =
        String(
            parsed.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            parsed.getMinutes()
        ).padStart(2, "0");

    return {
        date:
            `${year}-${month}-${day}`,
        time:
            `${hours}:${minutes}`
    };
}

/* =========================================================
   FORMAT INPUT DATE
========================================================= */

function formatInputDate(date) {
    if (!date) {
        return "";
    }

    const parts =
        date.split("-");

    if (parts.length !== 3) {
        return date;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/* =========================================================
   EXPORT
========================================================= */

export default WorkPage;
