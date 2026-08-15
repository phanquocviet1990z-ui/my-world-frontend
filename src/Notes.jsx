import {
    useCallback,
    useEffect,
    useState
} from "react";


/* =========================================================
   NOTES
========================================================= */

function Notes({
    apiUrl
}) {

    const [notes, setNotes] =
        useState([]);

    const [selectedNoteId, setSelectedNoteId] =
        useState(null);

    const [title, setTitle] =
        useState("");

    const [content, setContent] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [deleting, setDeleting] =
        useState(false);

    const [error, setError] =
        useState("");


    /* =====================================================
       LOAD NOTES
    ===================================================== */

    const loadNotes =
        useCallback(
            async function () {

                try {

                    setLoading(true);

                    setError("");

                    const response =
                        await fetch(
                            `${apiUrl}/api/notes`,
                            {
                                method: "GET",

                                credentials:
                                    "include",

                                headers: {
                                    Accept:
                                        "application/json"
                                }
                            }
                        );


                    const data =
                        await response.json();


                    if (
                        response.status ===
                        401
                    ) {

                        setNotes([]);

                        setSelectedNoteId(
                            null
                        );

                        return;
                    }


                    if (
                        !response.ok ||
                        !data.success
                    ) {

                        throw new Error(
                            data.message ||
                            "Không thể tải ghi chú."
                        );

                    }


                    const loadedNotes =
                        Array.isArray(
                            data.notes
                        )
                            ? data.notes
                            : [];


                    setNotes(
                        loadedNotes
                    );


                    /*
                     * Nếu chưa chọn note nào,
                     * tự chọn note đầu tiên.
                     */

                    if (
                        loadedNotes.length > 0
                    ) {

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


                                return exists
                                    ? currentId
                                    : loadedNotes[0].id;

                            }
                        );

                    } else {

                        setSelectedNoteId(
                            null
                        );

                        setTitle("");

                        setContent("");

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
                apiUrl
            ]
        );


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(
        function () {

            loadNotes();

        },
        [
            loadNotes
        ]
    );


    /* =====================================================
       SELECT NOTE
    ===================================================== */

    useEffect(
        function () {

            if (
                selectedNoteId === null
            ) {

                setTitle("");

                setContent("");

                return;

            }


            const note =
                notes.find(
                    (item) =>
                        String(
                            item.id
                        ) ===
                        String(
                            selectedNoteId
                        )
                );


            if (!note) {
                return;
            }


            setTitle(
                note.title || ""
            );

            setContent(
                note.content || ""
            );

        },
        [
            selectedNoteId,
            notes
        ]
    );


    /* =====================================================
       CREATE NOTE
    ===================================================== */

    async function createNote() {

        try {

            setSaving(true);

            setError("");


            const response =
                await fetch(
                    `${apiUrl}/api/notes`,
                    {
                        method: "POST",

                        credentials:
                            "include",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Accept:
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                title:
                                    "Ghi chú mới",

                                content:
                                    ""
                            })
                    }
                );


            const data =
                await response.json();


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
                !data.success ||
                !data.note
            ) {

                throw new Error(
                    data.message ||
                    "Không thể tạo ghi chú."
                );

            }


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
            selectedNoteId === null
        ) {

            return;

        }


        try {

            setSaving(true);

            setError("");


            const response =
                await fetch(
                    `${apiUrl}/api/notes/${selectedNoteId}`,
                    {
                        method: "PUT",

                        credentials:
                            "include",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Accept:
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                title,
                                content
                            })
                    }
                );


            const data =
                await response.json();


            if (
                response.status ===
                401
            ) {

                throw new Error(
                    "Bạn chưa đăng nhập."
                );

            }


            if (
                response.status ===
                404
            ) {

                throw new Error(
                    "Ghi chú không còn tồn tại."
                );

            }


            if (
                !response.ok ||
                !data.success ||
                !data.note
            ) {

                throw new Error(
                    data.message ||
                    "Không thể lưu ghi chú."
                );

            }


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
                                ? updatedNote
                                : note
                    )
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
            noteId === null ||
            noteId === undefined
        ) {

            return;

        }


        const confirmed =
            window.confirm(
                "Bạn có chắc muốn xóa ghi chú này?"
            );


        if (!confirmed) {
            return;
        }


        try {

            setDeleting(true);

            setError("");


            const response =
                await fetch(
                    `${apiUrl}/api/notes/${noteId}`,
                    {
                        method: "DELETE",

                        credentials:
                            "include",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const data =
                await response.json();


            if (
                response.status ===
                401
            ) {

                throw new Error(
                    "Bạn chưa đăng nhập."
                );

            }


            if (
                response.status ===
                404
            ) {

                throw new Error(
                    "Ghi chú không còn tồn tại."
                );

            }


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Không thể xóa ghi chú."
                );

            }


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


            /*
             * Nếu xóa note đang mở,
             * chuyển sang note đầu tiên còn lại.
             */

            if (
                String(
                    selectedNoteId
                ) ===
                String(
                    noteId
                )
            ) {

                if (
                    remainingNotes.length >
                    0
                ) {

                    setSelectedNoteId(
                        remainingNotes[0].id
                    );

                } else {

                    setSelectedNoteId(
                        null
                    );

                    setTitle("");

                    setContent("");

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
       FORMAT DATE
    ===================================================== */

    function formatDate(
        value
    ) {

        if (!value) {
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
       LOADING
    ===================================================== */

    if (loading) {

        return (
            <div
                className="notes-page"
            >

                <div
                    className="notes-loading"
                >
                    <div>
                        📝
                    </div>

                    <strong>
                        Đang tải ghi chú...
                    </strong>
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
                TOOLBAR
            ================================================= */}

            <div
                className="notes-toolbar"
            >

                <div>

                    <strong>
                        Ghi chú của tôi
                    </strong>

                    <span>
                        {notes.length}{" "}
                        {notes.length === 1
                            ? "ghi chú"
                            : "ghi chú"}
                    </span>

                </div>


                <div
                    className="notes-toolbar-actions"
                >

                    <button
                        type="button"
                        onClick={
                            createNote
                        }
                        disabled={
                            saving ||
                            deleting
                        }
                    >
                        ＋ Ghi chú mới
                    </button>

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
                        Chưa có ghi chú
                    </h2>

                    <p>
                        Tạo ghi chú đầu tiên
                        để lưu lại những
                        điều quan trọng.
                    </p>

                    <button
                        type="button"
                        onClick={
                            createNote
                        }
                        disabled={
                            saving
                        }
                    >
                        ＋ Tạo ghi chú đầu tiên
                    </button>

                </div>

            ) : (

                /* =================================================
                   NOTES WORKSPACE
                ================================================= */

                <div
                    className="notes-workspace"
                >

                    {/* =============================================
                       LIST
                    ============================================= */}

                    <aside
                        className="notes-list"
                    >

                        {notes.map(
                            (note) => (

                                <button
                                    key={
                                        note.id
                                    }
                                    type="button"
                                    className={[
                                        "notes-list-item",
                                        String(
                                            note.id
                                        ) ===
                                        String(
                                            selectedNoteId
                                        )
                                            ? "active"
                                            : ""
                                    ]
                                        .filter(
                                            Boolean
                                        )
                                        .join(
                                            " "
                                        )}
                                    onClick={() =>
                                        setSelectedNoteId(
                                            note.id
                                        )
                                    }
                                >

                                    <strong>
                                        {note.title ||
                                            "Ghi chú không có tiêu đề"}
                                    </strong>

                                    <span>
                                        {note.content
                                            ? note.content
                                            : "Chưa có nội dung"}
                                    </span>

                                    <small>
                                        {formatDate(
                                            note.updated_at
                                        )}
                                    </small>

                                </button>

                            )
                        )}

                    </aside>


                    {/* =============================================
                       EDITOR
                    ============================================= */}

                    <section
                        className="notes-editor"
                    >

                        {selectedNote ? (

                            <>

                                <div
                                    className="notes-editor-top"
                                >

                                    <span>
                                        📝
                                    </span>

                                    <span>
                                        {saving
                                            ? "Đang lưu..."
                                            : formatDate(
                                                selectedNote.updated_at
                                            )}
                                    </span>

                                </div>


                                <input
                                    type="text"
                                    value={
                                        title
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setTitle(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Tiêu đề ghi chú"
                                    className="notes-title-input"
                                />


                                <textarea
                                    value={
                                        content
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setContent(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Viết điều bạn muốn lưu lại..."
                                    className="notes-content-input"
                                />


                                <div
                                    className="notes-editor-actions"
                                >

                                    <button
                                        type="button"
                                        onClick={
                                            saveNote
                                        }
                                        disabled={
                                            saving ||
                                            deleting
                                        }
                                    >
                                        {saving
                                            ? "Đang lưu..."
                                            : "💾 Lưu ghi chú"}
                                    </button>


                                    <button
                                        type="button"
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
                                        {deleting
                                            ? "Đang xóa..."
                                            : "🗑️ Xóa"}
                                    </button>

                                </div>

                            </>

                        ) : (

                            <div
                                className="notes-editor-empty"
                            >
                                Chọn một ghi chú để bắt đầu.
                            </div>

                        )}

                    </section>

                </div>

            )}

        </div>
    );

}


export default Notes;