import React, { useEffect, useRef } from 'react';
import { mutate } from 'swr';
import useChat from './useChat';

interface ChatWidgetProps {
  messageToSend: string | null;
  onMessageProcessed: () => void;
  onClose: () => void;
}

// Define a type for the message object in history
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ messageToSend, onMessageProcessed, onClose }) => {
  const { history, send, status, loading, input, setInput } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effect to handle messages sent from the top input
  useEffect(() => {
    if (messageToSend) {
      send(messageToSend);
      // Call onMessageProcessed and revalidate data after sending
      onMessageProcessed();
      mutate("/api/tasks");
      mutate("/api/calendar");
    }
  }, [messageToSend, send, onMessageProcessed]); // Add dependencies

  // Effect to scroll to the bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [history]); // Scroll when history changes

  if (status === "loading") return null;

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
          {history.map((m: ChatMessage, i: number) => ( // Added types for m and i
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <span className={`
                inline-block px-3 py-1 rounded-lg whitespace-pre-wrap
                ${m.role === "assistant"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--neutral-200)] text-[var(--fg)]"
                }
              `}>
                {/* Render content, parsing markdown links */}
                {m.content.split('\n').map((line: string, lineIndex: number) => { // Added types for line and lineIndex
                  // Simple regex to find markdown links [text](url)
                  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                  let lastIndex = 0;
                  const elements: (string | React.ReactNode)[] = []; // Added type for elements

                  line.replace(linkRegex, (match: string, text: string, url: string, offset: number) => { // Added types for replace parameters
                    // Add text before the link
                    if (offset > lastIndex) {
                      elements.push(line.substring(lastIndex, offset));
                    }
                    // Add the link
                    elements.push(
                      <a
                        key={`${i}-${lineIndex}-${offset}`}
                        href={url}
                        target="_blank" // Open links in a new tab
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] hover:underline"
                      >
                        {text}
                      </a>
                    );
                    lastIndex = offset + match.length;
                    return match; // Return match to satisfy replace signature
                  });

                  // Add any remaining text after the last link
                  if (lastIndex < line.length) {
                    elements.push(line.substring(lastIndex));
                  }

                  return (
                    <p key={`${i}-${lineIndex}`} className="mb-1 last:mb-0">
                      {elements.length > 0 ? elements : line}
                    </p>
                  );
                })}
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
            onKeyDown={e => e.key === "Enter" && send(input)} // Keep existing handler for local input
          />
          <button
            onClick={() => send(input)}
            disabled={loading}
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
