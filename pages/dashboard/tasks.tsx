// pages/dashboard/tasks.tsx
"use client";

import { useState, FormEvent, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/components/widgets/TaskWidget";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const shouldFetch = status === "authenticated";
  const { data: tasks, mutate } = useSWR<Task[]>(
    shouldFetch ? "/api/tasks" : null,
    fetcher
  );

  const [input, setInput] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [search, setSearch] = useState("");

  const addOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const payload: any = {
      text: input.trim(),
    };

    const method = editing ? "PATCH" : "POST";

    if (editing) {
      payload.id = editing.id;
    }

    await fetch("/api/tasks", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setInput("");
    setEditing(null);
    mutate();
  };

  const remove = async (id: string) => {
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    mutate();
  };

  const toggleComplete = async (task: Task) => {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, done: !task.done }),
    });
    mutate();
  };

  const startEdit = (task: Task) => {
    setEditing(task);
    setInput(task.text);
  };

  const completedTasks = tasks ? tasks.filter((task) => task.done) : [];
  const pendingTasks = tasks ? tasks.filter((task) => !task.done) : [];

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task) =>
      task.text.toLowerCase().includes(search.toLowerCase())
    );
  }, [tasks, search]);

  if (status === "loading") {
    return <p>Loading tasks…</p>;
  }

  if (!session) {
    return <p>Please sign in to see your tasks.</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Tasks</h1>

      <form onSubmit={addOrUpdate} className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          className="border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          placeholder="New task…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="self-end bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600"
        >
          {editing ? "Save" : "Add"}
        </button>
      </form>

      <input
        type="text"
        className="border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] mb-4"
        placeholder="Search tasks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <h2>Pending Tasks</h2>
      {filteredTasks && filteredTasks.filter(task => !task.done).length > 0 ? (
        <table className="table-auto w-full">
          <thead>
            <tr>
              <th className="px-4 py-2">Task</th>
              <th className="px-4 py-2">Due Date</th>
              <th className="px-4 py-2">Created At</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.filter(task => !task.done).map((task) => (
              <tr key={task.id}>
                <td className="border px-4 py-2">{task.text}</td>
                <td className="border px-4 py-2">{task.dueDate || "No due date"}</td>
                <td className="border px-4 py-2">{task.createdAt || "Unknown"}</td>
                <td className="border px-4 py-2">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleComplete(task)}
                    className="mr-2"
                  />
                  <button
                    onClick={() => startEdit(task)}
                    className="text-sm text-primary-500 hover:underline mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(task.id)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No pending tasks.</p>
      )}

      <button
        onClick={() => setShowCompleted(!showCompleted)}
        className="text-blue-500 hover:underline mt-4"
      >
        {showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
      </button>

      {showCompleted && (
        <div>
          <h2>Completed Tasks</h2>
          {filteredTasks && filteredTasks.filter(task => task.done).length > 0 ? (
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">Task</th>
                  <th className="px-4 py-2">Due Date</th>
                  <th className="px-4 py-2">Created At</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.filter(task => task.done).map((task) => (
                  <tr key={task.id}>
                    <td className="border px-4 py-2">{task.text}</td>
                    <td className="border px-4 py-2">{task.dueDate || "No due date"}</td>
                    <td className="border px-4 py-2">{task.createdAt || "Unknown"}</td>
                    <td className="border px-4 py-2">
                      <button
                        onClick={() => remove(task.id)}
                        className="text-sm text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No completed tasks.</p>
          )}
        </div>
      )}
    </div>
  );
}