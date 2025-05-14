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
  const { data: session } = useSession();

  // Generate dates for the timeline (last 14 days)
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      const dates: JournalEntry[] = [];
      const today = new Date();
      
      for (let i = 13; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Try to load mood for this date
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
          } catch (e) {
            console.error('Error parsing saved entry:', e);
          }
        }
        
        dates.push(entry);
      }
      
      setEntries(dates);
    }
  }, [session]);

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Journal Timeline</h2>
      
      <div className="overflow-x-auto pb-2">
        <div className="flex space-x-3 min-w-max">
          {entries.map((entry) => (
            <button
              key={entry.date}
              onClick={() => handleDateSelect(entry.date)}
              className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                selectedDate === entry.date 
                  ? 'bg-teal-100 dark:bg-teal-900 shadow-md' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-2xl mb-1">
                {entry.mood?.emoji || '📝'}
              </span>
              <span className={`text-xs font-medium ${
                isToday(entry.date) 
                  ? 'text-teal-600 dark:text-teal-400' 
                  : 'text-slate-600 dark:text-slate-400'
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