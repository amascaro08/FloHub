// pages/dashboard/tasks.tsx

import { useState, FormEvent, useMemo } from "react";
import Head from "next/head";
import useSWR from "swr";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Task, UserSettings } from "@/types/app";
import CreatableSelect from 'react-select/creatable';
import { useUser } from "@/lib/hooks/useUser";
import { 
  PlusIcon, 
  CheckCircleIcon,
  MagnifyingGlassIcon,
  TagIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  ClockIcon,
  SparklesIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/solid';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const formatDate = (dateString: string | null) => {
  if (!dateString) return "No due date";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const isOverdue = (dateString: string | null) => {
  if (!dateString) return false;
  const today = new Date();
  const dueDate = new Date(dateString);
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
};

const isToday = (dateString: string | null) => {
  if (!dateString) return false;
  const today = new Date();
  const dueDate = new Date(dateString);
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate.getTime() === today.getTime();
};

export default function TasksPage() {
  const { user, isLoading } = useUser();
  const status = user ? "authenticated" : "unauthenticated";
  const router = useRouter();

  // Handle loading state
  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-primary-200 dark:bg-primary-800 rounded-full mx-auto mb-4"></div>
          <p className="text-grey-tint">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated state
  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-grey-tint">Please sign in to access your tasks.</p>
        </div>
      </div>
    );
  }

  const shouldFetch = status === "authenticated";
  const { data: tasks, mutate } = useSWR<Task[]>(
    shouldFetch ? "/api/tasks" : null,
    fetcher
  );

  const { data: userSettings } = useSWR<UserSettings>(
    shouldFetch ? "/api/userSettings" : null,
    fetcher
  );

  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<{ value: string; label: string }[]>([]);
  const [editing, setEditing] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "overview">("pending");
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const addOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const tags = selectedTags.map(tag => tag.value);

    const payload: any = {
      text: input.trim(),
      dueDate: dueDate || null,
      tags: tags.length > 0 ? tags : undefined,
    };

    const method = editing ? "PATCH" : "POST";

    if (editing) {
      payload.id = editing.id;
      payload.tags = tags;
    }

    await fetch("/api/tasks", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setInput("");
    setDueDate("");
    setSelectedTags([]);
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
    setSelectedTags(task.tags ? task.tags.map(tag => ({ value: tag, label: tag })) : []);
  };

  const cancelEdit = () => {
    setEditing(null);
    setInput("");
    setDueDate("");
    setSelectedTags([]);
  };

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task) =>
      task.text.toLowerCase().includes(search.toLowerCase()) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
    );
  }, [tasks, search]);

  const pendingTasks = filteredTasks.filter((task) => !task.done);
  const completedTasks = filteredTasks.filter((task) => task.done);
  const overdueTasks = pendingTasks.filter((task) => isOverdue(task.dueDate));
  const todayTasks = pendingTasks.filter((task) => isToday(task.dueDate));

  const tabs = [
    { id: 'pending', label: 'Pending', icon: ListBulletIcon, count: pendingTasks.length },
    { id: 'completed', label: 'Completed', icon: CheckCircleIcon, count: completedTasks.length },
    { id: 'overview', label: 'Overview', icon: SparklesIcon, count: null }
  ];

  return (
    <>
      <Head>
        <title>Tasks | FlowHub</title>
        <meta name="description" content="Manage your tasks efficiently with FlowHub's intelligent task manager" />
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-lg">✅</span>
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                Tasks
              </h1>
              <p className="text-sm text-grey-tint">
                {tasks ? `${pendingTasks.length} pending, ${completedTasks.length} completed` : 'Loading tasks...'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setActiveTab("pending")}
            className="btn-primary flex items-center space-x-2 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-8 shadow-md">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-soft-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-lg'
                  : 'text-grey-tint hover:text-dark-base dark:hover:text-soft-white hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === 'pending' ? 'Pend' : tab.id === 'completed' ? 'Done' : 'Over'}
              </span>
              {tab.count !== null && (
                <span className="ml-2 px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="input-modern pl-10 text-sm"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {/* Add/Edit Task Form */}
            <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white flex items-center">
                  {editing ? (
                    <>
                      <PencilIcon className="w-5 h-5 mr-2 text-primary-500" />
                      Edit Task
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-5 h-5 mr-2 text-primary-500" />
                      Add New Task
                    </>
                  )}
                </h2>
              </div>
              
              <form onSubmit={addOrUpdate} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      className="input-modern"
                      placeholder="What needs to be done?"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <div className="relative">
                      <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        className="input-modern pl-10"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <CreatableSelect
                      isMulti
                      options={(userSettings?.globalTags || []).map(tag => ({ value: tag, label: tag }))}
                      onChange={(newValue) => setSelectedTags(newValue as { value: string; label: string }[])}
                      value={selectedTags}
                      placeholder="Add tags..."
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (provided, state) => ({
                          ...provided,
                          backgroundColor: 'var(--bg)',
                          borderColor: state.isFocused ? 'var(--primary)' : 'var(--neutral-300)',
                          color: 'var(--fg)',
                          borderRadius: '1rem',
                          padding: '0.125rem',
                          '&:hover': {
                            borderColor: 'var(--primary)',
                          },
                          boxShadow: state.isFocused ? '0 0 0 2px rgba(0, 201, 167, 0.1)' : 'none',
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
                          backgroundColor: 'var(--primary)',
                          borderRadius: '0.75rem',
                        }),
                        multiValueLabel: (provided) => ({
                          ...provided,
                          color: 'white',
                          fontSize: '0.75rem',
                        }),
                        multiValueRemove: (provided) => ({
                          ...provided,
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'var(--primary-dark)',
                            color: 'white',
                          },
                        }),
                        menu: (provided) => ({
                          ...provided,
                          backgroundColor: 'var(--bg)',
                          border: '1px solid var(--neutral-300)',
                          borderRadius: '1rem',
                          boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
                        }),
                        option: (provided, state) => ({
                          ...provided,
                          backgroundColor: state.isFocused ? 'var(--neutral-100)' : 'var(--bg)',
                          color: 'var(--fg)',
                          borderRadius: '0.5rem',
                          margin: '0.25rem',
                          '&:active': {
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                          },
                        }),
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  {editing && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editing ? "Update Task" : "Add Task"}
                  </button>
                </div>
              </form>
            </div>

            {/* Priority Tasks Section */}
            {(overdueTasks.length > 0 || todayTasks.length > 0) && (
              <div className="space-y-4">
                {overdueTasks.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-4">
                    <h3 className="text-lg font-heading font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center">
                      <ClockIcon className="w-5 h-5 mr-2" />
                      Overdue ({overdueTasks.length})
                    </h3>
                    <div className="space-y-2">
                      {overdueTasks.map((task) => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          onToggle={toggleComplete}
                          onEdit={startEdit}
                          onDelete={remove}
                          priority="overdue"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {todayTasks.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-4">
                    <h3 className="text-lg font-heading font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center">
                      <CalendarDaysIcon className="w-5 h-5 mr-2" />
                      Due Today ({todayTasks.length})
                    </h3>
                    <div className="space-y-2">
                      {todayTasks.map((task) => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          onToggle={toggleComplete}
                          onEdit={startEdit}
                          onDelete={remove}
                          priority="today"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* All Pending Tasks */}
            <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white flex items-center">
                  <ListBulletIcon className="w-5 h-5 mr-2 text-primary-500" />
                  All Pending Tasks ({pendingTasks.length})
                </h2>
              </div>
              
              {pendingTasks.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:bg-gradient-to-br dark:from-primary-800 dark:to-primary-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <span className="text-4xl">✅</span>
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-dark-base dark:text-soft-white mb-2">
                    All caught up!
                  </h3>
                  <p className="text-grey-tint mb-6">
                    You have no pending tasks. Great job staying organized!
                  </p>
                  <p className="text-sm text-grey-tint">
                    Add a new task above to get started.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onToggle={toggleComplete}
                      onEdit={startEdit}
                      onDelete={remove}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white flex items-center">
                <CheckCircleIcon className="w-5 h-5 mr-2 text-green-500" />
                Completed Tasks ({completedTasks.length})
              </h2>
            </div>
            
            {completedTasks.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <span className="text-4xl">📝</span>
                </div>
                <h3 className="text-xl font-heading font-semibold text-dark-base dark:text-soft-white mb-2">
                  No completed tasks yet
                </h3>
                <p className="text-grey-tint">
                  Complete some tasks to see them here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {completedTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={toggleComplete}
                    onEdit={startEdit}
                    onDelete={remove}
                    completed
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-grey-tint uppercase tracking-wide mb-2">
                      Total
                    </p>
                    <p className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                      {tasks?.length || 0}
                    </p>
                  </div>
                  <ListBulletIcon className="w-8 h-8 text-primary-500" />
                </div>
              </div>

              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-grey-tint uppercase tracking-wide mb-2">
                      Pending
                    </p>
                    <p className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                      {pendingTasks.length}
                    </p>
                  </div>
                  <ClockIcon className="w-8 h-8 text-amber-500" />
                </div>
              </div>

              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-grey-tint uppercase tracking-wide mb-2">
                      Completed
                    </p>
                    <p className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                      {completedTasks.length}
                    </p>
                  </div>
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-grey-tint uppercase tracking-wide mb-2">
                      Completion
                    </p>
                    <p className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                      {tasks?.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
                    </p>
                  </div>
                  <SparklesIcon className="w-8 h-8 text-primary-500" />
                </div>
              </div>
            </div>

            {/* Quick Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {overdueTasks.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-6">
                  <h3 className="text-lg font-heading font-semibold text-red-800 dark:text-red-200 mb-4 flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2" />
                    Overdue Tasks
                  </h3>
                  <div className="space-y-2">
                    {overdueTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                        <span className="text-red-800 dark:text-red-200 truncate">{task.text}</span>
                      </div>
                    ))}
                    {overdueTasks.length > 3 && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        +{overdueTasks.length - 3} more overdue tasks
                      </p>
                    )}
                  </div>
                </div>
              )}

              {todayTasks.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
                  <h3 className="text-lg font-heading font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center">
                    <CalendarDaysIcon className="w-5 h-5 mr-2" />
                    Due Today
                  </h3>
                  <div className="space-y-2">
                    {todayTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                        <span className="text-amber-800 dark:text-amber-200 truncate">{task.text}</span>
                      </div>
                    ))}
                    {todayTasks.length > 3 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        +{todayTasks.length - 3} more tasks due today
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Task Card Component
interface TaskCardProps {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  completed?: boolean;
  priority?: 'overdue' | 'today';
}

function TaskCard({ task, onToggle, onEdit, onDelete, completed = false, priority }: TaskCardProps) {
  const priorityStyles = {
    overdue: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
    today: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
  };

  return (
    <div className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
      priority ? priorityStyles[priority] : ''
    }`}>
      <div className="flex items-start space-x-3">
        <button
          onClick={() => onToggle(task)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 mt-0.5 flex-shrink-0 ${
            task.done
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
          }`}
        >
          {task.done && <CheckCircleIcon className="w-3 h-3" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-dark-base dark:text-soft-white ${
                task.done ? 'line-through opacity-60' : ''
              }`}>
                {task.text}
              </p>
              
              <div className="flex items-center space-x-4 mt-1">
                {task.dueDate && (
                  <span className={`text-xs flex items-center ${
                    isOverdue(task.dueDate) && !task.done
                      ? 'text-red-600 dark:text-red-400'
                      : isToday(task.dueDate) && !task.done
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-grey-tint'
                  }`}>
                    <CalendarDaysIcon className="w-3 h-3 mr-1" />
                    {formatDate(task.dueDate)}
                  </span>
                )}
                
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1 ml-2">
              <button
                onClick={() => onEdit(task)}
                className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                title="Edit task"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                title="Delete task"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}