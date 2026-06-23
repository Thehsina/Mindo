// src/redux/tasksSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  orderBy
} from "firebase/firestore";

const tasksSlice = createSlice({
  name: "tasks",

  initialState: [],

  reducers: {
    setTasks: (state, action) => {
      return action.payload;
    },

    addTask: (state, action) => {
      state.push(action.payload);
    },

    toggleTask: (state, action) => {
      const task = state.find((t) => t.id === action.payload);
      if (task) {
        task.completed = !task.completed;
      }
    },

    deleteTask: (state, action) => {
      return state.filter((t) => t.id !== action.payload);
    },

    updateTask: (state, action) => {
      const index = state.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state[index] = { ...state[index], ...action.payload };
      }
    }
  }
});

export const { setTasks, addTask, toggleTask, deleteTask, updateTask } =
  tasksSlice.actions;

export default tasksSlice.reducer;

//////////////////////////////////////////////////////////
// FIRESTORE FUNCTIONS
//////////////////////////////////////////////////////////

export const fetchTasksFirestore = () => async (dispatch) => {
  const q = query(collection(db, "tasks"), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);

  const tasks = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    status: doc.data().status || (doc.data().completed ? "completed" : "todo"), // Migrate old tasks
  }));

  dispatch(setTasks(tasks));
};

export const addTaskFirestore = (task) => async (dispatch) => {
  console.log("Adding to firestore:", task);

  const docRef = await addDoc(collection(db, "tasks"), task);

  dispatch(
    addTask({
      id: docRef.id,
      ...task
    })
  );
};

export const toggleTaskFirestore = (task) => async (dispatch) => {
  await updateDoc(doc(db, "tasks", task.id), {
    completed: !task.completed
  });

  dispatch(toggleTask(task.id));
};

export const updateTaskFirestore = (task) => async (dispatch) => {
  const { id, ...data } = task;
  await updateDoc(doc(db, "tasks", id), data);
  dispatch(updateTask(task));
};

export const deleteTaskFirestore = (id) => async (dispatch) => {
  await deleteDoc(doc(db, "tasks", id));

  dispatch(deleteTask(id));
};

export const updateTaskStatusFirestore = (taskId, status) => async (dispatch) => {
  if (taskId.startsWith("temp-")) {
    dispatch(updateTaskStatus({ id: taskId, status }));
    return;
  }
  try {
    await updateDoc(doc(db, "tasks", taskId), {
      status,
      completed: status === "completed" // Keep backward compatibility
    });
    dispatch(updateTaskStatus({ id: taskId, status }));
  } catch (err) {
    console.error("Failed to update task status in Firestore:", err);
  }
};