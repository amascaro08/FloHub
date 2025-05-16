import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCurrentDate, formatDate, isToday, getDateStorageKey } from '@/lib/dateUtils';

interface JournalTimelineProps {
  onSelectDate: (date: string) => void;
  timezone?: string;
  refreshTrigger?: number; // A value that changes to trigger a refresh
  autoScrollToLatest?: boolean; // Whether to auto-scroll to the latest date
}

interface JournalEntry {
  date: string;
  mood?: {
    emoji: string;
    label: string;
    tags: string[];
  };
  content?: string;
}

const JournalTimeline: React.FC<JournalTimelineProps> = ({
  onSelectDate,
  timezone,
  refreshTrigger = 0,
  autoScrollToLatest = false
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate(timezone));
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [hasEntries, setHasEntries] = useState<{[key: string]: boolean}>({});
  const { data: session } = useSession();

  // Generate dates for the timeline for the current month
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      const dates: JournalEntry[] = [];
      const entriesMap: {[key: string]: boolean} = {};
      
      // Get all dates in the current month
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Get the last 7 days of the previous month (if we're not in the first week)
      const today = new Date();
      const showRecent = month === today.getMonth() && year === today.getFullYear();
      
      if (showRecent) {
        // Show the last 14 days if we're in the current month
        const recentDates = [];
        for (let i = 13; i >= 0; i--) {
          // Create date object for the current timezone
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          // Format the date in YYYY-MM-DD format for the user's timezone
          const dateStr = formatDate(date.toISOString(), timezone, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
          
          // Try to load mood and entry for this date
          const moodKey = getDateStorageKey('journal_mood', session.user.email, timezone, dateStr);
          const entryKey = getDateStorageKey('journal_entry', session.user.email, timezone, dateStr);
          
          const savedMood = localStorage.getItem(moodKey);
          const savedEntry = localStorage.getItem(entryKey);
          
          const entry: JournalEntry = { date: dateStr };
          
          if (savedMood) {
            try {
              entry.mood = JSON.parse(savedMood);
            } catch (e) {
              console.error('Error parsing saved mood:', e);
            }
          }
          
          if (savedEntry) {
            try {
              const parsed = JSON.parse(savedEntry);
              entry.content = parsed.content;
              entriesMap[dateStr] = true;
            } catch (e) {
              console.error('Error parsing saved entry:', e);
            }
          }
          
          recentDates.push(entry);
        }
        
        setEntries(recentDates);
      } else {
        // For past months, scan the entire month for entries
        for (let day = 1; day <= lastDay.getDate(); day++) {
          // Create date object for the current timezone
          const date = new Date(year, month, day);
          
          // Format the date in YYYY-MM-DD format for the user's timezone
          const dateStr = formatDate(date.toISOString(), timezone, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
          
          // Try to load mood and entry for this date
          const moodKey = getDateStorageKey('journal_mood', session.user.email, timezone, dateStr);
          const entryKey = getDateStorageKey('journal_entry', session.user.email, timezone, dateStr);
          
          const savedMood = localStorage.getItem(moodKey);
          const savedEntry = localStorage.getItem(entryKey);
          
          const entry: JournalEntry = { date: dateStr };
          
          if (savedMood) {
            try {
              entry.mood = JSON.parse(savedMood);
            } catch (e) {
              console.error('Error parsing saved mood:', e);
            }
          }
          
          if (savedEntry) {
            try {
              const parsed = JSON.parse(savedEntry);
              entry.content = parsed.content;
              entriesMap[dateStr] = true;
            } catch (e) {
              console.error('Error parsing saved entry:', e);
            }
          }
          
          dates.push(entry);
        }
        
        setEntries(dates);
      }
      
      setHasEntries(entriesMap);
      
      // Auto-scroll to the latest date if enabled
      if (autoScrollToLatest && showRecent) {
        setTimeout(() => {
          const timelineContainer = document.getElementById('timeline-entries');
          if (timelineContainer) {
            timelineContainer.scrollLeft = timelineContainer.scrollWidth;
          }
        }, 100);
      }
    }
  }, [session, currentMonth, timezone, refreshTrigger, autoScrollToLatest]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    onSelectDate(date);
  };

  // Use our utility function for formatting dates
  const formatDateDisplay = (dateStr: string) => {
    return formatDate(dateStr, timezone);
  };

  // Use our utility function to check if a date is today
  const isTodayDate = (dateStr: string) => {
    return isToday(dateStr, timezone);
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };

  // Navigate to current month
  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  // Format month name
  const formatMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Check if a date has an entry
  const hasEntry = (dateStr: string) => {
    return hasEntries[dateStr] || false;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-4 sm:p-6 max-w-full">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Journal Timeline</h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Previous Month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          <span className="text-sm font-medium whitespace-nowrap">
            {formatMonthName(currentMonth)}
          </span>
          
          <button
            onClick={goToNextMonth}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Next Month"
            disabled={
              currentMonth.getMonth() === new Date().getMonth() &&
              currentMonth.getFullYear() === new Date().getFullYear()
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          {(currentMonth.getMonth() !== new Date().getMonth() ||
            currentMonth.getFullYear() !== new Date().getFullYear()) && (
            <button
              onClick={goToCurrentMonth}
              className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
              title="Go to Current Month"
            >
              Today
            </button>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto pb-2 w-full">
        <div className="flex space-x-3 min-w-max max-w-full" id="timeline-entries">
          {entries.map((entry) => (
            <button
              key={entry.date}
              onClick={() => handleDateSelect(entry.date)}
              className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                selectedDate === entry.date
                  ? 'bg-teal-100 dark:bg-teal-900 shadow-md'
                  : hasEntry(entry.date)
                    ? 'bg-slate-50 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-2xl mb-1">
                {entry.mood?.emoji || (hasEntry(entry.date) ? '📝' : '·')}
              </span>
              <span className={`text-xs font-medium ${
                isTodayDate(entry.date)
                  ? 'text-teal-600 dark:text-teal-400'
                  : hasEntry(entry.date)
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-slate-500 dark:text-slate-500'
              }`}>
                {formatDateDisplay(entry.date)}
                {isTodayDate(entry.date) && ' (Today)'}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 break-words">
        {selectedDate && (
          <p>
            Selected: <span className="font-medium">{formatDate(selectedDate, timezone, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default JournalTimeline;