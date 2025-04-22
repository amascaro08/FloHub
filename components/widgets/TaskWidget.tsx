"use client";

import { useSession } from "next-auth/react";
import useSWR         from "swr";
import { useState, FormEvent } from "react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Task {
  id:        string;
  text:      string;
  due:       string | null;
  completed: boolean;
}

export default function TaskWidget() {
  const { data: session, status } = useSession();
  const shouldFetch               = status === "authenticated";
  const { data: tasks, mutate }   = useSWR<Task[]>(shouldFetch ? "/api/tasks" : null, fetcher);

  const [input, setInput] = useState("");
  const [due, setDue]     = useState<"today"|"tomorrow"|"custom">("today");
  const [editing, setEditing] = useState<Task | null>(null);

  const fmt = (iso: string | null) => {
    if (!iso) return "No due";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const addOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    let dueDate = new Date();
    if (due === "tomorrow") dueDate.setDate(dueDate.getDate() + 1);
    dueDate.setHours(0, 0, 0, 0);

    const payload = {
      text: input.trim(),
      due:  due === "custom" && editing === null
        ? dueDate.toISOString()
        : editing?.due ?? dueDate.toISOString(),
    };

    const url    = editing ? `/api/tasks/${editing.id}` : "/api/tasks";
    const method = editing ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setInput("");
    setDue("today");
    setEditing(null);
    mutate(); // refresh
  };

  const toggleComplete = async (t: Task) => {
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !t.completed }),
    });
    mutate();
  };

  const remove = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    mutate();
  };

  const startEdit = (t: Task) => {
    setEditing(t);
    setInput(t.text);
    setDue("custom");
  };

  if (status === "loading") {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-center">
        Loading tasks…
      </div>
    );
  }

  if (!session?.user?.email) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-center text-gray-700">
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
            className="flex-1 border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="New task…"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <select
            value={due}
            onChange={e => setDue(e.target.value as any)}
            className="border px-3 py-2 rounded focus:outline-none"
          >
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="custom">Custom</option>
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
        {tasks?.length
          ? tasks.map(t => (
              <li key={t.id} className="flex justify-between items-center">
                <div>
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => toggleComplete(t)}
                    className="mr-2"
                  />
                  <span className={t.completed ? "line-through text-gray-400" : ""}>
                    {t.text}
                  </span>
                  <span className="ml-2 text-gray-500">({fmt(t.due)})</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(t)}
                    className="text-indigo-500 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="text-red-500 text-xs"
                  >
                    X
                  </button>
                </div>
              </li>
            ))
          : <li className="text-gray-500">No tasks yet.</li>
        }
      </ul>
    </div>
  );
}
