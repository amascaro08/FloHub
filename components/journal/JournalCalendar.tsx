import React, { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { getCurrentDate, formatDate } from '@/lib/dateUtils';
import axios from 'axios';

interface JournalCalendarProps {
  onSelectDate: (date: string) => void;
  timezone?: string;
  refreshTrigger?: number;
}

interface DayData {
  date: string;
  mood?: {
    emoji: string;
    label: string;
    score: number;
  };
  hasEntry: boolean;
  activities?: string[];
  sleep?: {
    quality: string;
    hours: number;
  };
}

const JournalCalendar: React.FC<JournalCalendarProps> = (props) => {
  const { onSelectDate, timezone, refreshTrigger = 0 } = props;
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<DayData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate(timezone));
  const [isLoading, setIsLoading] = useState<boolean>(false);
 const { user, isLoading: isUserLoading } = useUser();
  const userData = user ? user : null;

  if (!user) {
    return <div>Loading...</div>; // Or any other fallback UI
  }

  // Generate calendar days for the current month using API data 
  useEffect(() => {
    const fetchCalendarData = async () => {
      if (!user?.primaryEmail) return;
      
      setIsLoading(true);
      
      try {
        const days: DayData[] = [];
        
        // Get all dates in the current month
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        // Get the first day of the month and the last day
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
        const firstDayOfWeek = firstDay.getDay();
        
        // Add padding days from previous month
        const prevMonth = new Date(year, month, 0);
        const prevMonthDays = prevMonth.getDate();
        
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
          const date = new Date(year, month - 1, prevMonthDays - i);
          const dateStr = formatDate(date.toISOString(), timezone, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
          
          days.push({
            date: dateStr,
            hasEntry: false,
            mood: undefined
          });
        }
        
        // Create basic calendar structure first
        const currentMonthDays: DayData[] = [];
        for (let day = 1; day <= lastDay.getDate(); day++) {
          const date = new Date(year, month, day);
          const dateStr = formatDate(date.toISOString(), timezone, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
          
          currentMonthDays.push({
            date: dateStr,
            hasEntry: false
          });
        }
        
        // Add current month days to the calendar
        days.push(...currentMonthDays);
        
        // Add padding days for next month to complete the grid
        const remainingDays = 42 - days.length; // 6 rows of 7 days
        for (let day = 1; day <= remainingDays; day++) {
          const date = new Date(year, month + 1, day);
          const dateStr = formatDate(date.toISOString(), timezone, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
          
          days.push({
            date: dateStr,
            hasEntry: false,
            mood: undefined
          });
        }
        
        // Set the basic calendar structure first so it renders quickly
        setCalendarDays(days);
        
        // Then fetch data for the current month days only
        const updatedDays = [...days];
        const startIdx = firstDayOfWeek;
        const endIdx = startIdx + lastDay.getDate();
        
        // Create a batch of dates to fetch at once
        const currentMonthDates: string[] = [];
        for (let i = startIdx; i < endIdx; i++) {
          currentMonthDates.push(updatedDays[i].date);
        }
        
        // Check localStorage cache first with improved cache management
        const cachedData: {[key: string]: any} = {};
        let cacheNeedsUpdate = false;
        
        if (typeof window !== 'undefined') {
          const cacheKey = `journal_calendar_${year}_${month}_${user.primaryEmail}`;
          const cachedJSON = localStorage.getItem(cacheKey);
          if (cachedJSON) {
            try {
              const cached = JSON.parse(cachedJSON);
              // Reduce cache time to 2 minutes for fresher data, but extend if no refreshTrigger
              const cacheTimeLimit = refreshTrigger > 0 ? 1000 : 2 * 60 * 1000; // 1 second if refresh triggered, else 2 minutes
              if (cached.timestamp && (Date.now() - cached.timestamp < cacheTimeLimit)) {
                Object.assign(cachedData, cached.data);
              } else {
                cacheNeedsUpdate = true;
              }
            } catch (e) {
              console.error('Error parsing cached calendar data:', e);
              cacheNeedsUpdate = true;
            }
          } else {
            cacheNeedsUpdate = true;
          }
        }
        
        // Filter out dates that are already in the cache (unless cache needs update)
        const datesToFetch = cacheNeedsUpdate ? currentMonthDates : currentMonthDates.filter(date => !cachedData[date]);
        
        if (datesToFetch.length > 0) {
          console.log(`JournalCalendar: Fetching data for ${datesToFetch.length} dates`);
          
          // Use batch APIs for better performance
          try {
            const [entriesResponse, moodsResponse, activitiesResponse, sleepResponse] = await Promise.allSettled([
              axios.post('/api/journal/entries/batch', { dates: datesToFetch }, { withCredentials: true }),
              axios.post('/api/journal/moods/batch', { dates: datesToFetch }, { withCredentials: true }),
              axios.post('/api/journal/activities/batch', { dates: datesToFetch }, { withCredentials: true }),
              axios.post('/api/journal/sleep/batch', { dates: datesToFetch }, { withCredentials: true })
            ]);
            
            // Process entries
            if (entriesResponse.status === 'fulfilled' && entriesResponse.value.data?.entries) {
              Object.entries(entriesResponse.value.data.entries).forEach(([date, hasContent]) => {
                const idx = days.findIndex(day => day.date === date);
                if (idx !== -1) {
                  updatedDays[idx].hasEntry = !!hasContent;
                  
                  // Update cache
                  if (!cachedData[date]) cachedData[date] = {};
                  cachedData[date].hasEntry = !!hasContent;
                }
              });
            }
            
            // Process moods
            if (moodsResponse.status === 'fulfilled' && moodsResponse.value.data?.moods) {
              Object.entries(moodsResponse.value.data.moods).forEach(([date, moodData]) => {
                const idx = days.findIndex(day => day.date === date);
                if (idx !== -1 && moodData) {
                  const moodObj = moodData as {emoji?: string; label?: string};
                  if (moodObj.emoji && moodObj.label) {
                    const moodScores: {[key: string]: number} = {
                      'Rad': 5, 'Good': 4, 'Meh': 3, 'Bad': 2, 'Awful': 1
                    };
                    
                    updatedDays[idx].mood = {
                      emoji: moodObj.emoji,
                      label: moodObj.label,
                      score: moodScores[moodObj.label] || 3
                    };
                    
                    // Update cache
                    if (!cachedData[date]) cachedData[date] = {};
                    cachedData[date].mood = updatedDays[idx].mood;
                  }
                }
              });
            }
            
            // Process activities
            if (activitiesResponse.status === 'fulfilled' && activitiesResponse.value.data?.activities) {
              Object.entries(activitiesResponse.value.data.activities).forEach(([date, activitiesList]) => {
                const idx = days.findIndex(day => day.date === date);
                if (idx !== -1 && Array.isArray(activitiesList) && activitiesList.length > 0) {
                  updatedDays[idx].activities = activitiesList;
                  
                  // Update cache
                  if (!cachedData[date]) cachedData[date] = {};
                  cachedData[date].activities = activitiesList;
                }
              });
            }
            
            // Process sleep data using batch API
            if (sleepResponse.status === 'fulfilled' && sleepResponse.value.data?.sleep) {
              Object.entries(sleepResponse.value.data.sleep).forEach(([date, sleepData]) => {
                const idx = days.findIndex(day => day.date === date);
                if (idx !== -1 && sleepData) {
                  const sleepObj = sleepData as {quality?: string; hours?: number};
                  if (sleepObj.quality && sleepObj.hours) {
                    updatedDays[idx].sleep = {
                      quality: sleepObj.quality,
                      hours: sleepObj.hours
                    };
                    
                    // Update cache
                    if (!cachedData[date]) cachedData[date] = {};
                    cachedData[date].sleep = updatedDays[idx].sleep;
                  }
                }
              });
            }
          } catch (error) {
            console.error('Error fetching batch calendar data:', error);
          }
        } else {
          console.log('JournalCalendar: Using cached data');
          // Use cached data for all dates
          for (let i = startIdx; i < endIdx; i++) {
            const dateStr = updatedDays[i].date;
            if (cachedData[dateStr]) {
              if (cachedData[dateStr].hasEntry) updatedDays[i].hasEntry = true;
              if (cachedData[dateStr].mood) updatedDays[i].mood = cachedData[dateStr].mood;
              if (cachedData[dateStr].activities) updatedDays[i].activities = cachedData[dateStr].activities;
              if (cachedData[dateStr].sleep) updatedDays[i].sleep = cachedData[dateStr].sleep;
            }
          }
        }
        
        // Update the calendar with the fetched data
        setCalendarDays(updatedDays);
        
        // Save to cache
        if (typeof window !== 'undefined') {
          const cacheKey = `journal_calendar_${year}_${month}_${user.primaryEmail}`;
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: cachedData
          }));
        }
      } catch (error) {
        console.error("Error generating calendar:", error);
        // Set a minimal calendar with just the current month's days
        const days: DayData[] = [];
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const lastDay = new Date(year, month + 1, 0);
        
        for (let day = 1; day <= lastDay.getDate(); day++) {
          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split('T')[0];
          days.push({
            date: dateStr,
            hasEntry: false,
            mood: undefined
          });
        }
        
        setCalendarDays(days);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user?.primaryEmail) {
      fetchCalendarData();
    }
  }, [user, currentMonth, timezone, refreshTrigger]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    onSelectDate(date);
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

  // Get mood color based on mood score
  const getMoodColor = (score?: number) => {
    if (!score) return 'bg-slate-100 dark:bg-slate-700';
    
    const colors = [
      'bg-red-200 dark:bg-red-900 border-red-300 dark:border-red-800', // Awful
      'bg-orange-200 dark:bg-orange-900 border-orange-300 dark:border-orange-800', // Bad
      'bg-yellow-200 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-800', // Meh
      'bg-green-200 dark:bg-green-900 border-green-300 dark:border-green-800', // Good
      'bg-purple-200 dark:bg-purple-900 border-purple-300 dark:border-purple-800' // Rad
    ];
    
    return colors[score - 1] || 'bg-slate-100 dark:bg-slate-700';
  };

  // Check if a date is in the current month
  const isCurrentMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
  };

  // Check if a date is today
  const isToday = (dateStr: string) => {
    const today = getCurrentDate(timezone);
    return dateStr === today;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-4 sm:p-6 w-full h-full overflow-hidden">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Calendar View</h2>
        {isLoading && (
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-teal-500 rounded-full border-t-transparent mr-2"></div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Loading calendar...</span>
          </div>
        )}
        
        <div className="flex items-center space-x-2 flex-shrink-0">
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
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-4 w-full overflow-x-auto" style={{ gridTemplateRows: 'auto repeat(6, minmax(80px, 1fr))', minHeight: '480px' }}>
        {/* Weekday headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 p-1">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDateSelect(day.date)}
            className={`
              relative flex flex-col rounded-lg sm:rounded-xl transition-all p-2 sm:p-3
              h-full w-full border-2 border-transparent
              ${isCurrentMonth(day.date) ? 'opacity-100' : 'opacity-40'}
              ${selectedDate === day.date ? 'ring-2 ring-black dark:ring-white' : ''}
              ${getMoodColor(day.mood?.score)}
              hover:brightness-95 dark:hover:brightness-110
            `}
          >
            {/* Date number in top-left */}
            <div className="absolute top-1 sm:top-2 left-1 sm:left-2">
              <span className={`text-sm sm:text-base font-medium ${isToday(day.date) ? 'text-teal-600 dark:text-teal-400' : ''}`}>
                {new Date(day.date).getDate()}
              </span>
            </div>
            
            {/* Sleep hours in top-right */}
            {day.sleep && day.sleep.hours > 0 && (
              <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded text-xs text-blue-800 dark:text-blue-200">
                💤{day.sleep.hours}h
              </div>
            )}
            
            {/* Mood emoji in center */}
            <div className="flex-1 flex items-center justify-center my-1">
              {day.mood && (
                <span className="text-xl sm:text-3xl">{day.mood.emoji}</span>
              )}
              
              {/* Entry indicator if no mood */}
              {day.hasEntry && !day.mood && (
                <span className="text-xl sm:text-3xl">📝</span>
              )}
            </div>
            
            {/* Activities at bottom */}
            {day.activities && day.activities.length > 0 && (
              <div className="w-full border-t border-black/10 dark:border-white/10 pt-1">
                <div className="flex flex-wrap justify-center gap-1">
                  {day.activities.slice(0, 4).map((activity, idx) => {
                    // Get icon for activity
                    const activityIcons: {[key: string]: string} = {
                      'Work': '💼', 'Exercise': '🏋️', 'Social': '👥', 'Reading': '📚',
                      'Gaming': '🎮', 'Family': '👨‍👩‍👧‍👦', 'Shopping': '🛒', 'Cooking': '🍳',
                      'Cleaning': '🧹', 'TV': '📺', 'Movies': '🎬', 'Music': '🎵',
                      'Outdoors': '🌳', 'Travel': '✈️', 'Relaxing': '🛌', 'Hobbies': '🎨',
                      'Study': '📝', 'Meditation': '🧘', 'Art': '🖼️', 'Writing': '✍️'
                    };
                    return (
                      <span key={idx} className="text-sm">
                        {activityIcons[activity] || '📌'}
                      </span>
                    );
                  })}
                  {day.activities.length > 4 && (
                    <span className="text-xs text-gray-500">+{day.activities.length - 4}</span>
                  )}
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        <p>Click on a day to view or edit that entry</p>
      </div>
    </div>
  );
};

export default JournalCalendar;