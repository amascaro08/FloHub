// components/widgets/TaskWidget.tsx
import { useState, FormEvent } from "react";

interface Task {
  id: string;
  text: string;
  due: string;        // ISO date string
  completed: boolean;
}

interface TaskWidgetProps {
  session: { user: { email: string } };
}

export default function TaskWidget({ session }: TaskWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [due, setDue] = useState("today");
  const [editing, setEditing] = useState<Task | null>(null);

  const load = async () => {
    const res = await fetch("/api/tasks");
    const data: Task[] = await res.json();
    setTasks(data);
  };

  // initial load
  useState(() => { load(); });

  const addOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    let url = "/api/tasks";
    let method = "POST";
    let body: any = { text: input.trim(), due };

    if (editing) {
      url += `/${editing.id}`;
      method = "PUT";
      body = { text: input.trim(), due };
    }

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setInput("");
    setDue("today");
    setEditing(null);
    await load();
  };

  const toggleComplete = async (t: Task) => {
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !t.completed }),
    });
    await load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await load();
  };

  const startEdit = (t: Task) => {
    setEditing(t);
    setInput(t.text);
    setDue(t.due);
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "Invalid date" : d.toLocaleDateString();
  };

  if (!session?.user?.email) {
    return (
      <div className="bg-white p-4 rounded shadow-sm text-center text-gray-700">
        Please sign in to see your tasks.
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-3">Tasks</h3>
      <form onSubmit={addOrUpdate} className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="New task…"
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none"
          >
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="custom">Custom…</option>
          </select>
        </div>
        <button
          type="submit"
          className="self-end bg-pastel-teal text-white px-4 py-2 rounded hover:bg-pastel-orange"
        >
          {editing ? "Save" : "Add"}
        </button>
      </form>

      <ul className="space-y-2 text-sm">
        {tasks.map((t) => (
          <li key={t.id} className="flex justify-between items-center">
            <div>
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() => toggleComplete(t)}
                className="mr-2"
              />
              <span className={t.completed ? "line-through text-gray-500" : ""}>
                {t.text}
              </span>
              <span className="ml-2 text-gray-400">({fmt(t.due)})</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(t)} className="text-indigo-500">
                Edit
              </button>
              <button onClick={() => remove(t.id)} className="text-red-500">
                X
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
