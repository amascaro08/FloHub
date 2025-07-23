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
  Lightbulb
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

  // Quick action buttons
  const quickActions = [
    {
      icon: <Brain className="w-4 h-4" />,
      label: "Get Suggestions",
      message: "Give me some suggestions",
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: "Productivity Overview",
      message: "Show me my productivity overview",
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
      icon: <List className="w-4 h-4" />,
      label: "My Tasks",
      message: "Show me my pending tasks",
      color: "bg-orange-500 hover:bg-orange-600"
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Today's Events",
      message: "What's on my calendar today?",
      color: "bg-indigo-500 hover:bg-indigo-600"
    },
    {
      icon: <Search className="w-4 h-4" />,
      label: "Search",
      message: "Search for ",
      color: "bg-gray-500 hover:bg-gray-600",
      fillsInput: true
    }
  ];

  return (
    <div role="dialog" aria-label="FloCat chat" className="h-full flex flex-col">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 text-[var(--fg)] dark:text-gray-100" ref={messagesEndRef}>
        {/* Welcome message and quick actions */}
        {showQuickActions && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Brain className="w-10 h-10 mx-auto mb-3 text-[var(--primary)]" />
              <h3 className="font-semibold text-lg text-[var(--fg)] dark:text-gray-100">Hey! I'm FloCat 😺</h3>
              <p className="text-sm text-[var(--fg-muted)] dark:text-gray-300 mt-2 leading-relaxed">
                Your AI productivity assistant. What can I help you with today?
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className={`h-auto p-3 flex flex-col items-center gap-2 text-white rounded-lg text-xs font-medium transition-all duration-200 ${action.color} border-0 disabled:opacity-50 hover:scale-105`}
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
                  <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
            
            <div className="text-center pt-2">
              <p className="text-xs text-[var(--fg-muted)] dark:text-gray-300">
                Or type your question below...
              </p>
            </div>
          </div>
        )}

        {/* Chat history */}
        {history.map((message, index) => (
          <div key={index} className={`p-3 rounded-lg ${
            message.role === 'user' 
              ? 'bg-[var(--primary)] text-white ml-4' 
              : 'bg-[var(--neutral-100)] dark:bg-gray-700 text-[var(--fg)] dark:text-gray-100 mr-4'
          }`}>
            {message.htmlContent ? (
              <div dangerouslySetInnerHTML={{ __html: message.htmlContent }} className="prose prose-sm dark:prose-invert max-w-none" />
            ) : (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-3 p-3 bg-[var(--neutral-100)] dark:bg-gray-700 rounded-lg mr-4">
            <div className="animate-spin w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full"></div>
            <span className="text-sm text-[var(--fg-muted)] dark:text-gray-300">FloCat is thinking...</span>
          </div>
        )}
      </div>
      
      {/* Input area */}
      <div className="border-t border-[var(--neutral-300)] dark:border-gray-600 pt-4">
        <div className="flex gap-2">
          <input
            className="
              flex-1 border border-[var(--neutral-300)] dark:border-gray-600
              rounded-lg px-3 py-2 focus:outline-none
              focus:ring-2 focus:ring-[var(--primary)]
              bg-white dark:bg-gray-700 text-[var(--fg)] dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-400
              text-sm
            "
            placeholder="Type a message…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()} // Use handleSend
          />
          <button
            onClick={handleSend} // Use handleSend
            disabled={loading || !input.trim()} // Disable if loading or input is empty
            className="
              px-4 py-2 rounded-lg text-white text-sm font-medium
              bg-[var(--primary)] hover:bg-[var(--primary-dark)]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
            >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ChatWidget);
