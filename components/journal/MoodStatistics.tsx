import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { getCurrentDate, getDateStorageKey } from '@/lib/dateUtils';
import axios from 'axios';

interface MoodStatisticsProps {
  timezone?: string;
  refreshTrigger?: number;
}

interface MoodData {
  date: string;
  emoji: string;
  label: string;
  activities?: string[];
}

interface ActivityCorrelation {
  activity: string;
  count: number;
  moodScore: number;
}

const MoodStatistics: React.FC<MoodStatisticsProps> = ({ timezone, refreshTrigger = 0 }) => {
  const [moodData, setMoodData] = useState<MoodData[]>([]);
  const [activityCorrelations, setActivityCorrelations] = useState<{[key: string]: ActivityCorrelation}>({});
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days'>('30days');
 const { user, isLoading } = useUser();
  const userData = user ? user : null;

  if (!user) {
    return <div>Loading...</div>; // Or any other fallback UI
  }

  // Load mood data and calculate statistics from API
  useEffect(() => {
    const fetchMoodData = async () => {
      if (user?.primaryEmail) {
        // Determine how many days to look back based on timeRange
        const daysToLookBack = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
        
        // Load mood data from the specified time range
        const moodEntries: MoodData[] = [];
        const today = new Date();
        const activityMoodMap: {[key: string]: {count: number, totalScore: number}} = {};
        
        for (let i = daysToLookBack - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = formatDate(date);
          
          try {
            // Try to load mood for this date
            const moodResponse = await axios.get(`/api/journal/mood?date=${dateStr}`);
            
            // Check if we have actual mood data (not empty defaults)
            if (moodResponse.data && moodResponse.data.emoji && moodResponse.data.label) {
              const entry: MoodData = {
                date: dateStr,
                emoji: moodResponse.data.emoji,
                label: moodResponse.data.label
              };
              
              // Try to load activities for this date
              try {
                const activitiesResponse = await axios.get(`/api/journal/activities?date=${dateStr}`);
                
                if (activitiesResponse.data &&
                    activitiesResponse.data.activities &&
                    Array.isArray(activitiesResponse.data.activities) &&
                    activitiesResponse.data.activities.length > 0) {
                  entry.activities = activitiesResponse.data.activities;
                  
                  // Calculate mood score (1-5)
                  const moodScores: {[key: string]: number} = {
                    'Rad': 5,
                    'Good': 4,
                    'Meh': 3,
                    'Bad': 2,
                    'Awful': 1
                  };
                  
                  const moodScore = moodScores[moodResponse.data.label] || 3;
                  
                  // Update activity correlations
                  activitiesResponse.data.activities.forEach((activity: string) => {
                    if (!activityMoodMap[activity]) {
                      activityMoodMap[activity] = { count: 0, totalScore: 0 };
                    }
                    
                    activityMoodMap[activity].count += 1;
                    activityMoodMap[activity].totalScore += moodScore;
                  });
                }
              } catch (error) {
                console.error(`Error fetching activities for ${dateStr}:`, error);
              }
              
              moodEntries.push(entry);
            } else {
              // Add placeholder for days without mood data
              moodEntries.push({
                date: dateStr,
                emoji: '',
                label: ''
              });
            }
          } catch (error) {
            console.error(`Error fetching mood for ${dateStr}:`, error);
            // Add placeholder for days without mood data
            moodEntries.push({
              date: dateStr,
              emoji: '',
              label: ''
            });
          }
        }
        
        setMoodData(moodEntries);
        
        // Calculate average mood score for each activity
        const correlations: {[key: string]: ActivityCorrelation} = {};
        Object.entries(activityMoodMap).forEach(([activity, data]) => {
          correlations[activity] = {
            activity,
            count: data.count,
            moodScore: data.count > 0 ? data.totalScore / data.count : 0
          };
        });
        
        setActivityCorrelations(correlations);
      }
    };
    
    if (user?.primaryEmail) {
      fetchMoodData();
    }
  }, [user, timezone, timeRange, refreshTrigger]);

  // Helper function to format date
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Count occurrences of each mood
  const getMoodCounts = () => {
    const counts: {[key: string]: number} = {
      'Rad': 0,
      'Good': 0,
      'Meh': 0,
      'Bad': 0,
      'Awful': 0
    };
    
    moodData.forEach(mood => {
      if (mood.label && counts[mood.label] !== undefined) {
        counts[mood.label] += 1;
      }
    });
    
    return counts;
  };

  // Get mood distribution percentages
  const getMoodPercentages = () => {
    const counts = getMoodCounts();
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) return counts;
    
    const percentages: {[key: string]: number} = {};
    Object.entries(counts).forEach(([mood, count]) => {
      percentages[mood] = Math.round((count / total) * 100);
    });
    
    return percentages;
  };

  // Get top activities correlated with good moods
  const getTopActivitiesForMood = (threshold: number = 4) => {
    return Object.values(activityCorrelations)
      .filter(correlation => correlation.count >= 2 && correlation.moodScore >= threshold)
      .sort((a, b) => b.moodScore - a.moodScore)
      .slice(0, 5);
  };

  // Get activities correlated with bad moods
  const getActivitiesForBadMood = (threshold: number = 3) => {
    return Object.values(activityCorrelations)
      .filter(correlation => correlation.count >= 2 && correlation.moodScore < threshold)
      .sort((a, b) => a.moodScore - b.moodScore)
      .slice(0, 5);
  };

  // Get mood emoji based on label
  const getMoodEmoji = (label: string): string => {
    const emojiMap: {[key: string]: string} = {
      'Rad': '😄',
      'Good': '🙂',
      'Meh': '😐',
      'Bad': '😕',
      'Awful': '😞'
    };
    
    return emojiMap[label] || '';
  };

  // Get color based on mood label
  const getMoodColor = (label: string): string => {
    const colorMap: {[key: string]: string} = {
      'Rad': 'bg-purple-500',
      'Good': 'bg-green-500',
      'Meh': 'bg-yellow-500',
      'Bad': 'bg-orange-500',
      'Awful': 'bg-red-500'
    };
    
    return colorMap[label] || 'bg-slate-300';
  };

  const percentages = getMoodPercentages();
  const topGoodActivities = getTopActivitiesForMood();
  const topBadActivities = getActivitiesForBadMood();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Mood Statistics</h2>
        
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-2 py-1 text-xs ${
              timeRange === '7days' 
                ? 'bg-teal-500 text-white' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-2 py-1 text-xs ${
              timeRange === '30days' 
                ? 'bg-teal-500 text-white' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90days')}
            className={`px-2 py-1 text-xs ${
              timeRange === '90days' 
                ? 'bg-teal-500 text-white' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>
      
      {/* Mood Distribution Chart */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mood Distribution
        </h3>
        
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
          {/* Horizontal bar chart */}
          <div className="space-y-3">
            {Object.entries(percentages).map(([mood, percentage]) => (
              <div key={mood} className="flex items-center">
                <div className="w-16 text-sm flex items-center">
                  <span className="mr-2">{getMoodEmoji(mood)}</span>
                  <span>{mood}</span>
                </div>
                <div className="flex-grow h-5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getMoodColor(mood)} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-8 text-right text-sm font-medium ml-2">
                  {percentage}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Mood Trend Line */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mood Trend
        </h3>
        
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
          <div className="h-24 flex items-end">
            {moodData.map((mood, index) => {
              const moodScores: {[key: string]: number} = {
                'Rad': 5,
                'Good': 4,
                'Meh': 3,
                'Bad': 2,
                'Awful': 1
              };
              
              const height = mood.label ? ((moodScores[mood.label] || 3) / 5) * 100 : 0;
              const displayCount = timeRange === '7days' ? 7 : timeRange === '30days' ? 15 : 30;
              const startIdx = Math.max(0, moodData.length - displayCount);
              
              // Only display a subset of data points based on the time range
              if (index < startIdx && index !== 0) return null;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-2 rounded-t-sm transition-all ${
                      mood.label
                        ? getMoodColor(mood.label)
                        : 'bg-slate-200 dark:bg-slate-600'
                    }`}
                    style={{ height: `${height}%` }}
                  ></div>
                  {mood.emoji && (
                    <span className="text-xs mt-1">{mood.emoji}</span>
                  )}
                  {(index === 0 || index === moodData.length - 1 || (index - startIdx) % 5 === 0) && (
                    <span className="text-xs mt-1 transform -rotate-45 origin-top-left">
                      {new Date(mood.date).getDate()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Activity Correlations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Positive Correlations */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Activities for Good Mood
          </h3>
          
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            {topGoodActivities.length > 0 ? (
              <ul className="space-y-2">
                {topGoodActivities.map(correlation => (
                  <li key={correlation.activity} className="flex justify-between items-center">
                    <span className="text-sm">{correlation.activity}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      {correlation.count}x {getMoodEmoji('Good')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Not enough data yet
              </p>
            )}
          </div>
        </div>
        
        {/* Negative Correlations */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Activities for Bad Mood
          </h3>
          
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            {topBadActivities.length > 0 ? (
              <ul className="space-y-2">
                {topBadActivities.map(correlation => (
                  <li key={correlation.activity} className="flex justify-between items-center">
                    <span className="text-sm">{correlation.activity}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                      {correlation.count}x {getMoodEmoji('Bad')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Not enough data yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodStatistics;