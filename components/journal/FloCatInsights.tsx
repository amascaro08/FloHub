import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { getCurrentDate, formatDate } from '@/lib/dateUtils';
import axios from 'axios';
import Image from 'next/image';

interface FloCatInsightsProps {
  refreshTrigger: number;
  timezone?: string;
}

interface JournalData {
  date: string;
  mood?: {
    emoji: string;
    label: string;
    score: number;
  };
  activities?: string[];
  sleep?: {
    quality: string;
    hours: number;
  };
  hasEntry?: boolean;
}

interface Insight {
  id: string;
  type: 'pattern' | 'encouragement' | 'suggestion' | 'streak';
  title: string;
  message: string;
  icon: string;
  confidence: number;
}

const FloCatInsights: React.FC<FloCatInsightsProps> = ({ refreshTrigger, timezone }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentInsight, setCurrentInsight] = useState(0);
  const { user } = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  useEffect(() => {
    analyzeJournalData();
  }, [user, refreshTrigger, timezone]);

  const analyzeJournalData = async () => {
    if (!user?.primaryEmail) return;

    setIsLoading(true);
    
    try {
      // Fetch the last 30 days of data
      const journalData: JournalData[] = [];
      const today = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayData: JournalData = { date: dateStr };
        
        try {
          // Fetch mood
          const moodResponse = await axios.get(`/api/journal/mood?date=${dateStr}`);
          if (moodResponse.data && moodResponse.data.emoji) {
            const moodScores: {[key: string]: number} = {
              '😞': 1, '😕': 2, '😐': 3, '🙂': 4, '😄': 5
            };
            dayData.mood = {
              emoji: moodResponse.data.emoji,
              label: moodResponse.data.label,
              score: moodScores[moodResponse.data.emoji] || 3
            };
          }
        } catch (error) {
          // No mood data for this day
        }
        
        try {
          // Fetch activities
          const activitiesResponse = await axios.get(`/api/journal/activities?date=${dateStr}`);
          if (activitiesResponse.data && activitiesResponse.data.activities) {
            dayData.activities = activitiesResponse.data.activities;
          }
        } catch (error) {
          // No activities data for this day
        }
        
        try {
          // Fetch sleep
          const sleepResponse = await axios.get(`/api/journal/sleep?date=${dateStr}`);
          if (sleepResponse.data && sleepResponse.data.quality) {
            dayData.sleep = {
              quality: sleepResponse.data.quality,
              hours: sleepResponse.data.hours || 7
            };
          }
        } catch (error) {
          // No sleep data for this day
        }
        
        try {
          // Check if there's an entry
          const entryResponse = await axios.get(`/api/journal/entry?date=${dateStr}`);
          dayData.hasEntry = !!(entryResponse.data && entryResponse.data.content);
        } catch (error) {
          dayData.hasEntry = false;
        }
        
        journalData.push(dayData);
      }
      
      // Generate insights from the data
      const generatedInsights = generateInsights(journalData);
      setInsights(generatedInsights);
      
    } catch (error) {
      console.error('Error analyzing journal data:', error);
      setInsights(getDefaultInsights());
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = (data: JournalData[]): Insight[] => {
    const insights: Insight[] = [];
    
    // Analyze journaling streak
    const journalingStreak = calculateJournalingStreak(data);
    if (journalingStreak >= 3) {
      insights.push({
        id: 'journaling_streak',
        type: 'streak',
        title: `${journalingStreak} Day Streak! 🔥`,
        message: `You've been journaling consistently for ${journalingStreak} days. That's amazing! Keep up the momentum.`,
        icon: '🔥',
        confidence: 100
      });
    }
    
    // Analyze mood patterns with activities
    const moodActivityPatterns = analyzeMoodActivityPatterns(data);
    if (moodActivityPatterns.length > 0) {
      insights.push(...moodActivityPatterns);
    }
    
    // Analyze sleep and mood correlation
    const sleepMoodInsight = analyzeSleepMoodCorrelation(data);
    if (sleepMoodInsight) {
      insights.push(sleepMoodInsight);
    }
    
    // Weekly progress analysis
    const weeklyProgress = analyzeWeeklyProgress(data);
    if (weeklyProgress) {
      insights.push(weeklyProgress);
    }
    
    // Activity frequency insights
    const activityInsights = analyzeActivityFrequency(data);
    if (activityInsights.length > 0) {
      insights.push(...activityInsights);
    }
    
    // If we don't have enough insights, add some encouragement
    if (insights.length < 2) {
      insights.push(...getEncouragementInsights(data));
    }
    
    // Sort by confidence and return top 4
    return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
  };

  const calculateJournalingStreak = (data: JournalData[]): number => {
    let streak = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].hasEntry) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const analyzeMoodActivityPatterns = (data: JournalData[]): Insight[] => {
    const insights: Insight[] = [];
    const activityMoodMap: {[key: string]: number[]} = {};
    
    // Build activity-mood correlation map
    data.forEach(day => {
      if (day.mood && day.activities) {
        day.activities.forEach(activity => {
          if (!activityMoodMap[activity]) {
            activityMoodMap[activity] = [];
          }
          activityMoodMap[activity].push(day.mood!.score);
        });
      }
    });
    
    // Find activities that correlate with good moods
    Object.entries(activityMoodMap).forEach(([activity, scores]) => {
      if (scores.length >= 3) {
        const avgMood = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        if (avgMood >= 4.0) {
          insights.push({
            id: `positive_activity_${activity}`,
            type: 'pattern',
            title: `${activity} = Happy You! 😊`,
            message: `I've noticed you tend to have better moods when you do ${activity.toLowerCase()}. Your average mood is ${avgMood.toFixed(1)}/5 on those days!`,
            icon: getActivityIcon(activity),
            confidence: Math.min(90, scores.length * 10)
          });
        }
        
        if (avgMood <= 2.5) {
          insights.push({
            id: `negative_activity_${activity}`,
            type: 'suggestion',
            title: `Consider Balancing ${activity}`,
            message: `${activity} seems to correlate with lower moods. Maybe try pairing it with something you enjoy?`,
            icon: getActivityIcon(activity),
            confidence: Math.min(80, scores.length * 8)
          });
        }
      }
    });
    
    return insights;
  };

  const analyzeSleepMoodCorrelation = (data: JournalData[]): Insight | null => {
    const sleepMoodData = data.filter(day => day.sleep && day.mood);
    
    if (sleepMoodData.length < 5) return null;
    
    const goodSleepDays = sleepMoodData.filter(day => 
      (day.sleep!.quality === 'Great' || day.sleep!.quality === 'Good') && day.sleep!.hours >= 7
    );
    
    const poorSleepDays = sleepMoodData.filter(day => 
      (day.sleep!.quality === 'Poor' || day.sleep!.quality === 'Terrible') || day.sleep!.hours < 6
    );
    
    if (goodSleepDays.length >= 3 && poorSleepDays.length >= 2) {
      const goodSleepMoodAvg = goodSleepDays.reduce((sum, day) => sum + day.mood!.score, 0) / goodSleepDays.length;
      const poorSleepMoodAvg = poorSleepDays.reduce((sum, day) => sum + day.mood!.score, 0) / poorSleepDays.length;
      
      if (goodSleepMoodAvg - poorSleepMoodAvg >= 0.8) {
        return {
          id: 'sleep_mood_correlation',
          type: 'pattern',
          title: 'Sleep = Better Mood! 😴',
          message: `Your mood is ${((goodSleepMoodAvg - poorSleepMoodAvg) * 20).toFixed(0)}% better when you get good sleep. Prioritizing rest really pays off!`,
          icon: '😴',
          confidence: 85
        };
      }
    }
    
    return null;
  };

  const analyzeWeeklyProgress = (data: JournalData[]): Insight | null => {
    const thisWeek = data.slice(-7);
    const lastWeek = data.slice(-14, -7);
    
    const thisWeekMoods = thisWeek.filter(day => day.mood).map(day => day.mood!.score);
    const lastWeekMoods = lastWeek.filter(day => day.mood).map(day => day.mood!.score);
    
    if (thisWeekMoods.length >= 3 && lastWeekMoods.length >= 3) {
      const thisWeekAvg = thisWeekMoods.reduce((a, b) => a + b, 0) / thisWeekMoods.length;
      const lastWeekAvg = lastWeekMoods.reduce((a, b) => a + b, 0) / lastWeekMoods.length;
      
      const improvement = thisWeekAvg - lastWeekAvg;
      
      if (improvement >= 0.5) {
        return {
          id: 'weekly_improvement',
          type: 'encouragement',
          title: 'Your Week is Looking Up! 📈',
          message: `Your mood has improved by ${(improvement * 20).toFixed(0)}% compared to last week. Whatever you're doing, keep it up!`,
          icon: '📈',
          confidence: 75
        };
      } else if (improvement <= -0.5) {
        return {
          id: 'weekly_support',
          type: 'encouragement',
          title: 'Tough Week? I See You 💚',
          message: `This week seems challenging. Remember, ups and downs are normal. Your journal shows you've bounced back before!`,
          icon: '💚',
          confidence: 70
        };
      }
    }
    
    return null;
  };

  const analyzeActivityFrequency = (data: JournalData[]): Insight[] => {
    const insights: Insight[] = [];
    const activityCounts: {[key: string]: number} = {};
    
    data.forEach(day => {
      if (day.activities) {
        day.activities.forEach(activity => {
          activityCounts[activity] = (activityCounts[activity] || 0) + 1;
        });
      }
    });
    
    const sortedActivities = Object.entries(activityCounts).sort((a, b) => b[1] - a[1]);
    
    if (sortedActivities.length > 0 && sortedActivities[0][1] >= 5) {
      const [topActivity, count] = sortedActivities[0];
      insights.push({
        id: 'top_activity',
        type: 'encouragement',
        title: `${topActivity} Champion! 🏆`,
        message: `You've done ${topActivity.toLowerCase()} ${count} times this month. You're really committed to this!`,
        icon: getActivityIcon(topActivity),
        confidence: 60
      });
    }
    
    return insights;
  };

  const getEncouragementInsights = (data: JournalData[]): Insight[] => {
    const encouragements = [
      {
        id: 'general_encouragement_1',
        type: 'encouragement' as const,
        title: 'Journaling Journey! ✨',
        message: "Every entry you write is a step toward better self-awareness. You're doing great!",
        icon: '✨',
        confidence: 50
      },
      {
        id: 'general_encouragement_2',
        type: 'encouragement' as const,
        title: 'Growing Through Writing 🌱',
        message: "Your commitment to journaling shows you care about your mental health. That's wonderful!",
        icon: '🌱',
        confidence: 50
      },
      {
        id: 'data_collection',
        type: 'suggestion' as const,
        title: 'More Data = Better Insights! 📊',
        message: "The more you track your moods and activities, the better I can help you spot patterns.",
        icon: '📊',
        confidence: 45
      }
    ];
    
    return encouragements;
  };

  const getDefaultInsights = (): Insight[] => [
    {
      id: 'welcome',
      type: 'encouragement',
      title: 'Welcome to Your Journey! 🌟',
      message: "I'm FloCat, and I'm here to help you discover patterns in your life. Start journaling and I'll learn with you!",
      icon: '🌟',
      confidence: 100
    }
  ];

  const getActivityIcon = (activity: string): string => {
    const icons: {[key: string]: string} = {
      'Work': '💼', 'Exercise': '🏋️', 'Social': '👥', 'Reading': '📚',
      'Gaming': '🎮', 'Family': '👨‍👩‍👧‍👦', 'Shopping': '🛒', 'Cooking': '🍳',
      'Cleaning': '🧹', 'TV': '📺', 'Movies': '🎬', 'Music': '🎵',
      'Outdoors': '🌳', 'Travel': '✈️', 'Relaxing': '🛌', 'Hobbies': '🎨',
      'Study': '📝', 'Meditation': '🧘', 'Art': '🖼️', 'Writing': '✍️'
    };
    return icons[activity] || '📌';
  };

  const nextInsight = () => {
    setCurrentInsight((prev) => (prev + 1) % insights.length);
  };

  const prevInsight = () => {
    setCurrentInsight((prev) => (prev - 1 + insights.length) % insights.length);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#00C9A7] to-[#FF6B6B] rounded-full flex items-center justify-center animate-pulse overflow-hidden">
            <Image
              src="/flocat-sidepeek.png"
              alt="FloCat"
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">FloCat's Insights</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Analyzing your journal patterns...</p>
          </div>
        </div>
        <div className="h-24 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#00C9A7] to-[#FF6B6B] rounded-full flex items-center justify-center overflow-hidden">
            <Image
              src="/flocat-sidepeek.png"
              alt="FloCat"
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">FloCat's Insights</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">No patterns detected yet</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#00C9A7]/10 to-[#FF6B6B]/10 rounded-xl p-4">
          <p className="text-slate-600 dark:text-slate-300">
            Keep journaling and tracking your moods! I need more data to spot patterns and give you personalized insights.
          </p>
        </div>
      </div>
    );
  }

  const currentInsightData = insights[currentInsight];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#00C9A7] to-[#FF6B6B] rounded-full flex items-center justify-center flocat-wiggle overflow-hidden">
            <Image
              src="/flocat-sidepeek.png"
              alt="FloCat"
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">FloCat's Insights</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Discovered {insights.length} pattern{insights.length !== 1 ? 's' : ''} in your journal
            </p>
          </div>
        </div>
        
        {insights.length > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={prevInsight}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {currentInsight + 1} of {insights.length}
            </span>
            
            <button
              onClick={nextInsight}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      <div className={`bg-gradient-to-br rounded-xl p-6 ${
        currentInsightData.type === 'pattern' ? 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' :
        currentInsightData.type === 'encouragement' ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' :
        currentInsightData.type === 'suggestion' ? 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20' :
        'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
      }`}>
        <div className="flex items-start space-x-4">
          <div className="text-3xl">{currentInsightData.icon}</div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {currentInsightData.title}
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentInsightData.message}
            </p>
            
            <div className="mt-4 flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentInsightData.type === 'pattern' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                currentInsightData.type === 'encouragement' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                currentInsightData.type === 'suggestion' ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200' :
                'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
              }`}>
                {currentInsightData.type.charAt(0).toUpperCase() + currentInsightData.type.slice(1)}
              </span>
              
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {currentInsightData.confidence}% confidence
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloCatInsights;