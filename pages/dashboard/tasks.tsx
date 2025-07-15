// pages/dashboard/tasks.tsx
"use client";

import { useState, FormEvent, useMemo } from "react";

import useSWR from "swr";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Task, UserSettings } from "@/types/app"; // Import UserSettings
import CreatableSelect from 'react-select/creatable'; // Import CreatableSelect

// Define a more comprehensive Task type for the tasks page

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const formatDate = (dateString: string | null) => {
  if (!dateString) return "No due date";
  const date = new Date(dateString);
  // Use a more concise format for better space usage
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function TasksPage() {
  const sessionHookResult = useSession();
  const session = sessionHookResult?.data ? sessionHookResult.data : null;
  const status = sessionHookResult?.status || "unauthenticated";
  const router = useRouter();

  const shouldFetch = status === "authenticated";
  const { data: tasks, mutate } = useSWR<Task[]>(
    shouldFetch ? "/api/tasks" : null,
    fetcher
  );

  // Fetch user settings to get global tags
  const { data: userSettings } = useSWR<UserSettings>(
    shouldFetch ? "/api/userSettings" : null,
    fetcher
  );

  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<{ value: string; label: string }[]>([]); // State for selected tags using CreatableSelect format
  const [editing, setEditing] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [search, setSearch] = useState("");

  const addOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Get tags from selectedTags state
    const tags = selectedTags.map(tag => tag.value);

    const payload: any = {
      text: input.trim(),
      dueDate: dueDate || null,
      tags: tags.length > 0 ? tags : undefined, // Include tags if not empty
    };

    const method = editing ? "PATCH" : "POST";

    if (editing) {
      payload.id = editing.id;
      // When editing, send the new tags array
      payload.tags = tags;
    }

    await fetch("/api/tasks", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setInput("");
    setDueDate("");
    setSelectedTags([]); // Clear selected tags
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
    // Populate selected tags from task tags
    setSelectedTags(task.tags ? task.tags.map(tag => ({ value: tag, label: tag })) : []);
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
    <div className="p-4 max-w-4xl mx-auto"> {/* Added max-width and auto margin for better centering on larger screens */}
      <h1 className="text-2xl font-semibold mb-4 text-[var(--fg)]">Tasks</h1> {/* Applied text color variable */}

      <form onSubmit={addOrUpdate} className="glass p-4 rounded-xl shadow-elevate-sm flex flex-col gap-4 mb-6"> {/* Applied glass class and adjusted spacing */}
        <div className="flex flex-col sm:flex-row gap-4"> {/* Flex container for inputs, responsive layout */}
          <input
            type="text"
            className="flex-1 border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-[var(--bg)]"
            placeholder="New task…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <input
            type="date"
            className="border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-[var(--bg)]"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        {/* Tags Input */}
        <CreatableSelect
          isMulti
          options={(userSettings?.globalTags || []).map(tag => ({ value: tag, label: tag }))} // Use global tags as options
          onChange={(newValue) => setSelectedTags(newValue as { value: string; label: string }[])}
          value={selectedTags}
          placeholder="Select or create tags..."
          className="flex-1" // Allow it to grow
          styles={{ // Basic styling to match other inputs
            control: (provided, state) => ({
              ...provided,
              backgroundColor: 'var(--bg)',
              borderColor: state.isFocused ? 'var(--primary)' : 'var(--neutral-300)',
              color: 'var(--fg)',
              '&:hover': {
                borderColor: 'var(--primary)',
              },
              boxShadow: state.isFocused ? '0 0 0 1px var(--primary)' : 'none',
            }),
            input: (provided) => ({
              ...provided,
              color: 'var(--fg)',
            }),
            singleValue: (provided) => ({
              ...provided,
              color: 'var(--fg)',
            }),
            multiValue: (provided) => ({
              ...provided,
              backgroundColor: 'var(--surface)',
              color: 'var(--fg)',
            }),
            multiValueLabel: (provided) => ({
              ...provided,
              color: 'var(--fg)',
            }),
            multiValueRemove: (provided) => ({
              ...provided,
              color: 'var(--fg)',
              '&:hover': {
                backgroundColor: 'var(--neutral-200)',
                color: 'var(--fg)',
              },
            }),
            menu: (provided) => ({
              ...provided,
              backgroundColor: 'var(--bg)',
            }),
            option: (provided, state) => ({
              ...provided,
              backgroundColor: state.isFocused ? 'var(--neutral-200)' : 'var(--bg)',
              color: 'var(--fg)',
              '&:active': {
                backgroundColor: 'var(--neutral-300)',
              },
            }),
          }}
        />
        <button
          type="submit"
          className="self-end bg-[var(--primary)] text-white px-4 py-2 rounded hover:bg-[var(--accent)] focus:outline-none focus:shadow-outline transition-colors"
        >
          {editing ? "Save" : "Add"}
        </button>
      </form>

      <input
        type="text"
        className="glass border border-[var(--neutral-300)] rounded w-full py-2 px-3 text-[var(--fg)] leading-tight focus:outline-none focus:shadow-outline mb-6 bg-[var(--bg)]"
        placeholder="Search tasks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <h2 className="text-xl font-semibold mb-3 text-[var(--fg)]">Pending Tasks</h2>
      {filteredTasks && filteredTasks.filter(task => !task.done).length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.filter(task => !task.done).map((task) => (
            <div key={task.id} className="glass p-4 rounded-xl shadow-elevate-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center flex-1">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={(e) => toggleComplete(task)}
                  className="mr-3 h-5 w-5 text-[var(--primary)] focus:ring-[var(--primary)] border-gray-300 rounded"
                />
                <div className="flex flex-col">
                  <span className="text-[var(--fg)] font-medium">{task.text}</span>
                  <span className="text-sm text-[var(--neutral-500)]">Due: {formatDate(task.dueDate)}</span>
                   {/* Display tags here */}
                   {task.tags && task.tags.length > 0 && (
                     <div className="flex flex-wrap gap-1 mt-1">
                       {task.tags.map(tag => (
                         <span key={tag} className="bg-[var(--surface)] text-[var(--fg)] text-xs px-2 py-1 rounded-full">
                           {tag}
                         </span>
                       ))}
                     </div>
                   )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => startEdit(task)}
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(task.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[var(--neutral-500)]">No pending tasks.</p>
      )}

      <button
        onClick={() => setShowCompleted(!showCompleted)}
        className="mt-6 text-[var(--primary)] hover:text-[var(--accent)] transition-colors"
      >
        {showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
      </button>

      {showCompleted && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3 text-[var(--fg)]">Completed Tasks</h2>
          {filteredTasks && filteredTasks.filter(task => task.done).length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.filter(task => task.done).map((task) => (
                <div key={task.id} className="glass p-4 rounded-xl shadow-elevate-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 opacity-70">
                   <div className="flex items-center flex-1">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={(e) => toggleComplete(task)}
                      className="mr-3 h-5 w-5 text-[var(--primary)] focus:ring-[var(--primary)] border-gray-300 rounded"
                    />
                    <div className="flex flex-col">
                      <span className="text-[var(--fg)] font-medium line-through">{task.text}</span>
                      <span className="text-sm text-[var(--neutral-500)]">Completed: {formatDate(task.dueDate)}</span>
                       {/* Display tags here */}
                       {task.tags && task.tags.length > 0 && (
                         <div className="flex flex-wrap gap-1 mt-1">
                           {task.tags.map(tag => (
                             <span key={tag} className="bg-[var(--surface)] text-[var(--fg)] text-xs px-2 py-1 rounded-full">
                               {tag}
                             </span>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => remove(task.id)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--neutral-500)]">No completed tasks.</p>
          )}
        </div>
      )}
    </div>
  );
}