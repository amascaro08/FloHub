import React, { useEffect, useRef } from 'react';
import { mutate } from 'swr';
import useChat from './useChat';

interface ChatWidgetProps {
  onClose: () => void;
  send: (message: string) => Promise<void>; // Accept send function as a prop
  history: ChatMessage[]; // Accept history as a prop
  status: 'idle' | 'loading' | 'success' | 'error'; // Accept status as a prop
  loading: boolean; // Accept loading as a prop
  input: string; // Accept input as a prop
  setInput: (input: string) => void; // Accept setInput as a prop
}

// Define a type for the message object in history
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  htmlContent?: string; // Add optional field for parsed HTML content
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ onClose, send, history, status, loading, input, setInput }) => {
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
        <div
          className="flex-1 overflow-y-auto space-y-2 mb-2 text-[var(--fg)]"
          ref={messagesEndRef}
        >
          {history.map((m: ChatMessage, i: number) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <span className={`
                inline-block px-3 py-1 rounded-lg whitespace-pre-wrap
                ${m.role === "assistant"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--neutral-200)] text-[var(--fg)]"
                }
              `}>
                {/* Render pre-parsed HTML content */}
                {m.htmlContent ? (
                  <div dangerouslySetInnerHTML={{ __html: m.htmlContent }} />
                ) : (
                  m.content // Fallback to raw content if htmlContent is not available
                )}
              </span>
            </div>
          ))}
          {loading && (
            <p className="italic text-[var(--neutral-500)]">FloCat is typing…</p>
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
}

export default ChatWidget;
