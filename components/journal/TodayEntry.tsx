import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import RichTextEditor from './RichTextEditor';
import { getCurrentDate, isToday, getDateStorageKey } from '@/lib/dateUtils';

interface TodayEntryProps {
  onSave: (entry: { content: string; timestamp: string }) => void;
  date?: string; // Optional date parameter, defaults to today
  timezone?: string; // User's timezone
  showPrompts?: boolean; // Whether to show journaling prompts
}

const TodayEntry: React.FC<TodayEntryProps> = ({ onSave, date, timezone, showPrompts = false }) => {
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const { data: session } = useSession();
  
  // Get the current date in YYYY-MM-DD format or use provided date
  const entryDate = date || getCurrentDate(timezone);
  const isTodayDate = !date || isToday(date, timezone);

  // Load saved entry from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      // If a specific date is provided, load that entry, otherwise load today's entry
      const storageKey = isTodayDate
        ? `journal_today_${session.user.email}`
        : getDateStorageKey('journal_entry', session.user.email, timezone, entryDate);
        
      const savedEntry = localStorage.getItem(storageKey);
      
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
  }, [session, entryDate, isTodayDate, timezone]);

  const handleSave = () => {
    if (!content.trim()) return;
    
    const timestamp = new Date().toISOString();
    const entry = { content, timestamp };
    
    // Save to localStorage
    if (session?.user?.email) {
      // Save to both the specific date key and today's entry if it's today
      const dateKey = getDateStorageKey('journal_entry', session.user.email, timezone, entryDate);
      localStorage.setItem(dateKey, JSON.stringify(entry));
      
      if (isTodayDate) {
        localStorage.setItem(
          `journal_today_${session.user.email}`,
          JSON.stringify(entry)
        );
      }
    }
    
    setSavedContent(content);
    setLastSaved(timestamp);
    onSave(entry);
  };

  const handleContentChange = (html: string) => {
    setContent(html);
  };

  // Journaling prompts to guide the user
  const journalingPrompts = [
    "What am I grateful for today?",
    "What's one thing I can do today to move closer to my goals?",
    "What was the most meaningful part of my day?",
    "What challenged me today and what did I learn from it?",
    "How am I feeling right now and why?",
    "What's one small win I can celebrate today?"
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          {isTodayDate ? "Today's Entry" : new Date(entryDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: timezone
          })}
        </h2>
        <button
          onClick={handleSave}
          className="text-sm px-3 py-1 rounded-md bg-teal-500 text-white hover:bg-teal-600 transition-colors"
        >
          Save
        </button>
      </div>

      {showPrompts && isTodayDate && (
        <div className="mb-4 bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Journal Prompts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {journalingPrompts.map((prompt, index) => (
              <div key={index} className="text-xs text-slate-600 dark:text-slate-400 p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                {prompt}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-grow">
        <RichTextEditor
          content={content}
          onChange={handleContentChange}
          placeholder={showPrompts && isTodayDate ?
            "Reflect on the prompts above or write freely about your day..." :
            "Write your thoughts..."}
        />
      </div>

      {lastSaved && (
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Last saved: {new Date(lastSaved).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default TodayEntry;