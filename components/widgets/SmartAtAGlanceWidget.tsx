import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle,
  Clock,
  Target,
  Heart,
  Zap,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface ProactiveSuggestion {
  type: 'habit_adjustment' | 'workflow_optimization' | 'time_management' | 'task_priority' | 'health_reminder' | 'productivity_tip';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionable: boolean;
  action?: {
    type: string;
    data: any;
  };
  reasoning: string;
  confidence: number;
}

interface SmartSummary {
  suggestions: ProactiveSuggestion[];
  insights: {
    taskPatterns: {
      completionRate: number;
      overdueTasks: number;
      commonTags: string[];
      preferredDays: string[];
    };
    habitPatterns: {
      strugglingHabits: any[];
      successfulHabits: any[];
      consistencyScores: { [habitId: string]: number };
    };
    timePatterns: {
      mostActiveHours: number[];
      mostProductiveDay: string;
    };
    productivity: {
      tasksPerDay: number;
      goalAchievementRate: number;
    };
  };
}

export default function SmartAtAGlanceWidget() {
  const [smartSummary, setSmartSummary] = useState<SmartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);

  const fetchSmartSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assistant/smart-summary');
      if (!response.ok) {
        throw new Error('Failed to fetch smart summary');
      }
      const data = await response.json();
      setSmartSummary(data);
    } catch (err) {
      console.error('Error fetching smart summary:', err);
      setError('Failed to load smart insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSmartSummary();
  }, []);

  const handleActionableSuggestion = async (suggestion: ProactiveSuggestion) => {
    if (!suggestion.actionable || !suggestion.action) return;

    try {
      // Execute the actionable suggestion
      const response = await fetch('/api/assistant/execute-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: suggestion.action,
          suggestionId: suggestion.title
        }),
      });

      if (response.ok) {
        // Refresh the summary after action
        await fetchSmartSummary();
      }
    } catch (error) {
      console.error('Error executing suggestion:', error);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'habit_adjustment':
        return <Target className="w-4 h-4" />;
      case 'workflow_optimization':
        return <TrendingUp className="w-4 h-4" />;
      case 'time_management':
        return <Clock className="w-4 h-4" />;
      case 'task_priority':
        return <AlertTriangle className="w-4 h-4" />;
      case 'health_reminder':
        return <Heart className="w-4 h-4" />;
      case 'productivity_tip':
        return <Zap className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="smart-at-a-glance-widget bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-[#00C9A7]" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Smart Insights
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-[#00C9A7]" />
          <span className="ml-2 text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>Analyzing your patterns...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="smart-at-a-glance-widget bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-[#00C9A7]" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Smart Insights
          </h2>
        </div>
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-[#FF6B6B]" />
          <p style={{ fontFamily: 'Inter, sans-serif' }}>{error}</p>
          <button 
            onClick={fetchSmartSummary}
            className="mt-4 px-4 py-2 bg-[#00C9A7] text-white rounded-lg hover:bg-[#00A8A7] transition-colors font-medium"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!smartSummary) {
    return null;
  }

  const { suggestions, insights } = smartSummary;

  return (
    <div className="smart-at-a-glance-widget bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
      {/* Proactive Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-[#FF6B6B]" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              AI Suggestions
            </h3>
            <span className="px-2 py-1 bg-[#00C9A7] text-white text-xs rounded-full font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              {suggestions.length}
            </span>
          </div>
          <div className="space-y-3">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <div 
                key={index}
                className="border border-[var(--neutral-300)] dark:border-gray-600 rounded-lg p-4 hover:bg-[var(--neutral-50)] dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-[var(--fg)] dark:text-gray-100">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{suggestion.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        suggestion.priority === 'high' ? 'bg-[#FF6B6B] text-white' :
                        suggestion.priority === 'medium' ? 'bg-[#00C9A7] text-white' :
                        'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`} style={{ fontFamily: 'Inter, sans-serif' }}>
                        {suggestion.priority}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {Math.round(suggestion.confidence * 100)}% confident
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {suggestion.message}
                    </p>
                    
                    {expandedSuggestion === index && (
                      <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic" style={{ fontFamily: 'Inter, sans-serif' }}>
                          💡 {suggestion.reasoning}
                        </p>
                        
                        {suggestion.actionable && suggestion.action && (
                          <button
                            onClick={() => handleActionableSuggestion(suggestion)}
                            className="mt-2 px-3 py-1 bg-[#00C9A7] text-white rounded-lg hover:bg-[#00A8A7] transition-colors text-xs font-medium flex items-center"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Apply Suggestion
                          </button>
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={() => setExpandedSuggestion(
                        expandedSuggestion === index ? null : index
                      )}
                      className="text-xs text-[#00C9A7] hover:text-[#00A8A7] flex items-center gap-1" style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {expandedSuggestion === index ? 'Show Less' : 'Show More'}
                      <ChevronRight 
                        className={`w-3 h-3 transform transition-transform ${
                          expandedSuggestion === index ? 'rotate-90' : ''
                        }`} 
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Insights */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[#00C9A7]" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Quick Insights
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Task Completion Rate */}
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00C9A7]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {Math.round(insights.taskPatterns.completionRate)}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>Task Completion</div>
          </div>

          {/* Tasks Per Day */}
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00C9A7]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {Math.round(insights.productivity.tasksPerDay * 10) / 10}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>Tasks/Day</div>
          </div>

          {/* Most Productive Day */}
          <div className="text-center">
            <div className="text-lg font-bold text-[#00C9A7]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {insights.timePatterns.mostProductiveDay}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>Best Day</div>
          </div>

          {/* Active Hours */}
          <div className="text-center">
            <div className="text-lg font-bold text-[#00C9A7]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {insights.timePatterns.mostActiveHours.slice(0, 2).map(h => `${h}:00`).join(', ')}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>Peak Hours</div>
          </div>
        </div>

        {/* Overdue Tasks Warning */}
        {insights.taskPatterns.overdueTasks > 0 && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                {insights.taskPatterns.overdueTasks} overdue tasks need attention
              </span>
            </div>
          </div>
        )}

        {/* Habit Status */}
        {(insights.habitPatterns.strugglingHabits.length > 0 || 
          insights.habitPatterns.successfulHabits.length > 0) && (
          <div className="mt-4 space-y-2">
            {insights.habitPatterns.successfulHabits.length > 0 && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {insights.habitPatterns.successfulHabits.length} habits going strong!
                </span>
              </div>
            )}
            
            {insights.habitPatterns.strugglingHabits.length > 0 && (
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Target className="w-4 h-4" />
                <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {insights.habitPatterns.strugglingHabits.length} habits need attention
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Popular Tags */}
      {insights.taskPatterns.commonTags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Popular Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {insights.taskPatterns.commonTags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}