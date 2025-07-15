import { useState, useEffect } from 'react';
import { useUser } from "@stackframe/stack";
import { getCurrentDate, formatDate, isToday, getDateStorageKey } from '@/lib/dateUtils';
import axios from 'axios';

interface JournalTimelineProps {
  onSelectDate: (date: string) => void;
  timezone?: string;
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
  activities?: string[];
  sleep?: {
    quality: string;
    hours: number;
  };
}

const JournalTimeline: React.FC<JournalTimelineProps> = ({
  onSelectDate,
  timezone,
  autoScrollToLatest = false
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate(timezone));
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [hasEntries, setHasEntries] = useState<{[key: string]: boolean}>({});
 const user = useUser();
  const userData = user ? user : null;

  if (!user) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Generate dates for the timeline for the current month
  useEffect(() => {
    if (user?.primaryEmail) {
      const fetchTimelineData = async () => {
        const entriesMap: {[key: string]: boolean} = {};
        
        // Get all dates in the current month
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Get the last 7 days of the previous month (if we're not in the first week)
        const today = new Date();
        const showRecent = month === today.getMonth() && year === today.getFullYear();
        
        // Check localStorage cache first
        const cacheKey = `journal_timeline_${year}_${month}_${user.primaryEmail}`;
        let cachedData: {entries: JournalEntry[], hasEntries: {[key: string]: boolean}} | null = null;
        
        if (typeof window !== 'undefined') {
          const cachedJSON = localStorage.getItem(cacheKey);
          if (cachedJSON) {
            try {
              const cached = JSON.parse(cachedJSON);
              if (cached.timestamp && (Date.now() - cached.timestamp < 5 * 60 * 1000)) { // 5 minute cache
                cachedData = cached.data;
                if (cachedData) {
                  setEntries(cachedData.entries);
                  setHasEntries(cachedData.hasEntries);
                }
                
                // Auto-scroll to the latest date if enabled
                if (autoScrollToLatest && showRecent) {
                  setTimeout(() => {
                    const timelineContainer = document.getElementById('timeline-entries');
                    if (timelineContainer) {
                      timelineContainer.scrollLeft = timelineContainer.scrollWidth;
                    }
                  }, 100);
                }
                
                return; // Use cached data and exit
              }
            } catch (e) {
              console.error('Error parsing cached timeline data:', e);
            }
          }
        }
        
        let timelineEntries: JournalEntry[] = [];
        
        if (showRecent) {
          // Show the last 14 days if we're in the current month
          const recentDates: string[] = [];
          const recentEntries: JournalEntry[] = [];
          
          // Prepare dates array
          for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            const dateStr = formatDate(date.toISOString(), timezone, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
            
            recentDates.push(dateStr);
            recentEntries.push({ date: dateStr });
          }
          
          // Batch fetch data for all dates
          try {
            // Fetch entries
            const entriesResponse = await axios.post('/api/journal/entries/batch', {
              dates: recentDates
            }, { withCredentials: true });
            
            if (entriesResponse.data && entriesResponse.data.entries) {
              Object.entries(entriesResponse.data.entries).forEach(([date, hasContent]) => {
                const idx = recentEntries.findIndex(entry => entry.date === date);
                if (idx !== -1 && hasContent) {
                  entriesMap[date] = true;
                }
              });
            }
            
            // Fetch moods
            const moodsResponse = await axios.post('/api/journal/moods/batch', {
              dates: recentDates
            }, { withCredentials: true });
            
            if (moodsResponse.data && moodsResponse.data.moods) {
              Object.entries(moodsResponse.data.moods).forEach(([date, moodData]) => {
                const idx = recentEntries.findIndex(entry => entry.date === date);
                if (idx !== -1 && moodData) {
                  const moodObj = moodData as {emoji?: string; label?: string; tags?: string[]};
                  if (moodObj.emoji && moodObj.label) {
                    recentEntries[idx].mood = {
                      emoji: moodObj.emoji,
                      label: moodObj.label,
                      tags: moodObj.tags || []
                    };
                  }
                }
              });
            }
            
            // Fetch activities
            try {
              const activitiesResponse = await axios.post('/api/journal/activities/batch', {
                dates: recentDates
              }, { withCredentials: true });
              
              if (activitiesResponse.data && activitiesResponse.data.activities) {
                Object.entries(activitiesResponse.data.activities).forEach(([date, activitiesList]) => {
                  const idx = recentEntries.findIndex(entry => entry.date === date);
                  if (idx !== -1 && Array.isArray(activitiesList) && activitiesList.length > 0) {
                    recentEntries[idx].activities = activitiesList;
                  }
                });
              }
            } catch (error) {
              console.error('Error fetching batch activities for timeline:', error);
            }
            
            // Fetch sleep data
            try {
              const sleepPromises = recentDates.map(dateStr =>
                axios.get(`/api/journal/sleep?date=${dateStr}`, { withCredentials: true })
                  .then(response => {
                    if (response.data && response.data.quality && response.data.hours) {
                      const idx = recentEntries.findIndex(entry => entry.date === dateStr);
                      if (idx !== -1) {
                        recentEntries[idx].sleep = {
                          quality: response.data.quality,
                          hours: response.data.hours
                        };
                      }
                    }
                  })
                  .catch(error => {
                    console.error(`Error fetching sleep for ${dateStr}:`, error);
                  })
              );
              
              await Promise.allSettled(sleepPromises);
            } catch (error) {
              console.error('Error fetching sleep data for timeline:', error);
            }
            
            // Fetch content for entries that exist
            for (let i = 0; i < recentEntries.length; i++) {
              const dateStr = recentEntries[i].date;
              if (entriesMap[dateStr]) {
                try {
                  const entryResponse = await axios.get(`/api/journal/entry?date=${dateStr}`, {
                    withCredentials: true
                  });
                  if (entryResponse.data && entryResponse.data.content) {
                    recentEntries[i].content = entryResponse.data.content;
                  }
                } catch (error) {
                  console.error(`Error fetching entry content for ${dateStr}:`, error);
                }
              }
            }
          } catch (error) {
            console.error('Error fetching batch data for timeline:', error);
          }
          
          timelineEntries = recentEntries;
        } else {
          // For past months, scan the entire month for entries
          const monthDates: string[] = [];
          const monthEntries: JournalEntry[] = [];
          
          // Prepare dates array
          for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            
            const dateStr = formatDate(date.toISOString(), timezone, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
            
            monthDates.push(dateStr);
            monthEntries.push({ date: dateStr });
          }
          
          // Batch fetch data for all dates
          try {
            // Fetch entries
            const entriesResponse = await axios.post('/api/journal/entries/batch', {
              dates: monthDates
            }, { withCredentials: true });
            
            if (entriesResponse.data && entriesResponse.data.entries) {
              Object.entries(entriesResponse.data.entries).forEach(([date, hasContent]) => {
                const idx = monthEntries.findIndex(entry => entry.date === date);
                if (idx !== -1 && hasContent) {
                  entriesMap[date] = true;
                }
              });
            }
            
            // Fetch moods
            const moodsResponse = await axios.post('/api/journal/moods/batch', {
              dates: monthDates
            }, { withCredentials: true });
            
            if (moodsResponse.data && moodsResponse.data.moods) {
              Object.entries(moodsResponse.data.moods).forEach(([date, moodData]) => {
                const idx = monthEntries.findIndex(entry => entry.date === date);
                if (idx !== -1 && moodData) {
                  const moodObj = moodData as {emoji?: string; label?: string; tags?: string[]};
                  if (moodObj.emoji && moodObj.label) {
                    monthEntries[idx].mood = {
                      emoji: moodObj.emoji,
                      label: moodObj.label,
                      tags: moodObj.tags || []
                    };
                  }
                }
              });
            }
            
            // Fetch activities
            try {
              const activitiesResponse = await axios.post('/api/journal/activities/batch', {
                dates: monthDates
              }, { withCredentials: true });
              
              if (activitiesResponse.data && activitiesResponse.data.activities) {
                Object.entries(activitiesResponse.data.activities).forEach(([date, activitiesList]) => {
                  const idx = monthEntries.findIndex(entry => entry.date === date);
                  if (idx !== -1 && Array.isArray(activitiesList) && activitiesList.length > 0) {
                    monthEntries[idx].activities = activitiesList;
                  }
                });
              }
            } catch (error) {
              console.error('Error fetching batch activities for timeline:', error);
            }
            
            // Fetch sleep data
            try {
              const sleepPromises = monthDates.map(dateStr =>
                axios.get(`/api/journal/sleep?date=${dateStr}`, { withCredentials: true })
                  .then(response => {
                    if (response.data && response.data.quality && response.data.hours) {
                      const idx = monthEntries.findIndex(entry => entry.date === dateStr);
                      if (idx !== -1) {
                        monthEntries[idx].sleep = {
                          quality: response.data.quality,
                          hours: response.data.hours
                        };
                      }
                    }
                  })
                  .catch(error => {
                    console.error(`Error fetching sleep for ${dateStr}:`, error);
                  })
              );
              
              await Promise.allSettled(sleepPromises);
            } catch (error) {
              console.error('Error fetching sleep data for timeline:', error);
            }
            
            // Fetch content for entries that exist
            for (let i = 0; i < monthEntries.length; i++) {
              const dateStr = monthEntries[i].date;
              if (entriesMap[dateStr]) {
                try {
                  const entryResponse = await axios.get(`/api/journal/entry?date=${dateStr}`, {
                    withCredentials: true
                  });
                  if (entryResponse.data && entryResponse.data.content) {
                    monthEntries[i].content = entryResponse.data.content;
                  }
                } catch (error) {
                  console.error(`Error fetching entry content for ${dateStr}:`, error);
                }
              }
            }
          } catch (error) {
            console.error('Error fetching batch data for timeline:', error);
          }
          
          timelineEntries = monthEntries;
        }
        
        // Update state
        setEntries(timelineEntries);
        setHasEntries(entriesMap);
        
        // Save to cache
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: {
              entries: timelineEntries,
              hasEntries: entriesMap
            }
          }));
        }
        
        // Auto-scroll to the latest date if enabled
        if (autoScrollToLatest && showRecent) {
          setTimeout(() => {
            const timelineContainer = document.getElementById('timeline-entries');
            if (timelineContainer) {
              timelineContainer.scrollLeft = timelineContainer.scrollWidth;
            }
          }, 100);
        }
      };
      
      fetchTimelineData();
      
    }
  }, [user, currentMonth, timezone, refreshTrigger, autoScrollToLatest]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    onSelectDate(date);
  };

  const refreshTimeline = () => {
    setRefreshTrigger((prev: number) => prev + 1);
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
        <div className="flex space-x-1 sm:space-x-2 md:space-x-3 w-full" id="timeline-entries">
          {entries.map((entry) => {
            // Determine background color based on mood
            let bgColorClass = 'bg-slate-100 dark:bg-slate-700';
            if (entry.mood?.label) {
              const moodColors: {[key: string]: string} = {
                'Rad': 'bg-purple-200 dark:bg-purple-900',
                'Good': 'bg-green-200 dark:bg-green-900',
                'Meh': 'bg-yellow-200 dark:bg-yellow-900',
                'Bad': 'bg-orange-200 dark:bg-orange-900',
                'Awful': 'bg-red-200 dark:bg-red-900'
              };
              bgColorClass = moodColors[entry.mood.label] || bgColorClass;
            }
            
            return (
              <button
                key={entry.date}
                onClick={() => handleDateSelect(entry.date)}
                className={`relative flex flex-col p-1 sm:p-2 rounded-xl transition-all min-w-[60px] sm:min-w-[70px] border-2 border-transparent ${
                  selectedDate === entry.date
                    ? 'ring-2 ring-black dark:ring-white shadow-md'
                    : ''
                } ${bgColorClass}`}
              >
                {/* Date at top */}
                <span className={`text-[0.6rem] sm:text-xs font-medium truncate w-full text-center mb-0.5 sm:mb-1 ${
                  isToday(entry.date, timezone)
                    ? 'text-teal-600 dark:text-teal-400'
                    : hasEntry(entry.date)
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-500 dark:text-slate-500'
                }`}>
                  {formatDate(entry.date, timezone)}
                  {isToday(entry.date, timezone) && ' (Today)'}
                </span>
                
                {/* Sleep hours in top-right if available */}
                {entry.sleep && entry.sleep.hours > 0 && (
                  <div className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1 bg-blue-200 dark:bg-blue-800 px-0.5 sm:px-1 rounded text-[0.5rem] sm:text-[0.6rem] text-blue-800 dark:text-blue-200 max-w-[40%] truncate">
                    💤{entry.sleep.hours}h
                  </div>
                )}
                
                {/* Mood emoji in center */}
                <div className="flex-grow flex items-center justify-center py-1 sm:py-2">
                  <span className="text-xl sm:text-2xl">
                    {entry.mood?.emoji || (hasEntry(entry.date) ? '📝' : '·')}
                  </span>
                </div>
                
                {/* Activities at bottom if available */}
                {entry.activities && entry.activities.length > 0 && (
                  <div className="w-full mt-auto border-t border-black/10 dark:border-white/10 pt-0.5 sm:pt-1">
                    <div className="flex flex-wrap justify-center gap-[1px] sm:gap-[2px]">
                      {entry.activities.slice(0, 3).map((activity, idx) => {
                        // Get icon for activity
                        const activityIcons: {[key: string]: string} = {
                          'Work': '💼', 'Exercise': '🏋️', 'Social': '👥', 'Reading': '📚',
                          'Gaming': '🎮', 'Family': '👨‍👩‍👧‍👦', 'Shopping': '🛒', 'Cooking': '🍳',
                          'Cleaning': '🧹', 'TV': '📺', 'Movies': '🎬', 'Music': '🎵',
                          'Outdoors': '🌳', 'Travel': '✈️', 'Relaxing': '🛌', 'Hobbies': '🎨',
                          'Study': '📝', 'Meditation': '🧘', 'Art': '🖼️', 'Writing': '✍️'
                        };
                        return (
                          <span key={idx} className="text-[0.6rem] sm:text-xs">
                            {activityIcons[activity] || '📌'}
                          </span>
                        );
                      })}
                      {entry.activities.length > 3 && (
                        <span className="text-[0.6rem] sm:text-xs">+{entry.activities.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
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