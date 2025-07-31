import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { getCurrentDate, getDateStorageKey, formatDate } from '@/lib/dateUtils';
import axios from 'axios';

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
 const { user, isLoading } = useUser();
  const userData = user ? user : null;

  if (!user) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  
  const today = date || getCurrentDate(timezone);
  
  // Load saved sleep data from API
  useEffect(() => {
    const fetchSleepData = async () => {
      if (user?.primaryEmail) {
        try {
          const response = await axios.get(`/api/journal/sleep?date=${today}`, {
            withCredentials: true
          });
          if (response.data) {
            // Only set quality if it's not empty
            if (response.data.quality) {
              setSleepQuality(response.data.quality);
            }
            setSleepHours(response.data.hours || 7);
          }
        } catch (error) {
          console.error('Error fetching sleep data:', error);
          // Default state is already set in useState
        }
        

      }
    };
    
    if (user?.primaryEmail) {
      fetchSleepData();
    }
  }, [user, today, timezone]);
  
  // Save sleep data to API
  const handleSaveSleep = async (quality: string, hours: number) => {
    if (!user?.primaryEmail) return;
    
    const sleepData = { quality, hours };
    
    try {
      // Save to API
      await axios.post('/api/journal/sleep', {
        date: today,
        quality,
        hours
      }, {
        withCredentials: true
      });
      
      // Call the onSave callback
      onSave(sleepData);
      
      // Update state
      setSleepQuality(quality);
      setSleepHours(hours);
    } catch (error) {
      console.error('Error saving sleep data:', error);
    }
  };
  
  const sleepOptions = [
    { quality: 'Excellent', emoji: '😴', description: 'Slept deeply, woke refreshed' },
    { quality: 'Good', emoji: '🙂', description: 'Slept well, minor disruptions' },
    { quality: 'Fair', emoji: '😐', description: 'Average sleep, some tossing and turning' },
    { quality: 'Poor', emoji: '😕', description: 'Restless, woke up tired' },
    { quality: 'Terrible', emoji: '😫', description: 'Barely slept, exhausted' }
  ];
  

  
  return (
    <div className="w-full">
      <div className="mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sleep Quality</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {sleepQuality ? `${sleepQuality} - ${sleepHours} hours` : 'Track your sleep quality'}
          </p>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 justify-between">
          {sleepOptions.map((option) => (
            <button
              key={option.quality}
              onClick={() => handleSaveSleep(option.quality, sleepHours)}
              className={`flex flex-col items-center p-3 rounded-lg sleep-button ${
                sleepQuality === option.quality
                  ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500 selected shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={option.description}
            >
              <span className="text-2xl mb-1">{option.emoji}</span>
              <span className="text-xs font-medium">{option.quality}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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
          onMouseUp={(e) => {
            const hours = parseFloat((e.target as HTMLInputElement).value);
            if (sleepQuality) {
              handleSaveSleep(sleepQuality, hours);
            }
          }}
          onTouchEnd={(e) => {
            const hours = parseFloat((e.target as HTMLInputElement).value);
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
      
      {sleepQuality ? (
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
      ) : (
        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400 italic">
          <p>Select your sleep quality above</p>
        </div>
      )}
      

    </div>
  );
};

export default SleepTracker;