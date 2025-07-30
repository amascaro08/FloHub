import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import axios from 'axios';

interface SleepInsightsProps {
  refreshTrigger?: number;
  timezone?: string;
}

interface SleepData {
  date: string;
  quality: string;
  hours: number;
}

const SleepInsights: React.FC<SleepInsightsProps> = ({ refreshTrigger = 0, timezone }) => {
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const fetchSleepData = async () => {
      if (!user?.primaryEmail) return;
      
      setIsLoading(true);
      try {
        // Fetch last 30 days of sleep data
        const dateRange: string[] = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dateRange.push(date.toISOString().split('T')[0]);
        }
        
        // Use batch API for sleep data
        const response = await axios.post('/api/journal/sleep/batch', { dates: dateRange }, { withCredentials: true });
        
        if (response.data?.sleep) {
          const sleepEntries: SleepData[] = [];
          
          dateRange.forEach(date => {
            const sleepInfo = response.data.sleep[date];
            if (sleepInfo && sleepInfo.quality && sleepInfo.hours) {
              sleepEntries.push({
                date,
                quality: sleepInfo.quality,
                hours: sleepInfo.hours
              });
            }
          });
          
          setSleepData(sleepEntries);
        }
      } catch (error) {
        console.error('Error fetching sleep data:', error);
        setSleepData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSleepData();
  }, [user, refreshTrigger, timezone]);

  // Calculate sleep insights
  const getSleepInsights = () => {
    if (sleepData.length === 0) return null;
    
    const totalHours = sleepData.reduce((sum, sleep) => sum + sleep.hours, 0);
    const avgHours = totalHours / sleepData.length;
    
    const qualityCounts = sleepData.reduce((acc, sleep) => {
      acc[sleep.quality] = (acc[sleep.quality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonQuality = Object.entries(qualityCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    const recentWeek = sleepData.slice(-7);
    const recentAvgHours = recentWeek.length > 0 
      ? recentWeek.reduce((sum, sleep) => sum + sleep.hours, 0) / recentWeek.length
      : avgHours;
    
    const goodSleepDays = sleepData.filter(sleep => 
      (sleep.quality === 'Great' || sleep.quality === 'Good') && sleep.hours >= 7
    ).length;
    
    const consistency = sleepData.length > 0 ? (goodSleepDays / sleepData.length) * 100 : 0;
    
    return {
      avgHours,
      recentAvgHours,
      mostCommonQuality,
      consistency,
      totalDays: sleepData.length,
      goodSleepDays
    };
  };

  const insights = getSleepInsights();

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
          <span className="text-2xl mr-3">😴</span>
          Sleep Insights
        </h3>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!insights || insights.totalDays === 0) {
    return (
      <>
        <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
          <span className="text-2xl mr-3">😴</span>
          Sleep Insights
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">😴</div>
          <p className="text-grey-tint text-sm">
            Start tracking your sleep to see insights and patterns!
          </p>
        </div>
      </>
    );
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'Great': return 'text-green-600 dark:text-green-400';
      case 'Good': return 'text-blue-600 dark:text-blue-400';
      case 'Fair': return 'text-yellow-600 dark:text-yellow-400';
      case 'Poor': return 'text-orange-600 dark:text-orange-400';
      case 'Terrible': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getConsistencyMessage = (consistency: number) => {
    if (consistency >= 80) return { message: "Excellent sleep consistency!", color: "text-green-600 dark:text-green-400" };
    if (consistency >= 60) return { message: "Good sleep routine", color: "text-blue-600 dark:text-blue-400" };
    if (consistency >= 40) return { message: "Room for improvement", color: "text-yellow-600 dark:text-yellow-400" };
    return { message: "Consider improving sleep habits", color: "text-orange-600 dark:text-orange-400" };
  };

  const consistencyInfo = getConsistencyMessage(insights.consistency);

  return (
    <>
      <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
        <span className="text-2xl mr-3">😴</span>
        Sleep Insights
      </h3>
      
      <div className="space-y-4">
        {/* Average Sleep Hours */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Average Sleep</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {insights.avgHours.toFixed(1)}h
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${Math.min((insights.avgHours / 10) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0h</span>
              <span>10h</span>
            </div>
          </div>
        </div>

        {/* Sleep Quality */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Most Common Quality</span>
            <span className={`text-lg font-semibold ${getQualityColor(insights.mostCommonQuality)}`}>
              {insights.mostCommonQuality}
            </span>
          </div>
        </div>

        {/* Sleep Consistency */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Sleep Consistency</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {insights.consistency.toFixed(0)}%
            </span>
          </div>
          <p className={`text-sm ${consistencyInfo.color}`}>
            {consistencyInfo.message}
          </p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full" 
                style={{ width: `${insights.consistency}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Recent Trend */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Recent Week Average</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {insights.recentAvgHours.toFixed(1)}h
            </span>
          </div>
          {insights.recentAvgHours > insights.avgHours ? (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              ↗ Getting more sleep lately!
            </p>
          ) : insights.recentAvgHours < insights.avgHours ? (
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
              ↘ Less sleep this week
            </p>
          ) : (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              → Consistent with your average
            </p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {insights.goodSleepDays}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Good Sleep Days</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {insights.totalDays}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Days Tracked</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SleepInsights;