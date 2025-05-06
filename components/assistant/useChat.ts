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

    // Placeholder for sending message to the API
    // In a real implementation, you would call chatWithFloCat here
    console.log("Sending message to API:", message);

    // Simulate a response
    await new Promise(resolve => setTimeout(resolve, 1000));
    const assistantResponse: ChatMessage = { role: 'assistant', content: `You said: "${message}" (This is a placeholder response)` };
    setHistory(prevHistory => [...prevHistory, assistantResponse]);
    setLoading(false);
    setStatus('success');
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