// src/redux/tasksSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase";

const tasksSlice = createSlice({
  name: "tasks",

  initialState: [],

  reducers: {
    setTasks: (state, action) => {
      return action.payload;
    },

    addTask: (state, action) => {
      const normalized = normalizeTask(action.payload);
      state.push(normalized);
    },

    toggleTask: (state, action) => {
      const task = state.find((t) => t.id === action.payload);
      if (task) {
        const nextCompleted = !Boolean(task.completed);
        task.completed = nextCompleted;
        task.status = nextCompleted ? "completed" : "todo";
      }
    },

    deleteTask: (state, action) => {
      return state.filter((t) => t.id !== action.payload);
    },

    updateTask: (state, action) => {
      const index = state.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state[index] = normalizeTask({ ...state[index], ...action.payload });
      }
    }
  }
});

export const { setTasks, addTask, toggleTask, deleteTask, updateTask } =
  tasksSlice.actions;

export default tasksSlice.reducer;

//////////////////////////////////////////////////////////
// DB MAPPER HELPERS
//////////////////////////////////////////////////////////

const normalizeTask = (task = {}) => {
  const completed = Boolean(task.completed) || task.status === "completed";
  const status =
    task.status === "in-progress"
      ? "in-progress"
      : completed
        ? "completed"
        : "todo";

  return {
    ...task,
    completed,
    status,
  };
};

const mapTaskFromDb = (dbTask) => normalizeTask({
  id: dbTask.id,
  title: dbTask.title,
  note: dbTask.note || "",
  dueDate: dbTask.due_date || "",
  priority: dbTask.priority || "None",
  category: dbTask.category || "Reminders",
  repeat: dbTask.repeat || "Never",
  organization: dbTask.organization || "",
  placesPeople: dbTask.places_people || "",
  locationType: dbTask.location_type || "none",
  locationReminder: Boolean(dbTask.location_reminder),
  locationName: dbTask.location_name || "",
  completed: Boolean(dbTask.completed),
  status: dbTask.status,
  createdAt: dbTask.created_at
});

const mapTaskToDb = (task) => ({
  title: task.title,
  note: task.note || "",
  due_date: task.dueDate || null,
  priority: task.priority || "None",
  category: task.category || "Reminders",
  repeat: task.repeat || "Never",
  organization: task.organization || "",
  places_people: task.placesPeople || "",
  location_type: task.locationType || "none",
  location_reminder: Boolean(task.locationReminder),
  location_name: task.locationName || "",
  completed: Boolean(task.completed),
  status: task.status || (task.completed ? "completed" : "todo")
});

//////////////////////////////////////////////////////////
// SUPABASE & LOCALSTORAGE FUNCTIONS
//////////////////////////////////////////////////////////

const readLocalTasks = () => {
  try {
    const raw = localStorage.getItem("tm.tasks");
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to read local tasks:", error);
    return [];
  }
};

const writeLocalTasks = (tasks) => {
  localStorage.setItem("tm.tasks", JSON.stringify(tasks));
};

export const fetchTasksFirestore = () => async (dispatch) => {
  try {
    if (!isSupabaseConfigured) {
      dispatch(setTasks(readLocalTasks()));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      dispatch(setTasks(readLocalTasks()));
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const tasks = (data || []).map(mapTaskFromDb);
    localStorage.setItem("tm.tasks", JSON.stringify(tasks));
    dispatch(setTasks(tasks));
  } catch (err) {
    console.error("Fetch tasks failed:", err);
  }
};

export const addTaskFirestore = (task) => async (dispatch) => {
  if (!isSupabaseConfigured) {
    const tasks = readLocalTasks();
    const newTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      status: task.status || (task.completed ? "completed" : "todo")
    };
    tasks.push(newTask);
    writeLocalTasks(tasks);
    dispatch(addTask(newTask));
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    const tasks = readLocalTasks();
    const newTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      status: task.status || (task.completed ? "completed" : "todo")
    };
    tasks.push(newTask);
    writeLocalTasks(tasks);
    dispatch(addTask(newTask));
    return;
  }

  const dbData = {
    ...mapTaskToDb(task),
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert([dbData])
    .select();

  if (error) {
    console.error("Failed to add task:", error);
    throw error;
  }

  if (data && data[0]) {
    const savedTask = mapTaskFromDb(data[0]);
    const currentTasks = JSON.parse(localStorage.getItem("tm.tasks") || "[]");
    currentTasks.push(savedTask);
    localStorage.setItem("tm.tasks", JSON.stringify(currentTasks));
    dispatch(addTask(savedTask));
  }
};

