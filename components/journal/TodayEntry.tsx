import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface TodayEntryProps {
  onSave: (entry: { content: string; timestamp: string }) => void;
}

const TodayEntry: React.FC<TodayEntryProps> = ({ onSave }) => {
  const [content, setContent] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [savedContent, setSavedContent] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const { data: session } = useSession();

  // Load saved entry from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      const savedEntry = localStorage.getItem(`journal_today_${session.user.email}`);
      if (savedEntry) {
        try {
          const parsed = JSON.parse(savedEntry);
          setContent(parsed.content || '');
          setSavedContent(parsed.content || '');
          setLastSaved(parsed.timestamp || null);
        } catch (e) {
          console.error('Error parsing saved journal entry:', e);
        }
      }
    }
  }, [session]);

  const handleSave = () => {
    if (!content.trim()) return;
    
    const timestamp = new Date().toISOString();
    const entry = { content, timestamp };
    
    // Save to localStorage
    if (session?.user?.email) {
      localStorage.setItem(
        `journal_today_${session.user.email}`,
        JSON.stringify(entry)
      );
    }
    
    setSavedContent(content);
    setLastSaved(timestamp);
    onSave(entry);
  };

  // Simple markdown renderer (could be replaced with a proper markdown library)
  const renderMarkdown = (text: string) => {
    // This is a very basic implementation
    // Replace with a proper markdown library in production
    return text
      .replace(/# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Today's Entry</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="text-sm px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {showMarkdown ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={handleSave}
            className="text-sm px-3 py-1 rounded-md bg-teal-500 text-white hover:bg-teal-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {showMarkdown ? (
        <div 
          className="flex-grow bg-slate-50 dark:bg-slate-700 rounded-lg p-4 overflow-auto"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your thoughts for today..."
          className="flex-grow p-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      )}

      {lastSaved && (
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Last saved: {new Date(lastSaved).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default TodayEntry;