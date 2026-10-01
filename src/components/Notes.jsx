import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotesFirestore,
  addNoteFirestore,
  deleteNoteFirestore,
  updateNoteFirestore,
} from "../redux/notesSlice";
import { Edit2, Trash2, Plus, X, Check, ImageIcon, FileText, Paperclip } from "lucide-react";
import { normalizeAttachments, readFileAsDataUrl, getAttachmentLabel } from "../utils/noteAttachments";

function normalizeNote(note) {
  const heading = note.heading ?? (typeof note.text === "string" ? "" : "");
  const description = note.description ?? note.text ?? "";
  return { ...note, heading, description, attachments: normalizeAttachments(note.attachments || []) };
}

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + " at " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function Notes() {
  const dispatch = useDispatch();
  const notes = useSelector((state) => state.notes);
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editHeading, setEditHeading] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAttachments, setEditAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchNotesFirestore());
  }, [dispatch]);

  const handleFilesSelected = async (event, mode = "create") => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const nextAttachments = await Promise.all(
      files.map(async (file) => {
        const dataUrl = await readFileAsDataUrl(file);
        return {
          id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
          dataUrl,
          size: file.size,
        };
      })
    );

    if (mode === "edit") {
      setEditAttachments((current) => [...current, ...nextAttachments]);
    } else {
      setAttachments((current) => [...current, ...nextAttachments]);
    }

    event.target.value = "";
  };

  const removeAttachment = (attachmentId, mode = "create") => {
    if (mode === "edit") {
      setEditAttachments((current) => current.filter((item) => item.id !== attachmentId));
      return;
    }

    setAttachments((current) => current.filter((item) => item.id !== attachmentId));
  };

  const handleAdd = () => {
    const h = heading.trim();
    const d = description.trim();
    if (!h && !d && !attachments.length) return;
    dispatch(
      addNoteFirestore({
        heading: h || "Untitled",
        description: d,
        attachments,
        createdAt: Date.now(),
      })
    );
    setHeading("");
    setDescription("");
    setAttachments([]);
  };

  const handleKeyDown = (e, field) => {
    if (e.key === "Enter") {
      if (field === "heading") {
        e.preventDefault();
        document.querySelector("textarea")?.focus();
      } else if (field === "description" && e.ctrlKey) {
        e.preventDefault();
        handleAdd();
      }
    }
  };

  const startEdit = (note) => {
    const n = normalizeNote(note);
    setEditingId(note.id);
    setEditHeading(n.heading);
    setEditDescription(n.description);
    setEditAttachments(n.attachments);
  };

  const saveEdit = (note) => {
    const h = editHeading.trim();
    const d = editDescription.trim();
    if (!h && !d && !editAttachments.length) return;
    dispatch(
      updateNoteFirestore({
        id: note.id,
        heading: h || "Untitled",
        description: d,
        attachments: editAttachments,
        createdAt: note.createdAt,
      })
    );
    setEditingId(null);
    setEditAttachments([]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAttachments([]);
  };

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Input Area */}
      <div className="flex flex-col gap-3 mb-8 shrink-0 bg-slate-50 dark:bg-[#1a1a1e] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 transition-colors focus-within:border-indigo-300 dark:focus-within:border-indigo-500/50">
        <input
          type="text"
          placeholder="Note title..."
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "heading")}
          className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 font-semibold text-lg"
        />
        <textarea
          placeholder="Take a note... (Ctrl+Enter to save)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "description")}
          rows={3}
          className="w-full bg-transparent border-none text-slate-700 dark:text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-0 resize-none text-sm"
        />
        <div className="flex items-center justify-between gap-3 mt-2">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={(event) => handleFilesSelected(event, "create")}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-[#1a1a1e] dark:text-slate-200"
            >
              <Paperclip className="h-4 w-4" />
              Add photo / PDF
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!heading.trim() && !description.trim() && !attachments.length}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-[#1a1a1e] dark:text-slate-200">
                {attachment.type === "pdf" ? <FileText className="h-3.5 w-3.5 text-rose-500" /> : <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />}
                <span className="max-w-[180px] truncate">{getAttachmentLabel(attachment)}</span>
                <button type="button" onClick={() => removeAttachment(attachment.id, "create")} className="text-slate-400 hover:text-rose-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2 pb-4">
        {notes.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">
            <p className="text-lg font-medium">No notes yet</p>
            <p className="text-sm mt-1">Your notes will appear here once you create them.</p>
          </div>
        ) : (
          notes.map((note) => {
            const n = normalizeNote(note);
            const isExpanded = expandedId === note.id;
            const isEditing = editingId === note.id;

            if (isEditing) {
              return (
                <div
                  key={note.id}
                  className="border border-indigo-300 dark:border-indigo-500/50 rounded-2xl p-4 bg-white dark:bg-[#121214] shadow-sm"
                >
                  <input
                    value={editHeading}
                    onChange={(e) => setEditHeading(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (editHeading.trim() || editDescription.trim()) && saveEdit(note)}
                    placeholder="Title"
                    className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 font-semibold mb-2"
                    autoFocus
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onKeyDown={(e) => e.ctrlKey && e.key === "Enter" && (editHeading.trim() || editDescription.trim()) && saveEdit(note)}
                    placeholder="Description... (Ctrl+Enter to save)"
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800/60 rounded-xl p-3 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y text-sm mb-3"
                  />

                  <div className="mb-3">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      className="hidden"
                      onChange={(event) => handleFilesSelected(event, "edit")}
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-[#1a1a1e] dark:text-slate-200"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Add photo / PDF
                    </button>
                  </div>

                  {editAttachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {editAttachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-[#1a1a1e] dark:text-slate-200">
                          {attachment.type === "pdf" ? <FileText className="h-3.5 w-3.5 text-rose-500" /> : <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />}
                          <span className="max-w-[180px] truncate">{getAttachmentLabel(attachment)}</span>
                          <button type="button" onClick={() => removeAttachment(attachment.id, "edit")} className="text-slate-400 hover:text-rose-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm flex items-center gap-2"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(note)}
                      disabled={!(editHeading.trim() || editDescription.trim() || editAttachments.length)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 font-medium text-sm flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={note.id}
                className={`group border border-slate-200 dark:border-slate-800/60 rounded-2xl bg-white dark:bg-[#121214] hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-sm transition-all cursor-pointer ${
                  isExpanded ? "ring-2 ring-indigo-500/20 border-indigo-200 dark:border-indigo-900/50" : ""
                }`}
                onClick={() => setExpandedId(isExpanded ? null : note.id)}
              >
                <div className="p-5 flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate text-lg">
                      {n.heading || "Untitled"}
                    </h3>
                    <p
                      className={`text-slate-600 dark:text-slate-400 text-sm mt-2 leading-relaxed ${
                        isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                      }`}
                    >
                      {n.description || "No description"}
                    </p>

                    {n.attachments?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {n.attachments.slice(0, isExpanded ? n.attachments.length : 3).map((attachment) => (
                          <div key={attachment.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#1a1a1e]">
                            {attachment.type === "pdf" ? (
                              <a
                                href={attachment.dataUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:text-indigo-600 dark:text-slate-200"
                              >
                                <FileText className="h-4 w-4 text-rose-500" />
                                {getAttachmentLabel(attachment)}
                              </a>
                            ) : (
                              <img
                                src={attachment.dataUrl}
                                alt={getAttachmentLabel(attachment)}
                                className="h-16 w-16 object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 font-medium">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                  
                  <div
                    className={`flex items-center gap-1 shrink-0 transition-opacity ${isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => startEdit(note)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
                      aria-label="Edit note"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => dispatch(deleteNoteFirestore(note.id))}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
