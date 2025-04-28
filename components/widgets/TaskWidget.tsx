// components/widgets/TaskWidget.tsx
"use client";

import { useSession } from "next-auth/react";
import useSWR         from "swr";
import { useState, FormEvent } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface Task {
  id:        string;
  text:      string;
  done:      boolean;
  dueDate:   string | null;
  createdAt: string | null;
}

export default function TaskWidget() {
  const { data: session, status } = useSession();
  const shouldFetch               = status === "authenticated";
  const { data: tasks, mutate }   = useSWR<Task[]>(
    shouldFetch ? "/api/tasks" : null,
    fetcher
  );

  const [input, setInput]         = useState("");
  const [due, setDue]             = useState<"today"|"tomorrow"|"custom">("today");
  const [customDate, setCustomDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [editing, setEditing]     = useState<Task | null>(null);
  const [celebrating, setCelebrating] = useState(false); // State for celebration

  // Friendly formatter: "Jan 5"
  const fmt = (iso: string | null) => {
    if (!iso) return "No due";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day:   "numeric",
    });
  };

  const addOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Determine the ISO dueDate string
    let dueISO: string | null = null;
    if (due === "today" || due === "tomorrow") {
      const d = new Date();
      if (due === "tomorrow") d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      dueISO = d.toISOString();
    }
    if (due === "custom") {
      const d = new Date(customDate);
      d.setHours(0, 0, 0, 0);
      dueISO = d.toISOString();
    }

    // Build payload
    const payload: any = {
      text:    input.trim(),
      dueDate: dueISO,
    };
    // If you're editing, send PATCH; else POST
    const method = editing ? "PATCH" : "POST";

    // For PATCH, include id & done
    if (editing) {
      payload.id   = editing.id;
      payload.done = editing.done;
    }

    await fetch("/api/tasks", {
      method,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    // Reset form
    setInput("");
    setDue("today");
    setCustomDate(new Date().toISOString().slice(0, 10));
    setEditing(null);
    mutate();
  };

  const toggleComplete = async (t: Task) => {
    // Optimistically update the UI
    if (tasks) {
      mutate(tasks.filter(task => task.id !== t.id), false); // Remove task and don't revalidate yet
    }

    // Trigger celebration
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 3000); // Hide celebration after 3 seconds

    // Send API request
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: t.id, done: !t.done }),
    });

    // Revalidate data after API call
    mutate();
  };

  const remove = async (id: string) => {
     // Optimistically update the UI
     if (tasks) {
      mutate(tasks.filter(task => task.id !== id), false); // Remove task and don't revalidate yet
    }

    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    });

    // Revalidate data after API call
    mutate();
  };

  const startEdit = (t: Task) => {
    setEditing(t);
    setInput(t.text);
    setDue(t.dueDate ? "custom" : "today");
    if (t.dueDate) {
      setCustomDate(t.dueDate.slice(0, 10));
    }
  };

  if (status === "loading") {
    return <p>Loading tasks…</p>;
  }
  if (!session) {
    return <p>Please sign in to see your tasks.</p>;
  }

  return (
    <div className="glass p-4 rounded-xl shadow-elevate-sm text-[var(--fg)] relative"> {/* Added relative for absolute positioning */}
      {/* Celebration Message */}
      {celebrating && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-75 text-white text-2xl font-bold z-10 rounded-xl">
          Task Complete! 🎉
        </div>
      )}

      <form onSubmit={addOrUpdate} className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            className="
              flex-1 border border-[var(--neutral-300)]
              px-3 py-2 rounded focus:outline-none
              focus:ring-2 focus:ring-[var(--primary)]
            "
            placeholder="New task…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <select
            value={due}
            onChange={(e) => setDue(e.target.value as any)}
            className="
              border border-[var(--neutral-300)]
              px-3 py-2 rounded focus:outline-none
              focus:ring-2 focus:ring-[var(--primary)]
              text-[var(--fg)]
            "
          >
            <option value="today" className="text-[var(--fg)]">Today</option>
            <option value="tomorrow" className="text-[var(--fg)]">Tomorrow</option>
            <option value="custom" className="text-[var(--fg)]">Custom</option>
          </select>

          {due === "custom" && (
            <input
              type="date"
              className="
                border border-[var(--neutral-300)]
                px-3 py-2 rounded focus:outline-none
                focus:ring-2 focus:ring-[var(--primary)]
              "
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          )}
        </div>

        <button
          type="submit"
          className="
            self-end bg-primary-500 text-white
            px-4 py-2 rounded hover:bg-primary-600
          "
        >
          {editing ? "Save" : "Add"}
        </button>
      </form>

      <ul className="space-y-2 text-sm">
        {tasks && tasks.length > 0 ? (
          tasks.map((t) => (
            <li
              key={t.id}
              className="flex justify-between items-center py-1"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggleComplete(t)}
                  className="mr-2"
                />
                <span className={t.done ? "line-through text-[var(--neutral-500)]" : ""}>
                  {t.text}
                </span>
                <span className="ml-2 text-[var(--neutral-500)]">
                  ({fmt(t.dueDate)})
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(t)}
                  className="text-sm text-primary-500 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  X
                </button>
              </div>
            </li>
          ))
        ) : (
          <li className="text-[var(--neutral-500)]">No tasks yet.</li>
        )}
      </ul>
    </div>
  );
}
