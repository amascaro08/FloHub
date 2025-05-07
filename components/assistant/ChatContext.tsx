import React, { createContext, useContext, ReactNode, useState } from 'react';
import { marked } from 'marked';

// Configure marked to return strings directly instead of promises
marked.setOptions({
  async: false
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  htmlContent?: string;
}

interface ChatContextType {
  history: ChatMessage[];
  send: (message: string) => Promise<void>;
  status: 'idle' | 'loading' | 'success' | 'error';
  loading: boolean;
  input: string;
  setInput: (input: string) => void;
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const send = async (message: string) => {
    if (!message.trim()) return;

    // User messages don't need markdown parsing here, but we'll add the structure
    const newUserMessage: ChatMessage = { role: 'user', content: message, htmlContent: message };
    
    // Update input, loading, and status states together
    setInput('');
    setLoading(true);
    setStatus('loading');

    try {
      // Instead of using the client-side capability matching and OpenAI directly,
      // we'll make a request to our API endpoint
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          history: history.map(msg => ({ role: msg.role, content: msg.content }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data.reply || "Sorry, I couldn't process that request.";

      // Parse assistant's response markdown to HTML
      let assistantHtmlContent;
      try {
        const result = marked(assistantContent);
        assistantHtmlContent = result instanceof Promise ? await result : result;
      } catch (error) {
        console.error("Error parsing markdown:", error);
        assistantHtmlContent = assistantContent;
      }

      // Update history with both the user message and the assistant's response
      const assistantResponse: ChatMessage = { role: 'assistant', content: assistantContent, htmlContent: assistantHtmlContent };
      setHistory(prevHistory => [...prevHistory, newUserMessage, assistantResponse]);
      setStatus('success');

    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage = 'Error: Something went wrong while processing your request.';
      let errorHtmlMessage;
      try {
        const result = marked(errorMessage);
        errorHtmlMessage = result instanceof Promise ? await result : result;
      } catch (error) {
        console.error("Error parsing markdown:", error);
        errorHtmlMessage = errorMessage;
      }
      
      setHistory(prevHistory => [...prevHistory, newUserMessage, { role: 'assistant', content: errorMessage, htmlContent: errorHtmlMessage }]);
      setStatus('error');

    } finally {
      setLoading(false);
    }
  };

  const value = {
    history,
    send,
    status,
    loading,
    input,
    setInput,
    isChatOpen,
    setIsChatOpen
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};