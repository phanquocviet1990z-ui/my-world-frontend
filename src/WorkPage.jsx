import { useEffect, useMemo, useState } from "react";
import "./WorkPage.css";

/* =========================================================
   TIMEZONE
========================================================= */

const APP_TIMEZONE = "Asia/Ho_Chi_Minh";

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

            if (
                !response.ok ||
                !data.success
            ) {
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
       SUCCESS
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
            splitDateTimeVietnam(task.due_date);

        console.log(
            "EDIT TASK DATE:",
            {
                databaseValue: task.due_date,
                vietnamDate: dueParts.date,
                vietnamTime: dueParts.time
            }
        );

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

        /* =================================================
           DUE DATE - VIỆT NAM -> UTC ISO

           Input:
           2026-08-14
           08:50

           Việt Nam:
           2026-08-14 08:50 +07:00

           Gửi server:
           2026-08-14T01:50:00.000Z

           PostgreSQL timestamptz:
           Đúng cùng một thời điểm.
        ================================================= */

        let dueDate = null;

        if (form.due_date) {

            const selectedTime =
                form.due_time || "23:59";

            dueDate =
                vietnamDateTimeToISO(
                    form.due_date,
                    selectedTime
                );

            if (!dueDate) {

                setError(
                    "Ngày hoặc giờ hết hạn không hợp lệ."
                );

                return;
            }
        }

        console.log(
            "TASK DUE DATE:",
            {
                inputDate: form.due_date,
                inputTime: form.due_time,
                sendToServer: dueDate
            }
        );

        setSaving(true);
        setError("");

        try {

            const payload = {
                title,
                description:
                    form.description.trim(),
                status:
                    form.status,
                priority:
                    form.priority,
                due_date:
                    dueDate
            };

            console.log(
                "TASK PAYLOAD:",
                payload
            );

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
       DATE FILTER
    ===================================================== */

    function getDateFilterType(
        date,
        completed = false
    ) {

        if (!date) {
            return "none";
        }

        const parsed =
            parseDate(date);

        if (!parsed) {
            return "none";
        }

        const now =
            new Date();

        const today =
            getVietnamDateParts(now);

        const task =
            getVietnamDateParts(parsed);

        if (!today || !task) {
            return "none";
        }

        const todayKey =
            `${today.year}-${today.month}-${today.day}`;

        const taskKey =
            `${task.year}-${task.month}-${task.day}`;

        const todayDate =
            vietnamDateToDayNumber(
                today.year,
                today.month,
                today.day
            );

        const taskDate =
            vietnamDateToDayNumber(
                task.year,
                task.month,
                task.day
            );

        const difference =
            taskDate - todayDate;

        if (
            !completed &&
            parsed.getTime() < now.getTime()
        ) {
            return "overdue";
        }

        if (
            taskKey === todayKey
        ) {
            return "today";
        }

        if (
            difference === 1
        ) {
            return "tomorrow";
        }

        if (
            difference >= 2
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
                    task.status ===
                        "completed"
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

                            {/* =================================================
                                DUE DATE
                            ================================================= */}

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
        parseDate(date);

    if (!parsed) {
        return null;
    }

    const now =
        new Date();

    const overdue =
        !completed &&
        parsed.getTime() <
            now.getTime();

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
   DATE PARSER
========================================================= */

function parseDate(value) {

    if (!value) {
        return null;
    }

    const parsed =
        new Date(value);

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return null;
    }

    return parsed;
}

/* =========================================================
   FORMAT DATE - VIETNAM
========================================================= */

function formatDate(date) {

    const parsed =
        parseDate(date);

    if (!parsed) {
        return "";
    }

    try {

        return new Intl.DateTimeFormat(
            "vi-VN",
            {
                timeZone:
                    APP_TIMEZONE,
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ).format(parsed);

    } catch (error) {

        console.error(
            "FORMAT DATE ERROR:",
            error
        );

        return "";
    }
}

/* =========================================================
   FORMAT DATE + TIME - VIETNAM
========================================================= */

function formatDateTime(date) {

    const parsed =
        parseDate(date);

    if (!parsed) {
        return "";
    }

    try {

        return new Intl.DateTimeFormat(
            "vi-VN",
            {
                timeZone:
                    APP_TIMEZONE,
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }
        ).format(parsed);

    } catch (error) {

        console.error(
            "FORMAT DATE TIME ERROR:",
            error
        );

        return "";
    }
}

/* =========================================================
   VIETNAM DATE + TIME -> UTC ISO
========================================================= */

/*
 * FIX LỖI:
 *
 * Không gửi trực tiếp:
 *
 * 2026-08-14T08:50:00+07:00
 *
 * Mà chuyển thành ISO UTC chuẩn:
 *
 * 2026-08-14T01:50:00.000Z
 *
 * PostgreSQL / Neon timestamptz
 * xử lý định dạng này ổn định.
 *
 * Input luôn được hiểu là giờ Việt Nam.
 */

function vietnamDateTimeToISO(
    date,
    time
) {

    if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        return null;
    }

    const safeTime =
        time || "23:59";

    if (
        typeof safeTime !== "string" ||
        !/^\d{2}:\d{2}$/.test(safeTime)
    ) {
        return null;
    }

    const [
        yearString,
        monthString,
        dayString
    ] = date.split("-");

    const [
        hourString,
        minuteString
    ] = safeTime.split(":");

    const year =
        Number(yearString);

    const month =
        Number(monthString);

    const day =
        Number(dayString);

    const hour =
        Number(hourString);

    const minute =
        Number(minuteString);

    /* =====================================================
       VALIDATE RANGE
    ===================================================== */

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        !Number.isInteger(hour) ||
        !Number.isInteger(minute)
    ) {
        return null;
    }

    if (
        month < 1 ||
        month > 12 ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    /* =====================================================
       VALIDATE REAL CALENDAR DATE

       Ví dụ:
       2026-02-31 -> invalid
    ===================================================== */

    const checkDate =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );

    if (
        checkDate.getUTCFullYear() !== year ||
        checkDate.getUTCMonth() !== month - 1 ||
        checkDate.getUTCDate() !== day
    ) {
        return null;
    }

    /* =====================================================
       VIỆT NAM = UTC+07:00

       08:50 Việt Nam
       -> 01:50 UTC
    ===================================================== */

    const utcMilliseconds =
        Date.UTC(
            year,
            month - 1,
            day,
            hour,
            minute,
            0,
            0
        ) -
        (7 * 60 * 60 * 1000);

    const result =
        new Date(
            utcMilliseconds
        );

    if (
        Number.isNaN(
            result.getTime()
        )
    ) {
        return null;
    }

    return result.toISOString();
}

/* =========================================================
   SPLIT POSTGRES DATE -> VIETNAM DATE + TIME
========================================================= */

function splitDateTimeVietnam(
    date
) {

    const parsed =
        parseDate(date);

    if (!parsed) {

        return {
            date: "",
            time: ""
        };
    }

    try {

        const formatter =
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone:
                        APP_TIMEZONE,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23"
                }
            );

        const parts =
            formatter.formatToParts(
                parsed
            );

        const values = {};

        parts.forEach((part) => {

            if (
                part.type !==
                "literal"
            ) {
                values[part.type] =
                    part.value;
            }

        });

        if (
            !values.year ||
            !values.month ||
            !values.day ||
            !values.hour ||
            !values.minute
        ) {
            return {
                date: "",
                time: ""
            };
        }

        return {
            date:
                `${values.year}-${values.month}-${values.day}`,

            time:
                `${values.hour}:${values.minute}`
        };

    } catch (error) {

        console.error(
            "SPLIT VIETNAM DATE ERROR:",
            error
        );

        return {
            date: "",
            time: ""
        };
    }
}

