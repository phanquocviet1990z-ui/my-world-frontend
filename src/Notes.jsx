import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";


/* =========================================================
   NOTES
========================================================= */

function Notes({
    apiUrl
}) {

    /* =====================================================
       STATE
    ===================================================== */

    const [notes, setNotes] =
        useState([]);

    const [selectedNoteId, setSelectedNoteId] =
        useState(null);

    const [title, setTitle] =
        useState("");

    const [content, setContent] =
        useState("");

    const [attachments, setAttachments] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [deleting, setDeleting] =
        useState(false);

    const [uploading, setUploading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [filter, setFilter] =
        useState("all");

    const [editorDirty, setEditorDirty] =
        useState(false);

    const [previewImage, setPreviewImage] =
        useState(null);

    const fileInputRef =
        useRef(null);


    /* =====================================================
       API HELPER
    ===================================================== */

    async function apiRequest(
        url,
        options = {}
    ) {

        const response =
            await fetch(
                url,
                {
                    credentials:
                        "include",

                    ...options,

                    headers: {
                        Accept:
                            "application/json",

                        ...(options.headers || {})
                    }
                }
            );


        let data = null;

        try {

            data =
                await response.json();

        } catch {

            data = null;

        }


        if (
            response.status ===
            401
        ) {

            throw new Error(
                "Bạn chưa đăng nhập."
            );

        }


        if (
            !response.ok ||
            !data?.success
        ) {

            throw new Error(
                data?.message ||
                "Có lỗi xảy ra."
            );

        }


        return data;

    }


    /* =====================================================
       LOAD NOTES
    ===================================================== */

    const loadNotes =
        useCallback(
            async function () {

                try {

                    setLoading(true);

                    setError("");


                    const params =
                        new URLSearchParams();


                    if (
                        search.trim()
                    ) {

                        params.set(
                            "q",
                            search.trim()
                        );

                    }


                    if (
                        filter ===
                        "pinned"
                    ) {

                        params.set(
                            "pinned",
                            "true"
                        );

                    }


                    if (
                        filter ===
                        "favorite"
                    ) {

                        params.set(
                            "favorite",
                            "true"
                        );

                    }


                    const queryString =
                        params.toString();


                    const url =
                        `${apiUrl}/api/notes` +
                        (
                            queryString
                                ? `?${queryString}`
                                : ""
                        );


                    const data =
                        await apiRequest(
                            url
                        );


                    const loadedNotes =
                        Array.isArray(
                            data.notes
                        )
                            ? data.notes
                            : [];


                    setNotes(
                        loadedNotes
                    );


                    setSelectedNoteId(
                        (currentId) => {

                            const exists =
                                loadedNotes.some(
                                    (note) =>
                                        String(
                                            note.id
                                        ) ===
                                        String(
                                            currentId
                                        )
                                );


                            if (exists) {

                                return currentId;

                            }


                            return loadedNotes.length
                                ? loadedNotes[0].id
                                : null;

                        }
                    );


                    if (
                        loadedNotes.length ===
                        0
                    ) {

                        setTitle("");

                        setContent("");

                        setAttachments([]);

                    }

                } catch (error) {

                    console.error(
                        "LOAD NOTES ERROR:",
                        error
                    );

                    setError(
                        error.message ||
                        "Không thể tải ghi chú."
                    );

                } finally {

                    setLoading(false);

                }

            },
            [
                apiUrl,
                search,
                filter
            ]
        );


    /* =====================================================
       INITIAL / SEARCH LOAD
    ===================================================== */

    useEffect(
        function () {

            const timer =
                setTimeout(
                    function () {

                        loadNotes();

                    },
                    250
                );


            return function () {

                clearTimeout(
                    timer
                );

            };

        },
        [
            loadNotes
        ]
    );


    /* =====================================================
       SELECTED NOTE
    ===================================================== */

    const selectedNote =
        notes.find(
            (note) =>
                String(
                    note.id
                ) ===
                String(
                    selectedNoteId
                )
        );


    /* =====================================================
       LOAD NOTE DETAIL / ATTACHMENTS
    ===================================================== */

    const loadNoteDetail =
        useCallback(
            async function (
                noteId
            ) {

                if (
                    noteId === null ||
                    noteId === undefined
                ) {

                    setAttachments([]);

                    return;

                }


                try {

                    const data =
                        await apiRequest(
                            `${apiUrl}/api/notes/${noteId}`
                        );


                    setAttachments(
                        Array.isArray(
                            data.note?.attachments
                        )
                            ? data.note.attachments
                            : []
                    );

                } catch (error) {

                    console.error(
                        "LOAD NOTE DETAIL ERROR:",
                        error
                    );

                    setAttachments([]);

                }

            },
            [
                apiUrl
            ]
        );


    /* =====================================================
       WHEN SELECTED NOTE CHANGES
    ===================================================== */

    useEffect(
        function () {

            if (
                !selectedNote
            ) {

                setTitle("");

                setContent("");

                setAttachments([]);

                setEditorDirty(false);

                return;

            }


            setTitle(
                selectedNote.title ||
                ""
            );

            setContent(
                selectedNote.content ||
                ""
            );

            setEditorDirty(
                false
            );


            loadNoteDetail(
                selectedNote.id
            );

        },
        [
            selectedNoteId
        ]
    );


    /* =====================================================
       CREATE NOTE
    ===================================================== */

    async function createNote() {

        try {

            setSaving(true);

            setError("");


            const data =
                await apiRequest(
                    `${apiUrl}/api/notes`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                title:
                                    "Ghi chú mới",

                                content:
                                    "",

                                color:
                                    "default"
                            })
                    }
                );


            const newNote =
                data.note;


            setNotes(
                (current) => [
                    newNote,
                    ...current
                ]
            );


            setSelectedNoteId(
                newNote.id
            );

            setTitle("");

            setContent("");

            setAttachments([]);

        } catch (error) {

            console.error(
                "CREATE NOTE ERROR:",
                error
            );

            setError(
                error.message ||
                "Không thể tạo ghi chú."
            );

        } finally {

            setSaving(false);

        }

    }


    /* =====================================================
       SAVE NOTE
    ===================================================== */

    async function saveNote() {

        if (
            !selectedNoteId
        ) {

            return;

        }


        try {

            setSaving(true);

            setError("");


            const data =
                await apiRequest(
                    `${apiUrl}/api/notes/${selectedNoteId}`,
                    {
                        method:
                            "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                title,
                                content
                            })
                    }
                );


            const updatedNote =
                data.note;


            setNotes(
                (current) =>
                    current.map(
                        (note) =>
                            String(
                                note.id
                            ) ===
                            String(
                                updatedNote.id
                            )
                                ? {
                                    ...note,
                                    ...updatedNote
                                }
                                : note
                    )
            );


            setEditorDirty(
                false
            );

        } catch (error) {

            console.error(
                "SAVE NOTE ERROR:",
                error
            );

            setError(
                error.message ||
                "Không thể lưu ghi chú."
            );

        } finally {

            setSaving(false);

        }

    }


    /* =====================================================
       DELETE NOTE
    ===================================================== */

    async function deleteNote(
        noteId
    ) {

        if (
            !noteId
        ) {

            return;

        }


        const confirmed =
            window.confirm(
                "Chuyển ghi chú này vào thùng rác?"
            );


        if (
            !confirmed
        ) {

            return;

        }


        try {

            setDeleting(true);

            setError("");


            await apiRequest(
                `${apiUrl}/api/notes/${noteId}`,
                {
                    method:
                        "DELETE"
                }
            );


            const remainingNotes =
                notes.filter(
                    (note) =>
                        String(
                            note.id
                        ) !==
                        String(
                            noteId
                        )
                );


            setNotes(
                remainingNotes
            );


            if (
                String(
                    selectedNoteId
                ) ===
                String(
                    noteId
                )
            ) {

                const nextNote =
                    remainingNotes[0];


                if (
                    nextNote
                ) {

                    setSelectedNoteId(
                        nextNote.id
                    );

                } else {

                    setSelectedNoteId(
                        null
                    );

                    setTitle("");

                    setContent("");

                    setAttachments([]);

                }

            }

        } catch (error) {

            console.error(
                "DELETE NOTE ERROR:",
                error
            );

            setError(
                error.message ||
                "Không thể xóa ghi chú."
            );

        } finally {

            setDeleting(false);

        }

    }


    /* =====================================================
       PIN
    ===================================================== */

    async function togglePin(
        note
    ) {

        try {

            setError("");


            const data =
                await apiRequest(
                    `${apiUrl}/api/notes/${note.id}/pin`,
                    {
                        method:
                            "PATCH"
                    }
                );


            const updatedNote =
                data.note;


            setNotes(
                (current) =>
                    current.map(
                        (item) =>
                            String(
                                item.id
                            ) ===
                            String(
                                updatedNote.id
                            )
                                ? {
                                    ...item,
                                    ...updatedNote
                                }
                                : item
                    )
            );

        } catch (error) {

            console.error(
                "PIN NOTE ERROR:",
                error
            );

            setError(
                error.message ||
                "Không thể ghim ghi chú."
            );

        }

    }


    /* =====================================================
       FAVORITE
    ===================================================== */

    async function toggleFavorite(
        note
    ) {

        try {

            setError("");


            const data =
                await apiRequest(
                    `${apiUrl}/api/notes/${note.id}/favorite`,
                    {
                        method:
                            "PATCH"
                    }
                );


            const updatedNote =
                data.note;


            setNotes(
                (current) =>
                    current.map(
                        (item) =>
                            String(
                                item.id
                            ) ===
                            String(
                                updatedNote.id
                            )
                                ? {
                                    ...item,
                                    ...updatedNote
                                }
                                : item
                    )
            );

        } catch (error) {

            console.error(
                "FAVORITE NOTE ERROR:",
                error
            );

            setError(
                error.message ||
                "Không thể cập nhật yêu thích."
            );

        }

    }


    /* =====================================================
       UPLOAD FILES
    ===================================================== */

    async function uploadFiles(
        event
    ) {

        const files =
            Array.from(
                event.target.files ||
                []
            );


        if (
            !files.length ||
            !selectedNoteId
        ) {

            return;

        }


        try {

            setUploading(true);

            setError("");


            const formData =
                new FormData();


            files.forEach(
                function (file) {

                    formData.append(
                        "files",
                        file
                    );

                }
            );


            const data =
                await apiRequest(
                    `${apiUrl}/api/notes/${selectedNoteId}/attachments`,
                    {
                        method:
                            "POST",

                        body:
                            formData
                    }
                );


            const uploaded =
                Array.isArray(
                    data.attachments
                )
                    ? data.attachments
                    : [];


            setAttachments(
                (current) => [
                    ...current,
                    ...uploaded
                ]
            );


            setNotes(
                (current) =>
                    current.map(
                        (note) =>
                            String(
                                note.id
                            ) ===
                            String(
                                selectedNoteId
                            )
                                ? {
                                    ...note,
                                    attachment_count:
                                        Number(
                                            note.attachment_count ||
                                            0
                                        ) +
                                        uploaded.length
                                }
                                : note
                    )
            );

        } catch (error) {

            console.error(
                "UPLOAD NOTE FILE ERROR:",
                error
            );

            setError(
                error.message ||
                "Không thể tải file lên."
            );

        } finally {

            setUploading(false);


            if (
                fileInputRef.current
            ) {

                fileInputRef.current.value =
                    "";

            }

        }

    }


    /* =====================================================
       DELETE ATTACHMENT
    ===================================================== */

    async function deleteAttachment(
        attachment
    ) {

        const confirmed =
            window.confirm(
                `Xóa file "${attachment.file_name}" khỏi ghi chú?`
            );


        if (
            !confirmed
        ) {

            return;

        }


        try {

            setError("");


            await apiRequest(
                `${apiUrl}/api/notes/${selectedNoteId}/attachments/${attachment.id}`,
                {
                    method:
                        "DELETE"
                }
            );


            setAttachments(
                (current) =>
                    current.filter(
                        (item) =>
                            String(
                                item.id
                            ) !==
                            String(
                                attachment.id
                            )
                    )
            );


            setNotes(
                (current) =>
                    current.map(
                        (note) =>
                            String(
                                note.id
                            ) ===
                            String(
                                selectedNoteId
                            )
                                ? {
                                    ...note,
                                    attachment_count:
                                        Math.max(
                                            0,
                                            Number(
                                                note.attachment_count ||
                                                0
                                            ) -
                                            1
                                        )
                                }
                                : note
                    )
            );

        } catch (error) {

            console.error(
                "DELETE ATTACHMENT ERROR:",
                error
            );

            setError(
                error.message ||
                "Không thể xóa file."
            );

        }

    }


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatDate(
        value
    ) {

        if (
            !value
        ) {

            return "";

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";

        }


        return date.toLocaleString(
            "vi-VN",
            {
                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    false
            }
        );

    }


    /* =====================================================
       FILE HELPERS
    ===================================================== */

    function getFileUrl(
        fileUrl
    ) {

        if (
            !fileUrl
        ) {

            return "";

        }


        if (
            fileUrl.startsWith(
                "http://"
            ) ||
            fileUrl.startsWith(
                "https://"
            )
        ) {

            return fileUrl;

        }


        return (
            apiUrl.replace(
                /\/$/,
                ""
            ) +
            fileUrl
        );

    }


    function isImage(
        attachment
    ) {

        return (
            attachment?.file_type ===
                "image" ||
            attachment?.mime_type?.startsWith(
                "image/"
            )
        );

    }


    function formatFileSize(
        bytes
    ) {

        const size =
            Number(bytes || 0);


        if (
            size < 1024
        ) {

            return `${size} B`;

        }


        if (
            size < 1024 * 1024
        ) {

            return `${(
                size /
                1024
            ).toFixed(1)} KB`;

        }


        return `${(
            size /
            (1024 * 1024)
        ).toFixed(1)} MB`;

    }


    /* =====================================================
       LOADING
    ===================================================== */

    if (
        loading
    ) {

        return (
            <div
                className="notes-page"
            >

                <div
                    className="notes-loading"
                >

                    <div className="notes-loading-icon">
                        📝
                    </div>

                    <strong>
                        Đang tải ghi chú...
                    </strong>

                    <span>
                        Đang chuẩn bị không gian ghi chú của bạn
                    </span>

                </div>

            </div>
        );

    }


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div
            className="notes-page"
        >

            {/* =================================================
                TOP BAR
            ================================================= */}

            <div
                className="notes-topbar"
            >

                <div
                    className="notes-search-box"
                >

                    <span>
                        🔎
                    </span>

                    <input
                        type="text"
                        value={
                            search
                        }
                        onChange={(
                            event
                        ) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Tìm kiếm ghi chú..."
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


                <button
                    type="button"
                    className="notes-new-button"
                    onClick={
                        createNote
                    }
                    disabled={
                        saving
                    }
                >
                    <span>
                        ＋
                    </span>

                    Ghi chú mới
                </button>

            </div>


            {/* =================================================
                FILTERS
            ================================================= */}

            <div
                className="notes-filterbar"
            >

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
                    📋 Tất cả
                </button>


                <button
                    type="button"
                    className={
                        filter === "pinned"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setFilter("pinned")
                    }
                >
                    📌 Đã ghim
                </button>


                <button
                    type="button"
                    className={
                        filter === "favorite"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setFilter("favorite")
                    }
                >
                    ⭐ Yêu thích
                </button>


                <div
                    className="notes-count"
                >
                    {notes.length} ghi chú
                </div>

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

                <div
                    className="notes-error"
                >

                    <span>
                        ⚠️
                    </span>

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
                EMPTY
            ================================================= */}

            {!notes.length ? (

                <div
                    className="notes-empty"
                >

                    <div
                        className="notes-empty-icon"
                    >
                        📝
                    </div>

                    <h2>
                        {search
                            ? "Không tìm thấy ghi chú"
                            : filter === "pinned"
                                ? "Chưa có ghi chú được ghim"
                                : filter === "favorite"
                                    ? "Chưa có ghi chú yêu thích"
                                    : "Chưa có ghi chú"}
                    </h2>

                    <p>
                        {search
                            ? "Thử tìm kiếm với từ khóa khác."
                            : "Tạo một ghi chú mới để bắt đầu lưu giữ những điều quan trọng."}
                    </p>

                    {!search &&
                        filter === "all" && (

                            <button
                                type="button"
                                onClick={
                                    createNote
                                }
                            >
                                ＋ Tạo ghi chú đầu tiên
                            </button>

                        )}

                </div>

            ) : (

                <div
                    className="notes-workspace"
                >

                    {/* =================================================
                        SIDEBAR
                    ================================================= */}

                    <aside
                        className="notes-list"
                    >

                        <div
                            className="notes-list-header"
                        >

                            <strong>
                                Ghi chú của tôi
                            </strong>

                            <span>
                                {notes.length}
                            </span>

                        </div>


                        <div
                            className="notes-list-scroll"
                        >

                            {notes.map(
                                (
                                    note
                                ) => (

                                    <div
                                        key={
                                            note.id
                                        }
                                        className={
                                            String(
                                                note.id
                                            ) ===
                                            String(
                                                selectedNoteId
                                            )
                                                ? "notes-list-card active"
                                                : "notes-list-card"
                                        }
                                    >

                                        <button
                                            type="button"
                                            className="notes-list-main"
                                            onClick={() =>
                                                setSelectedNoteId(
                                                    note.id
                                                )
                                            }
                                        >

                                            <div
                                                className="notes-list-title"
                                            >

                                                <strong>
                                                    {note.title ||
                                                        "Ghi chú không có tiêu đề"}
                                                </strong>

                                                <div>
                                                    {note.is_pinned && (
                                                        <span>
                                                            📌
                                                        </span>
                                                    )}

                                                    {note.is_favorite && (
                                                        <span>
                                                            ⭐
                                                        </span>
                                                    )}

                                                </div>

                                            </div>


                                            <p>
                                                {note.content ||
                                                    "Chưa có nội dung"}
                                            </p>


                                            <div
                                                className="notes-list-meta"
                                            >

                                                <span>
                                                    {formatDate(
                                                        note.updated_at
                                                    )}
                                                </span>


                                                {Number(
                                                    note.attachment_count ||
                                                    0
                                                ) > 0 && (

                                                    <span>
                                                        📎{" "}
                                                        {
                                                            note.attachment_count
                                                        }
                                                    </span>

                                                )}

                                            </div>

                                        </button>


                                        <div
                                            className="notes-list-actions"
                                        >

                                            <button
                                                type="button"
                                                title={
                                                    note.is_pinned
                                                        ? "Bỏ ghim"
                                                        : "Ghim"
                                                }
                                                onClick={() =>
                                                    togglePin(
                                                        note
                                                    )
                                                }
                                            >
                                                {note.is_pinned
                                                    ? "📌"
                                                    : "📍"}
                                            </button>


                                            <button
                                                type="button"
                                                title={
                                                    note.is_favorite
                                                        ? "Bỏ yêu thích"
                                                        : "Yêu thích"
                                                }
                                                onClick={() =>
                                                    toggleFavorite(
                                                        note
                                                    )
                                                }
                                            >
                                                {note.is_favorite
                                                    ? "⭐"
                                                    : "☆"}
                                            </button>

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    </aside>


                    {/* =================================================
                        EDITOR
                    ================================================= */}

                    <section
                        className="notes-editor"
                    >

                        {selectedNote ? (

                            <>

                                {/* =====================================
                                    EDITOR HEADER
                                ===================================== */}

                                <div
                                    className="notes-editor-header"
                                >

                                    <div>

                                        <div
                                            className="notes-editor-breadcrumb"
                                        >
                                            📝 Ghi chú
                                        </div>

                                        <span>
                                            {saving
                                                ? "Đang lưu..."
                                                : editorDirty
                                                    ? "● Chưa lưu thay đổi"
                                                    : `Cập nhật ${formatDate(
                                                        selectedNote.updated_at
                                                    )}`}
                                        </span>

                                    </div>


                                    <div
                                        className="notes-editor-header-actions"
                                    >

                                        <button
                                            type="button"
                                            className={
                                                selectedNote.is_pinned
                                                    ? "active"
                                                    : ""
                                            }
                                            onClick={() =>
                                                togglePin(
                                                    selectedNote
                                                )
                                            }
                                            title="Ghim"
                                        >
                                            📌
                                        </button>


                                        <button
                                            type="button"
                                            className={
                                                selectedNote.is_favorite
                                                    ? "active"
                                                    : ""
                                            }
                                            onClick={() =>
                                                toggleFavorite(
                                                    selectedNote
                                                )
                                            }
                                            title="Yêu thích"
                                        >
                                            {selectedNote.is_favorite
                                                ? "⭐"
                                                : "☆"}
                                        </button>

                                    </div>

                                </div>


                                {/* =====================================
                                    TITLE
                                ===================================== */}

                                <input
                                    type="text"
                                    value={
                                        title
                                    }
                                    onChange={(
                                        event
                                    ) => {

                                        setTitle(
                                            event.target.value
                                        );

                                        setEditorDirty(
                                            true
                                        );

                                    }}
                                    placeholder="Tiêu đề ghi chú..."
                                    className="notes-title-input"
                                />


                                {/* =====================================
                                    CONTENT
                                ===================================== */}

                                <textarea
                                    value={
                                        content
                                    }
                                    onChange={(
                                        event
                                    ) => {

                                        setContent(
                                            event.target.value
                                        );

                                        setEditorDirty(
                                            true
                                        );

                                    }}
                                    placeholder="Viết điều bạn muốn lưu lại..."
                                    className="notes-content-input"
                                />


                                {/* =====================================
                                    ATTACHMENTS
                                ===================================== */}

                                <div
                                    className="notes-attachments"
                                >

                                    <div
                                        className="notes-section-heading"
                                    >

                                        <div>

                                            <strong>
                                                📎 Tệp đính kèm
                                            </strong>

                                            <span>
                                                {attachments.length} tệp
                                            </span>

                                        </div>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            disabled={
                                                uploading
                                            }
                                        >
                                            {uploading
                                                ? "Đang tải..."
                                                : "＋ Thêm ảnh / file"}
                                        </button>

                                    </div>


                                    <input
                                        ref={
                                            fileInputRef
                                        }
                                        type="file"
                                        multiple
                                        onChange={
                                            uploadFiles
                                        }
                                        hidden
                                    />


                                    {!attachments.length ? (

                                        <div
                                            className="notes-attachment-empty"
                                        >

                                            <span>
                                                🖼️
                                            </span>

                                            <div>
                                                <strong>
                                                    Chưa có tệp đính kèm
                                                </strong>

                                                <small>
                                                    Bạn có thể tải ảnh hoặc file lên ghi chú này.
                                                </small>
                                            </div>

                                        </div>

                                    ) : (

                                        <div
                                            className="notes-attachment-grid"
                                        >

                                            {attachments.map(
                                                (
                                                    attachment
                                                ) => {

                                                    const url =
                                                        getFileUrl(
                                                            attachment.file_url
                                                        );


                                                    return (
                                                        <div
                                                            key={
                                                                attachment.id
                                                            }
                                                            className={
                                                                isImage(
                                                                    attachment
                                                                )
                                                                    ? "notes-attachment image"
                                                                    : "notes-attachment file"
                                                            }
                                                        >

                                                            {isImage(
                                                                attachment
                                                            ) ? (

                                                                <button
                                                                    type="button"
                                                                    className="notes-image-preview"
                                                                    onClick={() =>
                                                                        setPreviewImage(
                                                                            {
                                                                                url,
                                                                                name:
                                                                                    attachment.file_name
                                                                            }
                                                                        )
                                                                    }
                                                                >

                                                                    <img
                                                                        src={
                                                                            url
                                                                        }
                                                                        alt={
                                                                            attachment.file_name
                                                                        }
                                                                    />

                                                                    <span>
                                                                        🔍
                                                                    </span>

                                                                </button>

                                                            ) : (

                                                                <a
                                                                    href={
                                                                        url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="notes-file-preview"
                                                                >

                                                                    <span>
                                                                        📄
                                                                    </span>

                                                                    <strong>
                                                                        {attachment.file_name}
                                                                    </strong>

                                                                    <small>
                                                                        {formatFileSize(
                                                                            attachment.file_size
                                                                        )}
                                                                    </small>

                                                                </a>

                                                            )}


                                                            <div
                                                                className="notes-attachment-footer"
                                                            >

                                                                <span
                                                                    title={
                                                                        attachment.file_name
                                                                    }
                                                                >
                                                                    {attachment.file_name}
                                                                </span>


                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        deleteAttachment(
                                                                            attachment
                                                                        )
                                                                    }
                                                                    title="Xóa file"
                                                                >
                                                                    🗑️
                                                                </button>

                                                            </div>

                                                        </div>
                                                    );

                                                }
                                            )}

                                        </div>

                                    )}

                                </div>


                                {/* =====================================
                                    ACTIONS
                                ===================================== */}

                                <div
                                    className="notes-editor-footer"
                                >

                                    <div>

                                        <span>
                                            {content.length} ký tự
                                        </span>

                                        {attachments.length > 0 && (

                                            <span>
                                                📎{" "}
                                                {attachments.length} tệp
                                            </span>

                                        )}

                                    </div>


                                    <div
                                        className="notes-editor-actions"
                                    >

                                        <button
                                            type="button"
                                            className="notes-delete-button"
                                            onClick={() =>
                                                deleteNote(
                                                    selectedNote.id
                                                )
                                            }
                                            disabled={
                                                saving ||
                                                deleting
                                            }
                                        >
                                            🗑️
                                        </button>


                                        <button
                                            type="button"
                                            className="notes-save-button"
                                            onClick={
                                                saveNote
                                            }
                                            disabled={
                                                saving ||
                                                !editorDirty
                                            }
                                        >
                                            {saving
                                                ? "Đang lưu..."
                                                : "💾 Lưu ghi chú"}
                                        </button>

                                    </div>

                                </div>

                            </>

                        ) : (

                            <div
                                className="notes-editor-empty"
                            >

                                <div>
                                    📝
                                </div>

                                <h2>
                                    Chọn một ghi chú
                                </h2>

                                <p>
                                    Chọn ghi chú ở bên trái hoặc tạo ghi chú mới.
                                </p>

                            </div>

                        )}

                    </section>

                </div>

            )}


            {/* =================================================
                IMAGE LIGHTBOX
            ================================================= */}

            {previewImage && (

                <div
                    className="notes-image-lightbox"
                    onClick={() =>
                        setPreviewImage(null)
                    }
                >

                    <button
                        type="button"
                        className="notes-lightbox-close"
                        onClick={() =>
                            setPreviewImage(null)
                        }
                    >
                        ×
                    </button>


                    <img
                        src={
                            previewImage.url
                        }
                        alt={
                            previewImage.name
                        }
                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    />


                    <div
                        className="notes-lightbox-name"
                    >
                        {previewImage.name}
                    </div>

                </div>

            )}

        </div>
    );

}


export default Notes;