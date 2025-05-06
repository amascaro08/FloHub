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

    // Call the chatWithFloCat API function
    try {
      // Sending only the new message for now to test performance
      // A more sophisticated approach might send a limited history or summary
      // Simulate an asynchronous response to test responsiveness
      await new Promise(resolve => setTimeout(resolve, 1000));
      const assistantContent = `Simulated response to: "${message}"`;
      const assistantResponse: ChatMessage = { role: 'assistant', content: assistantContent };
      setHistory(prevHistory => [...prevHistory, assistantResponse]);
      setStatus('success');
    } catch (error) {
      console.error("Error simulating response:", error);
      setStatus('error');
      setHistory(prevHistory => [...prevHistory, { role: 'assistant', content: 'Error: Unable to get a simulated response.' }]);
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