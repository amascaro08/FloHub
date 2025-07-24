// components/widgets/TaskWidget.tsx
"use client";


import useSWR         from "swr";
import { useState, FormEvent, useMemo, memo } from "react"; // Import useMemo and memo
import CreatableSelect from 'react-select/creatable'; // Import CreatableSelect
import type { Task, UserSettings } from "@/types/app"; // Import Task and UserSettings types
import { useUser } from '@/lib/hooks/useUser';


const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => {
  if (!r.ok) {
    throw new Error('Not authorized');
  }
  return r.json();
});

function TaskWidget() {
  const { user, isLoading } = useUser(); // Just user object or null
  const isLoggedIn = !!user;

  // Only fetch tasks if logged in
  const { data: tasks, mutate } = useSWR<Task[]>(
    isLoggedIn ? "/api/tasks" : null,
    fetcher
  );

  if (!isLoggedIn) {
    return <div className="text-gray-400">Please sign in to view your tasks.</div>;
  }
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Fetch user settings to get global tags
  const { data: userSettings, error: settingsError } = useSWR<UserSettings>(
    isLoggedIn ? "/api/userSettings" : null,
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

  if (!user) {
    return <p>Please sign in to see your tasks.</p>;
  }

  if (settingsError) { // Add error check for settings
    return <p>Error loading settings.</p>;
  }


  // Filter out completed tasks for display
  const incompleteTasks = tasks ? tasks.filter(task => !task.done) : [];

  return (
    <div className="task-widget bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 relative">
      {/* Celebration Message */}
      {celebrating && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-75 text-white text-2xl font-bold z-10 rounded-xl animate-fade-in">
          Task Complete! 🎉
        </div>
      )}

      <form onSubmit={addOrUpdate} className="flex flex-col gap-3 mb-5">
        {/* Task input and date selection - responsive layout */}
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            className="input-modern flex-1 order-1"
            placeholder="New task…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className="flex gap-2 order-2 md:order-1 w-full md:w-auto">
            <select
              value={due}
              onChange={(e) => setDue(e.target.value as "today" | "tomorrow" | "custom")}
              className="input-modern w-auto min-w-[100px] md:min-w-0 flex-shrink-0"
            >
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="custom">Custom</option>
            </select>

            {due === "custom" && (
              <input
                type="date"
                className="input-modern w-auto flex-shrink-0"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Source and Tags */}
        <div className="flex flex-row gap-2 items-center w-full">
           <div className="flex items-center">
             <label className="text-sm font-medium mr-2">Source:</label>
             <select
               value={taskSource}
               onChange={(e) => setTaskSource(e.target.value as "personal" | "work")}
               className="input-modern w-auto py-1"
             >
               <option value="personal">Personal</option>
               <option value="work">Work</option>
             </select>
           </div>

           {/* Tags Input */}
           <div className="flex-1 flex-grow">
             <label htmlFor="task-tags" className="sr-only">Tags</label>
             <CreatableSelect
               isMulti
               options={tagOptions}
               onChange={handleTagChange}
               placeholder="Select or create tags..."
               isDisabled={false}
               isSearchable
               value={selectedTags.map(tag => ({ value: tag, label: tag }))}
               classNamePrefix="react-select"
               theme={(theme) => ({
                 ...theme,
                 colors: {
                   ...theme.colors,
                   primary: '#14B8A6',
                   primary25: '#99F6E4',
                 },
               })}
             />
           </div>
        </div>

        <button
          type="submit"
          className="btn-primary self-end"
        >
          {editing ? "Save" : "Add Task"}
        </button>
      </form>

      <ul className="space-y-3">
        {incompleteTasks.length > 0 ? (
          incompleteTasks.map((t) => (
            <li
              key={t.id}
              className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="flex items-center flex-wrap">
                <div className="flex items-center min-w-0">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleComplete(t)}
                    className="mr-3 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="font-medium truncate">
                    {t.text}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center ml-2 mt-1">
                  {/* Display task source tag */}
                  {t.source && (
                    <span className={`tag ${t.source === "work" ? "tag-work" : "tag-personal"} mr-1`}>
                      {t.source === "work" ? "Work" : "Personal"}
                    </span>
                  )}
                  
                  {/* Display task tags */}
                  {t.tags && t.tags.map(tag => (
                    <span key={tag} className="tag mr-1 mb-1">
                      {tag}
                    </span>
                  ))}
                  
                  <span className="text-neutral-500 text-sm ml-1">
                    ({fmt(t.dueDate)})
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 ml-2 shrink-0">
                <button
                  onClick={() => startEdit(t)}
                  className="text-sm text-primary-500 hover:text-primary-700 transition-colors"
                  aria-label="Edit task"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors"
                  aria-label="Delete task"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </li>
          ))
        ) : (
          <li className="text-neutral-500 text-center py-4">No tasks yet. Add one above!</li>
        )}
      </ul>
    </div>
  );
}

export default memo(TaskWidget);
