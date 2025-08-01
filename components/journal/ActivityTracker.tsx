import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { getCurrentDate, getDateStorageKey } from '@/lib/dateUtils';
import { CustomActivity } from '@/types/app';
import useSWR, { mutate } from 'swr';
import axios from 'axios';

interface ActivityTrackerProps {
  onSave: (activities: string[]) => void;
  date?: string;
  timezone?: string;
}

interface QuickAddModalProps {
  onClose: () => void;
  onActivityAdded: (activity: CustomActivity) => void;
  userSettings: any;
  mutateUserSettings: () => Promise<any>;
}

// Comprehensive emoji library with categories
const emojiLibrary = {
  "Activities": ['🏃', '🚶', '🏋️', '🧘', '🏊', '🚴', '⛷️', '🏂', '🏄', '🎯', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🎮', '🎲'],
  "Work & Study": ['💼', '👔', '👨‍💼', '👩‍💼', '💻', '🖥️', '📱', '📞', '📧', '📨', '📩', '📬', '📊', '📈', '📉', '📋', '📑', '📄', '📃', '📜', '📋', '📁', '📂', '🗂️'],
  "Food & Drink": ['🍳', '🍽️', '🍴', '🥄', '🥢', '🥣', '🥡', '🥧', '🧁', '🎂', '🍰', '🍪', '🍕', '🍔', '🌭', '🌮', '🌯', '🥙', '🥪', '🥨', '🥯', '🥖', '🥐', '🥞'],
  "Social & Family": ['👥', '👨‍👩‍👧‍👦', '👨‍👩‍👦‍👦', '👨‍👩‍👧‍👧', '👨‍👩‍👦', '👨‍👩‍👧', '👨‍👦', '👨‍👧', '👩‍👦', '👩‍👧', '💑', '💏', '👫', '👬', '👭', '👯‍♀️', '👯‍♂️'],
  "Travel & Transport": ['✈️', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘'],
  "Nature & Outdoors": ['🌳', '🌲', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘'],
  "Health & Wellness": ['😴', '💤', '😪', '😵', '😵‍💫', '🥴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳', '😎', '🤩', '🥺', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵'],
  "Hobbies & Creative": ['🎨', '🖼️', '🎭', '🎪', '🎟️', '🎫', '🎬', '🎤', '🎧', '🎼', '🎹', '🎸', '🎻', '🎺', '🎷', '🪗', '🪕', '🎺', '🎻', '🎼', '🎵', '🎶', '🎤', '🎧'],
  "Shopping & Commerce": ['🛒', '🛍️', '🛏️', '🛋️', '🪑', '🪞', '🪟', '🛁', '🛀', '🧼', '🫧', '🪒', '🧽', '🪣', '🧴', '🫙', '🧂', '🫗', '🫖', '🫕', '🫔', '🫓', '🫒', '🫑'],
  "Home & Life": ['🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '⛪', '🕌', '🛕'],
  "Technology": ['💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📺', '📻', '📱', '📲', '☎️', '📞', '📟', '📠', '🔋'],
  "Sports & Games": ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🏑', '🏒', '🏓', '🏸', '🏊', '🏊‍♀️', '🏊‍♂️', '🚣', '🚣‍♀️', '🚣‍♂️'],
  "Emotions & Expressions": ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜'],
  "Objects & Tools": ['🔧', '🔨', '🔩', '⚙️', '🔗', '⛓️', '🔪', '🗡️', '⚔️', '🛡️', '🔫', '🏹', '🪃', '🪄', '🪅', '🪆', '🪇', '🪈', '🪉', '🪊', '🪋', '🪌', '🪍', '🪎'],
  "Symbols & Misc": ['⭐', '🌟', '✨', '⚡', '💫', '🔥', '💎', '💍', '📌', '📍', '🔖', '📎', '📐', '📏', '✂️', '🗂️', '📁', '📂', '🗄️', '🗑️', '🎯', '🎪', '🎭', '🎨']
};

// Flatten all emojis for search
const allEmojis = Object.values(emojiLibrary).flat();

const QuickAddModal: React.FC<QuickAddModalProps> = ({ onClose, onActivityAdded, userSettings, mutateUserSettings }) => {
  const [activityName, setActivityName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📌');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Activities');
  const { user } = useUser();

  // Filter emojis based on search query
  const filteredEmojis = searchQuery 
    ? allEmojis.filter(emoji => emoji.includes(searchQuery) || emoji.includes(searchQuery.toLowerCase()))
    : emojiLibrary[selectedCategory as keyof typeof emojiLibrary] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName.trim() || !user?.primaryEmail) return;

    setIsSubmitting(true);

    try {
      const newActivity: CustomActivity = {
        name: activityName.trim(),
        icon: selectedIcon
      };

      console.log('Creating new activity:', newActivity); // Debug log
      console.log('Selected icon:', selectedIcon); // Debug log

      // Check if activity already exists
      const existingActivities = userSettings?.journalCustomActivities || [];
      if (existingActivities.some((activity: CustomActivity) => 
        activity.name.toLowerCase() === newActivity.name.toLowerCase()
      )) {
        alert('This activity already exists!');
        setIsSubmitting(false);
        return;
      }

      // Update user settings with new activity
      const updatedActivities = [...existingActivities, newActivity];
      
      console.log('Saving updated activities:', updatedActivities); // Debug log
      
      const response = await fetch('/api/userSettings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journalCustomActivities: updatedActivities
        }),
      });

      if (response.ok) {
        // Force revalidate the user settings cache
        await mutateUserSettings();
        
        // Call the callback to add the activity to the current selection
        onActivityAdded(newActivity);
        
        // Close the modal
        onClose();
      } else {
        console.error('Failed to save custom activity');
        alert('Failed to save custom activity. Please try again.');
      }
    } catch (error) {
      console.error('Error saving custom activity:', error);
      alert('Error saving custom activity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Custom Activity
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Activity Name
            </label>
            <input
              type="text"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              placeholder="Enter activity name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choose Icon
            </label>
            
            {/* Category Selector */}
            <div className="mb-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {Object.keys(emojiLibrary).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emojis..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Emoji Grid */}
            <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedIcon(emoji)}
                  className={`w-8 h-8 text-lg rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedIcon === emoji ? 'bg-primary-100 dark:bg-primary-900 border-2 border-primary-500' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !activityName.trim()}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ onSave, date, timezone }) => {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [saveConfirmation, setSaveConfirmation] = useState<boolean>(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);
  const { user, isLoading } = useUser();

  // Fetch user settings to get custom activities
  const { data: userSettings, mutate: mutateUserSettings } = useSWR(
    user ? '/api/userSettings' : null,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    { 
      revalidateOnFocus: false,
      revalidateOnMount: true,
      refreshInterval: 0
    }
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
  
  console.log('ActivityTracker: userSettings:', userSettings);
  console.log('ActivityTracker: customActivities:', customActivities);
  
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

  const handleQuickAddActivity = (newActivity: CustomActivity) => {
    // Add the new activity to the current selection
    toggleActivity(newActivity.name);
  };
  
  // Get icon for an activity
  const getActivityIcon = (activity: string) => {
    console.log('Getting icon for activity:', activity);
    console.log('Available custom activities:', customActivities);
    
    // Check enabled default activities first
    const defaultActivity = enabledDefaultActivities.find((a: CustomActivity) => a.name === activity);
    if (defaultActivity) {
      console.log('Found in default activities:', defaultActivity.icon);
      return defaultActivity.icon;
    }
    
    // Check all default activities (for historical data)
    const allDefaultActivity = defaultActivities.find((a: CustomActivity) => a.name === activity);
    if (allDefaultActivity) {
      console.log('Found in all default activities:', allDefaultActivity.icon);
      return allDefaultActivity.icon;
    }
    
    // Check custom activities
    const customActivity = customActivities.find((a: CustomActivity) => a.name === activity);
    if (customActivity) {
      console.log('Found in custom activities:', customActivity.icon);
      return customActivity.icon;
    }
    
    console.log('Using fallback icon for:', activity);
    // Fallback icon
    return '📌';
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activities</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">What did you do today?</p>
          </div>
          <button
            onClick={() => setShowQuickAddModal(true)}
            className="px-3 py-1 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-1"
          >
            <span>+</span>
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* Default Activities */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Default Activities</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {enabledDefaultActivities.map((activity: CustomActivity) => (
            <button
              key={activity.name}
              onClick={() => toggleActivity(activity.name)}
              className={`p-3 rounded-lg border transition-all duration-200 flex flex-col items-center space-y-1 ${
                selectedActivities.includes(activity.name)
                  ? 'bg-primary-100 dark:bg-primary-900 border-primary-500 text-primary-700 dark:text-primary-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
              }`}
            >
              <span className="text-2xl">{activity.icon}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{activity.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Activities */}
      {customActivities.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Custom Activities</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {customActivities.map((activity: CustomActivity) => (
              <button
                key={activity.name}
                onClick={() => toggleActivity(activity.name)}
                className={`p-3 rounded-lg border transition-all duration-200 flex flex-col items-center space-y-1 ${
                  selectedActivities.includes(activity.name)
                    ? 'bg-primary-100 dark:bg-primary-900 border-primary-500 text-primary-700 dark:text-primary-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                }`}
              >
                <span className="text-2xl">{activity.icon}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{activity.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Activities Summary */}
      {selectedActivities.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Activities</h4>
          <div className="flex flex-wrap gap-2">
            {selectedActivities.map((activity) => (
              <span
                key={activity}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
              >
                <span className="mr-1">{getActivityIcon(activity)}</span>
                {activity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Save Confirmation */}
      {saveConfirmation && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Activities saved! ✨
        </div>
      )}

      {/* Quick Add Modal */}
      {showQuickAddModal && (
        <QuickAddModal
          onClose={() => setShowQuickAddModal(false)}
          onActivityAdded={handleQuickAddActivity}
          userSettings={userSettings}
          mutateUserSettings={mutateUserSettings}
        />
      )}
    </div>
  );
};

export default ActivityTracker;