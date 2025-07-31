import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { getCurrentDate, getDateStorageKey } from '@/lib/dateUtils';
import { CustomActivity } from '@/types/app';
import useSWR from 'swr';
import axios from 'axios';

interface ActivityTrackerProps {
  onSave: (activities: string[]) => void;
  date?: string;
  timezone?: string;
}

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ onSave, date, timezone }) => {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [saveConfirmation, setSaveConfirmation] = useState<boolean>(false);
  const { user, isLoading } = useUser();

  // Fetch user settings to get custom activities
  const { data: userSettings } = useSWR(
    user ? '/api/userSettings' : null,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    { revalidateOnFocus: false }
  );
  const userData = user ? user : null;

  if (!user) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  
  // Default activities
  // Default activities with icons 
  const defaultActivities: CustomActivity[] = [
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
  
  // Get custom activities from user settings
  const customActivities = userSettings?.journalCustomActivities || [];
  
  // Get disabled activities from user settings
  const disabledActivities = userSettings?.journalDisabledActivities || [];
  
  // Filter out disabled default activities
  const enabledDefaultActivities = defaultActivities.filter(
    (activity: CustomActivity) => !disabledActivities.includes(activity.name)
  );

  // Load saved activities for the specific date
  useEffect(() => {
    const fetchActivitiesData = async () => {
      if (user?.primaryEmail) {
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
    // Check enabled default activities first
    const defaultActivity = enabledDefaultActivities.find((a: CustomActivity) => a.name === activity);
    if (defaultActivity) return defaultActivity.icon;
    
    // Check all default activities (for historical data)
    const allDefaultActivity = defaultActivities.find((a: CustomActivity) => a.name === activity);
    if (allDefaultActivity) return allDefaultActivity.icon;
    
    // Check custom activities
    const customActivity = customActivities.find((a: CustomActivity) => a.name === activity);
    if (customActivity) return customActivity.icon;
    
    // Fallback icon
    return '📌';
  };




  
  return (
    <div className="w-full">
      <div className="mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activities</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">What did you do today?</p>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {enabledDefaultActivities.map((activity: CustomActivity) => (
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
          
          {customActivities.map((activity: CustomActivity) => (
            <button
              key={`custom-${activity.name}`}
              onClick={() => toggleActivity(activity.name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center activity-tag ${
                selectedActivities.includes(activity.name)
                  ? 'bg-purple-600 text-white scale-105 shadow-sm'
                  : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800'
              }`}
            >
              <span className="mr-1">{activity.icon}</span>
              {activity.name}
            </button>
          ))}
        </div>
        
        {customActivities.length === 0 && (
          <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            <p>No custom activities yet.</p>
            <p>Go to Journal Settings → Activities to add custom activities.</p>
          </div>
        )}
      </div>
      
      {selectedActivities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Activities ({selectedActivities.length})
          </h3>
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {/* Use Array.from(new Set()) to ensure unique activities are displayed */}
              {Array.from(new Set(selectedActivities)).map((activity: string) => (
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
      

      
      {saveConfirmation && (
        <div className="mt-4 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-center text-sm transition-opacity animate-fade-in-out">
          Activities saved automatically ✅
        </div>
      )}
    </div>
  );
};

export default ActivityTracker;