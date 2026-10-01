// src/redux/notesSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase";
import { normalizeAttachments } from "../utils/noteAttachments";

const sanitizeNote = (note = {}) => ({
  id: note.id,
  heading: note.heading ?? "",
  description: note.description ?? "",
  attachments: normalizeAttachments(note.attachments || []),
  createdAt: note.createdAt ?? Date.now(),
});

const notesSlice = createSlice({
  name: "notes",
  initialState: [],
  reducers: {
    setNotes: (state, action) => action.payload.map((note) => sanitizeNote(note)),
    addNote: (state, action) => {
      state.push(sanitizeNote(action.payload));
    },
    deleteNote: (state, action) => state.filter(n => n.id !== action.payload),
    updateNote: (state, action) => {
      const note = state.find(n => n.id === action.payload.id);
      if (note) {
        if (action.payload.heading !== undefined) note.heading = action.payload.heading;
        if (action.payload.description !== undefined) note.description = action.payload.description;
        if (action.payload.attachments !== undefined) note.attachments = normalizeAttachments(action.payload.attachments);
      }
    },
    replaceNoteId: (state, action) => {
      const { tempId, realId } = action.payload;
      const note = state.find(n => n.id === tempId);
      if (note) note.id = realId;
    },
  }
});

export const { setNotes, addNote, deleteNote, updateNote, replaceNoteId } = notesSlice.actions;
export default notesSlice.reducer;

// Supabase functions
export const fetchNotesFirestore = () => async dispatch => {
  try {
    if (!isSupabaseConfigured) {
      const localNotes = localStorage.getItem("tm.notes");
      const notes = localNotes ? JSON.parse(localNotes) : [];
      dispatch(setNotes(notes));
      return;
    }

    const user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const notes = (data || []).map(row => ({
      id: row.id,
      heading: row.heading || "",
      description: row.description || "",
      attachments: normalizeAttachments(row.attachments || []),
      createdAt: row.created_at
    }));

    dispatch(setNotes(notes));
  } catch (err) {
    console.error("Failed to fetch notes from Supabase:", err);
  }
};

export const addNoteFirestore = note => async dispatch => {
  const tempId = `temp-note-${Date.now()}`;
  const noteWithTempId = { ...note, id: tempId };
  dispatch(addNote(noteWithTempId));
  
  try {
    if (!isSupabaseConfigured) {
      const localNotes = localStorage.getItem("tm.notes");
      const notes = localNotes ? JSON.parse(localNotes) : [];
      const newNote = {
        ...note,
        attachments: normalizeAttachments(note.attachments || []),
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      notes.push(newNote);
      localStorage.setItem("tm.notes", JSON.stringify(notes));
      dispatch(replaceNoteId({ tempId, realId: newNote.id }));
      return;
    }

    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const dbData = {
      heading: note.heading || "",
      description: note.description || "",
      attachments: normalizeAttachments(note.attachments || []),
      user_id: user.id
    };

    const { data, error } = await supabase
      .from("notes")
      .insert([dbData])
      .select();

    if (error) {
      if (error.message?.includes("attachments") || error.message?.includes("column")) {
        const fallbackData = {
          heading: note.heading || "",
          description: note.description || "",
          user_id: user.id
        };

        const fallbackResult = await supabase
          .from("notes")
          .insert([fallbackData])
          .select();

        if (fallbackResult.error) throw fallbackResult.error;

        if (fallbackResult.data && fallbackResult.data[0]) {
          dispatch(replaceNoteId({ tempId, realId: fallbackResult.data[0].id }));
        }
        return;
      }

      throw error;
    }

    if (data && data[0]) {
      dispatch(replaceNoteId({ tempId, realId: data[0].id }));
    }
  } catch (err) {
    console.error("Failed to save note to Supabase:", err);
    dispatch(deleteNote(tempId));
  }
};

export const deleteNoteFirestore = id => async dispatch => {
  if (id.startsWith("temp-")) {
    dispatch(deleteNote(id));
    return;
  }
  
  try {
    if (!isSupabaseConfigured) {
      const localNotes = localStorage.getItem("tm.notes");
      let notes = localNotes ? JSON.parse(localNotes) : [];
      notes = notes.filter(n => n.id !== id);
      localStorage.setItem("tm.notes", JSON.stringify(notes));
      dispatch(deleteNote(id));
      return;
    }

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id);

    if (error) throw error;
    dispatch(deleteNote(id));
  } catch (err) {
    console.error("Failed to delete note from Supabase:", err);
  }
};

export const updateNoteFirestore = note => async dispatch => {
  if (note.id.startsWith("temp-")) {
    dispatch(updateNote({ id: note.id, heading: note.heading, description: note.description, attachments: note.attachments || [] }));
    return;
  }
  
  // Optimistic update - update Redux immediately
  dispatch(updateNote({ id: note.id, heading: note.heading, description: note.description, attachments: note.attachments || [] }));
  
  try {
    if (!isSupabaseConfigured) {
      const localNotes = localStorage.getItem("tm.notes");
      let notes = localNotes ? JSON.parse(localNotes) : [];
      notes = notes.map(n => n.id === note.id ? { ...n, heading: note.heading, description: note.description, attachments: normalizeAttachments(note.attachments || []) } : n);
      localStorage.setItem("tm.notes", JSON.stringify(notes));
      return;
    }

    const updateData = {
      heading: note.heading ?? "",
      description: note.description ?? "",
      attachments: normalizeAttachments(note.attachments || [])
    };

    const { error } = await supabase
      .from("notes")
      .update(updateData)
      .eq("id", note.id);

    if (error) {
      if (error.message?.includes("attachments") || error.message?.includes("column")) {
        const fallbackUpdate = {
          heading: note.heading ?? "",
          description: note.description ?? ""
        };

        const { error: fallbackError } = await supabase
          .from("notes")
          .update(fallbackUpdate)
          .eq("id", note.id);

        if (fallbackError) throw fallbackError;
        return;
      }

      throw error;
    }
  } catch (err) {
    console.error("Failed to update note in Supabase:", err);
  }
};