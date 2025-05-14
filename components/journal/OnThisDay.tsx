import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface OnThisDayProps {
  onViewEntry?: (date: string) => void;
}

interface HistoricalEntry {
  date: string;
  content: string;
  timestamp: string;
}

const OnThisDay: React.FC<OnThisDayProps> = ({ onViewEntry }) => {
  const [historicalEntry, setHistoricalEntry] = useState<HistoricalEntry | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      const today = new Date();
      const lastYear = new Date(today);
      lastYear.setFullYear(today.getFullYear() - 1);
      
      // Format as YYYY-MM-DD, but keep the current year's date
      const lastYearDate = `${lastYear.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      
      // Try to load entry from this day last year
      const savedEntry = localStorage.getItem(`journal_entry_${session.user.email}_${lastYearDate}`);
      
      if (savedEntry) {
        try {
          const parsed = JSON.parse(savedEntry);
          setHistoricalEntry({
            date: lastYearDate,
            content: parsed.content,
            timestamp: parsed.timestamp
          });
        } catch (e) {
          console.error('Error parsing historical entry:', e);
        }
      }
    }
  }, [session]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleViewEntry = () => {
    if (historicalEntry && onViewEntry) {
      onViewEntry(historicalEntry.date);
    }
  };

  // Get a preview of the content (first 150 characters)
  const getContentPreview = (content: string) => {
    if (content.length <= 150) return content;
    return content.substring(0, 150) + '...';
  };

  if (!historicalEntry) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">On This Day</h2>
        <p className="text-slate-600 dark:text-slate-400 italic">
          No journal entries from this day in previous years.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">On This Day</h2>
      
      <div className="mb-3">
        <span className="text-teal-600 dark:text-teal-400 font-medium">
          {formatDate(historicalEntry.date)}
        </span>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
          {getContentPreview(historicalEntry.content)}
        </p>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(historicalEntry.timestamp).toLocaleTimeString()}
        </span>
        
        {onViewEntry && (
          <button
            onClick={handleViewEntry}
            className="text-sm px-3 py-1 rounded-md bg-teal-500 text-white hover:bg-teal-600 transition-colors"
          >
            View Full Entry
          </button>
        )}
      </div>
    </div>
  );
};

export default OnThisDay;