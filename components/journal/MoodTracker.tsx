import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCurrentDate, getDateStorageKey } from '@/lib/dateUtils';

interface MoodTrackerProps {
  onSave: (mood: { emoji: string; label: string; tags: string[] }) => void;
  timezone?: string;
}

const MoodTracker: React.FC<MoodTrackerProps> = ({ onSave, timezone }) => {
  const [selectedEmoji, setSelectedEmoji] = useState<string>('😐');
  const [selectedLabel, setSelectedLabel] = useState<string>('Okay');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState<string>('');
  const [saveConfirmation, setSaveConfirmation] = useState<boolean>(false);
  const { data: session } = useSession();

  const emojis = ['😞', '😕', '😐', '🙂', '😄'];
  const labels = ['Sad', 'Down', 'Okay', 'Good', 'Great'];
  const commonTags = ['focused', 'drained', 'creative', 'anxious', 'calm', 'energetic', 'tired', 'motivated'];

  // Load saved mood from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      const today = getCurrentDate(timezone);
      const storageKey = getDateStorageKey('journal_mood', session.user.email, timezone, today);
      const savedMood = localStorage.getItem(storageKey);
      if (savedMood) {
        try {
          const parsed = JSON.parse(savedMood);
          setSelectedEmoji(parsed.emoji || '😐');
          setSelectedLabel(parsed.label || 'Okay');
          setSelectedTags(parsed.tags || []);
        } catch (e) {
          console.error('Error parsing saved mood:', e);
        }
      }
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
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Mood Tracker</h2>
      
      <div className="flex justify-between items-center mb-6">
        {emojis.map((emoji, index) => (
          <button
            key={emoji}
            onClick={() => handleEmojiSelect(emoji, index)}
            className={`text-3xl p-2 rounded-full transition-all ${
              selectedEmoji === emoji 
                ? 'bg-teal-100 dark:bg-teal-900 scale-110 shadow-md' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            aria-label={`Select mood: ${labels[index]}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          How are you feeling?
        </label>
        <select
          value={selectedLabel}
          onChange={(e) => setSelectedLabel(e.target.value)}
          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {labels.map(label => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
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
      
      <div className="relative">
        <button
          onClick={handleSave}
          className="w-full py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors"
        >
          Save Mood
        </button>
        
        {saveConfirmation && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-center text-sm transition-opacity animate-fade-in-out">
            Mood saved successfully! ✅
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodTracker;