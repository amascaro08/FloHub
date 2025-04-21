import useSWR from "swr";
import { useState, FormEvent } from "react";
import { useSession, signIn }  from "next-auth/react";

interface Task {
  id: string;
  text: string;
  done: boolean;
  dueDate?: string | null;
  createdAt?: string | null;
}

const fetcher = async (url: string, opts?: any) => {
  const res = await fetch(url, opts);
  if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
};

export default function TaskWidget() {
  const { data: session, status } = useSession();
  const { data: tasks, error, mutate } = useSWR<Task[]>(
    status === "authenticated" ? "/api/tasks" : null,
    fetcher
  );

  const [input, setInput]           = useState("");
  const [dueOption, setDueOption]   = useState<"today"|"tomorrow"|"custom">("today");
  const [customDate, setCustomDate] = useState("");

  const addTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // compute dueDate
    let dueDate: string | undefined;
    const now = new Date();
    if (dueOption === "today") {
      dueDate = now.toISOString();
    } else if (dueOption === "tomorrow") {
      const t = new Date(now);
      t.setDate(t.getDate() + 1);
      dueDate = t.toISOString();
    } else if (dueOption === "custom" && customDate) {
      dueDate = new Date(customDate).toISOString();
    }

    // create task
    const created: Task = await fetcher("/api/tasks", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: input.trim(), dueDate }),
    });

    // emit event for FloCat memory
    fetch("/api/assistant/event", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "new_task",
        payload: created,
        timestamp: created.createdAt,
      }),
    }).catch(console.error);

    setInput("");
    setCustomDate("");
    setDueOption("today");
    mutate();
  };

  const toggleDone = async (task: Task) => {
    await fetcher("/api/tasks", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: task.id, done: !task.done }),
    });

    fetch("/api/assistant/event", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "toggle_task",
        payload: { id: task.id, done: !task.done },
        timestamp: new Date().toISOString(),
      }),
    }).catch(console.error);

    mutate();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await fetch("/api/tasks", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    });

    fetch("/api/assistant/event", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "delete_task",
        payload: { id },
        timestamp: new Date().toISOString(),
      }),
    }).catch(console.error);

    mutate();
  };

  if (status === "loading") {
    return <div className="p-4 text-center">Loading tasks…</div>;
  }
  if (status !== "authenticated") {
    return (
      <div className="bg-white p-4 rounded shadow-sm text-center">
        <p>Please sign in to manage tasks.</p>
        <button
          onClick={() => signIn("google")}
          className="mt-2 text-indigo-600 underline"
        >
          Sign in with Google
        </button>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded shadow-sm text-red-700">
        Error loading tasks: {error.message}
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-3">Tasks</h3>

      <form onSubmit={addTask} className="space-y-3 mb-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="New task…"
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm">Due:</label>
          <select
            value={dueOption}
            onChange={(e) => setDueOption(e.target.value as any)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
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
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          )}
        </div>
      </form>

      <ul className="space-y-2">
        {tasks && tasks.length > 0 ? (
          tasks.map((t) => {
            const due = t.dueDate ? new Date(t.dueDate) : null;
            return (
              <li key={t.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggleDone(t)}
                  className="mr-2"
                />
                <div className="flex-1">
                  <span className={t.done ? "line-through text-gray-400" : ""}>
                    {t.text}
                  </span>
                  {due && (
                    <span className="block text-xs text-gray-500">
                      due {due.toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  &times;
                </button>
              </li>
            );
          })
        ) : (
          <li className="text-gray-500">No tasks yet.</li>
        )}
      </ul>
    </div>
  );
}
