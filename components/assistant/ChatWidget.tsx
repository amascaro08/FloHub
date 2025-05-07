import React, { useEffect, useRef, memo } from 'react';
import { mutate } from 'swr';
import { useChat } from './ChatContext';

interface ChatWidgetProps {
  onClose: () => void;
}

// Define a type for the message object in history
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  htmlContent?: string; // Add optional field for parsed HTML content
}

const ChatWidget: React.FC<ChatWidgetProps> = memo(({ onClose }) => {
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

  return (
    <div role="dialog" aria-label="FloCat chat" className="
      w-80 h-96
      glass p-4 rounded-xl shadow-elevate-lg
      flex flex-col
    ">
        <div className="flex-1 overflow-y-auto space-y-2 mb-2 text-[var(--fg)]" ref={messagesEndRef}>
          {history.map((message, index) => (
            <div key={index} className={`p-2 rounded ${message.role === 'user' ? 'bg-[var(--neutral-200)]' : 'bg-[var(--neutral-100)]'}`}>
              {message.htmlContent ? (
                <div dangerouslySetInnerHTML={{ __html: message.htmlContent }} />
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          ))}
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
});

export default memo(ChatWidget);
