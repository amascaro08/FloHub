import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCurrentDate, getDateStorageKey } from '@/lib/dateUtils';

interface ActivityTrackerProps {
  onSave: (activities: string[]) => void;
  date?: string;
  timezone?: string;
}

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ onSave, date, timezone }) => {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [customActivity, setCustomActivity] = useState<string>('');
  const [saveConfirmation, setSaveConfirmation] = useState<boolean>(false);
  const [userActivities, setUserActivities] = useState<string[]>([]);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [activityStats, setActivityStats] = useState<{[key: string]: number}>({});
  const { data: session } = useSession();
  
  // Default activities
  // Default activities with icons
  const defaultActivities = [
    { name: 'Work', icon: '💼' },
    { name: 'Exercise', icon: '🏋️' },
    { name: 'Social', icon: '👥' },
    { name: 'Reading', icon: '📚' },
    { name: 'Gaming', icon: '🎮' },
    { name: 'Family', icon: '👨‍👩‍👧‍👦' },
    { name: 'Shopping', icon: '🛒' },
    { name: 'Cooking', icon: '🍳' },
    { name: 'Cleaning', icon: '🧹' },
    { name: 'TV', icon: '📺' },
    { name: 'Movies', icon: '🎬' },
    { name: 'Music', icon: '🎵' },
    { name: 'Outdoors', icon: '🌳' },
    { name: 'Travel', icon: '✈️' },
    { name: 'Relaxing', icon: '🛌' },
    { name: 'Hobbies', icon: '🎨' },
    { name: 'Study', icon: '📝' },
    { name: 'Meditation', icon: '🧘' },
    { name: 'Art', icon: '🖼️' },
    { name: 'Writing', icon: '✍️' }
  ];
  
  // Get the current date in YYYY-MM-DD format or use provided date
  const entryDate = date || getCurrentDate(timezone);

  // Load saved activities and user's custom activities from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      // Load user's custom activities
      const customActivitiesKey = `journal_custom_activities_${session.user.email}`;
      const savedCustomActivities = localStorage.getItem(customActivitiesKey);
      
      if (savedCustomActivities) {
        try {
          const parsed = JSON.parse(savedCustomActivities);
          setUserActivities(parsed);
        } catch (e) {
          console.error('Error parsing saved custom activities:', e);
        }
      }
      
      // Load activities for the specific date
      const activitiesKey = getDateStorageKey('journal_activities', session.user.email, timezone, entryDate);
      const savedActivities = localStorage.getItem(activitiesKey);
      
      if (savedActivities) {
        try {
          const parsed = JSON.parse(savedActivities);
          setSelectedActivities(parsed);
        } catch (e) {
          console.error('Error parsing saved activities:', e);
        }
      }
    }
    // Calculate activity statistics
    const calculateActivityStats = () => {
      if (session?.user?.email) {
        const stats: {[key: string]: number} = {};
        const last30Days = [];
        
        // Get dates for the last 30 days
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          last30Days.push(dateStr);
        }
        
        // Count activities for each day
        last30Days.forEach(dateStr => {
          const key = getDateStorageKey('journal_activities', session.user.email || '', timezone || '', dateStr);
          const savedActivities = localStorage.getItem(key);
          
          if (savedActivities) {
            try {
              const activities = JSON.parse(savedActivities);
              activities.forEach((activity: string) => {
                stats[activity] = (stats[activity] || 0) + 1;
              });
            } catch (e) {
              console.error('Error parsing saved activities:', e);
            }
          }
        });
        
        setActivityStats(stats);
      }
    };
    
    calculateActivityStats();
  }, [session, entryDate, timezone]);

  const handleSave = () => {
    if (session?.user?.email) {
      // Save selected activities for this date
      const activitiesKey = getDateStorageKey('journal_activities', session.user.email, timezone, entryDate);
      localStorage.setItem(activitiesKey, JSON.stringify(selectedActivities));
      
      // Show save confirmation
      setSaveConfirmation(true);
      
      // Hide confirmation after 3 seconds
      setTimeout(() => {
        setSaveConfirmation(false);
      }, 3000);
      
      onSave(selectedActivities);
    }
    // Recalculate activity stats after saving
    setTimeout(() => {
      const calculateActivityStats = () => {
        if (session?.user?.email) {
          const stats: {[key: string]: number} = {};
          const last30Days = [];
          
          // Get dates for the last 30 days
          const today = new Date();
          for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last30Days.push(dateStr);
          }
          
          // Count activities for each day
          last30Days.forEach(dateStr => {
            const key = getDateStorageKey('journal_activities', session.user.email || '', timezone || '', dateStr);
            const savedActivities = localStorage.getItem(key);
            
            if (savedActivities) {
              try {
                const activities = JSON.parse(savedActivities);
                activities.forEach((activity: string) => {
                  stats[activity] = (stats[activity] || 0) + 1;
                });
              } catch (e) {
                console.error('Error parsing saved activities:', e);
              }
            }
          });
          
          setActivityStats(stats);
        }
      };
      
      calculateActivityStats();
    }, 500);
  };

  const toggleActivity = (activity: string) => {
    if (selectedActivities.includes(activity)) {
      setSelectedActivities(selectedActivities.filter(a => a !== activity));
    } else {
      setSelectedActivities([...selectedActivities, activity]);
    }
  };
  
  // Get icon for an activity
  const getActivityIcon = (activity: string) => {
    const defaultActivity = defaultActivities.find(a => a.name === activity);
    return defaultActivity ? defaultActivity.icon : '📌';
  };

  const addCustomActivity = () => {
    if (customActivity.trim() && !defaultActivities.map(a => a.name).includes(customActivity.trim()) && !userActivities.includes(customActivity.trim())) {
      // Add to user's custom activities
      const newUserActivities = [...userActivities, customActivity.trim()];
      setUserActivities(newUserActivities);
      
      // Save custom activities to localStorage
      if (session?.user?.email) {
        const customActivitiesKey = `journal_custom_activities_${session.user.email}`;
        localStorage.setItem(customActivitiesKey, JSON.stringify(newUserActivities));
      }
      
      // Add to selected activities
      if (!selectedActivities.includes(customActivity.trim())) {
        setSelectedActivities([...selectedActivities, customActivity.trim()]);
      }
      
      setCustomActivity('');
    } else if (customActivity.trim() && !selectedActivities.includes(customActivity.trim())) {
      // If activity already exists but isn't selected, select it
      setSelectedActivities([...selectedActivities, customActivity.trim()]);
      setCustomActivity('');
    }
  };

  // Get top activities based on frequency
  const getTopActivities = () => {
    return Object.entries(activityStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([activity, count]) => ({ activity, count }));
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Activities</h2>
        <button
          onClick={() => setShowInsights(!showInsights)}
          className="text-sm px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          {showInsights ? 'Hide Insights' : 'Show Insights'}
        </button>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          What did you do today?
        </label>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {defaultActivities.map(activity => (
            <button
              key={activity.name}
              onClick={() => toggleActivity(activity.name)}
              className={`px-3 py-1 rounded-full text-sm transition-all flex items-center ${
                selectedActivities.includes(activity.name)
                  ? 'bg-teal-500 text-white scale-105 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <span className="mr-1">{activity.icon}</span>
              {activity.name}
            </button>
          ))}
          
          {userActivities.map(activity => (
            <button
              key={`custom-${activity}`}
              onClick={() => toggleActivity(activity)}
              className={`px-3 py-1 rounded-full text-sm transition-all flex items-center ${
                selectedActivities.includes(activity)
                  ? 'bg-purple-500 text-white scale-105 shadow-sm'
                  : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800'
              }`}
            >
              <span className="mr-1">📌</span>
              {activity}
            </button>
          ))}
        </div>
        
        <div className="flex">
          <input
            type="text"
            value={customActivity}
            onChange={(e) => setCustomActivity(e.target.value)}
            placeholder="Add custom activity..."
            className="flex-grow p-2 rounded-l-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomActivity();
              }
            }}
          />
          <button
            onClick={addCustomActivity}
            className="px-3 py-2 rounded-r-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
      
      {selectedActivities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Activities ({selectedActivities.length})
          </h3>
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {selectedActivities.map(activity => (
                <div
                  key={`selected-${activity}`}
                  className="px-3 py-1 rounded-full text-sm bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 flex items-center"
                >
                  <span className="mr-1">{getActivityIcon(activity)}</span>
                  <span>{activity}</span>
                  <button 
                    onClick={() => toggleActivity(activity)}
                    className="ml-2 text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Activity Insights */}
      {showInsights && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Activity Insights (Last 30 Days)
          </h3>
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            {getTopActivities().length > 0 ? (
              <div className="space-y-2">
                {getTopActivities().map(({ activity, count }) => (
                  <div key={`stat-${activity}`} className="flex items-center">
                    <span className="mr-2">{getActivityIcon(activity)}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{activity}</span>
                    <div className="ml-2 flex-grow">
                      <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${Math.min(100, (count / 30) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{count} days</span>
                  </div>
                ))}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  These are your most frequent activities. Consider how they affect your mood and wellbeing.
                </p>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm italic">
                Track your activities for a few days to see insights
              </p>
            )}
          </div>
        </div>
      )}
      
      <div className="relative">
        <button
          onClick={handleSave}
          className="w-full py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors"
        >
          Save Activities
        </button>
        
        {saveConfirmation && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-center text-sm transition-opacity animate-fade-in-out">
            Activities saved successfully! ✅
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTracker;