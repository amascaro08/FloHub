import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import axios from 'axios';

interface TrendsProps {
  refreshTrigger?: number;
  timezone?: string;
}

interface DayData {
  date: string;
  mood?: {
    emoji: string;
    label: string;
    score: number;
  };
  activities?: string[];
}

interface TrendAnalysis {
  moodTrend: 'improving' | 'declining' | 'stable';
  moodChange: number;
  weeklyAverage: number;
  monthlyAverage: number;
  bestDay: string;
  challengingDay: string;
  consistentActivities: string[];
  moodBoostingActivities: string[];
}

const Trends: React.FC<TrendsProps> = ({ refreshTrigger = 0, timezone }) => {
  const [trendData, setTrendData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const fetchTrendData = async () => {
      if (!user?.primaryEmail) return;
      
      setIsLoading(true);
      try {
        // Fetch last 30 days of data
        const dateRange: string[] = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dateRange.push(date.toISOString().split('T')[0]);
        }
        
        // Use batch APIs for all data
        const [moodsResponse, activitiesResponse] = await Promise.allSettled([
          axios.post('/api/journal/moods/batch', { dates: dateRange }, { withCredentials: true }),
          axios.post('/api/journal/activities/batch', { dates: dateRange }, { withCredentials: true })
        ]);
        
        const moodsData = moodsResponse.status === 'fulfilled' ? moodsResponse.value.data.moods : {};
        const activitiesData = activitiesResponse.status === 'fulfilled' ? activitiesResponse.value.data.activities : {};
        
        const dayData: DayData[] = dateRange.map(date => {
          const dayInfo: DayData = { date };
          
          // Add mood data
          const moodInfo = moodsData[date];
          if (moodInfo && moodInfo.emoji && moodInfo.label) {
            const moodScores: Record<string, number> = {
              'Rad': 5, 'Good': 4, 'Meh': 3, 'Bad': 2, 'Awful': 1
            };
            dayInfo.mood = {
              emoji: moodInfo.emoji,
              label: moodInfo.label,
              score: moodScores[moodInfo.label] || 3
            };
          }
          
          // Add activity data
          const dayActivities = activitiesData[date];
          if (dayActivities && Array.isArray(dayActivities)) {
            dayInfo.activities = dayActivities;
          }
          
          return dayInfo;
        });
        
        setTrendData(dayData);
      } catch (error) {
        console.error('Error fetching trend data:', error);
        setTrendData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrendData();
  }, [user, refreshTrigger, timezone]);

  // Analyze trends
  const analyzeTrends = (): TrendAnalysis | null => {
    const daysWithMood = trendData.filter(day => day.mood);
    if (daysWithMood.length < 5) return null;
    
    // Calculate mood trends
    const recentWeek = daysWithMood.slice(-7);
    const previousWeek = daysWithMood.slice(-14, -7);
    
    const weeklyAverage = recentWeek.reduce((sum, day) => sum + (day.mood?.score || 0), 0) / recentWeek.length;
    const previousWeekAverage = previousWeek.length > 0 
      ? previousWeek.reduce((sum, day) => sum + (day.mood?.score || 0), 0) / previousWeek.length
      : weeklyAverage;
    
    const monthlyAverage = daysWithMood.reduce((sum, day) => sum + (day.mood?.score || 0), 0) / daysWithMood.length;
    const moodChange = weeklyAverage - previousWeekAverage;
    
    let moodTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (moodChange > 0.3) moodTrend = 'improving';
    else if (moodChange < -0.3) moodTrend = 'declining';
    
    // Find best and challenging days
    const sortedByMood = [...daysWithMood].sort((a, b) => (b.mood?.score || 0) - (a.mood?.score || 0));
    const bestDay = sortedByMood[0]?.date || '';
    const challengingDay = sortedByMood[sortedByMood.length - 1]?.date || '';
    
    // Analyze activity patterns
    const activityMoodMap: Record<string, { scores: number[]; count: number }> = {};
    const activityFrequency: Record<string, number> = {};
    
    trendData.forEach(day => {
      if (day.activities && day.mood) {
        day.activities.forEach(activity => {
          if (!activityMoodMap[activity]) {
            activityMoodMap[activity] = { scores: [], count: 0 };
          }
          activityMoodMap[activity].scores.push(day.mood!.score);
          activityMoodMap[activity].count++;
          
          activityFrequency[activity] = (activityFrequency[activity] || 0) + 1;
        });
      }
    });
    
    // Find consistent activities (appeared in >50% of days with activities)
    const daysWithActivities = trendData.filter(day => day.activities && day.activities.length > 0).length;
    const consistentActivities = Object.entries(activityFrequency)
      .filter(([, count]) => count > daysWithActivities * 0.5)
      .map(([activity]) => activity)
      .slice(0, 3);
    
    // Find mood-boosting activities
    const moodBoostingActivities = Object.entries(activityMoodMap)
      .filter(([, data]) => data.count >= 3)
      .map(([activity, data]) => ({
        activity,
        avgMood: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
      }))
      .filter(item => item.avgMood >= 4)
      .sort((a, b) => b.avgMood - a.avgMood)
      .slice(0, 3)
      .map(item => item.activity);
    
    return {
      moodTrend,
      moodChange,
      weeklyAverage,
      monthlyAverage,
      bestDay,
      challengingDay,
      consistentActivities,
      moodBoostingActivities
    };
  };

  const analysis = analyzeTrends();

  // Helper functions
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return 'text-green-600 dark:text-green-400';
      case 'declining': return 'text-red-600 dark:text-red-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getActivityIcon = (activity: string): string => {
    const icons: Record<string, string> = {
      'Work': '💼', 'Exercise': '🏋️', 'Social': '👥', 'Reading': '📚',
      'Gaming': '🎮', 'Family': '👨‍👩‍👧‍👦', 'Shopping': '🛒', 'Cooking': '🍳',
      'Cleaning': '🧹', 'TV': '📺', 'Movies': '🎬', 'Music': '🎵',
      'Outdoors': '🌳', 'Travel': '✈️', 'Relaxing': '🛌', 'Hobbies': '🎨',
      'Study': '📝', 'Meditation': '🧘', 'Art': '🖼️', 'Writing': '✍️'
    };
    return icons[activity] || '📌';
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
          <span className="text-2xl mr-3">📈</span>
          Trends
        </h3>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <>
        <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
          <span className="text-2xl mr-3">📈</span>
          Trends
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📈</div>
          <p className="text-grey-tint text-sm">
            Track moods and activities for 5+ days to see trends and patterns!
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
        <span className="text-2xl mr-3">📈</span>
        Trends
      </h3>
      
      <div className="space-y-4">
        {/* Mood Trend Overview */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Mood Trend
            </h4>
            <span className={`text-lg ${getTrendColor(analysis.moodTrend)}`}>
              {getTrendIcon(analysis.moodTrend)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {analysis.weeklyAverage.toFixed(1)}/5
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">This Week</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {analysis.monthlyAverage.toFixed(1)}/5
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">30-Day Average</div>
            </div>
          </div>
          <div className={`mt-2 text-sm ${getTrendColor(analysis.moodTrend)}`}>
            {analysis.moodTrend === 'improving' && `Mood improving by ${analysis.moodChange.toFixed(1)} points`}
            {analysis.moodTrend === 'declining' && `Mood declining by ${Math.abs(analysis.moodChange).toFixed(1)} points`}
            {analysis.moodTrend === 'stable' && 'Mood remains stable'}
          </div>
        </div>

        {/* Notable Days */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">🌟</span>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Best Day</h4>
            </div>
            <div className="text-sm text-gray-900 dark:text-white">
              {formatDate(analysis.bestDay)}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">💙</span>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Tough Day</h4>
            </div>
            <div className="text-sm text-gray-900 dark:text-white">
              {formatDate(analysis.challengingDay)}
            </div>
          </div>
        </div>

        {/* Consistent Activities */}
        {analysis.consistentActivities.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
              Your Consistent Habits
            </h4>
            <div className="space-y-2">
              {analysis.consistentActivities.map(activity => (
                <div key={activity} className="flex items-center space-x-2">
                  <span>{getActivityIcon(activity)}</span>
                  <span className="text-sm text-gray-900 dark:text-white">{activity}</span>
                  <span className="text-xs text-green-600 dark:text-green-400">Consistent</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mood-Boosting Activities */}
        {analysis.moodBoostingActivities.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
              Activities That Boost Your Mood
            </h4>
            <div className="space-y-2">
              {analysis.moodBoostingActivities.map(activity => (
                <div key={activity} className="flex items-center space-x-2">
                  <span>{getActivityIcon(activity)}</span>
                  <span className="text-sm text-gray-900 dark:text-white">{activity}</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Mood Booster</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mini Mood Chart */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
            Last 14 Days
          </h4>
          <div className="flex items-end h-16 space-x-1">
            {trendData.slice(-14).map((day, index) => {
              const height = day.mood ? (day.mood.score / 5) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t ${
                      day.mood
                        ? day.mood.score >= 4
                          ? 'bg-green-500'
                          : day.mood.score >= 3
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    style={{ height: `${height}%` }}
                  ></div>
                  {day.mood && (
                    <span className="text-xs mt-1">{day.mood.emoji}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Trends;