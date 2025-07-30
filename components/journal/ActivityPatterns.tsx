import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import axios from 'axios';

interface ActivityPatternsProps {
  refreshTrigger?: number;
  timezone?: string;
}

interface ActivityData {
  date: string;
  activities: string[];
}

interface ActivityStats {
  activity: string;
  count: number;
  frequency: number;
  recentCount: number;
  trend: 'up' | 'down' | 'stable';
}

const ActivityPatterns: React.FC<ActivityPatternsProps> = ({ refreshTrigger = 0, timezone }) => {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const fetchActivityData = async () => {
      if (!user?.primaryEmail) return;
      
      setIsLoading(true);
      try {
        // Fetch last 30 days of activity data
        const dateRange: string[] = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dateRange.push(date.toISOString().split('T')[0]);
        }
        
        // Use batch API for activity data
        const response = await axios.post('/api/journal/activities/batch', { dates: dateRange }, { withCredentials: true });
        
        if (response.data?.activities) {
          const activityEntries: ActivityData[] = [];
          
          dateRange.forEach(date => {
            const dayActivities = response.data.activities[date];
            if (dayActivities && Array.isArray(dayActivities) && dayActivities.length > 0) {
              activityEntries.push({
                date,
                activities: dayActivities
              });
            }
          });
          
          setActivityData(activityEntries);
        }
      } catch (error) {
        console.error('Error fetching activity data:', error);
        setActivityData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchActivityData();
  }, [user, refreshTrigger, timezone]);

  // Calculate activity statistics
  const getActivityStats = (): ActivityStats[] => {
    if (activityData.length === 0) return [];
    
    const activityCounts: Record<string, number> = {};
    const recentActivityCounts: Record<string, number> = {};
    
    // Count all activities
    activityData.forEach((day, index) => {
      day.activities.forEach(activity => {
        activityCounts[activity] = (activityCounts[activity] || 0) + 1;
        
        // Count recent activities (last 7 days)
        if (index >= activityData.length - 7) {
          recentActivityCounts[activity] = (recentActivityCounts[activity] || 0) + 1;
        }
      });
    });
    
    const totalDays = 30;
    const recentDays = Math.min(7, activityData.length);
    
    // Calculate trends and stats
    const stats: ActivityStats[] = Object.entries(activityCounts).map(([activity, count]) => {
      const frequency = (count / totalDays) * 100;
      const recentCount = recentActivityCounts[activity] || 0;
      const recentFrequency = (recentCount / recentDays) * 100;
      const averageFrequency = frequency;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (recentFrequency > averageFrequency * 1.2) {
        trend = 'up';
      } else if (recentFrequency < averageFrequency * 0.8) {
        trend = 'down';
      }
      
      return {
        activity,
        count,
        frequency,
        recentCount,
        trend
      };
    });
    
    return stats.sort((a, b) => b.count - a.count);
  };

  const activityStats = getActivityStats();
  const topActivities = activityStats.slice(0, 8);

  // Get activity icon
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

  // Get trend indicator
  const getTrendIndicator = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return { icon: '📈', color: 'text-green-600 dark:text-green-400', label: 'Increasing' };
      case 'down': return { icon: '📉', color: 'text-red-600 dark:text-red-400', label: 'Decreasing' };
      default: return { icon: '➡️', color: 'text-blue-600 dark:text-blue-400', label: 'Stable' };
    }
  };

  // Get frequency color
  const getFrequencyColor = (frequency: number) => {
    if (frequency >= 60) return 'bg-green-500';
    if (frequency >= 40) return 'bg-blue-500';
    if (frequency >= 20) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
          <span className="text-2xl mr-3">🎯</span>
          Activity Patterns
        </h3>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (activityStats.length === 0) {
    return (
      <>
        <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
          <span className="text-2xl mr-3">🎯</span>
          Activity Patterns
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-grey-tint text-sm">
            Start tracking activities to see patterns and trends!
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
        <span className="text-2xl mr-3">🎯</span>
        Activity Patterns
      </h3>
      
      <div className="space-y-4">
        {/* Top Activities */}
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
            Most Frequent Activities (Last 30 Days)
          </h4>
          <div className="space-y-2">
            {topActivities.map((stat) => {
              const trendInfo = getTrendIndicator(stat.trend);
              return (
                <div key={stat.activity} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getActivityIcon(stat.activity)}</span>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {stat.activity}
                        </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {stat.count} times
                          </span>
                          <span className={`text-xs ${trendInfo.color}`}>
                            {trendInfo.icon} {trendInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {stat.frequency.toFixed(0)}%
                      </div>
                      <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${getFrequencyColor(stat.frequency)}`}
                          style={{ width: `${Math.min(stat.frequency, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Diversity */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
            Activity Diversity
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {activityStats.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Unique Activities</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {activityData.reduce((sum, day) => sum + day.activities.length, 0)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Total Entries</div>
            </div>
          </div>
        </div>

        {/* Recent Trends */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
            Recent Trends (Last 7 Days)
          </h4>
          <div className="space-y-2">
            {activityStats.filter(stat => stat.trend !== 'stable').slice(0, 4).map((stat) => {
              const trendInfo = getTrendIndicator(stat.trend);
              return (
                <div key={stat.activity} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>{getActivityIcon(stat.activity)}</span>
                    <span className="text-sm text-gray-900 dark:text-white">{stat.activity}</span>
                  </div>
                  <div className={`flex items-center space-x-1 text-xs ${trendInfo.color}`}>
                    <span>{trendInfo.icon}</span>
                    <span>{stat.recentCount} times this week</span>
                  </div>
                </div>
              );
            })}
            {activityStats.filter(stat => stat.trend !== 'stable').length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center">
                Your activity patterns are stable
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ActivityPatterns;