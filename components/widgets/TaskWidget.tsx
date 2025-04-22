// components/widgets/TaskWidget.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import type { Session } from "next-auth";

interface Task {
  id: string;
  text: string;
  due: string;        // ISO date string
  completed: boolean;
}

export default function TaskWidget({ session }: { session: Session }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [due, setDue] = useState("today");
  const [editing, setEditing] = useState<Task | null>(null);

  // load tasks from the API
  const load = async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) {
      const data: Task[] = await res.json();
      setTasks(data);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      load();
    }
  }, [session]);

  // helper to format ISO → human
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? "Invalid date"
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const addOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // compute due date ISO
    let dueDate = new Date();
    if (due === "tomorrow") dueDate.setDate(dueDate.getDate() + 1);
    dueDate.setHours(0, 0, 0, 0);

    const payload = {
      text: input.trim(),
      due: due === "custom" && editing === null ? dueDate.toISOString() : editing?.due ?? dueDate.toISOString(),
    };

    const url = editing ? `/api/tasks/${editing.id}` : "/api/tasks";
    const method = editing ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    setDue("custom");
  };

  // if not authenticated
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
            className="flex-1 border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="New task…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <select
            value={due}
            onChange={(e) => setDue(e.target.value)}
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
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex justify-between items-center"
          >
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
        ))}
        {tasks.length === 0 && (
          <li className="text-gray-500">No tasks yet.</li>
        )}
      </ul>
    </div>
  );
}
