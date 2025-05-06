import chatWithFloCat from '../../lib/assistant';
import { useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseChatHook {
  history: ChatMessage[];
  send: (message: string) => void;
  status: 'idle' | 'loading' | 'success' | 'error';
  loading: boolean;
  input: string;
  setInput: (input: string) => void;
}

const useChat = (): UseChatHook => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(false);

  const send = async (message: string) => {
    if (!message.trim()) return;

    const newUserMessage: ChatMessage = { role: 'user', content: message };
    
    // Optimistically update history with the user message
    setHistory(prevHistory => [...prevHistory, newUserMessage]);
    setInput('');
    setLoading(true);
    setStatus('loading');

    try {
      // Call chatWithFloCat with the *current* history plus the new user message
      // Use the functional update form of setHistory to get the most recent state
      const assistantContent = await chatWithFloCat([...history, newUserMessage]);

      // Add the assistant's response to the history
      const assistantResponse: ChatMessage = { role: 'assistant', content: assistantContent };
      setHistory(prevHistory => [...prevHistory, assistantResponse]);

      setStatus('success');
    } catch (error) {
      console.error("Error calling chatWithFloCat:", error);
      setStatus('error');
      // Add error message to history
      setHistory(prevHistory => [...prevHistory, { role: 'assistant', content: 'Error: Unable to get a response from FloCat.' }]);
    } finally {
      setLoading(false);
    }
  };

  return {
    history,
    send,
    status,
    loading,
    input,
    setInput,
  };
};

export default useChat;