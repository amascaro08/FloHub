import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface JournalSummaryProps {
  // Optional props for future integration
}

interface MoodData {
  date: string;
  emoji: string;
  label: string;
}

const JournalSummary: React.FC<JournalSummaryProps> = () => {
  const [moodData, setMoodData] = useState<MoodData[]>([]);
  const [topThemes, setTopThemes] = useState<{theme: string, count: number}[]>([]);
  const [floCatsSummary, setFloCatsSummary] = useState<string>('');
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      // Load mood data from the last 30 days
      const moodEntries: MoodData[] = [];
      const today = new Date();
      const allTags: Record<string, number> = {};
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Try to load mood for this date
        const savedMood = localStorage.getItem(`journal_mood_${session.user.email}_${dateStr}`);
        
        if (savedMood) {
          try {
            const parsed = JSON.parse(savedMood);
            moodEntries.push({
              date: dateStr,
              emoji: parsed.emoji,
              label: parsed.label
            });
            
            // Count tags for themes
            if (parsed.tags && Array.isArray(parsed.tags)) {
              parsed.tags.forEach((tag: string) => {
                allTags[tag] = (allTags[tag] || 0) + 1;
              });
            }
          } catch (e) {
            console.error('Error parsing saved mood:', e);
          }
        }
      }
      
      setMoodData(moodEntries);
      
      // Get top themes
      const themes = Object.entries(allTags)
        .map(([theme, count]) => ({ theme, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      setTopThemes(themes);
      
      // Generate a more specific FloCats summary based on mood data and themes
      const generateFloCatsSummary = () => {
        // If no mood data, return a default message
        if (moodData.length === 0) return "Start journaling to get FloCats insights about your entries.";
        
        // Count mood frequencies
        const moodCounts: Record<string, number> = {};
        moodData.forEach(mood => {
          moodCounts[mood.label] = (moodCounts[mood.label] || 0) + 1;
        });
        
        // Find most common mood
        let mostCommonMood = "neutral";
        let maxCount = 0;
        Object.entries(moodCounts).forEach(([mood, count]) => {
          if (count > maxCount) {
            mostCommonMood = mood;
            maxCount = count;
          }
        });
        
        // Get recent trend
        const trend = getMoodTrend();
        
        // Build personalized summary using mood data and themes
        let summary = `Based on your journal entries, your mood has been predominantly ${mostCommonMood.toLowerCase()} this month`;
        
        if (trend !== "Not enough data") {
          summary += ` and is currently ${trend.toLowerCase()}.`;
        } else {
          summary += ".";
        }
        
        // Add theme insights if available
        if (topThemes.length > 0) {
          summary += ` Your entries frequently mention ${topThemes[0].theme}`;
          if (topThemes.length > 1) {
            summary += ` and ${topThemes[1].theme}`;
          }
          summary += ", which seem to be important in your life right now.";
        }
        
        // Add personalized advice based on mood
        if (mostCommonMood === "Sad" || mostCommonMood === "Down") {
          summary += " Consider activities that have previously improved your mood, like connecting with friends or spending time outdoors.";
        } else if (mostCommonMood === "Great" || mostCommonMood === "Good") {
          summary += " Keep up with the positive activities and relationships that are contributing to your wellbeing.";
        }
        
        return summary;
      };
      
      setFloCatsSummary(generateFloCatsSummary());
    }
  }, [session]);

  // Helper function to get mood trend description
  const getMoodTrend = () => {
    if (moodData.length < 3) return "Not enough data";
    
    const labels = ['Sad', 'Down', 'Okay', 'Good', 'Great'];
    const recentMoods = moodData.slice(-7).map(m => labels.indexOf(m.label));
    
    const avgMood = recentMoods.reduce((sum, val) => sum + val, 0) / recentMoods.length;
    
    if (avgMood < 1.5) return "Trending downward";
    if (avgMood < 2.5) return "Stable";
    if (avgMood < 3.5) return "Slightly improving";
    return "Trending upward";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Journal Summary</h2>
      
      <div className="mb-6">
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">FloCats Summary</h3>
        <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
          {floCatsSummary || "Start journaling to get FloCats insights about your entries."}
        </p>
      </div>
      
      <div className="mb-6">
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Mood Trend</h3>
        <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</span>
            <span className="text-sm font-medium text-teal-600 dark:text-teal-400">{getMoodTrend()}</span>
          </div>
          
          {/* Simple mood line graph */}
          <div className="h-16 flex items-end">
            {moodData.slice(-7).map((mood, index) => {
              const labels = ['Sad', 'Down', 'Okay', 'Good', 'Great'];
              const height = ((labels.indexOf(mood.label) + 1) / 5) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-2 bg-teal-500 rounded-t-sm transition-all"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-xs mt-1">{mood.emoji}</span>
                </div>
              );
            })}
            
            {/* Fill empty spaces if less than 7 days of data */}
            {Array.from({ length: Math.max(0, 7 - moodData.slice(-7).length) }).map((_, index) => (
              <div key={`empty-${index}`} className="flex-1 flex flex-col items-center">
                <div className="w-2 bg-slate-200 dark:bg-slate-600 rounded-t-sm h-0"></div>
                <span className="text-xs mt-1">·</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Top Themes</h3>
        <div className="flex flex-wrap gap-2">
          {topThemes.length > 0 ? (
            topThemes.map(({ theme, count }) => (
              <div 
                key={theme}
                className="px-3 py-1 rounded-full text-sm bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200"
              >
                {theme} ({count})
              </div>
            ))
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm italic">
              Add tags to your mood entries to see themes
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalSummary;