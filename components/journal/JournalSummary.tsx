import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import axios from 'axios';

interface JournalSummaryProps {
  refreshTrigger?: number; // Trigger to refresh the summary 
}

interface MoodData {
  date: string;
  emoji: string;
  label: string;
  tags?: string[];
}

interface JournalEntry {
  date: string;
  hasContent: boolean;
}

const JournalSummary: React.FC<JournalSummaryProps> = ({ refreshTrigger = 0 }) => {
  const [moodData, setMoodData] = useState<MoodData[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [topThemes, setTopThemes] = useState<{theme: string, count: number}[]>([]);
  const [floCatsSummary, setFloCatsSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useUser();

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchJournalData = async () => {
      if (!user?.primaryEmail) return;

      setIsLoading(true);
      try {
        // Generate date range for last 30 days
        const dateRange: string[] = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dateRange.push(date.toISOString().split('T')[0]);
        }

        // Fetch data using batch APIs
        const [entriesResponse, moodsResponse] = await Promise.allSettled([
          axios.post('/api/journal/entries/batch', { dates: dateRange }, { withCredentials: true }),
          axios.post('/api/journal/moods/batch', { dates: dateRange }, { withCredentials: true })
        ]);

        // Process entries data
        const entriesData = entriesResponse.status === 'fulfilled' ? entriesResponse.value.data.entries : {};
        const journalEntryList: JournalEntry[] = [];
        
        Object.entries(entriesData).forEach(([date, hasContent]) => {
          if (hasContent) {
            journalEntryList.push({ date, hasContent: true });
          }
        });
        
        setJournalEntries(journalEntryList);

        // Process moods data
        const moodsData = moodsResponse.status === 'fulfilled' ? moodsResponse.value.data.moods : {};
        const moodEntries: MoodData[] = [];
        const allTags: Record<string, number> = {};

        Object.entries(moodsData).forEach(([date, moodInfo]) => {
          if (moodInfo && (moodInfo as any).emoji && (moodInfo as any).label) {
            const mood = moodInfo as any;
            moodEntries.push({
              date,
              emoji: mood.emoji,
              label: mood.label,
              tags: mood.tags || []
            });

            // Count tags for themes
            if (mood.tags && Array.isArray(mood.tags)) {
              mood.tags.forEach((tag: string) => {
                allTags[tag] = (allTags[tag] || 0) + 1;
              });
            }
          }
        });

        setMoodData(moodEntries);

        // Get top themes
        const themes = Object.entries(allTags)
          .map(([theme, count]) => ({ theme, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setTopThemes(themes);
        
        // Generate FloCats summary
        setFloCatsSummary(generateFloCatsSummary(moodEntries, journalEntryList, themes));
      } catch (error) {
        console.error('Error fetching journal data:', error);
        setFloCatsSummary("Unable to load journal summary. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJournalData();
  }, [user, refreshTrigger]);

  const generateFloCatsSummary = (moods: MoodData[], entries: JournalEntry[], themes: {theme: string, count: number}[]): string => {
    // If no data, return encouraging message
    if (moods.length === 0 && entries.length === 0) {
      return "Start journaling to get FloCats insights about your entries! Track your moods and write about your day to see personalized patterns and advice.";
    }

    let summary = "";
    
    // Journal activity summary
    const journalDays = entries.length;
    const totalPossibleDays = 30;
    const journalConsistency = (journalDays / totalPossibleDays) * 100;
    
    if (journalDays > 0) {
      summary += `You've been journaling for ${journalDays} days this month`;
      if (journalConsistency >= 80) {
        summary += " - excellent consistency! ";
      } else if (journalConsistency >= 50) {
        summary += " - good progress! ";
      } else {
        summary += ". Consider setting a daily reminder to build the habit. ";
      }
    }

    // Mood analysis
    if (moods.length > 0) {
      // Count mood frequencies
      const moodCounts: Record<string, number> = {};
      moods.forEach(mood => {
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

      summary += `Your mood has been predominantly ${mostCommonMood.toLowerCase()} recently. `;

      // Calculate mood trend
      const moodScores: {[key: string]: number} = {
        'Rad': 5, 'Good': 4, 'Meh': 3, 'Bad': 2, 'Awful': 1
      };

      const recentMoods = moods
        .filter(m => m.label)
        .map(m => moodScores[m.label] || 3);

      if (recentMoods.length >= 5) {
        const recentAvg = recentMoods.slice(-7).reduce((sum, val) => sum + val, 0) / Math.min(7, recentMoods.length);
        const olderAvg = recentMoods.slice(0, -7).reduce((sum, val) => sum + val, 0) / Math.max(1, recentMoods.length - 7);

        if (recentAvg - olderAvg > 0.3) {
          summary += "Your mood has been improving lately - keep up whatever positive changes you've made! ";
        } else if (olderAvg - recentAvg > 0.3) {
          summary += "Your mood seems to have dipped recently. Consider what factors might be affecting your wellbeing. ";
        } else {
          summary += "Your mood has been relatively stable. ";
        }
      }

      // Add theme insights
      if (themes.length > 0) {
        summary += `Looking at your mood tags, ${themes[0].theme}`;
        if (themes.length > 1) {
          summary += ` and ${themes[1].theme}`;
        }
        summary += ` seem to be significant themes in your life right now. `;
      }

      // Personalized advice based on dominant mood
      if (mostCommonMood === "Awful" || mostCommonMood === "Bad") {
        summary += "Consider activities that have previously improved your mood, and don't hesitate to reach out for support when needed.";
      } else if (mostCommonMood === "Rad" || mostCommonMood === "Good") {
        summary += "You're doing great! Consider noting what specific activities or situations contribute to these positive feelings.";
      } else {
        summary += "Try identifying patterns between your activities and mood to discover what brings you the most joy and fulfillment.";
      }
    } else if (entries.length > 0) {
      summary += "You've been consistent with journaling! Consider adding mood tracking to gain deeper insights into your emotional patterns and wellbeing trends.";
    }

    return summary;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Journal Summary</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Overview of your journal entries</p>
          </div>
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-teal-500 rounded-full border-t-transparent mr-2"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Journal Summary</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Overview of your journal entries</p>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">FloCat's Insights</h3>
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {floCatsSummary}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {journalEntries.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">Days Journaled</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {moodData.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">Moods Tracked</div>
        </div>
      </div>
      
      <div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">Top Themes</h3>
        <div className="flex flex-wrap gap-2">
          {topThemes.length > 0 ? (
            topThemes.map(({ theme, count }) => (
              <div 
                key={theme}
                className="px-3 py-1.5 rounded-full text-sm bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-900 dark:to-teal-800 text-teal-700 dark:text-teal-200 border border-teal-200 dark:border-teal-700 font-medium"
              >
                {theme} ({count})
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
              Add tags to your mood entries to see themes
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalSummary;