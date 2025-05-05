// components/widgets/TaskWidget.tsx
"use client";

import { useSession } from "next-auth/react";
import useSWR         from "swr";
import { useState, FormEvent, useMemo } from "react"; // Import useMemo
import CreatableSelect from 'react-select/creatable'; // Import CreatableSelect
import type { Task, UserSettings } from "@/types/app"; // Import Task and UserSettings types

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TaskWidget() {
  const { data: session, status } = useSession();
  const shouldFetch               = status === "authenticated";
  const { data: tasks, mutate }   = useSWR<Task[]>(
    shouldFetch ? "/api/tasks" : null,
    fetcher
  );

  // Fetch user settings to get global tags
  const { data: userSettings, error: settingsError } = useSWR<UserSettings>(
    shouldFetch ? "/api/userSettings" : null,
    fetcher
  );

  const [input, setInput]         = useState("");
  const [due, setDue]             = useState<"today"|"tomorrow"|"custom">("today");
  const [customDate, setCustomDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [editing, setEditing]     = useState<Task | null>(null);
  const [celebrating, setCelebrating] = useState(false); // State for celebration
  const [taskSource, setTaskSource] = useState<"personal" | "work">("personal"); // State for task source
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // State for selected tags

  // Combine unique tags from tasks and global tags from settings
  const allAvailableTags = useMemo(() => {
    const taskTags = tasks?.flatMap(task => task.tags) || [];
    const globalTags = userSettings?.globalTags || [];
    const combinedTags = [...taskTags, ...globalTags];
    return Array.from(new Set(combinedTags)).sort();
  }, [tasks, userSettings]); // Add userSettings to dependency array

  const tagOptions = allAvailableTags.map(tag => ({ value: tag, label: tag }));

  const handleTagChange = (selectedOptions: any) => {
    setSelectedTags(Array.isArray(selectedOptions) ? selectedOptions.map(option => option.value) : []);
  };


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
    const payload: Partial<Task> = { // Use Partial<Task> since not all fields are required for create/update
      text:    input.trim(),
      dueDate: dueISO,
      source:  taskSource, // Include task source
      tags: selectedTags, // Include selected tags
    };
    // If you're editing, send PATCH; else POST
    const method = editing ? "PATCH" : "POST";

    // For PATCH, include id & done
    if (editing) {
      payload.id   = editing.id;
      payload.done = editing.done;
      // If editing, don't change source unless explicitly added to form
      if (taskSource !== (editing.source || "personal")) { // Check if source changed from original
         payload.source = taskSource;
      } else {
         delete payload.source; // Don't send source if it's the same as original or default
      }
      // If editing, don't change tags unless explicitly changed in form (more complex, skip for now)
      // For simplicity, we'll always send the selectedTags from the form on edit
    }

    console.log("Payload:", payload);
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
    setTaskSource("personal"); // Reset source to default
    setSelectedTags([]); // Clear selected tags
    mutate();
  };

  const toggleComplete = async (t: Task) => {
    // Optimistically update the UI by filtering out completed tasks
    if (tasks) {
      mutate(tasks.filter(task => task.id !== t.id), false);
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
    setTaskSource(t.source || "personal"); // Set source when editing
    setSelectedTags(t.tags || []); // Set tags when editing
  };

  if (status === "loading" || (!tasks && !settingsError && shouldFetch) || (!userSettings && !settingsError && shouldFetch)) { // Add loading checks for settings and tasks
    return <p>Loading tasks…</p>;
  }
  if (!session) {
    return <p>Please sign in to see your tasks.</p>;
  }

  if (settingsError) { // Add error check for settings
    return <p>Error loading settings.</p>;
  }


  // Filter out completed tasks for display
  const incompleteTasks = tasks ? tasks.filter(task => !task.done) : [];

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
            onChange={(e) => setDue(e.target.value as "today" | "tomorrow" | "custom")}
            className="
              border border-[var(--neutral-300)]
              px-3 py-2 rounded focus:outline-none
              focus:ring-2 focus:ring-[var(--primary)]
              text-[var(--fg)]
            "
          >
            <option value="today" className="text-[var(--fg)]">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="custom">Custom</option>
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

        {/* Source and Tags */}
        {/* Source and Tags on the same line */}
        <div className="flex flex-row gap-2 items-center w-full"> {/* Source label, Source select, and Tags input, added w-full */}
           <label className="text-sm font-medium text-[var(--fg)]">Source:</label>
           <select
             value={taskSource}
             onChange={(e) => setTaskSource(e.target.value as "personal" | "work")}
             className="
               border border-[var(--neutral-300)]
               px-3 py-1 rounded focus:outline-none
               focus:ring-2 focus:ring-[var(--primary)]
               text-[var(--fg)]
             "
           >
             <option value="personal">Personal</option>
             <option value="work">Work</option>
           </select>

           {/* Tags Input */}
           <div className="flex-1 flex-grow"> {/* This div is just for the CreatableSelect, added flex-grow */}
             {/* The "Tags" label is not needed visually here, but keep it for accessibility with sr-only */}
             <label htmlFor="task-tags" className="sr-only">Tags</label>
             <CreatableSelect // Use CreatableSelect for tags
               isMulti
               options={tagOptions}
               onChange={handleTagChange}
               placeholder="Select or create tags..."
               isDisabled={false} // Adjust as needed
               isSearchable
               value={selectedTags.map(tag => ({ value: tag, label: tag }))} // Set value for CreatableSelect
             />
           </div>
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
        {incompleteTasks.length > 0 ? (
          incompleteTasks.map((t) => (
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
                <span>
                  {t.text}
                </span>
                 {/* Display task source tag */}
                {t.source && (
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs ml-2 ${
                      t.source === "work"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {t.source === "work" ? "Work" : "Personal"}
                  </span>
                )}
                {/* Display task tags */}
                {t.tags && t.tags.map(tag => (
                  <span key={tag} className="inline-block px-2 py-0.5 rounded text-xs ml-2 bg-off-white text-cool-grey">
                    {tag}
                  </span>
                ))}
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
