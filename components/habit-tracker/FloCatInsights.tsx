import React, { useState, useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { Habit, HabitCompletion } from '@/types/habit-tracker';
import { 
  SparklesIcon, 
  LightBulbIcon, 
  TrendingUpIcon,
  HeartIcon,
  ClockIcon,
  AcademicCapIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowRightIcon
} from '@heroicons/react/24/solid';

interface FloCatInsightsProps {
  habits: Habit[];
  completions: HabitCompletion[];
  stats: {
    totalHabits: number;
    todayCompleted: number;
    todayTotal: number;
    weeklyRate: number;
    longestStreak: number;
  };
}

interface InsightCard {
  id: string;
  type: 'motivation' | 'suggestion' | 'tip' | 'celebration';
  title: string;
  content: string;
  icon: React.ComponentType<any>;
  color: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const FloCatInsights: React.FC<FloCatInsightsProps> = ({
  habits,
  completions,
  stats
}) => {
  const { user } = useUser();
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [floCatStyle, setFloCatStyle] = useState('default');
  const [preferredName, setPreferredName] = useState('');

  // Load user settings for personalized FloCat messaging
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user?.primaryEmail) return;
      
      try {
        const response = await fetch('/api/userSettings');
        if (response.ok) {
          const settings = await response.json();
          setFloCatStyle(settings.floCatStyle || 'default');
          setPreferredName(settings.preferredName || '');
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    loadUserSettings();
  }, [user]);

  // Generate personalized insights based on habit data
  useEffect(() => {
    const generateInsights = () => {
      const newInsights: InsightCard[] = [];
      const today = new Date().toISOString().split('T')[0];
      
      // Get FloCat messages based on style
      const getFloCatMessage = (defaultMsg: string, moreCatty: string, lessCatty: string, professional: string) => {
        let msg = defaultMsg;
        switch(floCatStyle) {
          case 'more_catty': msg = moreCatty; break;
          case 'less_catty': msg = lessCatty; break;
          case 'professional': msg = professional; break;
        }
        
        // Personalize with preferred name
        if (preferredName) {
          msg = msg.replace(/you/gi, preferredName);
        }
        
        return msg;
      };

      // 1. Celebration for perfect days
      if (stats.todayCompleted === stats.todayTotal && stats.todayTotal > 0) {
        newInsights.push({
          id: 'perfect-day',
          type: 'celebration',
          title: getFloCatMessage(
            'Perfect Day! 🎉',
            'Purr-fect Day! 😸',
            'Great Work Today!',
            'Daily Goals Achieved'
          ),
          content: getFloCatMessage(
            'You completed all your habits today! You\'re building incredible momentum.',
            'Meow-velous! You completed all your habits today! Your consistency is absolutely paw-some! 🐾',
            'You completed all your habits today! Your consistency is impressive.',
            'All daily habits completed successfully. Excellent consistency demonstrated.'
          ),
          icon: SparklesIcon,
          color: 'green'
        });
      }

      // 2. Streak motivation
      if (stats.longestStreak >= 7) {
        newInsights.push({
          id: 'streak-celebration',
          type: 'celebration',
          title: getFloCatMessage(
            `Amazing ${stats.longestStreak}-Day Streak! 🔥`,
            `Fur-tastic ${stats.longestStreak}-Day Streak! 🔥😺`,
            `Excellent ${stats.longestStreak}-Day Streak!`,
            `${stats.longestStreak}-Day Consistency Record`
          ),
          content: getFloCatMessage(
            'Your dedication is paying off! Long streaks like this create lasting change.',
            'Your dedication is absolutely claw-some! Long streaks like this create lasting change. Keep up the purr-fect work!',
            'Your dedication is impressive! Consistency like this creates lasting positive change.',
            'Sustained consistency over extended periods demonstrates excellent habit formation.'
          ),
          icon: TrendingUpIcon,
          color: 'orange'
        });
      }

      // 3. Weekly performance insights
      if (stats.weeklyRate >= 80) {
        newInsights.push({
          id: 'weekly-performance',
          type: 'tip',
          title: getFloCatMessage(
            'Strong Weekly Performance! 💪',
            'Paw-some Weekly Performance! 💪😸',
            'Excellent Weekly Results!',
            'High Weekly Completion Rate'
          ),
          content: getFloCatMessage(
            `${stats.weeklyRate}% completion rate this week! You're in the zone. Consider adding a complementary habit.`,
            `${stats.weeklyRate}% completion rate this week! You're absolutely in the zone, fur real! Maybe it's time to add another habit? 🐱`,
            `${stats.weeklyRate}% completion rate this week shows excellent progress. Consider expanding your routine.`,
            `${stats.weeklyRate}% weekly completion rate indicates optimal performance. Consider additional habit integration.`
          ),
          icon: AcademicCapIcon,
          color: 'blue'
        });
      } else if (stats.weeklyRate < 50 && habits.length > 0) {
        newInsights.push({
          id: 'weekly-improvement',
          type: 'suggestion',
          title: getFloCatMessage(
            'Let\'s Boost Your Consistency 📈',
            'Let\'s Paw-sitively Boost Your Consistency! 📈😺',
            'Opportunity for Improvement',
            'Consistency Enhancement Recommended'
          ),
          content: getFloCatMessage(
            `${stats.weeklyRate}% completion this week. Try focusing on just one habit to build momentum first.`,
            `${stats.weeklyRate}% completion this week - no worries, we all have rough patches! Try focusing on just one habit to build momentum first. You\'ve got this! 🐾`,
            `${stats.weeklyRate}% completion this week suggests focusing on fewer habits to build consistency.`,
            `${stats.weeklyRate}% weekly completion rate. Recommend focusing on single habit optimization for improved consistency.`
          ),
          icon: LightBulbIcon,
          color: 'yellow'
        });
      }

      // 4. Habit suggestions based on time patterns
      const morningHabits = habits.filter(h => h.name.toLowerCase().includes('morning') || h.name.toLowerCase().includes('wake'));
      const eveningHabits = habits.filter(h => h.name.toLowerCase().includes('evening') || h.name.toLowerCase().includes('night'));
      
      if (habits.length > 0 && morningHabits.length === 0) {
        newInsights.push({
          id: 'morning-suggestion',
          type: 'suggestion',
          title: getFloCatMessage(
            'Consider a Morning Habit ☀️',
            'How About a Morning Habit? ☀️😸',
            'Morning Routine Suggestion',
            'Morning Habit Recommendation'
          ),
          content: getFloCatMessage(
            'Morning habits often have the highest success rates. Try adding a simple 5-minute morning routine!',
            'Morning habits often have the highest success rates! How about adding a simple 5-minute morning routine? It\'ll be paw-sitively energizing! 🌅',
            'Research shows morning habits have higher success rates. Consider a simple morning routine.',
            'Data indicates morning habits demonstrate superior adherence rates. Consider implementing a morning routine.'
          ),
          icon: ClockIcon,
          color: 'amber'
        });
      }

      // 5. Motivational insight for beginners
      if (habits.length === 1) {
        newInsights.push({
          id: 'first-habit',
          type: 'motivation',
          title: getFloCatMessage(
            'Your Habit Journey Begins! 🚀',
            'Your Paw-some Habit Journey Begins! 🚀😸',
            'Starting Your Habit Journey',
            'Habit Formation Initiative'
          ),
          content: getFloCatMessage(
            'Every expert was once a beginner. Focus on consistency over perfection with your first habit.',
            'Every expert was once a beginner, fur sure! Focus on consistency over perfection with your first habit. I\'m rooting for you! 🐾',
            'Starting with one habit is smart. Focus on building consistency before adding more.',
            'Single habit focus is optimal for initial habit formation. Prioritize consistency over expansion.'
          ),
          icon: HeartIcon,
          color: 'pink'
        });
      }

      // 6. No habits yet - encouragement
      if (habits.length === 0) {
        newInsights.push({
          id: 'get-started',
          type: 'suggestion',
          title: getFloCatMessage(
            'Ready to Start Building Habits? 🎯',
            'Ready to Start Building Paw-some Habits? 🎯😸',
            'Begin Your Habit Journey',
            'Habit Formation Opportunity'
          ),
          content: getFloCatMessage(
            'The best time to start was yesterday, the second best time is now! What positive change would you like to make?',
            'The best time to start was yesterday, the second best time is meow! What paw-sitive change would you like to make? 😺',
            'Starting a habit-building journey is a great decision. What positive change would you like to implement?',
            'Optimal time for habit implementation initiation. Identify desired behavioral modification target.'
          ),
          icon: SparklesIcon,
          color: 'primary'
        });
      }

      // 7. Weekly wrap-up and planning
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
        newInsights.push({
          id: 'weekend-reflection',
          type: 'tip',
          title: getFloCatMessage(
            'Weekend Reflection Time 🌟',
            'Weekend Paw-flection Time! 🌟😸',
            'Weekly Review Opportunity',
            'Weekly Performance Analysis'
          ),
          content: getFloCatMessage(
            'Weekends are perfect for reflecting on your habit progress and planning for the week ahead.',
            'Weekends are purr-fect for reflecting on your habit progress and planning for the week ahead! Take some time to celebrate your wins! 🎉',
            'Weekend periods provide excellent opportunities for habit progress review and weekly planning.',
            'Weekend timeframe optimal for habit performance analysis and subsequent weekly planning.'
          ),
          icon: ChatBubbleBottomCenterTextIcon,
          color: 'purple'
        });
      }

      setInsights(newInsights);
      setLoading(false);
    };

    if (habits !== undefined && completions !== undefined) {
      generateInsights();
    }
  }, [habits, completions, stats, floCatStyle, preferredName]);

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
      orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200',
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
      amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
      pink: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 text-pink-800 dark:text-pink-200',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
      primary: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-200'
    };
    return colorMap[color] || colorMap.primary;
  };

  if (loading) {
    return (
      <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:bg-gradient-to-br dark:from-purple-800 dark:to-purple-900 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl animate-pulse">😺</span>
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
              FloCat Insights
            </h2>
            <p className="text-grey-tint">Analyzing your habits...</p>
          </div>
        </div>
        
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-2xl w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-2xl w-1/2"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-xl">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:bg-gradient-to-br dark:from-purple-800 dark:to-purple-900 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">😺</span>
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
              FloCat Insights
            </h2>
            <p className="text-grey-tint leading-relaxed">
              Personalized insights and suggestions for your habit journey
            </p>
          </div>
        </div>

        {insights.length === 0 ? (
          <div className="text-center py-12">
            <SparklesIcon className="w-16 h-16 text-grey-tint mx-auto mb-6" />
            <h3 className="text-xl font-heading font-bold text-dark-base dark:text-soft-white mb-3">
              Building insights...
            </h3>
            <p className="text-grey-tint leading-relaxed max-w-md mx-auto">
              Keep tracking your habits and FloCat will provide personalized insights to help you improve! 😺
            </p>
          </div>
        ) : (
                      <div className="grid gap-6">
              {insights.map(insight => (
                <div
                  key={insight.id}
                  className={`p-6 rounded-2xl border shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 ${getColorClasses(insight.color)}`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <insight.icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading font-bold mb-3 text-lg">
                        {insight.title}
                      </h3>
                      <p className="leading-relaxed">
                        {insight.content}
                      </p>
                    {insight.action && (
                      <button
                        onClick={insight.action.onClick}
                        className="mt-3 inline-flex items-center text-sm font-medium hover:underline"
                      >
                        {insight.action.label}
                        <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-xl">
        <h3 className="text-xl font-heading font-bold text-dark-base dark:text-soft-white mb-6">
          Your Progress Summary
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {stats.totalHabits}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Total Habits
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.todayCompleted}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Completed Today
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.longestStreak}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Best Streak
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.weeklyRate}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Weekly Rate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloCatInsights;