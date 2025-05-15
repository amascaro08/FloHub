import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface JournalTimelineProps {
  onSelectDate: (date: string) => void;
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

const JournalTimeline: React.FC<JournalTimelineProps> = ({ onSelectDate }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          // Try to load mood and entry for this date
          const savedMood = localStorage.getItem(`journal_mood_${session.user.email}_${dateStr}`);
          const savedEntry = localStorage.getItem(`journal_entry_${session.user.email}_${dateStr}`);
          
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
          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split('T')[0];
          
          // Try to load mood and entry for this date
          const savedMood = localStorage.getItem(`journal_mood_${session.user.email}_${dateStr}`);
          const savedEntry = localStorage.getItem(`journal_entry_${session.user.email}_${dateStr}`);
          
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
    }
  }, [session, currentMonth]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    onSelectDate(date);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Journal Timeline</h2>
        
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
          
          <span className="text-sm font-medium">
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
      
      <div className="overflow-x-auto pb-2">
        <div className="flex space-x-3 min-w-max">
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
                isToday(entry.date)
                  ? 'text-teal-600 dark:text-teal-400'
                  : hasEntry(entry.date)
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-slate-500 dark:text-slate-500'
              }`}>
                {formatDate(entry.date)}
                {isToday(entry.date) && ' (Today)'}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        {selectedDate && (
          <p>
            Selected: <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en-US', {
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