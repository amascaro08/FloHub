import { db } from "./drizzle";
import { 
  tasks, 
  notes, 
  habits, 
  habitCompletions, 
  journalEntries, 
  journalMoods, 
  conversations, 
  userSettings,
  calendarEvents,
  meetings 
} from "../db/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import OpenAI from "openai";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Types for user data analysis
interface UserContext {
  userId: string;
  tasks: any[];
  completedTasks: any[];
  notes: any[];
  meetings: any[];
  habits: any[];
  habitCompletions: any[];
  journalEntries: any[];
  journalMoods: any[];
  calendarEvents: any[];
  conversations: any[];
  userSettings: any;
}

interface PatternAnalysis {
  taskPatterns: TaskPatterns;
  habitPatterns: HabitPatterns;
  workflowPatterns: WorkflowPatterns;
  timePatterns: TimePatterns;
  productivityPatterns: ProductivityPatterns;
}

interface TaskPatterns {
  averageCompletionTime: number;
  commonTags: string[];
  preferredDays: string[];
  procrastinationTrends: any[];
  overdueTasks: number;
  completionRate: number;
  busyPeriods: string[];
}

interface HabitPatterns {
  consistencyScores: { [habitId: string]: number };
  strugglingHabits: any[];
  successfulHabits: any[];
  optimalTimes: { [habitId: string]: string };
  weekdayVsWeekend: { [habitId: string]: { weekday: number, weekend: number } };
}

interface WorkflowPatterns {
  meetingToNotePatterns: any[];
  tagUsagePatterns: { [tag: string]: number };
  productiveDays: string[];
  commonWorkflows: string[];
  contextSwitching: number;
}

interface TimePatterns {
  mostActiveHours: number[];
  mostProductiveDay: string;
  energyLevels: { [hour: number]: number };
  breakPatterns: any[];
}

interface ProductivityPatterns {
  tasksPerDay: number;
  focusTime: number;
  multitaskingScore: number;
  goalAchievementRate: number;
  stressIndicators: string[];
}

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

export class SmartAIAssistant {
  private userId: string;
  private context: UserContext | null = null;
  private patterns: PatternAnalysis | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Public method to update calendar events with external data
  updateCalendarEvents(events: any[]): void {
    if (this.context) {
      this.context.calendarEvents = events;
    }
  }

  // Helper to get user timezone
  private getUserTimezone(): string {
    return (global as any).currentUserTimezone || 'UTC';
  }

