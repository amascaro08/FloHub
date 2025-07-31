import { useState, useEffect, useRef } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import RichTextEditor from './RichTextEditor';
import { getCurrentDate, isToday, getDateStorageKey } from '@/lib/dateUtils';
import axios from 'axios';

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
  const [userSettings, setUserSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { user, isLoading } = useUser();
  const userData = user ? user : null;

  // Refs for managing timeouts and preventing memory leaks
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savePromiseRef = useRef<Promise<any> | null>(null);

  if (!user) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  
  // Get the current date in YYYY-MM-DD format or use provided date 
  const entryDate = date || getCurrentDate(timezone);
  const isTodayDate = !date || isToday(date, timezone);

  // Load saved entry from API on component mount
  useEffect(() => {
    const fetchEntry = async () => {
      if (user?.primaryEmail) {
        try {
          const response = await axios.get(`/api/journal/entry?date=${entryDate}`);
          if (response.data) {
            setContent(response.data.content || '');
            setSavedContent(response.data.content || '');
            setLastSaved(response.data.timestamp || null);
          }
        } catch (error) {
          console.error('Error fetching journal entry:', error);
          // Set default empty state
          setContent('');
          setSavedContent('');
          setLastSaved(null);
        }
      }
    };
    
    if (user?.primaryEmail) {
      fetchEntry();
    }
  }, [user, entryDate, timezone]);

  // Load user settings for prompts
  useEffect(() => {
    if (user?.primaryEmail) {
      const savedSettings = localStorage.getItem(`journal_settings_${user.primaryEmail}`);
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setUserSettings(settings);
        } catch (error) {
          console.error('Error loading user settings:', error);
        }
      }
    }
  }, [user]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  // Journaling prompts
  const journalingPrompts = [
    { id: 'grateful', question: "What am I grateful for today?" },
    { id: 'focus', question: "What's one thing I can do today to move closer to my goals?" },
    { id: 'meaningful', question: "What was the most meaningful part of my day?" },
    { id: 'challenge', question: "What challenged me today and what did I learn from it?" },
    { id: 'feeling', question: "How am I feeling right now and why?" },
    { id: 'win', question: "What's one small win I can celebrate today?" }
  ];

  // Auto-save function
  const autoSave = async (newContent: string) => {
    if (!user?.primaryEmail || newContent.trim() === savedContent.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    const timestamp = new Date().toISOString();
    const entry = { content: newContent, timestamp };

    try {
      // Cancel any pending save operations
      if (savePromiseRef.current) {
        // Let the previous save complete, but don't wait for it
      }

      // Start new save operation
      const savePromise = axios.post('/api/journal/entry', {
        date: entryDate,
        content: newContent,
        timestamp
      }, {
        withCredentials: true
      });

      savePromiseRef.current = savePromise;
      await savePromise;

             // Only update state if this is still the latest save operation
       if (savePromiseRef.current === savePromise) {
         setSavedContent(newContent);
         setLastSaved(timestamp);
         // Call onSave only for significant content changes (every 50+ characters)
         if (Math.abs(newContent.length - savedContent.length) > 50) {
           onSave(entry);
         }
       }
    } catch (error) {
      console.error('Error saving journal entry:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Insert prompt into editor
  const insertPrompt = (question: string) => {
    const promptText = `\n\n**${question}**\n`;
    const newContent = content + promptText;
    setContent(newContent);
    setEditorContent(newContent);
    
    // Auto-save when prompt is inserted
    setTimeout(() => autoSave(newContent), 100);
  };

  const handleSave = () => {
    // Use the content directly
    let finalContent = content;
    
    if (!finalContent.trim()) return;
    
    const timestamp = new Date().toISOString();
    const entry = { content: finalContent, timestamp };
    
    // Save to localStorage
    if (user?.primaryEmail) {
      // Save to both the specific date key and today's entry if it's today
      const dateKey = getDateStorageKey('journal_entry', user.primaryEmail, timezone, entryDate);
      localStorage.setItem(dateKey, JSON.stringify(entry));
      
      if (isTodayDate) {
        localStorage.setItem(
          `journal_today_${user.primaryEmail}`,
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
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new timeout for auto-save
    debounceTimeoutRef.current = setTimeout(() => {
      autoSave(html);
    }, 2000); // Increased debounce time to 2 seconds for better UX
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
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {isSaving ? (
            <span className="flex items-center">
              <div className="animate-spin h-3 w-3 border border-slate-400 rounded-full border-t-transparent mr-1"></div>
              Saving...
            </span>
          ) : lastSaved ? (
            <span>Auto-saved {new Date(lastSaved).toLocaleTimeString()}</span>
          ) : (
            <span>Start writing to auto-save</span>
          )}
        </div>
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
        {showPrompts && isTodayDate && userSettings?.dailyPrompts !== false && (
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

    </div>
  );
};

export default TodayEntry;