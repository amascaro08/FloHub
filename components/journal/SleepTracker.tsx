import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCurrentDate, getDateStorageKey } from '@/lib/dateUtils';

interface SleepTrackerProps {
  onSave: (sleep: { quality: string; hours: number }) => void;
  timezone?: string;
  date?: string;
}

const SleepTracker: React.FC<SleepTrackerProps> = ({ 
  onSave, 
  timezone,
  date
}) => {
  const [sleepQuality, setSleepQuality] = useState<string>('');
  const [sleepHours, setSleepHours] = useState<number>(7);
  const { data: session } = useSession();
  
  const today = date || getCurrentDate(timezone);
  
  // Load saved sleep data
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      const key = getDateStorageKey('journal_sleep', session.user.email, timezone, today);
      const savedSleep = localStorage.getItem(key);
      
      if (savedSleep) {
        try {
          const parsed = JSON.parse(savedSleep);
          setSleepQuality(parsed.quality || '');
          setSleepHours(parsed.hours || 7);
        } catch (e) {
          console.error('Error parsing saved sleep data:', e);
        }
      }
    }
  }, [session, today, timezone]);
  
  // Save sleep data
  const handleSaveSleep = (quality: string, hours: number) => {
    if (!session?.user?.email) return;
    
    const sleepData = { quality, hours };
    
    // Save to localStorage
    const key = getDateStorageKey('journal_sleep', session.user.email, timezone, today);
    localStorage.setItem(key, JSON.stringify(sleepData));
    
    // Call the onSave callback
    onSave(sleepData);
    
    // Update state
    setSleepQuality(quality);
    setSleepHours(hours);
  };
  
  const sleepOptions = [
    { quality: 'Excellent', emoji: '😴', description: 'Slept deeply, woke refreshed' },
    { quality: 'Good', emoji: '🙂', description: 'Slept well, minor disruptions' },
    { quality: 'Fair', emoji: '😐', description: 'Average sleep, some tossing and turning' },
    { quality: 'Poor', emoji: '😕', description: 'Restless, woke up tired' },
    { quality: 'Terrible', emoji: '😫', description: 'Barely slept, exhausted' }
  ];
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-4 w-full">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Sleep Quality</h3>
      
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 justify-between">
          {sleepOptions.map((option) => (
            <button
              key={option.quality}
              onClick={() => handleSaveSleep(option.quality, sleepHours)}
              className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                sleepQuality === option.quality
                  ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500'
                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <span className="text-2xl mb-1">{option.emoji}</span>
              <span className="text-xs font-medium">{option.quality}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Hours of sleep: {sleepHours}
        </label>
        <input
          type="range"
          min="0"
          max="12"
          step="0.5"
          value={sleepHours}
          onChange={(e) => {
            const hours = parseFloat(e.target.value);
            setSleepHours(hours);
            if (sleepQuality) {
              handleSaveSleep(sleepQuality, hours);
            }
          }}
          className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span>0h</span>
          <span>6h</span>
          <span>12h</span>
        </div>
      </div>
      
      {sleepQuality && (
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          <p>
            {sleepQuality === 'Excellent' && 'You had an excellent night of sleep!'}
            {sleepQuality === 'Good' && 'You had a good night of sleep.'}
            {sleepQuality === 'Fair' && 'Your sleep was fair last night.'}
            {sleepQuality === 'Poor' && 'You had a poor night of sleep.'}
            {sleepQuality === 'Terrible' && 'You had a terrible night of sleep.'}
            {` (${sleepHours} hours)`}
          </p>
        </div>
      )}
    </div>
  );
};

export default SleepTracker;