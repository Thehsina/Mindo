import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotesFirestore,
  addNoteFirestore,
  deleteNoteFirestore,
  updateNoteFirestore,
} from "../redux/notesSlice";
import { EditIcon, DeleteIcon } from "./Icons";

function normalizeNote(note) {
  const heading = note.heading ?? (typeof note.text === "string" ? "" : "");
  const description = note.description ?? note.text ?? "";
  return { ...note, heading, description };
}

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function Notes() {
  const dispatch = useDispatch();
  const notes = useSelector((state) => state.notes);
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editHeading, setEditHeading] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    dispatch(fetchNotesFirestore());
  }, [dispatch]);

  const handleAdd = () => {
    const h = heading.trim();
    const d = description.trim();
    if (!h && !d) return;
    dispatch(
      addNoteFirestore({
        heading: h || "Untitled",
        description: d,
        createdAt: Date.now(),
      })
    );
    setHeading("");
    setDescription("");
  };

  const handleKeyDown = (e, field) => {
    if (e.key === "Enter") {
      if (field === "heading") {
        // Move to description
        e.preventDefault();
        document.querySelector("textarea")?.focus();
      } else if (field === "description" && e.ctrlKey) {
        // Ctrl+Enter to submit
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
  };

  const saveEdit = (note) => {
    const h = editHeading.trim();
    const d = editDescription.trim();
    if (!h && !d) {
      // nothing to save
      return;
    }
    dispatch(
      updateNoteFirestore({
        id: note.id,
        heading: h || "Untitled",
        description: d,
        createdAt: note.createdAt,
      })
    );
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex flex-col gap-3 mb-6 shrink-0">
        <input
          type="text"
          placeholder="📝 Note heading..."
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "heading")}
          className="glass-input w-full"
        />
        <textarea
          placeholder="✍️ Description... (Ctrl+Enter to submit)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "description")}
          rows={3}
          className="glass-input w-full resize-y"
        />
        <button
          onClick={handleAdd}
          className="glass-button w-fit"
        >
          Add Note
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {notes.map((note) => {
          const n = normalizeNote(note);
          const isExpanded = expandedId === note.id;
          const isEditing = editingId === note.id;

          if (isEditing) {
            return (
              <div
                key={note.id}
                className="glass-card p-4"
              >
                <input
                  value={editHeading}
                  onChange={(e) => setEditHeading(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (editHeading.trim() || editDescription.trim()) && saveEdit(note)}
                  placeholder="Heading"
                  className="glass-input w-full mb-2 text-sm"
                  autoFocus
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={(e) => e.ctrlKey && e.key === "Enter" && (editHeading.trim() || editDescription.trim()) && saveEdit(note)}
                  placeholder="Description... (Ctrl+Enter to save)"
                  rows={4}
                  className="glass-input w-full resize-y text-sm"
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    onClick={() => saveEdit(note)}
                    disabled={!(editHeading.trim() || editDescription.trim())}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer text-sm transition ${
                      editHeading.trim() || editDescription.trim()
                        ? "glass-button"
                        : "backdrop-blur-md bg-white/5 border border-white/10 text-white/40 cursor-not-allowed"
                    }`}
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 glass-button-outline rounded-lg cursor-pointer text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={note.id}
              className={`glass-card overflow-hidden transition-all cursor-pointer ${
                isExpanded ? "ring-2 ring-cyan-400/50" : ""
              }`}
            >
              <div
                className="p-4 flex justify-between items-start gap-2"
                onClick={() => setExpandedId(isExpanded ? null : note.id)}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-cyan-300 truncate">
                    {n.heading || "Untitled"}
                  </h3>
                  <p
                    className={`text-white/70 text-sm mt-1 ${
                      isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                    }`}
                  >
                    {n.description || "No description"}
                  </p>
                  <p className="text-xs text-cyan-300/50 mt-1">
                    {formatDate(n.createdAt)}
                  </p>
                </div>
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => startEdit(note)}
                    className="p-1.5 text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg cursor-pointer transition"
                    aria-label="Edit note"
                  >
                    <EditIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => dispatch(deleteNoteFirestore(note.id))}
                    className="p-1.5 text-pink-300/60 hover:text-pink-300 hover:bg-pink-500/10 rounded-lg cursor-pointer transition"
                    aria-label="Delete note"
                  >
                    <DeleteIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