/* =========================================================
   GET VIETNAM DATE PARTS
========================================================= */

function getVietnamDateParts(
    date
) {

    const parsed =
        parseDate(date);

    if (!parsed) {
        return null;
    }

    try {

        const formatter =
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone:
                        APP_TIMEZONE,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }
            );

        const parts =
            formatter.formatToParts(
                parsed
            );

        const values = {};

        parts.forEach((part) => {

            if (
                part.type !==
                "literal"
            ) {
                values[part.type] =
                    part.value;
            }

        });

        if (
            !values.year ||
            !values.month ||
            !values.day
        ) {
            return null;
        }

        return {
            year:
                values.year,

            month:
                values.month,

            day:
                values.day
        };

    } catch (error) {

        console.error(
            "GET VIETNAM DATE PARTS ERROR:",
            error
        );

        return null;
    }
}

/* =========================================================
   DATE TO DAY NUMBER
========================================================= */

function vietnamDateToDayNumber(
    year,
    month,
    day
) {

    return Math.floor(
        Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day)
        ) / 86400000
    );
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

    if (
        parts.length !== 3
    ) {
        return date;
    }

    return (
        `${parts[2]}/` +
        `${parts[1]}/` +
        `${parts[0]}`
    );
}

/* =========================================================
   EXPORT
========================================================= */

export default WorkPage;