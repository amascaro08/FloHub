import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCurrentDate, getDateStorageKey, formatDate } from '@/lib/dateUtils';
import axios from 'axios';

interface MoodTrackerProps {
  onSave: (mood: { emoji: string; label: string; tags: string[] }) => void;
  timezone?: string;
}

const MoodTracker: React.FC<MoodTrackerProps> = ({ onSave, timezone }) => {
  const [selectedEmoji, setSelectedEmoji] = useState<string>('😐');
  const [selectedLabel, setSelectedLabel] = useState<string>('Meh');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState<string>('');
  const [saveConfirmation, setSaveConfirmation] = useState<boolean>(false);
  const [moodData, setMoodData] = useState<{date: string, emoji: string, label: string}[]>([]);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const { data: session } = useSession();
  const sessionData = session ? session : null;

  if (!session) {
    return <div>Loading...</div>; // Or any other fallback UI
  }

  const emojis = ['😞', '😕', '😐', '🙂', '😄'];
  const labels = ['Awful', 'Bad', 'Meh', 'Good', 'Rad'];
  const commonTags = ['focused', 'drained', 'creative', 'anxious', 'calm', 'energetic', 'tired', 'motivated'];

  // Load saved mood from API on component mount 
  useEffect(() => {
    const fetchMoodData = async () => {
      if (session?.user?.email) {
        const today = getCurrentDate(timezone);
        
        // Fetch today's mood
        try {
          const response = await axios.get(`/api/journal/mood?date=${today}`, {
            withCredentials: true
          });
          if (response.data) {
            setSelectedEmoji(response.data.emoji || '😐');
            setSelectedLabel(response.data.label || 'Meh');
            setSelectedTags(response.data.tags || []);
          }
        } catch (error) {
          console.error('Error fetching mood data:', error);
          // Set default state
          setSelectedEmoji('😐');
          setSelectedLabel('Meh');
          setSelectedTags([]);
        }
        
        // Load mood data from the last 7 days for the trend
        const moodEntries: {date: string, emoji: string, label: string}[] = [];
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
            const response = await axios.get(`/api/journal/mood?date=${dateStr}`, {
              withCredentials: true
            });
            // Check if we have actual mood data (not empty defaults)
            if (response.data && response.data.emoji && response.data.label) {
              moodEntries.push({
                date: dateStr,
                emoji: response.data.emoji,
                label: response.data.label
              });
            } else {
              // Add placeholder for days without mood data
              moodEntries.push({
                date: dateStr,
                emoji: '·',
                label: ''
              });
            }
          } catch (error) {
            // Add placeholder for days without mood data
            moodEntries.push({
              date: dateStr,
              emoji: '·',
              label: ''
            });
          }
        }
        
        setMoodData(moodEntries);
      }
    };
    
    if (session?.user?.email) {
      fetchMoodData();
    }
  }, [session, timezone]);

  const handleSave = () => {
    const mood = {
      emoji: selectedEmoji,
      label: selectedLabel,
      tags: selectedTags,
    };
    
    // Save to localStorage with today's date in user's timezone
    if (session?.user?.email) {
      const today = getCurrentDate(timezone);
      const storageKey = getDateStorageKey('journal_mood', session.user.email, timezone, today);
      localStorage.setItem(storageKey, JSON.stringify(mood));
      
      // Show save confirmation
      setSaveConfirmation(true);
      
      // Hide confirmation after 3 seconds
      setTimeout(() => {
        setSaveConfirmation(false);
      }, 3000);
    }
    
    onSave(mood);
  };

  const handleEmojiSelect = (emoji: string, index: number) => {
    setSelectedEmoji(emoji);
    setSelectedLabel(labels[index]);
    
    // Auto-save when mood is selected
    setTimeout(async () => {
      const mood = {
        emoji: emoji,
        label: labels[index],
        tags: selectedTags,
      };
      
      // Save to API with today's date in user's timezone
      if (session?.user?.email) {
        const today = getCurrentDate(timezone);
        
        try {
          await axios.post('/api/journal/mood', {
            date: today,
            emoji: emoji,
            label: labels[index],
            tags: selectedTags
          }, {
            withCredentials: true
          });
          
          // Show save confirmation
          setSaveConfirmation(true);
          
          // Hide confirmation after 3 seconds
          setTimeout(() => {
            setSaveConfirmation(false);
          }, 3000);
          
          onSave(mood);
        } catch (error) {
          console.error('Error saving mood data:', error);
        }
      }
    }, 100);
  };

  const toggleTag = (tag: string) => {
    let newTags;
    if (selectedTags.includes(tag)) {
      newTags = selectedTags.filter(t => t !== tag);
    } else {
      newTags = [...selectedTags, tag];
    }
    
    setSelectedTags(newTags);
    
    // Auto-save when tags are updated
    setTimeout(async () => {
      const mood = {
        emoji: selectedEmoji,
        label: selectedLabel,
        tags: newTags,
      };
      
      // Save to API with today's date in user's timezone
      if (session?.user?.email) {
        const today = getCurrentDate(timezone);
        
        try {
          await axios.post('/api/journal/mood', {
            date: today,
            emoji: selectedEmoji,
            label: selectedLabel,
            tags: newTags
          }, {
            withCredentials: true
          });
          
          // Show save confirmation
          setSaveConfirmation(true);
          
          // Hide confirmation after 3 seconds
          setTimeout(() => {
            setSaveConfirmation(false);
          }, 3000);
          
          onSave(mood);
        } catch (error) {
          console.error('Error saving mood data:', error);
        }
      }
    }, 100);
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      const newTags = [...selectedTags, customTag.trim()];
      setSelectedTags(newTags);
      setCustomTag('');
      
      // Auto-save when custom tag is added
      setTimeout(async () => {
        const mood = {
          emoji: selectedEmoji,
          label: selectedLabel,
          tags: newTags,
        };
        
        // Save to API with today's date in user's timezone
        if (session?.user?.email) {
          const today = getCurrentDate(timezone);
          
          try {
            await axios.post('/api/journal/mood', {
              date: today,
              emoji: selectedEmoji,
              label: selectedLabel,
              tags: newTags
            }, {
              withCredentials: true
            });
            
            // Show save confirmation
            setSaveConfirmation(true);
            
            // Hide confirmation after 3 seconds
            setTimeout(() => {
              setSaveConfirmation(false);
            }, 3000);
            
            onSave(mood);
          } catch (error) {
            console.error('Error saving mood data:', error);
          }
        }
      }, 100);
    }
  };
  
  // Helper function to get mood trend description
  const getMoodTrend = () => {
    if (moodData.filter(m => m.label).length < 3) return "Not enough data";
    
    const labels = ['Awful', 'Bad', 'Meh', 'Good', 'Rad'];
    const recentMoods = moodData.filter(m => m.label).map(m => labels.indexOf(m.label));
    
    if (recentMoods.length === 0) return "Not enough data";
    
    const avgMood = recentMoods.reduce((sum, val) => sum + val, 0) / recentMoods.length;
    
    if (avgMood < 1.5) return "Trending downward";
    if (avgMood < 2.5) return "Stable";
    if (avgMood < 3.5) return "Slightly improving";
    return "Trending upward";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Mood Tracker</h2>
        <button
          onClick={() => setShowInsights(!showInsights)}
          className="text-sm px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          {showInsights ? 'Hide Insights' : 'Show Insights'}
        </button>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        {emojis.map((emoji, index) => {
          // Get color based on mood
          const moodColors = [
            'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200', // Awful
            'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200', // Bad
            'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200', // Meh
            'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200', // Good
            'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200', // Rad
          ];
          
          const selectedColor = moodColors[index];
          const isSelected = selectedEmoji === emoji;
          
          return (
            <button
              key={emoji}
              onClick={() => handleEmojiSelect(emoji, index)}
              className={`flex flex-col items-center justify-center p-3 rounded-full transition-all ${
                isSelected
                  ? `${selectedColor} scale-110 shadow-md`
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              aria-label={`Select mood: ${labels[index]}`}
            >
              <span className="text-3xl mb-1">{emoji}</span>
              <span className={`text-xs font-medium ${isSelected ? '' : 'text-slate-600 dark:text-slate-400'}`}>
                {labels[index]}
              </span>
            </button>
          );
        })}
      </div>
      
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tags (optional)
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {commonTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedTags.includes(tag)
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        
        <div className="flex">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            placeholder="Add custom tag..."
            className="flex-grow p-2 rounded-l-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomTag();
              }
            }}
          />
          <button
            onClick={addCustomTag}
            className="px-3 py-2 rounded-r-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
      
      {/* Mood Trend Section - Only shown when insights are toggled */}
      {showInsights && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Mood Trend</h3>
            <span className="text-sm font-medium text-teal-600 dark:text-teal-400">{getMoodTrend()}</span>
          </div>
          
          {/* Simple mood line graph */}
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</span>
            </div>
            
            <div className="h-16 flex items-end">
              {moodData.map((mood, index) => {
                const labels = ['Sad', 'Down', 'Okay', 'Good', 'Great'];
                const height = mood.label ? ((labels.indexOf(mood.label) + 1) / 5) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-2 rounded-t-sm transition-all ${mood.label ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs mt-1">{mood.emoji}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {saveConfirmation && (
        <div className="mt-4 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-center text-sm transition-opacity animate-fade-in-out">
          Mood saved automatically ✅
        </div>
      )}
    </div>
  );
};

export default MoodTracker;