export const updateTaskFirestore = (task) => async (dispatch) => {
  if (!isSupabaseConfigured) {
    const localTasks = readLocalTasks();
    const tasks = localTasks.map((t) => (t.id === task.id ? { ...t, ...task } : t));
    writeLocalTasks(tasks);
    dispatch(updateTask(task));
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    const localTasks = readLocalTasks();
    const tasks = localTasks.map((t) => (t.id === task.id ? { ...t, ...task } : t));
    writeLocalTasks(tasks);
    dispatch(updateTask(task));
    return;
  }

  const { id } = task;
  const dbData = mapTaskToDb(task);

  const { error } = await supabase
    .from("tasks")
    .update(dbData)
    .eq("id", id);

  if (error) {
    console.error("Failed to update task:", error);
    throw error;
  }

  dispatch(updateTask(task));
};

export const toggleTaskFirestore = (task) => async (dispatch) => {
  const newCompleted = !task.completed;
  const newStatus = newCompleted ? "completed" : "todo";

  if (!isSupabaseConfigured) {
    const localTasks = readLocalTasks();
    const tasks = localTasks.map((t) => (t.id === task.id ? { ...t, completed: newCompleted, status: newStatus } : t));
    writeLocalTasks(tasks);
    dispatch(toggleTask(task.id));
    dispatch(updateTask({ id: task.id, completed: newCompleted, status: newStatus }));
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    const localTasks = readLocalTasks();
    const tasks = localTasks.map((t) => (t.id === task.id ? { ...t, completed: newCompleted, status: newStatus } : t));
    writeLocalTasks(tasks);
    dispatch(toggleTask(task.id));
    dispatch(updateTask({ id: task.id, completed: newCompleted, status: newStatus }));
    return;
  }

  const { error } = await supabase
    .from("tasks")
    .update({ completed: newCompleted, status: newStatus })
    .eq("id", task.id);

  if (error) {
    console.error("Failed to toggle task:", error);
    return;
  }

  dispatch(toggleTask(task.id));
  dispatch(updateTask({ id: task.id, completed: newCompleted, status: newStatus }));
};

export const deleteTaskFirestore = (id) => async (dispatch) => {
  if (!isSupabaseConfigured) {
    const localTasks = readLocalTasks();
    const tasks = localTasks.filter((t) => t.id !== id);
    writeLocalTasks(tasks);
    dispatch(deleteTask(id));
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    const localTasks = readLocalTasks();
    const tasks = localTasks.filter((t) => t.id !== id);
    writeLocalTasks(tasks);
    dispatch(deleteTask(id));
    return;
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete task:", error);
    return;
  }

  const localTasks = JSON.parse(localStorage.getItem("tm.tasks") || "[]");
  const nextTasks = localTasks.filter((task) => task.id !== id);
  localStorage.setItem("tm.tasks", JSON.stringify(nextTasks));
  dispatch(deleteTask(id));
};

export const updateTaskStatusFirestore = (taskId, status) => async (dispatch) => {
  const completed = status === "completed";

  if (!isSupabaseConfigured) {
    const localTasks = localStorage.getItem("tm.tasks");
    let tasks = localTasks ? JSON.parse(localTasks) : [];
    tasks = tasks.map(t => t.id === taskId ? { ...t, status, completed } : t);
    localStorage.setItem("tm.tasks", JSON.stringify(tasks));
    dispatch(updateTask({ id: taskId, status, completed }));
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    console.error("User not authenticated for updateTaskStatusFirestore");
    return;
  }

  try {
    const { error } = await supabase
      .from("tasks")
      .update({ status, completed })
      .eq("id", taskId);

    if (error) throw error;

    dispatch(updateTask({ id: taskId, status, completed }));
  } catch (err) {
    console.error("Failed to update task status in Supabase:", err);
  }
};