import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCurrentDate, formatDate, getDateStorageKey } from '@/lib/dateUtils';
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
}

const JournalCalendar: React.FC<JournalCalendarProps> = ({
  onSelectDate,
  timezone,
  refreshTrigger = 0
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<DayData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate(timezone));
  const { data: session } = useSession();

  // Generate calendar days for the current month using API data
  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        if (session?.user?.email) {
          // Set a loading state
          setCalendarDays([]);
          
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
          
          // Batch the API calls for better performance
          const promises = [];
          
          for (let i = startIdx; i < endIdx; i++) {
            const dateStr = updatedDays[i].date;
            
            // Create promises for all API calls
            promises.push(
              axios.get(`/api/journal/entry?date=${dateStr}`)
                .then(response => {
                  if (response.data && response.data.content && response.data.content.trim() !== '') {
                    updatedDays[i].hasEntry = true;
                  }
                })
                .catch(() => {})
            );
            
            promises.push(
              axios.get(`/api/journal/mood?date=${dateStr}`)
                .then(response => {
                  if (response.data && response.data.emoji && response.data.label) {
                    const moodScores: {[key: string]: number} = {
                      'Rad': 5,
                      'Good': 4,
                      'Meh': 3,
                      'Bad': 2,
                      'Awful': 1
                    };
                    
                    updatedDays[i].mood = {
                      emoji: response.data.emoji,
                      label: response.data.label,
                      score: moodScores[response.data.label] || 3
                    };
                  }
                })
                .catch(() => {})
            );
            
            promises.push(
              axios.get(`/api/journal/activities?date=${dateStr}`)
                .then(response => {
                  if (response.data &&
                      response.data.activities &&
                      Array.isArray(response.data.activities) &&
                      response.data.activities.length > 0) {
                    updatedDays[i].activities = response.data.activities;
                  }
                })
                .catch(() => {})
            );
          }
          
          // Wait for all promises to resolve
          await Promise.allSettled(promises);
          
          // Update the calendar with the fetched data
          setCalendarDays(updatedDays);
        }
        
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
        
        setCalendarDays(days);
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
      }
    };
    
    if (session?.user?.email) {
      fetchCalendarData();
    }
  }, [session, currentMonth, timezone, refreshTrigger]);

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
      'bg-red-200 dark:bg-red-900', // Awful
      'bg-orange-200 dark:bg-orange-900', // Bad
      'bg-yellow-200 dark:bg-yellow-900', // Meh
      'bg-green-200 dark:bg-green-900', // Good
      'bg-purple-200 dark:bg-purple-900' // Rad
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-4 sm:p-6 w-full overflow-hidden">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Calendar View</h2>
        {calendarDays.length === 0 && (
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
      <div className="grid grid-cols-7 gap-1 mb-4 w-full min-w-[280px] max-w-full overflow-x-auto">
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
              relative aspect-square flex flex-col items-center justify-center rounded-lg transition-all p-1
              min-w-[30px] w-full
              ${isCurrentMonth(day.date) ? 'opacity-100' : 'opacity-40'}
              ${selectedDate === day.date ? 'ring-2 ring-teal-500 dark:ring-teal-400' : ''}
              ${getMoodColor(day.mood?.score)}
              hover:brightness-95 dark:hover:brightness-110
            `}
          >
            <span className={`text-xs font-medium ${isToday(day.date) ? 'text-teal-600 dark:text-teal-400' : ''}`}>
              {new Date(day.date).getDate()}
            </span>
            
            <div className="flex flex-col items-center">
              {day.mood && (
                <span className="text-sm">{day.mood.emoji}</span>
              )}
              
              {day.hasEntry && !day.mood && (
                <span className="text-sm">📝</span>
              )}
              
              {day.activities && day.activities.length > 0 && (
                <div className="flex flex-wrap justify-center mt-1">
                  {day.activities.slice(0, 1).map((activity, idx) => {
                    // Get icon for activity
                    const activityIcons: {[key: string]: string} = {
                      'Work': '💼', 'Exercise': '🏋️', 'Social': '👥', 'Reading': '📚',
                      'Gaming': '🎮', 'Family': '👨‍👩‍👧‍👦', 'Shopping': '🛒', 'Cooking': '🍳',
                      'Cleaning': '🧹', 'TV': '📺', 'Movies': '🎬', 'Music': '🎵',
                      'Outdoors': '🌳', 'Travel': '✈️', 'Relaxing': '🛌', 'Hobbies': '🎨',
                      'Study': '📝', 'Meditation': '🧘', 'Art': '🖼️', 'Writing': '✍️'
                    };
                    return (
                      <span key={idx} className="text-xs">
                        {activityIcons[activity] || '📌'}
                      </span>
                    );
                  })}
                  {day.activities.length > 1 && (
                    <span className="text-xs">+{day.activities.length - 1}</span>
                  )}
                </div>
              )}
            </div>
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