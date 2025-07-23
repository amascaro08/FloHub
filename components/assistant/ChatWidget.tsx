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
    <div role="dialog" aria-label="FloCat chat" className="
      w-80 h-96
      glass p-4 rounded-xl shadow-elevate-lg
      flex flex-col
    ">
        <div className="flex-1 overflow-y-auto space-y-2 mb-2 text-[var(--fg)]" ref={messagesEndRef}>
          {/* Welcome message and quick actions */}
          {showQuickActions && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <Brain className="w-8 h-8 mx-auto mb-2 text-[var(--primary)]" />
                <h3 className="font-semibold text-sm">Hey! I'm FloCat 😺</h3>
                <p className="text-xs text-[var(--fg-muted)] mt-1">
                  Your AI productivity assistant. What can I help you with?
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
                <p className="text-xs text-[var(--fg-muted)]">
                  Or type your question below...
                </p>
              </div>
            </div>
          )}

          {/* Chat history */}
          {history.map((message, index) => (
            <div key={index} className={`p-2 rounded ${message.role === 'user' ? 'bg-[var(--neutral-200)]' : 'bg-[var(--neutral-100)]'}`}>
              {message.htmlContent ? (
                <div dangerouslySetInnerHTML={{ __html: message.htmlContent }} />
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-2 p-2 bg-[var(--neutral-100)] rounded">
              <div className="animate-spin w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full"></div>
              <span className="text-sm text-[var(--fg-muted)]">FloCat is thinking...</span>
            </div>
          )}
        </div>
        <div className="flex border-t border-[var(--neutral-300)] pt-2">
          <input
            className="
              flex-1 border border-[var(--neutral-300)]
              rounded-l px-2 py-1 focus:outline-none
              focus:ring-2 focus:ring-[var(--primary)]
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
              ml-2 px-3 rounded-r text-white
              bg-[var(--accent)] hover:opacity-90
              disabled:opacity-50
            "
            >
            Send
          </button>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="mt-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Close
        </button>
      </div>
  );
};

export default memo(ChatWidget);
