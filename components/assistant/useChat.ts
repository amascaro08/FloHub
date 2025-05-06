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
    setHistory(prevHistory => [...prevHistory, newUserMessage]);
    setInput('');
    setLoading(true);
    setStatus('loading');

    try {
      // Create the updated history including the new user message
      const updatedHistory = [...history, newUserMessage];

      // Update the state with the user message immediately
      setHistory(updatedHistory);

      // Call chatWithFloCat with the updated history
      const assistantContent = await chatWithFloCat(updatedHistory);

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