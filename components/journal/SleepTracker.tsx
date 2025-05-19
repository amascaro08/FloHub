import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  const [sleepData, setSleepData] = useState<{date: string, quality: string, hours: number}[]>([]);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const { data: session } = useSession();

  if (!session) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  
  const today = date || getCurrentDate(timezone);
  
  // Load saved sleep data from API
  useEffect(() => {
    const fetchSleepData = async () => {
      if (session?.user?.email) {
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
        
        // Fetch sleep data for the last 7 days for insights
        const sleepEntries: {date: string, quality: string, hours: number}[] = [];
        const currentDate = new Date();
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(currentDate);
          date.setDate(date.getDate() - i);
          const dateStr = formatDate(date.toISOString(), timezone, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
          
          try {
            const response = await axios.get(`/api/journal/sleep?date=${dateStr}`, {
              withCredentials: true
            });
            if (response.data && response.data.quality) {
              sleepEntries.push({
                date: dateStr,
                quality: response.data.quality,
                hours: response.data.hours || 0
              });
            } else {
              // Add placeholder for days without sleep data
              sleepEntries.push({
                date: dateStr,
                quality: '',
                hours: 0
              });
            }
          } catch (error) {
            // Add placeholder for days without sleep data
            sleepEntries.push({
              date: dateStr,
              quality: '',
              hours: 0
            });
          }
        }
        
        setSleepData(sleepEntries);
      }
    };
    
    if (session?.user?.email) {
      fetchSleepData();
    }
  }, [session, today, timezone]);
  
  // Save sleep data to API
  const handleSaveSleep = async (quality: string, hours: number) => {
    if (!session?.user?.email) return;
    
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
  
  // Helper function to get average sleep hours
  const getAverageSleepHours = () => {
    const validEntries = sleepData.filter(entry => entry.hours > 0);
    if (validEntries.length === 0) return 0;
    
    const totalHours = validEntries.reduce((sum, entry) => sum + entry.hours, 0);
    return (totalHours / validEntries.length).toFixed(1);
  };
  
  // Helper function to get sleep quality trend
  const getSleepQualityTrend = () => {
    const qualityMap: {[key: string]: number} = {
      'Excellent': 5,
      'Good': 4,
      'Fair': 3,
      'Poor': 2,
      'Terrible': 1
    };
    
    const validEntries = sleepData.filter(entry => entry.quality);
    if (validEntries.length < 3) return "Not enough data";
    
    const scores = validEntries.map(entry => qualityMap[entry.quality] || 0);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    if (avgScore > 4) return "Excellent sleep pattern";
    if (avgScore > 3) return "Good sleep pattern";
    if (avgScore > 2) return "Average sleep pattern";
    if (avgScore > 1) return "Poor sleep pattern";
    return "Very poor sleep pattern";
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-4 w-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Sleep Quality</h3>
        <button
          onClick={() => setShowInsights(!showInsights)}
          className="text-sm px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          {showInsights ? 'Hide Insights' : 'Show Insights'}
        </button>
        {sleepQuality && (
          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
            {sleepQuality} - {sleepHours} hours
          </span>
        )}
      </div>
      
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 justify-between">
          {sleepOptions.map((option) => (
            <button
              key={option.quality}
              onClick={() => handleSaveSleep(option.quality, sleepHours)}
              className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                sleepQuality === option.quality
                  ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500 scale-110 shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
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
      
      {/* Sleep Insights Section - Only shown when insights are toggled */}
      {showInsights && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sleep Insights</h3>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{getSleepQualityTrend()}</span>
          </div>
          
          {/* Simple sleep visualization */}
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Avg: {getAverageSleepHours()} hours</span>
            </div>
            
            <div className="flex items-end h-16 gap-1">
              {sleepData.map((data, index) => {
                const qualityColors: {[key: string]: string} = {
                  'Excellent': 'bg-green-500',
                  'Good': 'bg-teal-500',
                  'Fair': 'bg-yellow-500',
                  'Poor': 'bg-orange-500',
                  'Terrible': 'bg-red-500'
                };
                
                const height = data.hours ? (data.hours / 12) * 100 : 0;
                const color = data.quality ? qualityColors[data.quality] : 'bg-slate-300 dark:bg-slate-600';
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full rounded-t-sm transition-all ${color}`}
                      style={{ height: `${height}%` }}
                    ></div>
                    <div className="flex flex-col items-center mt-1">
                      <span className="text-xs">{data.hours || '-'}</span>
                      <span className="text-[0.6rem] text-slate-500">
                        {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Consistent sleep patterns are important for overall health and well-being.
          </p>
        </div>
      )}
    </div>
  );
};

export default SleepTracker;