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
  const [promptAnswers, setPromptAnswers] = useState<{[key: string]: string}>({});
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
  
  // Handle prompt answer changes
  const handlePromptChange = (promptId: string, value: string) => {
    setPromptAnswers({
      ...promptAnswers,
      [promptId]: value
    });
  };

  const handleSave = () => {
    // Combine prompt answers with the main content
    let finalContent = content;
    
    if (showPrompts && isTodayDate && Object.keys(promptAnswers).length > 0) {
      finalContent = journalingPrompts.map(prompt => {
        const answer = promptAnswers[prompt.id] || '';
        if (answer.trim()) {
          return `<h4>${prompt.question}</h4><p>${answer}</p>`;
        }
        return '';
      }).filter(Boolean).join('') + (content ? '<hr/>' + content : '');
    }
    
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
  };


  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 flex flex-col h-full overflow-hidden">
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

      {showPrompts && isTodayDate ? (
        <div className="flex flex-col h-full overflow-auto">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Journal Prompts
          </h3>
          <div className="grid grid-cols-1 gap-4 mb-4 overflow-y-auto max-w-full">
            {journalingPrompts.map((prompt) => (
              <div key={prompt.id} className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {prompt.question}
                </label>
                <textarea
                  value={promptAnswers[prompt.id] || ''}
                  onChange={(e) => handlePromptChange(prompt.id, e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={2}
                  placeholder="Your answer..."
                />
              </div>
            ))}
            
            {/* Additional free-form thoughts section */}
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Any other thoughts or reflections?
              </label>
              <RichTextEditor
                content={content}
                onChange={handleContentChange}
                placeholder="Write freely about anything else on your mind..."
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow overflow-auto">
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            placeholder="Write your thoughts..."
          />
        </div>
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