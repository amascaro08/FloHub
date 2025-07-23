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
  isLoading?: boolean;
  loadingMessage?: string;
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
    
    // Add the user message immediately
    setHistory(prevHistory => [...prevHistory, newUserMessage]);
    
    // Update input, loading, and status states together
    setInput('');
    setLoading(true);
    setStatus('loading');

    // Add a loading message to show progress
    const loadingMessage: ChatMessage = { 
      role: 'assistant', 
      content: 'FloCat is thinking...', 
      htmlContent: 'FloCat is thinking...',
      isLoading: true,
      loadingMessage: 'Starting analysis...'
    };
    setHistory(prevHistory => [...prevHistory, loadingMessage]);

    try {
      // Determine what type of request this is and update loading message accordingly
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('calendar') || lowerMessage.includes('schedule') || 
          lowerMessage.includes('event') || lowerMessage.includes('today') ||
          lowerMessage.includes('tomorrow') || lowerMessage.includes('next') ||
          lowerMessage.includes('upcoming')) {
        
        // Update loading message for calendar queries
        setHistory(prevHistory => [
          ...prevHistory.slice(0, -1),
          { ...loadingMessage, loadingMessage: 'Checking your schedule...' }
        ]);
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
        
        setHistory(prevHistory => [
          ...prevHistory.slice(0, -1),
          { ...loadingMessage, loadingMessage: 'Fetching calendar events...' }
        ]);
        
      } else if (lowerMessage.includes('note') || lowerMessage.includes('meeting')) {
        
        setHistory(prevHistory => [
          ...prevHistory.slice(0, -1),
          { ...loadingMessage, loadingMessage: 'Searching your notes...' }
        ]);
        
      } else if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
        
        setHistory(prevHistory => [
          ...prevHistory.slice(0, -1),
          { ...loadingMessage, loadingMessage: 'Checking your tasks...' }
        ]);
        
      } else if (lowerMessage.includes('habit') || lowerMessage.includes('streak')) {
        
        setHistory(prevHistory => [
          ...prevHistory.slice(0, -1),
          { ...loadingMessage, loadingMessage: 'Analyzing your habits...' }
        ]);
        
      } else if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
        
        setHistory(prevHistory => [
          ...prevHistory.slice(0, -1),
          { ...loadingMessage, loadingMessage: 'Gathering your data...' }
        ]);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setHistory(prevHistory => [
          ...prevHistory.slice(0, -1),
          { ...loadingMessage, loadingMessage: 'Creating your summary...' }
        ]);
        
      } else {
        
        setHistory(prevHistory => [
          ...prevHistory.slice(0, -1),
          { ...loadingMessage, loadingMessage: 'Processing your request...' }
        ]);
        
      }

      // Small delay to show the specific loading message
      await new Promise(resolve => setTimeout(resolve, 300));

      // Make the API request
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

      // Replace the loading message with the actual response
      const assistantResponse: ChatMessage = { 
        role: 'assistant', 
        content: assistantContent, 
        htmlContent: assistantHtmlContent,
        isLoading: false
      };
      
      setHistory(prevHistory => [
        ...prevHistory.slice(0, -1), // Remove loading message
        assistantResponse
      ]);
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
      
      // Replace loading message with error
      setHistory(prevHistory => [
        ...prevHistory.slice(0, -1), // Remove loading message
        { role: 'assistant', content: errorMessage, htmlContent: errorHtmlMessage, isLoading: false }
      ]);
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