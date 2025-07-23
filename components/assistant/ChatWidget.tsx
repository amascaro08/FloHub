import React, { useEffect, useRef, memo } from 'react';
import { mutate } from 'swr';
import { useChat } from './ChatContext'; // Make sure we're using the context version
import { Plus, Calendar, FileText, BarChart3, Target, Repeat, Lightbulb, Zap, Heart } from 'lucide-react';

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

  // Effect to scroll to the bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [history]); // Scroll when history changes

  // Handle sending message from input
  const handleSend = async () => {
    if (input.trim()) {
      await send(input.trim());
      setInput(''); // Clear input after sending
    }
  };

  // Quick action handlers
  const handleQuickAction = async (action: string) => {
    await send(action);
  };

  const quickActions = [
    {
      label: 'Add Task',
      icon: Plus,
      action: 'add task',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      label: 'Schedule',
      icon: Calendar,
      action: 'schedule event',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      label: 'Summary',
      icon: BarChart3,
      action: 'daily summary',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      label: 'Insights',
      icon: Lightbulb,
      action: 'productivity insights',
      color: 'bg-yellow-500 hover:bg-yellow-600',
    },
    {
      label: 'Focus',
      icon: Zap,
      action: 'help me focus',
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      label: 'Motivation',
      icon: Heart,
      action: 'motivation',
      color: 'bg-pink-500 hover:bg-pink-600',
    },
    {
      label: 'My Tasks',
      icon: Target,
      action: 'show my tasks',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      label: 'My Habits',
      icon: Repeat,
      action: 'list habits',
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
  ];

  return (
    <div role="dialog" aria-label="FloCat chat" className="h-full flex flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={messagesEndRef}>
        {history.length === 0 ? (
          <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
            <div className="text-2xl mb-2">🐱</div>
            <p className="text-sm">Hi! I'm FloCat, your AI assistant.</p>
            <p className="text-xs mt-1">How can I help you today?</p>
          </div>
        ) : (
          history.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`
                max-w-[85%] p-3 rounded-lg
                ${message.role === 'user' 
                  ? 'bg-[var(--primary)] text-white' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-[var(--fg)]'
                }
              `}>
                {message.htmlContent ? (
                  <div dangerouslySetInnerHTML={{ __html: message.htmlContent }} />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-3">
        <div className="mb-2">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Quick Actions:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.action)}
                disabled={loading}
                className={`
                  flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-white text-xs font-medium
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${action.color}
                `}
              >
                <action.icon className="w-3 h-3" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex space-x-2">
          <input
            className="
              flex-1 px-3 py-2 
              border border-neutral-300 dark:border-neutral-600
              rounded-lg 
              bg-white dark:bg-neutral-800
              text-[var(--fg)]
              placeholder-neutral-500 dark:placeholder-neutral-400
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent
              text-sm
            "
            placeholder="Type a message… 🐱"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="
              px-4 py-2 
              bg-[var(--primary)] hover:bg-[var(--primary)]/90
              text-white text-sm font-medium
              rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center
              min-w-[60px]
            "
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ChatWidget);
