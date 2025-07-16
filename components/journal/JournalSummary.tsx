import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";

interface JournalSummaryProps {
  refreshTrigger?: number; // Trigger to refresh the summary 
}

interface MoodData {
  date: string;
  emoji: string;
  label: string;
}

const JournalSummary: React.FC<JournalSummaryProps> = ({ refreshTrigger = 0 }) => {
  const [moodData, setMoodData] = useState<MoodData[]>([]);
  const [topThemes, setTopThemes] = useState<{theme: string, count: number}[]>([]);
  const [floCatsSummary, setFloCatsSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
 const { user, isLoading } = useUser();
  const userData = user ? user : null;

  if (!user) {
    return <div>Loading...</div>; // Or any other fallback UI
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.primaryEmail) {
      // Load mood data from the last 30 days
      const moodEntries: MoodData[] = [];
      const today = new Date();
      const allTags: Record<string, number> = {};
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Try to load mood for this date
        const savedMood = localStorage.getItem(`journal_mood_${user.primaryEmail}_${dateStr}`);
        
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
          if (mood.label) {
            moodCounts[mood.label] = (moodCounts[mood.label] || 0) + 1;
          }
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
        
        // Calculate mood trend
        const moodScores: {[key: string]: number} = {
          'Rad': 5,
          'Good': 4,
          'Meh': 3,
          'Bad': 2,
          'Awful': 1
        };
        
        const recentMoods = moodData
          .filter(m => m.label)
          .map(m => moodScores[m.label] || 3);
        
        let trendDescription = "";
        let trendAdvice = "";
        if (recentMoods.length >= 3) {
          // Calculate if trend is improving or declining
          const firstHalf = recentMoods.slice(0, Math.floor(recentMoods.length / 2));
          const secondHalf = recentMoods.slice(Math.floor(recentMoods.length / 2));
          
          const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
          
          if (secondAvg - firstAvg > 0.5) {
            trendDescription = "Your mood has been improving recently. ";
            trendAdvice = "Take note of what positive changes you've made and continue building on them. ";
          } else if (firstAvg - secondAvg > 0.5) {
            trendDescription = "Your mood has been declining recently. ";
            trendAdvice = "Consider what factors might be affecting your wellbeing and what small changes could help. ";
          } else {
            trendDescription = "Your mood has been relatively stable. ";
            trendAdvice = "Consider introducing small positive changes to enhance your wellbeing. ";
          }
        }
        
        // Calculate mood variability
        let variabilityAdvice = "";
        if (recentMoods.length >= 5) {
          const moodVariations = [];
          for (let i = 1; i < recentMoods.length; i++) {
            moodVariations.push(Math.abs(recentMoods[i] - recentMoods[i-1]));
          }
          
          const avgVariation = moodVariations.reduce((sum, val) => sum + val, 0) / moodVariations.length;
          
          if (avgVariation > 1.5) {
            variabilityAdvice = "Your mood shows significant day-to-day variations. Establishing consistent routines might help stabilize your emotional wellbeing. ";
          }
        }
        
        // Build personalized summary using mood data and themes
        let summary = `Based on your journal entries, your mood has been predominantly ${mostCommonMood.toLowerCase()} this month. ${trendDescription}${variabilityAdvice}`;
        
        // Add theme insights if available
        if (topThemes.length > 0) {
          summary += `Your entries frequently mention ${topThemes[0].theme}`;
          if (topThemes.length > 1) {
            summary += ` and ${topThemes[1].theme}`;
          }
          summary += ", which seem to be important in your life right now. ";
        }
        
        // Add personalized advice based on mood
        if (mostCommonMood === "Awful" || mostCommonMood === "Bad") {
          summary += `${trendAdvice}Consider activities that have previously improved your mood, like connecting with friends or spending time outdoors. Small acts of self-care can make a significant difference in how you feel day-to-day.`;
        } else if (mostCommonMood === "Rad" || mostCommonMood === "Good") {
          summary += `${trendAdvice}Keep up with the positive activities and relationships that are contributing to your wellbeing. Consider sharing your positive experiences with others to amplify their effect.`;
        } else {
          summary += `${trendAdvice}Try to identify patterns in your activities and how they affect your mood to find what brings you joy. Even small positive changes to your daily routine can have a cumulative positive effect on your wellbeing.`;
        }
        
        return summary;
      };
      
      setFloCatsSummary(generateFloCatsSummary());
    }
  }, [user, refreshTrigger]);


  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Journal Summary</h2>
        {isGenerating && (
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-teal-500 rounded-full border-t-transparent mr-2"></div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Updating...</span>
          </div>
        )}
      </div>
      
      <div className="mb-6">
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">FloCats Summary</h3>
        <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
          {floCatsSummary || "Start journaling to get FloCats insights about your entries."}
        </p>
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