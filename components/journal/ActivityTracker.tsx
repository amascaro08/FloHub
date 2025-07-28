import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { getCurrentDate, getDateStorageKey } from '@/lib/dateUtils';
import axios from 'axios';

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
 const { user, isLoading } = useUser();
  const userData = user ? user : null;

  if (!user) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  
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

  // Load saved activities and user's custom activities from API
  useEffect(() => {
    const fetchActivitiesData = async () => {
      if (user?.primaryEmail) {
        // Load user's custom activities
        try {
          const customActivitiesKey = `journal_custom_activities_${user.primaryEmail}`;
          const savedCustomActivities = localStorage.getItem(customActivitiesKey);
          
          if (savedCustomActivities) {
            const parsed = JSON.parse(savedCustomActivities);
            setUserActivities(parsed);
          }
        } catch (e) {
          console.error('Error parsing saved custom activities:', e);
        }
        
        // Load activities for the specific date
        try {
          const response = await axios.get(`/api/journal/activities?date=${entryDate}`, {
            withCredentials: true
          });
          if (response.data && response.data.activities) {
            setSelectedActivities(response.data.activities);
          }
        } catch (error) {
          console.error('Error fetching activities data:', error);
          // Set default empty state
          setSelectedActivities([]);
        }
        
        // Calculate activity statistics
        const calculateActivityStats = async () => {
          const stats: {[key: string]: number} = {};
          const last30Days: string[] = [];
          
          // Get dates for the last 30 days
          const today = new Date();
          for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last30Days.push(dateStr);
          }
          
          // Count activities for each day
          for (const dateStr of last30Days) {
            try {
              const response = await axios.get(`/api/journal/activities?date=${dateStr}`, {
                withCredentials: true
              });
              if (response.data && response.data.activities && response.data.activities.length > 0) {
                response.data.activities.forEach((activity: string) => {
                  stats[activity] = (stats[activity] || 0) + 1;
                });
              }
            } catch (error) {
              // If activities don't exist for this date, continue to the next date
              continue;
            }
          }
          
          setActivityStats(stats);
        };
        
        calculateActivityStats();
      }
    };
    
    if (user?.primaryEmail) {
      fetchActivitiesData();
    }
  }, [user, entryDate, timezone]);

  const handleSave = () => {
    if (user?.primaryEmail) {
      // Save selected activities for this date
      const activitiesKey = getDateStorageKey('journal_activities', user.primaryEmail, timezone, entryDate);
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
        if (user?.primaryEmail) {
          const stats: {[key: string]: number} = {};
          const last30Days: string[] = [];
          
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
            const key = getDateStorageKey('journal_activities', user.primaryEmail || '', timezone || '', dateStr);
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
    // Create a new array with unique activities
    const uniqueActivities = Array.from(new Set(selectedActivities));
    
    // Check if the activity already exists in the array
    const activityExists = uniqueActivities.includes(activity);
    
    // Create a new array without this activity
    const filteredActivities = uniqueActivities.filter(a => a !== activity);
    
    // If the activity didn't exist, add it once
    let newActivities;
    if (!activityExists) {
      newActivities = [...filteredActivities, activity];
    } else {
      newActivities = filteredActivities;
    }
    
    console.log("Toggling activity:", activity);
    console.log("Before:", uniqueActivities);
    console.log("After:", newActivities);
    
    setSelectedActivities(newActivities);
    
    // Auto-save when activities are updated
    setTimeout(async () => {
      if (user?.primaryEmail) {
        try {
          console.log("Saving activities:", newActivities);
          
          // Save selected activities for this date
          await axios.post('/api/journal/activities', {
            date: entryDate,
            activities: newActivities
          }, {
            withCredentials: true
          });
          
          // Show save confirmation
          setSaveConfirmation(true);
          
          // Hide confirmation after 3 seconds
          setTimeout(() => {
            setSaveConfirmation(false);
          }, 3000);
          
          onSave(newActivities);
        } catch (error) {
          console.error('Error saving activities data:', error);
        }
      }
    }, 100);
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
      if (user?.primaryEmail) {
        const customActivitiesKey = `journal_custom_activities_${user.primaryEmail}`;
        localStorage.setItem(customActivitiesKey, JSON.stringify(newUserActivities));
      }
      
      // Create a new array with unique activities
      const uniqueActivities = Array.from(new Set(selectedActivities));
      
      // Add to selected activities if not already included
      let newActivities = uniqueActivities;
      if (!uniqueActivities.includes(customActivity.trim())) {
        newActivities = [...uniqueActivities, customActivity.trim()];
      }
      
      // Update state with the new unique activities
      setSelectedActivities(newActivities);
      
      setCustomActivity('');
      
      // Auto-save when custom activity is added
      setTimeout(async () => {
        if (user?.primaryEmail) {
          try {
            // Save selected activities for this date
            await axios.post('/api/journal/activities', {
              date: entryDate,
              activities: newActivities
            }, {
              withCredentials: true
            });
            
            // Show save confirmation
            setSaveConfirmation(true);
            
            // Hide confirmation after 3 seconds
            setTimeout(() => {
              setSaveConfirmation(false);
            }, 3000);
            
            onSave(newActivities);
          } catch (error) {
            console.error('Error saving activities data:', error);
          }
        }
      }, 100);
    } else if (customActivity.trim() && !selectedActivities.includes(customActivity.trim())) {
      // If activity already exists but isn't selected, select it
      const newActivities = [...selectedActivities, customActivity.trim()];
      setSelectedActivities(newActivities);
      setCustomActivity('');
      
      // Auto-save when existing activity is selected
      setTimeout(async () => {
        if (user?.primaryEmail) {
          try {
            // Save selected activities for this date
            await axios.post('/api/journal/activities', {
              date: entryDate,
              activities: newActivities
            }, {
              withCredentials: true
            });
            
            // Show save confirmation
            setSaveConfirmation(true);
            
            // Hide confirmation after 3 seconds
            setTimeout(() => {
              setSaveConfirmation(false);
            }, 3000);
            
            onSave(newActivities);
          } catch (error) {
            console.error('Error saving activities data:', error);
          }
        }
      }, 100);
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
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activities</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">What did you do today?</p>
        </div>
        <button
          onClick={() => setShowInsights(!showInsights)}
          className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          {showInsights ? 'Hide Insights' : 'Insights'}
        </button>
      </div>
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {defaultActivities.map(activity => (
            <button
              key={activity.name}
              onClick={() => toggleActivity(activity.name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center activity-tag ${
                selectedActivities.includes(activity.name)
                  ? 'bg-teal-600 text-white scale-105 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
              className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center activity-tag ${
                selectedActivities.includes(activity)
                  ? 'bg-purple-600 text-white scale-105 shadow-sm'
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
            className="flex-grow p-2 rounded-l-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomActivity();
              }
            }}
          />
          <button
            onClick={addCustomActivity}
            className="px-3 py-2 rounded-r-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors font-medium"
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
              {/* Use Array.from(new Set()) to ensure unique activities are displayed */}
              {Array.from(new Set(selectedActivities)).map(activity => (
                <div
                  key={`selected-${activity}`}
                  className="px-3 py-1 rounded-full text-sm bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 flex items-center"
                >
                  <span className="mr-1">{getActivityIcon(activity)}</span>
                  <span>{activity}</span>
                  <button
                    onClick={() => toggleActivity(activity)}
                    className="ml-2 text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-200"
                    aria-label={`Remove ${activity}`}
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
      
      {saveConfirmation && (
        <div className="mt-4 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-center text-sm transition-opacity animate-fade-in-out">
          Activities saved automatically ✅
        </div>
      )}
    </div>
  );
};

export default ActivityTracker;