// src/pages/TasksPage.jsx
import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import TaskList from "../components/TaskList";
import FilterTask from "../components/FilterTask";
import { fetchTasksFirestore } from "../redux/tasksSlice";

export default function TasksPage() {
  const dispatch = useDispatch();
  const tasks = useSelector((state) => state.tasks);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    dispatch(fetchTasksFirestore());
  }, [dispatch]);

  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (filter === "active" && task.completed) return false;
    if (filter === "completed" && !task.completed) return false;
    if (filter === "high" && task.priority !== "High") return false;
    if (filter === "medium" && task.priority !== "Medium") return false;
    if (filter === "low" && task.priority !== "Low") return false;

    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 pt-20">
      <Navbar title="Tasks" showBack />
      <div className="flex-1 p-4 md:p-8 flex justify-center overflow-y-auto">
        <div className="w-full max-w-4xl flex flex-col gap-6 pb-8">

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Task List */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold text-white">
                Task List ({filteredTasks.length})
              </h2>
              <FilterTask
                filter={filter}
                setFilter={setFilter}
              />
            </div>
            <div className="glass rounded-2xl shadow border-white/20 p-4 md:p-6 flex flex-col min-h-[400px]">
              <TaskList tasks={filteredTasks} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}