  // Helper to get timezone-aware dates
  private getTimezoneAwareDates() {
    const userTimezone = this.getUserTimezone();
    const now = new Date();
    const nowInUserTz = toZonedTime(now, userTimezone);
    
    const today = new Date(nowInUserTz.getFullYear(), nowInUserTz.getMonth(), nowInUserTz.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return { now: nowInUserTz, today, tomorrow, userTimezone };
  }

  async loadUserContext(): Promise<UserContext> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Fetch all user data in parallel for better performance
      const [
        userTasks,
        userNotes,
        userHabits,
        userHabitCompletions,
        userJournalEntries,
        userJournalMoods,
        userCalendarEvents,
        userMeetings,
        userConversations,
        settings
      ] = await Promise.all([
        // Tasks (last 30 days)
        db.select().from(tasks)
          .where(and(
            eq(tasks.user_email, this.userId),
            gte(tasks.createdAt, thirtyDaysAgo)
          ))
          .orderBy(desc(tasks.createdAt)),

        // Notes (last 30 days)
        db.select().from(notes)
          .where(and(
            eq(notes.user_email, this.userId),
            gte(notes.createdAt, thirtyDaysAgo)
          ))
          .orderBy(desc(notes.createdAt)),

        // Habits
        db.select().from(habits)
          .where(eq(habits.userId, this.userId))
          .orderBy(desc(habits.createdAt)),

        // Habit completions (last 30 days)
        db.select().from(habitCompletions)
          .where(and(
            eq(habitCompletions.userId, this.userId),
            gte(habitCompletions.timestamp, thirtyDaysAgo)
          ))
          .orderBy(desc(habitCompletions.timestamp)),

        // Journal entries (last 30 days)
        db.select().from(journalEntries)
          .where(and(
            eq(journalEntries.user_email, this.userId),
            gte(journalEntries.createdAt, thirtyDaysAgo)
          ))
          .orderBy(desc(journalEntries.createdAt)),

        // Journal moods (last 30 days)
        db.select().from(journalMoods)
          .where(and(
            eq(journalMoods.user_email, this.userId),
            gte(journalMoods.createdAt, thirtyDaysAgo)
          ))
          .orderBy(desc(journalMoods.createdAt)),

        // Calendar events (last 7 days + next 7 days)
        db.select().from(calendarEvents)
          .where(eq(calendarEvents.user_email, this.userId)),

        // Meetings (last 30 days)
        db.select().from(meetings)
          .where(and(
            eq(meetings.userId, this.userId),
            gte(meetings.createdAt, thirtyDaysAgo)
          ))
          .orderBy(desc(meetings.createdAt)),

        // Conversations (last 30 days)
        db.select().from(conversations)
          .where(and(
            eq(conversations.userId, this.userId),
            gte(conversations.createdAt, thirtyDaysAgo)
          ))
          .orderBy(desc(conversations.createdAt)),

        // User settings
        db.select().from(userSettings)
          .where(eq(userSettings.user_email, this.userId))
          .limit(1)
      ]);

      this.context = {
        userId: this.userId,
        tasks: userTasks,
        completedTasks: userTasks.filter(task => task.done),
        notes: userNotes,
        meetings: userMeetings,
        habits: userHabits,
        habitCompletions: userHabitCompletions,
        journalEntries: userJournalEntries,
        journalMoods: userJournalMoods,
        calendarEvents: userCalendarEvents,
        conversations: userConversations,
        userSettings: settings[0] || null
      };

      return this.context;
    } catch (error) {
      console.error('Error loading user context:', error);
      throw new Error('Failed to load user context');
    }
  }

  async analyzeUserPatterns(): Promise<PatternAnalysis> {
    if (!this.context) {
      await this.loadUserContext();
    }

    const taskPatterns = this.analyzeTaskPatterns();
    const habitPatterns = this.analyzeHabitPatterns();
    const workflowPatterns = this.analyzeWorkflowPatterns();
    const timePatterns = this.analyzeTimePatterns();
    const productivityPatterns = this.analyzeProductivityPatterns();

    this.patterns = {
      taskPatterns,
      habitPatterns,
      workflowPatterns,
      timePatterns,
      productivityPatterns
    };

    return this.patterns;
  }

  private analyzeTaskPatterns(): TaskPatterns {
    const { tasks, completedTasks } = this.context!;
    
    // Calculate completion rate
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    
    // Find overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(task => 
      !task.done && task.dueDate && new Date(task.dueDate) < now
    ).length;

    // Analyze common tags
    const tagCounts: { [tag: string]: number } = {};
    tasks.forEach(task => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    const commonTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    // Analyze preferred completion days
    const dayCompletions: { [day: string]: number } = {};
    completedTasks.forEach(task => {
      if (task.createdAt) {
        const day = new Date(task.createdAt).getDay();
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
        dayCompletions[dayName] = (dayCompletions[dayName] || 0) + 1;
      }
    });
    const preferredDays = Object.entries(dayCompletions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    // Calculate average completion time (simplified)
    const averageCompletionTime = completedTasks.length > 0 ? 
      completedTasks.reduce((sum, task) => {
        if (task.createdAt && task.dueDate) {
          const created = new Date(task.createdAt);
          const due = new Date(task.dueDate);
          return sum + (due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }
        return sum;
      }, 0) / completedTasks.length : 0;

    return {
      averageCompletionTime,
      commonTags,
      preferredDays,
      procrastinationTrends: [], // TODO: Implement procrastination analysis
      overdueTasks,
      completionRate,
      busyPeriods: [] // TODO: Implement busy period analysis
    };
  }

  private analyzeHabitPatterns(): HabitPatterns {
    const { habits, habitCompletions } = this.context!;
    
    const consistencyScores: { [habitId: string]: number } = {};
    const strugglingHabits: any[] = [];
    const successfulHabits: any[] = [];
    const optimalTimes: { [habitId: string]: string } = {};
    const weekdayVsWeekend: { [habitId: string]: { weekday: number, weekend: number } } = {};

    habits.forEach(habit => {
      const habitId = habit.id.toString();
      const completions = habitCompletions.filter(comp => comp.habitId === habit.id);
      
      // Calculate consistency score (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentCompletions = completions.filter(comp => 
        new Date(comp.timestamp) >= thirtyDaysAgo && comp.completed
      );
      
      let expectedDays = 30;
      if (habit.frequency === 'weekly') expectedDays = Math.floor(30 / 7);
      else if (habit.frequency === 'custom' && habit.customDays) {
        expectedDays = Math.floor((habit.customDays as string[]).length * 30 / 7);
      }
      
      const consistencyScore = expectedDays > 0 ? (recentCompletions.length / expectedDays) * 100 : 0;
      consistencyScores[habitId] = consistencyScore;

      // Categorize habits
      if (consistencyScore < 50) {
        strugglingHabits.push({
          ...habit,
          consistencyScore,
          completionCount: recentCompletions.length,
          expectedCount: expectedDays
        });
      } else if (consistencyScore > 80) {
        successfulHabits.push({
          ...habit,
          consistencyScore,
          completionCount: recentCompletions.length
        });
      }

      // Analyze weekday vs weekend patterns
      const weekdayCompletions = completions.filter(comp => {
        const day = new Date(comp.timestamp).getDay();
        return day >= 1 && day <= 5; // Monday to Friday
      }).length;
      
      const weekendCompletions = completions.filter(comp => {
        const day = new Date(comp.timestamp).getDay();
        return day === 0 || day === 6; // Saturday and Sunday
      }).length;

      weekdayVsWeekend[habitId] = {
        weekday: weekdayCompletions,
        weekend: weekendCompletions
      };

      // Find optimal times (simplified - based on most common completion hour)
      const hourCounts: { [hour: number]: number } = {};
      completions.forEach(comp => {
        const hour = new Date(comp.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      const optimalHour = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (optimalHour) {
        optimalTimes[habitId] = `${optimalHour[0]}:00`;
      }
    });

    return {
      consistencyScores,
      strugglingHabits,
      successfulHabits,
      optimalTimes,
      weekdayVsWeekend
    };
  }

  private analyzeWorkflowPatterns(): WorkflowPatterns {
    const { notes, meetings, tasks } = this.context!;
    
    // Analyze meeting-to-note patterns
    const meetingToNotePatterns = meetings.map(meeting => ({
      meetingId: meeting.id,
      hasNotes: notes.some(note => note.eventId === meeting.eventId),
      hasActions: meeting.actions && meeting.actions.length > 0,
      hasFollowUpTasks: tasks.some(task => 
        task.source === 'meeting' || 
        (task.tags && task.tags.includes('meeting'))
      )
    }));

    // Analyze tag usage patterns
    const tagUsagePatterns: { [tag: string]: number } = {};
    [...notes, ...tasks].forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => {
          tagUsagePatterns[tag] = (tagUsagePatterns[tag] || 0) + 1;
        });
      }
    });

    return {
      meetingToNotePatterns,
      tagUsagePatterns,
      productiveDays: [], // TODO: Implement based on task completion
      commonWorkflows: [], // TODO: Implement workflow detection
      contextSwitching: 0 // TODO: Implement context switching analysis
    };
  }

  private analyzeTimePatterns(): TimePatterns {
    const { tasks, habitCompletions, journalEntries } = this.context!;
    
    // Analyze most active hours
    const hourActivity: { [hour: number]: number } = {};
    
    [...tasks, ...habitCompletions, ...journalEntries].forEach(item => {
      if (item.createdAt || item.timestamp) {
        const hour = new Date(item.createdAt || item.timestamp).getHours();
        hourActivity[hour] = (hourActivity[hour] || 0) + 1;
      }
    });

    const mostActiveHours = Object.entries(hourActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Find most productive day
    const dayActivity: { [day: string]: number } = {};
    tasks.filter(task => task.done).forEach(task => {
      if (task.createdAt) {
        const day = new Date(task.createdAt).getDay();
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
        dayActivity[dayName] = (dayActivity[dayName] || 0) + 1;
      }
    });

    const mostProductiveDay = Object.entries(dayActivity)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Monday';

    return {
      mostActiveHours,
      mostProductiveDay,
      energyLevels: hourActivity,
      breakPatterns: [] // TODO: Implement break pattern analysis
    };
  }

  private analyzeProductivityPatterns(): ProductivityPatterns {
    const { tasks, completedTasks } = this.context!;
    
    // Calculate tasks per day
    const uniqueDays = new Set();
    tasks.forEach(task => {
      if (task.createdAt) {
        const date = new Date(task.createdAt).toDateString();
        uniqueDays.add(date);
      }
    });
    
    const tasksPerDay = uniqueDays.size > 0 ? tasks.length / uniqueDays.size : 0;
    const goalAchievementRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

    return {
      tasksPerDay,
      focusTime: 0, // TODO: Calculate based on task completion times
      multitaskingScore: 0, // TODO: Calculate based on task switching
      goalAchievementRate,
      stressIndicators: [] // TODO: Implement based on journal mood analysis
    };
  }

  async generateProactiveSuggestions(): Promise<ProactiveSuggestion[]> {
    if (!this.patterns) {
      await this.analyzeUserPatterns();
    }

    const suggestions: ProactiveSuggestion[] = [];

    // Habit adjustment suggestions
    this.patterns!.habitPatterns.strugglingHabits.forEach(habit => {
      if (habit.consistencyScore < 30 && habit.frequency === 'daily') {
        suggestions.push({
          type: 'habit_adjustment',
          priority: 'medium',
          title: `Consider adjusting "${habit.name}" frequency`,
          message: `You've only completed "${habit.name}" ${habit.completionCount} times out of ${habit.expectedCount} expected completions this month (${Math.round(habit.consistencyScore)}% consistency). Consider changing it to a weekly habit to build momentum.`,
          actionable: true,
          action: {
            type: 'suggest_habit_frequency_change',
            data: {
              habitId: habit.id,
              currentFrequency: habit.frequency,
              suggestedFrequency: 'weekly',
              reason: 'low_daily_consistency'
            }
          },
          reasoning: 'Daily habits with low consistency often benefit from reduced frequency to rebuild confidence and momentum.',
          confidence: 0.8
        });
      }

      // Time-based habit suggestions
      const timePattern = this.patterns!.habitPatterns.weekdayVsWeekend[habit.id.toString()];
      if (timePattern && timePattern.weekend > timePattern.weekday * 1.5) {
        suggestions.push({
          type: 'habit_adjustment',
          priority: 'low',
          title: `"${habit.name}" works better on weekends`,
          message: `You complete "${habit.name}" more consistently on weekends. Consider scheduling it specifically for weekend days.`,
          actionable: true,
          action: {
            type: 'suggest_habit_schedule_change',
            data: {
              habitId: habit.id,
              suggestedDays: ['saturday', 'sunday'],
              reason: 'weekend_preference_detected'
            }
          },
          reasoning: 'User shows higher completion rates on weekends for this habit.',
          confidence: 0.7
        });
      }
    });

    // Task management suggestions
    if (this.patterns!.taskPatterns.overdueTasks > 5) {
      suggestions.push({
        type: 'task_priority',
        priority: 'high',
        title: 'High number of overdue tasks detected',
        message: `You have ${this.patterns!.taskPatterns.overdueTasks} overdue tasks. Consider reviewing your task load and prioritizing the most important ones.`,
        actionable: true,
        action: {
          type: 'suggest_task_review',
          data: {
            overdueCount: this.patterns!.taskPatterns.overdueTasks,
            suggestionType: 'priority_review'
          }
        },
        reasoning: 'High overdue task count indicates potential overwhelm or unrealistic scheduling.',
        confidence: 0.9
      });
    }

    if (this.patterns!.taskPatterns.completionRate < 60) {
      suggestions.push({
        type: 'workflow_optimization',
        priority: 'medium',
        title: 'Low task completion rate',
        message: `Your task completion rate is ${Math.round(this.patterns!.taskPatterns.completionRate)}%. Consider breaking down larger tasks into smaller, more manageable pieces.`,
        actionable: false,
        reasoning: 'Low completion rates often indicate tasks are too large or overwhelming.',
        confidence: 0.75
      });
    }

    // Time management suggestions
    if (this.patterns!.timePatterns.mostActiveHours.length > 0) {
      const activeHours = this.patterns!.timePatterns.mostActiveHours;
      suggestions.push({
        type: 'time_management',
        priority: 'low',
        title: 'Optimize your peak hours',
        message: `You're most active around ${activeHours.map(h => `${h}:00`).join(', ')}. Consider scheduling your most important tasks during these times.`,
        actionable: false,
        reasoning: 'Scheduling important work during peak activity hours can improve productivity.',
        confidence: 0.6
      });
    }

    // Workflow optimization suggestions
    const meetingNoteRatio = this.patterns!.workflowPatterns.meetingToNotePatterns.filter(m => m.hasNotes).length / 
                            this.patterns!.workflowPatterns.meetingToNotePatterns.length;
    
    if (meetingNoteRatio < 0.5 && this.patterns!.workflowPatterns.meetingToNotePatterns.length > 3) {
      suggestions.push({
        type: 'workflow_optimization',
        priority: 'medium',
        title: 'Missing meeting notes',
        message: `You're only taking notes for ${Math.round(meetingNoteRatio * 100)}% of your meetings. Consider setting up a reminder to take notes during or after meetings.`,
        actionable: true,
        action: {
          type: 'suggest_meeting_note_workflow',
          data: {
            currentRatio: meetingNoteRatio,
            suggestionType: 'note_taking_reminder'
          }
        },
        reasoning: 'Regular meeting notes improve information retention and follow-up actions.',
        confidence: 0.8
      });
    }

    // Health and wellness suggestions based on journal data
    if (this.context!.journalMoods.length > 0) {
      const recentMoods = this.context!.journalMoods.slice(0, 7);
      const negativeEmojis = ['😞', '😟', '😰', '😢', '😭', '😤', '😠'];
      const negativeMoodCount = recentMoods.filter(mood => 
        negativeEmojis.includes(mood.emoji || '')
      ).length;

      if (negativeMoodCount > 3) {
        suggestions.push({
          type: 'health_reminder',
          priority: 'high',
          title: 'Consider taking a break',
          message: `You've logged several negative moods recently. Consider scheduling some self-care time or taking a short break.`,
          actionable: true,
          action: {
            type: 'suggest_wellness_break',
            data: {
              negativeMoodCount,
              suggestionType: 'self_care_reminder'
            }
          },
          reasoning: 'Consistent negative moods may indicate stress or burnout.',
          confidence: 0.7
        });
      }
    }

    // Sort suggestions by priority and confidence
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }

  async processNaturalLanguageQuery(query: string): Promise<string> {
    if (!this.context) {
      await this.loadUserContext();
    }

    const lowerQuery = query.toLowerCase();

    // Calendar/Schedule queries - prioritize these first
    if (lowerQuery.includes('schedule') || lowerQuery.includes('calendar') || 
        lowerQuery.includes('meetings') || lowerQuery.includes('events') ||
        lowerQuery.includes('agenda') || lowerQuery.includes('today\'s') ||
        (lowerQuery.includes('when') && (lowerQuery.includes('do i') || lowerQuery.includes('am i'))) ||
        lowerQuery.includes('airport') || lowerQuery.includes('flight') || 
        lowerQuery.includes('mum') || lowerQuery.includes('mom') || lowerQuery.includes('dad') ||
        lowerQuery.includes('doctor') || lowerQuery.includes('appointment') ||
        (lowerQuery.includes('what') && (lowerQuery.includes('today') || lowerQuery.includes('tomorrow')))) {
      return this.handleCalendarQueries(query);
    }

    // Task-related queries
    if (lowerQuery.includes('task') && (lowerQuery.includes('when') || lowerQuery.includes('last'))) {
      return this.handleTaskTimeQueries(query);
    }

    // Meeting-related queries (for past meetings/notes)
    if (lowerQuery.includes('meeting') && lowerQuery.includes('with')) {
      return this.handleMeetingQueries(query);
    }

    // Habit-related queries
    if (lowerQuery.includes('habit') || lowerQuery.includes('streak')) {
      return this.handleHabitQueries(query);
    }

    // Note-related queries
    if (lowerQuery.includes('note') && lowerQuery.includes('about')) {
      return this.handleNoteQueries(query);
    }

    // Tag-related queries
    if (lowerQuery.includes('tag') || lowerQuery.includes('related to')) {
      return this.handleTagQueries(query);
    }

    // Productivity queries
    if (lowerQuery.includes('productive') || lowerQuery.includes('progress')) {
      return this.handleProductivityQueries(query);
    }

    // Default to general context search
    return this.handleGeneralQueries(query);
  }

  private handleCalendarQueries(query: string): string {
    const lowerQuery = query.toLowerCase();
    const { now, today, tomorrow, userTimezone } = this.getTimezoneAwareDates();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Filter calendar events based on the query
    let relevantEvents = this.context!.calendarEvents;

    // ENHANCED: Check for specific contextual queries (like "when do I take mum to the airport")
    if ((lowerQuery.includes("when") && (lowerQuery.includes("do") || lowerQuery.includes("am"))) ||
        lowerQuery.includes("airport") || lowerQuery.includes("flight") || 
        lowerQuery.includes("mum") || lowerQuery.includes("mom") || lowerQuery.includes("dad")) {
      console.log(`[DEBUG] Contextual query detected: "${query}"`);
      // Extract keywords from the query for contextual search
      const contextKeywords = this.extractCalendarKeywords(query);
      console.log(`[DEBUG] Extracted keywords: ${contextKeywords.join(', ')}`);
      
      if (contextKeywords.length > 0) {
        // Search for events that match the context keywords
        const matchingEvents = relevantEvents.filter(event => {
          const eventText = `${event.summary || ''} ${event.description || ''} ${event.location || ''}`.toLowerCase();
          const matches = contextKeywords.some(keyword => eventText.includes(keyword));
          if (matches) {
            console.log(`[DEBUG] Found matching event: "${event.summary}" - matched keywords in: "${eventText}"`);
          }
          return matches;
        });
        
        console.log(`[DEBUG] Found ${matchingEvents.length} matching events out of ${relevantEvents.length} total events`);
        
        if (matchingEvents.length > 0) {
          // Sort by date and get the next occurrence
          const upcomingMatches = matchingEvents
            .filter(event => {
              const eventDate = new Date(event.start || event.date);
              const eventInUserTz = toZonedTime(eventDate, userTimezone);
              return eventInUserTz >= today;
            })
            .sort((a, b) => {
              const dateA = new Date(a.start || a.date);
              const dateB = new Date(b.start || b.date);
              return dateA.getTime() - dateB.getTime();
            });
          
          if (upcomingMatches.length > 0) {
            const nextEvent = upcomingMatches[0];
            const eventDate = new Date(nextEvent.start || nextEvent.date);
            
            const dayName = formatInTimeZone(eventDate, userTimezone, 'eeee');
            const dateStr = formatInTimeZone(eventDate, userTimezone, 'MMMM d' + (eventDate.getFullYear() !== now.getFullYear() ? ', yyyy' : ''));
            const timeStr = formatInTimeZone(eventDate, userTimezone, 'h:mm a');
            
            // Calculate time difference for more natural response
            const timeDiff = eventDate.getTime() - now.getTime();
            const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            let whenText = "";
            if (daysUntil === 0) {
              whenText = "today";
            } else if (daysUntil === 1) {
              whenText = "tomorrow";
            } else if (daysUntil <= 7) {
              whenText = `this ${dayName}`;
            } else {
              whenText = `on ${dayName}, ${dateStr}`;
            }
            
            let response = `📅 **${nextEvent.summary}** is scheduled for **${whenText}** at **${timeStr}**`;
            
            if (nextEvent.location) {
              response += `\n📍 Location: ${nextEvent.location}`;
            }
            
            if (nextEvent.description) {
              response += `\n📝 ${nextEvent.description.substring(0, 150)}${nextEvent.description.length > 150 ? '...' : ''}`;
            }
            
            // Add helpful context about time remaining
            if (daysUntil === 0) {
              const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
              if (hoursUntil > 0) {
                response += `\n\n⏰ That's in about ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}!`;
              }
            } else if (daysUntil === 1) {
              response += `\n\n⏰ That's tomorrow!`;
            } else if (daysUntil <= 7) {
              response += `\n\n⏰ That's in ${daysUntil} days.`;
            }
            
            return response;
          } else {
            // No upcoming matches, check for past events
            const pastMatches = matchingEvents
              .filter(event => {
                const eventDate = new Date(event.start || event.date);
                return eventDate < today;
              })
              .sort((a, b) => {
                const dateA = new Date(a.start || a.date);
                const dateB = new Date(b.start || b.date);
                return dateB.getTime() - dateA.getTime(); // Most recent first
              });
            
            if (pastMatches.length > 0) {
              const lastEvent = pastMatches[0];
              const eventDate = new Date(lastEvent.start || lastEvent.date);
              const timeAgo = this.formatTimeAgo(eventDate);
              
              return `📅 I found "${lastEvent.summary}" but it was ${timeAgo}. I don't see any upcoming events matching your query.`;
            } else {
              return `📅 I couldn't find any events matching "${contextKeywords.join(', ')}" in your calendar. Could you be more specific or check if the event is scheduled?`;
            }
          }
        }
      }
    }

    // Standard calendar query handling (existing logic) with timezone awareness
    if (lowerQuery.includes("today") || lowerQuery.includes("today's")) {
      relevantEvents = relevantEvents.filter(event => {
        const eventDate = new Date(event.start || event.date);
        const eventInUserTz = toZonedTime(eventDate, userTimezone);
        return eventInUserTz >= today && eventInUserTz < tomorrow;
      });
      
      if (relevantEvents.length === 0) {
        return "You have no events scheduled for today! ✨ Enjoy your free time.";
      }
      
      const eventList = relevantEvents.map(event => {
        const eventDate = new Date(event.start || event.date);
        const time = formatInTimeZone(eventDate, userTimezone, 'h:mm a');
        return `• ${time} - **${event.summary}**${event.location ? ` (${event.location})` : ''}`;
      }).join('\n');
      
      return `📅 **Today's Schedule** (${relevantEvents.length} event${relevantEvents.length !== 1 ? 's' : ''}):\n\n${eventList}`;
      
    } else if (lowerQuery.includes("tomorrow")) {
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      
      relevantEvents = relevantEvents.filter(event => {
        const eventDate = new Date(event.start || event.date);
        const eventInUserTz = toZonedTime(eventDate, userTimezone);
        return eventInUserTz >= tomorrow && eventInUserTz < dayAfterTomorrow;
      });
      
      if (relevantEvents.length === 0) {
        return "You have no events scheduled for tomorrow! 🌟";
      }
      
      const eventList = relevantEvents.map(event => {
        const eventDate = new Date(event.start || event.date);
        const time = formatInTimeZone(eventDate, userTimezone, 'h:mm a');
        return `• ${time} - **${event.summary}**${event.location ? ` (${event.location})` : ''}`;
      }).join('\n');
      
      return `📅 **Tomorrow's Schedule** (${relevantEvents.length} event${relevantEvents.length !== 1 ? 's' : ''}):\n\n${eventList}`;
      
    } else {
      // General schedule/calendar query - show upcoming events with timezone awareness
      relevantEvents = relevantEvents.filter(event => {
        const eventDate = new Date(event.start || event.date);
        const eventInUserTz = toZonedTime(eventDate, userTimezone);
        return eventInUserTz >= today && eventInUserTz <= nextWeek;
      }).slice(0, 10);
      
      if (relevantEvents.length === 0) {
        return "You have no upcoming events in the next week! 🆓 Perfect time to plan something new.";
      }
      
      // Group by day
      const eventsByDay = new Map<string, any[]>();
      relevantEvents.forEach(event => {
        const eventDate = new Date(event.start || event.date);
        const eventInUserTz = toZonedTime(eventDate, userTimezone);
        const dayKey = eventInUserTz.toDateString();
        if (!eventsByDay.has(dayKey)) {
          eventsByDay.set(dayKey, []);
        }
        eventsByDay.get(dayKey)!.push(event);
      });
      
      let scheduleText = "📅 **Your Upcoming Schedule**:\n\n";
      
      for (const [dayKey, dayEvents] of Array.from(eventsByDay.entries())) {
        const dayDate = new Date(dayKey);
        const dayName = formatInTimeZone(dayDate, userTimezone, 'eeee, MMM d');
        
        scheduleText += `**${dayName}** (${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}):\n`;
        
        dayEvents.forEach((event: any) => {
          const eventDate = new Date(event.start || event.date);
          const time = formatInTimeZone(eventDate, userTimezone, 'h:mm a');
          scheduleText += `• ${time} - ${event.summary}${event.location ? ` (${event.location})` : ''}\n`;
        });
        
        scheduleText += '\n';
      }
      
      return scheduleText.trim();
    }
  }

  // NEW: Extract calendar-specific keywords for contextual search
  private extractCalendarKeywords(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    
    // Remove question words and common phrases
    const stopWords = ['when', 'do', 'i', 'am', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'to', 'for', 'with', 'at', 'on', 'in', 'take', 'have', 'get', 'go', 'my', 'me'];
    
    // Extract meaningful keywords
    const words = lowerQuery
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Add common synonyms and variations
    const expandedKeywords = [...words];
    words.forEach(word => {
      switch(word) {
        case 'mum':
        case 'mom':
        case 'mother':
          expandedKeywords.push('mum', 'mom', 'mother');
          break;
        case 'dad':
        case 'father':
          expandedKeywords.push('dad', 'father');
          break;
        case 'airport':
          expandedKeywords.push('flight', 'plane', 'travel');
          break;
        case 'flight':
          expandedKeywords.push('airport', 'plane', 'travel');
          break;
        case 'doctor':
          expandedKeywords.push('appointment', 'medical', 'clinic');
          break;
        case 'meeting':
          expandedKeywords.push('call', 'conference', 'discussion');
          break;
      }
    });
    
    return Array.from(new Set(expandedKeywords)); // Remove duplicates
  }

  private handleTaskTimeQueries(query: string): string {
    // Extract task name or keywords from query
    const taskKeywords = this.extractKeywords(query);
    const relevantTasks = this.context!.tasks.filter(task => {
      const taskText = task.text.toLowerCase();
      return taskKeywords.some(keyword => taskText.includes(keyword));
    });

    if (relevantTasks.length === 0) {
      return "I couldn't find any tasks matching your query. Could you be more specific?";
    }

    const mostRecentTask = relevantTasks.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    const timeAgo = this.formatTimeAgo(new Date(mostRecentTask.createdAt));
    return `The most recent task matching your query was "${mostRecentTask.text}", created ${timeAgo}. ${mostRecentTask.done ? 'It has been completed.' : 'It is still pending.'}`;
  }

  private handleMeetingQueries(query: string): string {
    const nameMatch = query.match(/with\s+(\w+)/i);
    if (!nameMatch) {
      return "Please specify who you want to find meetings with.";
    }

    const personName = nameMatch[1].toLowerCase();
    const relevantMeetings = this.context!.meetings.filter(meeting => 
      meeting.title?.toLowerCase().includes(personName) ||
      meeting.content?.toLowerCase().includes(personName)
    );

    if (relevantMeetings.length === 0) {
      return `I couldn't find any meetings with ${personName}.`;
    }

    const upcomingMeetings = relevantMeetings.filter(meeting => 
      new Date(meeting.createdAt) > new Date()
    );

    if (upcomingMeetings.length > 0) {
      const nextMeeting = upcomingMeetings[0];
      return `Your next meeting with ${personName} is "${nextMeeting.title}" scheduled for ${this.formatDate(new Date(nextMeeting.createdAt))}.`;
    } else {
      const lastMeeting = relevantMeetings.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      const timeAgo = this.formatTimeAgo(new Date(lastMeeting.createdAt));
      return `Your last meeting with ${personName} was "${lastMeeting.title}" ${timeAgo}.`;
    }
  }

  private handleHabitQueries(query: string): string {
    if (!this.patterns) {
      return "I need to analyze your habits first. Please try again in a moment.";
    }

    if (query.toLowerCase().includes('struggling') || query.toLowerCase().includes('difficult')) {
      const struggling = this.patterns.habitPatterns.strugglingHabits;
      if (struggling.length === 0) {
        return "Great news! You don't seem to be struggling with any habits right now. Keep up the good work! 🎉";
      }
      
      const habitList = struggling.map(h => 
        `"${h.name}" (${Math.round(h.consistencyScore)}% consistency)`
      ).join(', ');
      
      return `You seem to be struggling with these habits: ${habitList}. Would you like some suggestions on how to improve them?`;
    }

    if (query.toLowerCase().includes('best') || query.toLowerCase().includes('successful')) {
      const successful = this.patterns.habitPatterns.successfulHabits;
      if (successful.length === 0) {
        return "You're still building consistency with your habits. Keep going! 💪";
      }
      
      const habitList = successful.map(h => 
        `"${h.name}" (${Math.round(h.consistencyScore)}% consistency)`
      ).join(', ');
      
      return `Your most successful habits are: ${habitList}. Great job maintaining these! 🌟`;
    }

    return "I can help you track habit consistency, identify struggling habits, or find your most successful ones. What would you like to know?";
  }

  private handleNoteQueries(query: string): string {
    const keywords = this.extractKeywords(query);
    const relevantNotes = this.context!.notes.filter(note => {
      const noteContent = `${note.title} ${note.content}`.toLowerCase();
      return keywords.some(keyword => noteContent.includes(keyword));
    });

    if (relevantNotes.length === 0) {
      return "I couldn't find any notes matching your query.";
    }

    if (relevantNotes.length === 1) {
      const note = relevantNotes[0];
      return `I found one note: "${note.title}" from ${this.formatTimeAgo(new Date(note.createdAt))}. ${note.content.substring(0, 200)}${note.content.length > 200 ? '...' : ''}`;
    }

    const notesList = relevantNotes.slice(0, 5).map(note => 
      `"${note.title}" (${this.formatTimeAgo(new Date(note.createdAt))})`
    ).join(', ');

    return `I found ${relevantNotes.length} notes matching your query. The most recent ones are: ${notesList}`;
  }

  private handleTagQueries(query: string): string {
    // Extract tag from query
    const tagMatch = query.match(/(?:tag|related to)\s+(\w+)/i);
    if (!tagMatch) {
      return "Please specify which tag you're looking for.";
    }

    const tag = tagMatch[1].toLowerCase();
    const taggedItems = [
      ...this.context!.tasks.filter(task => 
        task.tags && Array.isArray(task.tags) && task.tags.some((t: string) => t.toLowerCase().includes(tag))
      ).map(item => ({ ...item, type: 'task' })),
      ...this.context!.notes.filter(note => 
        note.tags && Array.isArray(note.tags) && note.tags.some((t: string) => t.toLowerCase().includes(tag))
      ).map(item => ({ ...item, type: 'note' }))
    ];

    if (taggedItems.length === 0) {
      return `I couldn't find any items tagged with "${tag}".`;
    }

    const summary = taggedItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const summaryText = Object.entries(summary)
      .map(([type, count]) => `${count as number} ${type}${(count as number) > 1 ? 's' : ''}`)
      .join(', ');

    return `I found ${taggedItems.length} items related to "${tag}": ${summaryText}. Would you like me to list them?`;
  }

  private handleProductivityQueries(query: string): string {
    if (!this.patterns) {
      return "I need to analyze your productivity patterns first. Please try again in a moment.";
    }

    const productivity = this.patterns.productivityPatterns;
    const taskPatterns = this.patterns.taskPatterns;

    return `Here's your productivity overview:
    
📊 **Task Completion Rate**: ${Math.round(taskPatterns.completionRate)}%
📈 **Average Tasks Per Day**: ${Math.round(productivity.tasksPerDay * 10) / 10}
🎯 **Most Productive Day**: ${this.patterns.timePatterns.mostProductiveDay}
⏰ **Most Active Hours**: ${this.patterns.timePatterns.mostActiveHours.map(h => `${h}:00`).join(', ')}
${taskPatterns.overdueTasks > 0 ? `⚠️ **Overdue Tasks**: ${taskPatterns.overdueTasks}` : '✅ **No Overdue Tasks**'}

${taskPatterns.completionRate > 80 ? 'You\'re doing great! 🌟' : 
  taskPatterns.completionRate > 60 ? 'Good progress, but there\'s room for improvement! 💪' :
  'Consider reviewing your task management strategy. 🤔'}`;
  }

  private handleGeneralQueries(query: string): string {
    // This would ideally use AI to understand complex queries
    // For now, provide a helpful response about capabilities
    return `I can help you with:

🔍 **Finding Information**:
- "When did I last work on [project]?"
- "Show me notes about [topic]"
- "What meetings do I have with [person]?"

📊 **Analyzing Patterns**:
- "How are my habits doing?"
- "What's my productivity like?"
- "Which tasks am I struggling with?"

🏷️ **Organizing by Tags**:
- "Show me everything tagged [tag]"
- "What's related to [topic]?"

💡 **Getting Suggestions**:
- "Give me productivity tips"
- "How can I improve my habits?"

Try asking me something specific about your tasks, notes, meetings, or habits!`;
  }

  private extractKeywords(query: string): string[] {
    // Remove common words and extract meaningful keywords
    const stopWords = ['when', 'did', 'last', 'work', 'on', 'about', 'with', 'show', 'me', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'as', 'by', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
    
    return query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .map(word => word.replace(/[^\w]/g, ''));
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

export { type ProactiveSuggestion, type UserContext, type PatternAnalysis };