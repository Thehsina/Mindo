// src/redux/notesSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { db } from "../firebase";
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";

const notesSlice = createSlice({
  name: "notes",
  initialState: [],
  reducers: {
    setNotes: (state, action) => action.payload,
    addNote: (state, action) => {
      state.push(action.payload);
    },
    deleteNote: (state, action) => state.filter(n => n.id !== action.payload),
    updateNote: (state, action) => {
      const note = state.find(n => n.id === action.payload.id);
      if (note) {
        if (action.payload.heading !== undefined) note.heading = action.payload.heading;
        if (action.payload.description !== undefined) note.description = action.payload.description;
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

// Firestore functions
export const fetchNotesFirestore = () => async dispatch => {
  const snapshot = await getDocs(collection(db, "notes"));
  const notes = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      heading: data.heading ?? (data.text ? "" : ""),
      description: data.description ?? data.text ?? "",
      createdAt: data.createdAt
    };
  });
  dispatch(setNotes(notes));
};

export const addNoteFirestore = note => async dispatch => {
  const tempId = `temp-note-${Date.now()}`;
  const noteWithTempId = { ...note, id: tempId };
  dispatch(addNote(noteWithTempId));
  try {
    const docRef = await addDoc(collection(db, "notes"), note);
    dispatch(replaceNoteId({ tempId, realId: docRef.id }));
  } catch (err) {
    console.error("Failed to save note to Firestore:", err);
    dispatch(deleteNote(tempId));
  }
};

export const deleteNoteFirestore = id => async dispatch => {
  if (id.startsWith("temp-")) {
    dispatch(deleteNote(id));
    return;
  }
  try {
    await deleteDoc(doc(db, "notes", id));
    dispatch(deleteNote(id));
  } catch (err) {
    console.error("Failed to delete note from Firestore:", err);
    dispatch(deleteNote(id));
  }
};

export const updateNoteFirestore = note => async dispatch => {
  if (note.id.startsWith("temp-")) {
    dispatch(updateNote({ id: note.id, heading: note.heading, description: note.description }));
    return;
  }
  // Optimistic update - update Redux immediately
  dispatch(updateNote({ id: note.id, heading: note.heading, description: note.description }));
  try {
    const updateData = {
      heading: note.heading ?? "",
      description: note.description ?? ""
    };
    if (note.createdAt) {
      updateData.createdAt = note.createdAt;
    }
    await updateDoc(doc(db, "notes", note.id), updateData);
  } catch (err) {
    console.error("Failed to update note in Firestore:", err);
  }
};