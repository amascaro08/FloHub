import { useState } from "react";
import useSWR from "swr";

interface Task {
  id: string;
  text: string;
  due: string;         // ISO string
  completed: boolean;
}

// basic fetcher for SWR
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TaskWidget() {
  // 1️⃣ FETCH tasks
  const { data: tasks, error, mutate } = useSWR<Task[]>("/api/tasks", fetcher);
  const [text, setText] = useState("");
  const [dueOption, setDueOption] = useState<"today"|"tomorrow"|"custom">("today");
  const [customDate, setCustomDate] = useState("");

  // 2️⃣ ADD a new task
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    // compute due date
    let due = new Date();
    if (dueOption === "today") {
      // keep today
    } else if (dueOption === "tomorrow") {
      due.setDate(due.getDate() + 1);
    } else if (dueOption === "custom" && customDate) {
      due = new Date(customDate);
    }
    // zero time
    due.setHours(0,0,0,0);

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), due: due.toISOString() }),
    });
    setText("");
    mutate(); // re‑fetch
  }

  // 3️⃣ TOGGLE complete
  async function toggleComplete(id: string, completed: boolean) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    mutate();
  }

  // 4️⃣ DELETE
  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    mutate();
  }

  if (error) return <p className="text-red-500">Failed to load tasks.</p>;
  if (!tasks) return <p>Loading tasks…</p>;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-3">Tasks</h3>

      {/* New Task Form */}
      <form onSubmit={addTask} className="space-y-2 mb-4">
        <input
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="New task…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex items-center space-x-2">
          <select
            value={dueOption}
            onChange={(e) => setDueOption(e.target.value as any)}
            className="border px-2 py-1 rounded"
          >
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="custom">Custom</option>
          </select>

          {dueOption === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="border px-2 py-1 rounded"
            />
          )}

          <button
            type="submit"
            className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-orange-500"
          >
            Add
          </button>
        </div>
      </form>

      {/* Task List */}
      <ul className="space-y-2 text-sm">
        {tasks.length === 0 && (
          <li className="text-gray-500">No tasks.</li>
        )}
        {tasks.map((t) => {
          const dueDate = new Date(t.due).toLocaleDateString();
          return (
            <li key={t.id} className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={() => toggleComplete(t.id, t.completed)}
                />
                <span className={t.completed ? "line-through text-gray-400" : ""}>
                  {t.text}
                </span>
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{dueDate}</span>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="text-red-500 text-xs"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
