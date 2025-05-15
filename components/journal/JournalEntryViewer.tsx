import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatDate } from '@/lib/dateUtils';

interface JournalEntryViewerProps {
  date: string;
  onEdit?: () => void;
  timezone?: string;
}

interface JournalEntry {
  content: string;
  timestamp: string;
}

const JournalEntryViewer: React.FC<JournalEntryViewerProps> = ({ date, onEdit, timezone }) => {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      setLoading(true);
      
      // Load entry from localStorage
      const savedEntry = localStorage.getItem(`journal_entry_${session.user.email}_${date}`);
      
      if (savedEntry) {
        try {
          const parsed = JSON.parse(savedEntry);
          setEntry({
            content: parsed.content || '',
            timestamp: parsed.timestamp || new Date().toISOString()
          });
        } catch (e) {
          console.error('Error parsing saved journal entry:', e);
          setEntry(null);
        }
      } else {
        setEntry(null);
      }
      
      setLoading(false);
    }
  }, [date, session]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 flex flex-col h-full">
        <div className="animate-pulse flex flex-col h-full">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="flex-grow bg-slate-100 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {formatDate(date, timezone, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h2>
        </div>
        
        <div className="flex-grow flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 italic">
            No journal entry for this date.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          {formatDate(date, timezone, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h2>
        
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm px-3 py-1 rounded-md bg-teal-500 text-white hover:bg-teal-600 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
      
      <div 
        className="prose dark:prose-invert max-w-none flex-grow bg-slate-50 dark:bg-slate-700 rounded-lg p-4 overflow-auto"
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
      
      {entry.timestamp && (
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Last updated: {new Date(entry.timestamp).toLocaleString(undefined, {
            timeZone: timezone
          })}
        </div>
      )}
    </div>
  );
};

export default JournalEntryViewer;