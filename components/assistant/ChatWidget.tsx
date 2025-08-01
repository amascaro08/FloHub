import React, { useEffect, useRef, memo, useState } from 'react';
import { mutate } from 'swr';
import { useChat } from './ChatContext';
import { 
  Plus, 
  List, 
  TrendingUp, 
  Brain, 
  Calendar,
  Search,
  Lightbulb,
  Clock,
  Target,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ChatWidgetProps {
  onClose: () => void;
}

// Define a type for the message object in history
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  htmlContent?: string; // Add optional field for parsed HTML content
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ onClose }) => {
  // Get chat state from context
  const { history, send, status, loading, input, setInput } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showQuickActions, setShowQuickActions] = useState(history.length === 0);
  const [userStats, setUserStats] = useState<{
    pendingTasks: number;
    overdueTasks: number;
    todayEvents: number;
    habitsCount: number;
  } | null>(null);

  // Effect to scroll to the bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [history]); // Scroll when history changes

  // Hide quick actions when conversation starts
  useEffect(() => {
    setShowQuickActions(history.length === 0);
  }, [history.length]);

  // Load user stats for dynamic suggestions
  useEffect(() => {
    const loadUserStats = async () => {
      try {
        const [tasksRes, eventsRes, habitsRes] = await Promise.allSettled([
          fetch('/api/tasks'),
          fetch('/api/calendar'),
          fetch('/api/habits')
        ]);

        const stats = {
          pendingTasks: 0,
          overdueTasks: 0,
          todayEvents: 0,
          habitsCount: 0
        };

        if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
          const tasks = await tasksRes.value.json();
          stats.pendingTasks = tasks.filter((t: any) => !t.done).length;
          stats.overdueTasks = tasks.filter((t: any) => !t.done && t.dueDate && new Date(t.dueDate) < new Date()).length;
        }

        if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
          const events = await eventsRes.value.json();
          const today = new Date();
          stats.todayEvents = events.filter((e: any) => {
            const eventDate = new Date(e.start || e.date);
            return eventDate.toDateString() === today.toDateString();
          }).length;
        }

        if (habitsRes.status === 'fulfilled' && habitsRes.value.ok) {
          const habits = await habitsRes.value.json();
          stats.habitsCount = habits.length;
        }

        setUserStats(stats);
      } catch (error) {
        console.warn('Could not load user stats for suggestions:', error);
      }
    };

    if (showQuickActions) {
      loadUserStats();
    }
  }, [showQuickActions]);

  // Handle sending message from input
  const handleSend = async () => {
    if (input.trim()) {
      await send(input.trim());
      setInput(''); // Clear input after sending
    }
  };

  // Handle quick action clicks
  const handleQuickAction = async (message: string) => {
    await send(message);
  };

  // Dynamic quick actions based on user data
  const getQuickActions = () => {
    const baseActions = [
      {
        icon: <Brain className="w-4 h-4" />,
        label: "Get Insights",
        message: "How am I doing with my productivity?",
        color: "bg-purple-500 hover:bg-purple-600"
      },
      {
        icon: <Calendar className="w-4 h-4" />,
        label: "Today's Schedule",
        message: "What's on my calendar today?",
        color: "bg-blue-500 hover:bg-blue-600"
      },
      {
        icon: <Plus className="w-4 h-4" />,
        label: "Add Task",
        message: "Add task: ",
        color: "bg-green-500 hover:bg-green-600",
        fillsInput: true
      },
      {
        icon: <Search className="w-4 h-4" />,
        label: "Search",
        message: "When did I last talk about ",
        color: "bg-gray-500 hover:bg-gray-600",
        fillsInput: true
      }
    ];

    // Add contextual actions based on user stats
    if (userStats) {
      if (userStats.pendingTasks > 0) {
        baseActions.push({
          icon: <List className="w-4 h-4" />,
          label: `My Tasks (${userStats.pendingTasks})`,
          message: "Show me my pending tasks",
          color: "bg-orange-500 hover:bg-orange-600"
        });
      }

      if (userStats.overdueTasks > 0) {
        baseActions.push({
          icon: <AlertCircle className="w-4 h-4" />,
          label: `Overdue (${userStats.overdueTasks})`,
          message: "Show me my overdue tasks",
          color: "bg-red-500 hover:bg-red-600"
        });
      }

      if (userStats.todayEvents > 0) {
        baseActions.push({
          icon: <Clock className="w-4 h-4" />,
          label: `Today (${userStats.todayEvents})`,
          message: "What's my schedule for today?",
          color: "bg-indigo-500 hover:bg-indigo-600"
        });
      }

      if (userStats.habitsCount > 0) {
        baseActions.push({
          icon: <Target className="w-4 h-4" />,
          label: "My Habits",
          message: "How are my habits doing?",
          color: "bg-teal-500 hover:bg-teal-600"
        });
      }
    }

    return baseActions;
  };

  const quickActions = getQuickActions();

      return (
    <div role="dialog" aria-label="FloCat chat" className="
      w-full h-full
      flex flex-col
      p-4
    ">
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 text-[var(--fg)] dark:text-gray-100 min-h-0" ref={messagesEndRef}>
          {/* Welcome message and quick actions */}
          {showQuickActions && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <Brain className="w-8 h-8 mx-auto mb-2 text-[var(--primary)]" />
                <h3 className="font-semibold text-sm text-[var(--fg)] dark:text-gray-100">Hey! I'm FloCat 😺</h3>
                <p className="text-xs text-[var(--fg-muted)] dark:text-gray-300 mt-1">
                  Your personal AI assistant. I know all about your tasks, calendar, and habits!
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className={`h-auto p-2 flex flex-col items-center gap-1 text-white rounded-lg text-xs font-medium transition-all duration-200 ${action.color} border-0 disabled:opacity-50`}
                    onClick={() => {
                      if (action.fillsInput) {
                        setInput(action.message);
                      } else {
                        handleQuickAction(action.message);
                      }
                    }}
                    disabled={loading}
                  >
                    {action.icon}
                    <span className="text-xs font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="text-center">
                <p className="text-xs text-[var(--fg-muted)] dark:text-gray-300">
                  Try asking me things like:
                </p>
                <div className="mt-2 space-y-1 text-xs text-[var(--fg-muted)] dark:text-gray-300">
                  <p>• "When am I taking mum to the airport?"</p>
                  <p>• "When did I last talk about incentives?"</p>
                  <p>• "What's my next meeting?"</p>
                  <p>• "Add task: review quarterly report"</p>
                </div>
              </div>
            </div>
          )}

          {/* Chat history */}
          {history.map((message, index) => (
            <div key={index} className={`p-2 rounded ${
              message.role === 'user' 
                ? 'bg-[var(--neutral-200)] dark:bg-gray-700 text-[var(--fg)] dark:text-gray-100' 
                : 'bg-[var(--neutral-100)] dark:bg-gray-600 text-[var(--fg)] dark:text-gray-100'
            }`}>
              {message.htmlContent ? (
                <div dangerouslySetInnerHTML={{ __html: message.htmlContent }} className="prose prose-sm dark:prose-invert max-w-none" />
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-2 p-2 bg-[var(--neutral-100)] dark:bg-gray-600 rounded">
              <div className="animate-spin w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full"></div>
              <span className="text-sm text-[var(--fg-muted)] dark:text-gray-300">FloCat is thinking...</span>
            </div>
          )}
        </div>
        <div className="flex border-t border-[var(--neutral-300)] dark:border-gray-600 pt-4 pb-2">
          <input
            className="
              flex-1 border border-[var(--neutral-300)] dark:border-gray-600
              rounded-l px-3 py-2 focus:outline-none
              focus:ring-2 focus:ring-[var(--primary)]
              bg-white dark:bg-gray-700 text-[var(--fg)] dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-400
            "
            placeholder="Ask me anything about your data..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()} // Use handleSend
          />
          <button
            onClick={handleSend} // Use handleSend
            disabled={loading || !input.trim()} // Disable if loading or input is empty
            className="
              px-4 py-2 rounded-r text-white
              bg-[var(--accent)] hover:opacity-90
              disabled:opacity-50
            "
            >
            Send
          </button>
        </div>
      </div>
  );
};

export default memo(ChatWidget);
