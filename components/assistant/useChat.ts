import { findMatchingCapability } from '../../lib/floCatCapabilities';
import chatWithFloCat from '../../lib/assistant';
import { useState } from 'react';
import { marked } from 'marked'; // Import marked

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  htmlContent?: string; // Add optional field for parsed HTML content
}

interface UseChatHook {
  history: ChatMessage[];
  send: (message: string) => Promise<void>; // Corrected return type to Promise<void>
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

    // User messages don't need markdown parsing here, but we'll add the structure
    const newUserMessage: ChatMessage = { role: 'user', content: message, htmlContent: message };
    
    setInput('');
    setLoading(true);
    setStatus('loading');

    try {
      // Attempt to match user input to a registered capability
      const match = findMatchingCapability(message);
      let assistantContent: string;

      if (match) {
        console.log(`Matched capability: ${match.capability.featureName}, Command: ${match.command}, Args: ${match.args}`);
        // Execute the handler for the matched capability
        assistantContent = await match.capability.handler(match.command, match.args);
      } else {
        console.log("No capability match, falling back to general chat.");
        // Fallback to general chat if no capability matches
        assistantContent = await chatWithFloCat([...history, newUserMessage]);
      }

      // Parse assistant's response markdown to HTML
      const assistantHtmlContent = await marked(assistantContent);

      // Update history with both the user message and the assistant's response
      const assistantResponse: ChatMessage = { role: 'assistant', content: assistantContent, htmlContent: assistantHtmlContent };
      setHistory(prevHistory => [...prevHistory, newUserMessage, assistantResponse]);

      setStatus('success');
    } catch (error) {
      console.error("Error processing message:", error);
      setStatus('error');
      // Add user message and error message to history
      const errorMessage = 'Error: Something went wrong while processing your request.';
      const errorHtmlMessage = await marked(errorMessage);
      setHistory(prevHistory => [...prevHistory, newUserMessage, { role: 'assistant', content: errorMessage, htmlContent: errorHtmlMessage }]);
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