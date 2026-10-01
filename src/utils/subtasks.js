import { getCurrentUser, isSupabaseConfigured, supabase } from "../supabase";

const STORAGE_KEY = "tm.subtasks";

const normalizeSubtask = (subtask = {}) => ({
  id: subtask.id || subtask.task_id || `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  taskId: subtask.task_id || subtask.taskId || "",
  title: subtask.title || "",
  completed: Boolean(subtask.completed),
  createdAt: subtask.created_at || subtask.createdAt || new Date().toISOString(),
});

const readLocalSubtasks = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch (error) {
    console.warn("Unable to read local subtasks:", error);
    return {};
  }
};

const writeLocalSubtasks = (map) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

export const fetchTaskSubtasks = async (taskId) => {
  if (!taskId) return [];

  if (!isSupabaseConfigured) {
    const localMap = readLocalSubtasks();
    return (localMap[taskId] || []).map(normalizeSubtask);
  }

  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("task_subtasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map((subtask) => normalizeSubtask({ ...subtask, taskId: subtask.task_id }));
};

const persistLocalSubtasks = (taskId, subtasks) => {
  const localMap = readLocalSubtasks();
  localMap[taskId] = subtasks.map((item) => ({
    ...item,
    task_id: taskId,
    taskId,
  }));
  writeLocalSubtasks(localMap);
};

export const createTaskSubtask = async (taskId, title) => {
  if (!taskId || !title?.trim()) return null;
  const cleanTitle = title.trim();

  if (!isSupabaseConfigured) {
    const localMap = readLocalSubtasks();
    const next = [
      ...(localMap[taskId] || []),
      {
        id: `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        task_id: taskId,
        taskId,
        title: cleanTitle,
        completed: false,
        created_at: new Date().toISOString(),
      },
    ];
    localMap[taskId] = next;
    writeLocalSubtasks(localMap);
    return normalizeSubtask(next[next.length - 1]);
  }

  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("task_subtasks")
    .insert([{ task_id: taskId, user_id: user.id, title: cleanTitle, completed: false }])
    .select();

  if (error) throw error;
  return normalizeSubtask((data || [])[0]);
};

export const toggleTaskSubtask = async (taskId, subtaskId, nextCompleted) => {
  if (!taskId || !subtaskId) return null;

  if (!isSupabaseConfigured) {
    const localMap = readLocalSubtasks();
    const next = (localMap[taskId] || []).map((item) =>
      item.id === subtaskId ? { ...item, completed: Boolean(nextCompleted) } : item
    );
    localMap[taskId] = next;
    writeLocalSubtasks(localMap);
    return normalizeSubtask(next.find((item) => item.id === subtaskId));
  }

  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("task_subtasks")
    .update({ completed: Boolean(nextCompleted) })
    .eq("id", subtaskId)
    .eq("user_id", user.id)
    .select();

  if (error) throw error;
  return normalizeSubtask((data || [])[0]);
};

export const deleteTaskSubtask = async (taskId, subtaskId) => {
  if (!taskId || !subtaskId) return false;

  if (!isSupabaseConfigured) {
    const localMap = readLocalSubtasks();
    const next = (localMap[taskId] || []).filter((item) => item.id !== subtaskId);
    localMap[taskId] = next;
    writeLocalSubtasks(localMap);
    return true;
  }

  const user = await getCurrentUser();
  if (!user) return false;

  const { error } = await supabase
    .from("task_subtasks")
    .delete()
    .eq("id", subtaskId)
    .eq("user_id", user.id);

  if (error) throw error;
  return true;
};

export const syncLocalSubtasks = (taskId, subtasks) => {
  if (!taskId) return;
  persistLocalSubtasks(taskId, subtasks);
};
