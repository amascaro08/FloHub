import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import RichTextEditor from './RichTextEditor';
import { getCurrentDate, isToday, getDateStorageKey } from '@/lib/dateUtils';

interface TodayEntryProps {
  onSave: (entry: { content: string; timestamp: string }) => void;
  date?: string; // Optional date parameter, defaults to today
  timezone?: string; // User's timezone
  showPrompts?: boolean; // Whether to show journaling prompts
  activities?: string[]; // Optional activities for the entry
}

const TodayEntry: React.FC<TodayEntryProps> = ({ onSave, date, timezone, showPrompts = false, activities = [] }) => {
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
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
  
  // Journaling prompts
  const journalingPrompts = [
    { id: 'grateful', question: "What am I grateful for today?" },
    { id: 'focus', question: "What's one thing I can do today to move closer to my goals?" },
    { id: 'meaningful', question: "What was the most meaningful part of my day?" },
    { id: 'challenge', question: "What challenged me today and what did I learn from it?" },
    { id: 'feeling', question: "How am I feeling right now and why?" },
    { id: 'win', question: "What's one small win I can celebrate today?" }
  ];
  
  // Insert prompt into editor
  const insertPrompt = (question: string) => {
    const promptText = `\n\n**${question}**\n`;
    setContent(prevContent => prevContent + promptText);
    setEditorContent(prevContent => prevContent + promptText);
  };

  const handleSave = () => {
    // Use the content directly
    let finalContent = content;
    
    if (!finalContent.trim()) return;
    
    const timestamp = new Date().toISOString();
    const entry = { content: finalContent, timestamp };
    
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
    setEditorContent(html);
  };


  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-4 sm:p-6 flex flex-col h-full overflow-hidden max-w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
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
      
      {/* Display activities if available */}
      {activities.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {activities.map(activity => (
              <div
                key={activity}
                className="px-3 py-1 rounded-full text-xs bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200"
              >
                {activity}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col h-full overflow-auto">
        {showPrompts && isTodayDate && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Journal Prompts (click to add)
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {journalingPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => insertPrompt(prompt.question)}
                  className="px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {prompt.question}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex-grow overflow-auto max-w-full">
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            placeholder="Write your thoughts..."
          />
        </div>
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