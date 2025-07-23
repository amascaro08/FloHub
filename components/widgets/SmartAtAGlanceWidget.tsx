import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
      <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
            <Brain className="w-5 h-5" />
            Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
            <span className="ml-2 text-[var(--fg)] dark:text-gray-100">Analyzing your patterns...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
            <Brain className="w-5 h-5" />
            Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--fg-muted)] dark:text-gray-300">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button 
              variant="secondary" 
              onClick={fetchSmartSummary}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!smartSummary) {
    return null;
  }

  const { suggestions, insights } = smartSummary;

  return (
    <div className="space-y-4">
      {/* Proactive Suggestions */}
      {suggestions.length > 0 && (
        <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              AI Suggestions
              <Badge variant="secondary">{suggestions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                      <h4 className="font-medium text-sm text-[var(--fg)] dark:text-gray-100">{suggestion.title}</h4>
                      <Badge 
                        variant={getPriorityColor(suggestion.priority) as any}
                        className="text-xs"
                      >
                        {suggestion.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}% confident
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-[var(--fg-muted)] dark:text-gray-300">
                      {suggestion.message}
                    </p>
                    
                    {expandedSuggestion === index && (
                      <div className="space-y-2 pt-2 border-t border-[var(--neutral-300)] dark:border-gray-600">
                        <p className="text-xs text-[var(--fg-muted)] dark:text-gray-400 italic">
                          💡 {suggestion.reasoning}
                        </p>
                        
                        {suggestion.actionable && suggestion.action && (
                          <Button
                            size="sm"
                            onClick={() => handleActionableSuggestion(suggestion)}
                            className="mt-2"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Apply Suggestion
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={() => setExpandedSuggestion(
                        expandedSuggestion === index ? null : index
                      )}
                      className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1 transition-colors"
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
          </CardContent>
        </Card>
      )}

      {/* Quick Insights */}
      <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Task Completion Rate */}
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--primary)]">
                {Math.round(insights.taskPatterns.completionRate)}%
              </div>
              <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Task Completion</div>
            </div>

            {/* Tasks Per Day */}
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--primary)]">
                {Math.round(insights.productivity.tasksPerDay * 10) / 10}
              </div>
              <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Tasks/Day</div>
            </div>

            {/* Most Productive Day */}
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--primary)]">
                {insights.timePatterns.mostProductiveDay}
              </div>
              <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Best Day</div>
            </div>

            {/* Active Hours */}
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--primary)]">
                {insights.timePatterns.mostActiveHours.slice(0, 2).map(h => `${h}:00`).join(', ')}
              </div>
              <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Peak Hours</div>
            </div>
          </div>

          {/* Overdue Tasks Warning */}
          {insights.taskPatterns.overdueTasks > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">
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
                  <span className="text-sm">
                    {insights.habitPatterns.successfulHabits.length} habits going strong!
                  </span>
                </div>
              )}
              
              {insights.habitPatterns.strugglingHabits.length > 0 && (
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Target className="w-4 h-4" />
                  <span className="text-sm">
                    {insights.habitPatterns.strugglingHabits.length} habits need attention
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular Tags */}
      {insights.taskPatterns.commonTags.length > 0 && (
        <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--fg)] dark:text-gray-100">Popular Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insights.taskPatterns.commonTags.map((tag, index) => (
                <Badge key={index} variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                  #{tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}