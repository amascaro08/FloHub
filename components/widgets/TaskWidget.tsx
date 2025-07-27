// components/widgets/TaskWidget.tsx
"use client";

import useSWR from "swr";
import { useState, FormEvent, useMemo, memo } from "react";
import CreatableSelect from 'react-select/creatable';
import type { Task, UserSettings } from "@/types/app";
import { useUser } from '@/lib/hooks/useUser';
import { 
  Plus, 
  CheckCircle, 
  Circle, 
  Trash2, 
  Edit3, 
  Calendar,
  Tag,
  Clock
} from 'lucide-react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => {
  if (!r.ok) {
    throw new Error('Not authorized');
  }
  return r.json();
});

function TaskWidget() {
  const { user, isLoading } = useUser();
  const isLoggedIn = !!user;

  // Only fetch tasks if logged in
  const { data: tasks, mutate } = useSWR<Task[]>(
    isLoggedIn ? "/api/tasks" : null,
    fetcher
  );

  if (!isLoggedIn) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-primary-500" />
        </div>
        <p className="text-grey-tint font-body">Please sign in to view your tasks.</p>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Fetch user settings to get global tags
  const { data: userSettings, error: settingsError } = useSWR<UserSettings>(
    isLoggedIn ? "/api/userSettings" : null,
    fetcher
  );

  const [input, setInput] = useState("");
  const [due, setDue] = useState<"today"|"tomorrow"|"custom">("today");
  const [customDate, setCustomDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [editing, setEditing] = useState<Task | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [taskSource, setTaskSource] = useState<"personal" | "work">("personal");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Combine unique tags from tasks and global tags from settings
  const allAvailableTags = useMemo(() => {
    const taskTags = tasks?.flatMap(task => task.tags) || [];
    const globalTags = userSettings?.globalTags || [];
    const combinedTags = [...taskTags, ...globalTags];
    return Array.from(new Set(combinedTags)).sort();
  }, [tasks, userSettings]);

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
      day: "numeric",
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
    const payload: Partial<Task> = {
      text: input.trim(),
      dueDate: dueISO,
      source: taskSource,
      tags: selectedTags,
    };

    try {
      if (editing) {
        // Update existing task
        const response = await fetch(`/api/tasks/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          setEditing(null);
          setInput("");
          setSelectedTags([]);
          mutate();
        }
      } else {
        // Create new task
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          setInput("");
          setSelectedTags([]);
          mutate();
        }
      }
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const toggleComplete = async (t: Task) => {
    try {
      const response = await fetch(`/api/tasks/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, done: !t.done }),
      });
      if (response.ok) {
        mutate();
        if (!t.done) {
          setCelebrating(true);
          setTimeout(() => setCelebrating(false), 2000);
        }
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const remove = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        mutate();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const startEdit = (t: Task) => {
    setEditing(t);
    setInput(t.text);
    setSelectedTags(t.tags || []);
    if (t.dueDate) {
      const dueDate = new Date(t.dueDate);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (dueDate.toDateString() === today.toDateString()) {
        setDue("today");
      } else if (dueDate.toDateString() === tomorrow.toDateString()) {
        setDue("tomorrow");
      } else {
        setDue("custom");
        setCustomDate(dueDate.toISOString().slice(0, 10));
      }
    } else {
      setDue("today");
    }
    setTaskSource(t.source || "personal");
  };

  const cancelEdit = () => {
    setEditing(null);
    setInput("");
    setSelectedTags([]);
    setDue("today");
  };

  // Filter tasks for display
  const incompleteTasks = tasks?.filter(t => !t.done) || [];
  const completedTasks = tasks?.filter(t => t.done) || [];

  return (
    <div className="space-y-4">
      {/* Add Task Form */}
      <form onSubmit={addOrUpdate} className="space-y-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors duration-200 flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-grey-tint flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>Due Date</span>
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setDue("today")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  due === "today"
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDue("tomorrow")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  due === "tomorrow"
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setDue("custom")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  due === "custom"
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                Custom
              </button>
            </div>
            {due === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
          </div>

          {/* Task Source */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-grey-tint">Source</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setTaskSource("personal")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  taskSource === "personal"
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setTaskSource("work")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  taskSource === "work"
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                Work
              </button>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-grey-tint flex items-center space-x-1">
            <Tag className="w-3 h-3" />
            <span>Tags</span>
          </label>
          <CreatableSelect
            isMulti
            value={selectedTags.map(tag => ({ value: tag, label: tag }))}
            onChange={handleTagChange}
            options={tagOptions}
            placeholder="Add tags..."
            className="text-sm"
            classNamePrefix="react-select"
            styles={{
              control: (base) => ({
                ...base,
                backgroundColor: 'transparent',
                borderColor: '#e5e7eb',
                borderRadius: '0.75rem',
                '&:hover': {
                  borderColor: '#00C9A7'
                }
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb'
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected ? '#00C9A7' : state.isFocused ? '#f0fdfa' : 'transparent',
                color: state.isSelected ? 'white' : '#374151'
              })
            }}
          />
        </div>

        {editing && (
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors duration-200"
            >
              Update Task
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        )}
      </form>

      {/* Tasks List */}
      <div className="space-y-3">
        {/* Incomplete Tasks */}
        {incompleteTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-dark-base dark:text-soft-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-primary-500" />
              <span>Incomplete ({incompleteTasks.length})</span>
            </h3>
            {incompleteTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
              >
                <button
                  onClick={() => toggleComplete(task)}
                  className="flex-shrink-0"
                >
                  <Circle className="w-5 h-5 text-gray-400 hover:text-primary-500 transition-colors" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-base dark:text-soft-white truncate">
                    {task.text}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {task.dueDate && (
                      <span className="text-xs text-grey-tint">
                        Due {fmt(task.dueDate)}
                      </span>
                    )}
                    {task.source && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.source === 'work' 
                          ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300'
                          : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      }`}>
                        {task.source}
                      </span>
                    )}
                  </div>
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => startEdit(task)}
                    className="p-1 text-gray-400 hover:text-primary-500 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => remove(task.id)}
                    className="p-1 text-gray-400 hover:text-accent-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-dark-base dark:text-soft-white flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Completed ({completedTasks.length})</span>
            </h3>
            {completedTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl"
              >
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-through truncate">
                    {task.text}
                  </p>
                </div>
                <button
                  onClick={() => remove(task.id)}
                  className="p-1 text-gray-400 hover:text-accent-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {completedTasks.length > 3 && (
              <p className="text-xs text-grey-tint text-center">
                +{completedTasks.length - 3} more completed tasks
              </p>
            )}
          </div>
        )}

        {/* Empty State */}
        {(!tasks || tasks.length === 0) && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-primary-500" />
            </div>
            <p className="text-grey-tint font-body text-sm">
              No tasks yet. Add your first task above!
            </p>
          </div>
        )}
      </div>

      {/* Celebration Animation */}
      {celebrating && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="animate-bounce text-6xl">🎉</div>
        </div>
      )}
    </div>
  );
}

export default memo(TaskWidget);
