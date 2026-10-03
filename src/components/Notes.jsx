import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotesFirestore,
  addNoteFirestore,
  deleteNoteFirestore,
  updateNoteFirestore,
} from "../redux/notesSlice";
import { Edit2, Trash2, Plus, X, Check, ImageIcon, FileText, Paperclip, Notebook } from "lucide-react";
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
  const [selectedNote, setSelectedNote] = useState(null);
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

  const startEdit = (note, e) => {
    if (e) e.stopPropagation();
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
    if (selectedNote?.id === note.id) {
      setSelectedNote({ ...note, heading: h || "Untitled", description: d, attachments: editAttachments });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAttachments([]);
  };

  const handleDeleteNote = (noteId, e) => {
    if (e) e.stopPropagation();
    dispatch(deleteNoteFirestore(noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
  };

  return (
    <div className="flex flex-col min-h-0 h-full gap-4">
      {/* Create Note Input Box */}
      <div className="flex flex-col gap-3 shrink-0 bg-slate-50 dark:bg-[#1a1a1e] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 transition-colors focus-within:border-indigo-400 dark:focus-within:border-indigo-500/50 shadow-xs">
        <input
          type="text"
          placeholder="Note title..."
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "heading")}
          className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 font-bold text-base sm:text-lg"
        />
        <textarea
          placeholder="Take a note... (Ctrl+Enter to save)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "description")}
          rows={2}
          className="w-full bg-transparent border-none text-slate-700 dark:text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-0 resize-none text-sm font-medium"
        />

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#121214] dark:text-slate-200">
                {attachment.type === "pdf" ? <FileText className="h-4 w-4 text-rose-500" /> : <ImageIcon className="h-4 w-4 text-indigo-500" />}
                <span className="max-w-[180px] truncate">{getAttachmentLabel(attachment)}</span>
                <button type="button" onClick={() => removeAttachment(attachment.id, "create")} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-[#121214] dark:text-slate-200 cursor-pointer"
            >
              <Paperclip className="h-4 w-4" />
              Add photo / PDF
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!heading.trim() && !description.trim() && !attachments.length}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        </div>
      </div>

      {/* Notes Cards Grid - Designed like Grocery Cards */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {notes.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            <Notebook className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <p className="text-base font-bold text-slate-800 dark:text-white">No notes yet</p>
            <p className="text-xs text-slate-500">Create your first note above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => {
              const n = normalizeNote(note);
              const isEditing = editingId === note.id;

              if (isEditing) {
                return (
                  <div
                    key={note.id}
                    className="border-2 border-indigo-500 rounded-2xl p-4 bg-white dark:bg-[#121214] shadow-md flex flex-col justify-between min-h-[200px]"
                  >
                    <div>
                      <input
                        value={editHeading}
                        onChange={(e) => setEditHeading(e.target.value)}
                        placeholder="Title..."
                        className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-bold text-base mb-2"
                        autoFocus
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description..."
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-700 dark:text-slate-300 focus:outline-none text-xs resize-none mb-2"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {editAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                          {editAttachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-[#1a1a1e] dark:text-slate-200">
                              {attachment.type === "pdf" ? <FileText className="h-3 w-3 text-rose-500" /> : <ImageIcon className="h-3 w-3 text-indigo-500" />}
                              <span className="max-w-[120px] truncate">{getAttachmentLabel(attachment)}</span>
                              <button type="button" onClick={() => removeAttachment(attachment.id, "edit")} className="text-slate-400 hover:text-rose-600">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="p-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 flex items-center gap-1"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            multiple
                            className="hidden"
                            onChange={(event) => handleFilesSelected(event, "edit")}
                          />
                        </button>
                        <div className="flex gap-1.5">
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(note)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors font-semibold text-xs flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-2xs hover:shadow-md transition-all duration-200 dark:border-slate-800/80 dark:bg-[#121214] hover:border-indigo-400 dark:hover:border-indigo-500/50 cursor-pointer min-h-[160px]"
                >
                  <div>
                    {/* Top Header Card Info */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                        Note
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEdit(note, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                          title="Edit note"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Content */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate mt-2">
                      {n.heading || "Untitled"}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-3 leading-relaxed font-medium">
                      {n.description || "No description"}
                    </p>

                    {/* Attachments preview */}
                    {n.attachments?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {n.attachments.slice(0, 3).map((attachment) => (
                          <div key={attachment.id} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#1a1a1e]">
                            {attachment.type === "pdf" ? (
                              <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                <FileText className="h-3 w-3 text-rose-500" />
                                PDF
                              </span>
                            ) : (
                              <img
                                src={attachment.dataUrl}
                                alt={getAttachmentLabel(attachment)}
                                className="h-10 w-10 object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Date */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    <span>{formatDate(n.createdAt)}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 group-hover:underline">View &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note View Modal when clicked */}
      {selectedNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                  Note Details
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {normalizeNote(selectedNote).heading || "Untitled"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNote(null)}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 dark:border-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {normalizeNote(selectedNote).description || "No description."}
              </p>

              {normalizeNote(selectedNote).attachments?.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Attachments</h4>
                  <div className="flex flex-wrap gap-2">
                    {normalizeNote(selectedNote).attachments.map((attachment) => (
                      <div key={attachment.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#1a1a1e]">
                        {attachment.type === "pdf" ? (
                          <a
                            href={attachment.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-200"
                          >
                            <FileText className="h-4 w-4 text-rose-500" />
                            {getAttachmentLabel(attachment)}
                          </a>
                        ) : (
                          <a href={attachment.dataUrl} target="_blank" rel="noreferrer">
                            <img
                              src={attachment.dataUrl}
                              alt={getAttachmentLabel(attachment)}
                              className="h-24 w-24 object-cover"
                            />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500">
              <span>{formatDate(selectedNote.createdAt)}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const n = selectedNote;
                    setSelectedNote(null);
                    startEdit(n);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  Edit Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
