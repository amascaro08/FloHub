// pages/dashboard/tasks.tsx
"use client";

import { useState, FormEvent, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/components/widgets/TaskWidget";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const formatDate = (dateString: string | null) => {
  if (!dateString) return "No due date";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

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
  const [dueDate, setDueDate] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [search, setSearch] = useState("");

  const addOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const payload: any = {
      text: input.trim(),
      dueDate: dueDate || null,
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
    setDueDate("");
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
    setDueDate(task.dueDate || "");
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
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="New task…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <input
          type="date"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {editing ? "Save" : "Add"}
        </button>
      </form>

      <input
        type="text"
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
        placeholder="Search tasks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <h2 className="text-xl font-semibold mb-2">Pending Tasks</h2>
      {filteredTasks && filteredTasks.filter(task => !task.done).length > 0 ? (
        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.filter(task => !task.done).map((task) => (
                <tr key={task.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{task.text}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(task.dueDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{task.createdAt || "Unknown"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleComplete(task)}
                      className="mr-2"
                    />
                    <button
                      onClick={() => startEdit(task)}
                      className="text-indigo-600 hover:text-indigo-900 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(task.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No pending tasks.</p>
      )}

      <button
        onClick={() => setShowCompleted(!showCompleted)}
        className="mt-4 text-blue-500 hover:text-blue-700"
      >
        {showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
      </button>

      {showCompleted && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Completed Tasks</h2>
          {filteredTasks && filteredTasks.filter(task => task.done).length > 0 ? (
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.filter(task => task.done).map((task) => (
                    <tr key={task.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{task.text}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(task.dueDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{task.createdAt || "Unknown"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => remove(task.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No completed tasks.</p>
          )}
        </div>
      )}
    </div>
  );
}