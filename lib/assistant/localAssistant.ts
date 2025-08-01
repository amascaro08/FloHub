import { db } from "@/lib/drizzle";
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
} from "@/db/schema";
import { eq, and, gte, lte, desc, sql, count, like, or } from "drizzle-orm";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { retrieveContentFromStorage, retrieveArrayFromStorage, retrieveJSONBFromStorage } from "@/lib/contentSecurity";

interface LocalAssistantContext {
  userId: string;
  tasks: any[];
  notes: any[];
  habits: any[];
  habitCompletions: any[];
  journalEntries: any[];
  calendarEvents: any[];
  meetings: any[];
  userSettings: any;
}

interface QueryIntent {
  type: 'calendar' | 'task' | 'note' | 'habit' | 'productivity' | 'search' | 'create' | 'general';
  action: 'query' | 'create' | 'update' | 'delete';
  entities: {
    timeRef?: string;
    person?: string;
    location?: string;
    topic?: string;
    task?: string;
    event?: string;
  };
  confidence: number;
}

export class LocalAssistant {
  private userEmail: string;
  private context: LocalAssistantContext | null = null;

  constructor(userEmail: string) {
    this.userEmail = userEmail;
  }

  async processQuery(query: string): Promise<string> {
    try {
      // Load context if not already loaded
      if (!this.context) {
        await this.loadContext();
      }

      // Analyze intent
      const intent = this.analyzeIntent(query);
      
      // Route to appropriate handler based on intent
      switch (intent.type) {
        case 'calendar':
          return await this.handleCalendarQuery(query, intent);
        case 'task':
          return await this.handleTaskQuery(query, intent);
        case 'note':
          return await this.handleNoteQuery(query, intent);
        case 'journal':
          return await this.handleJournalQuery(query, intent);
        case 'meeting':
          return await this.handleMeetingQuery(query, intent);
        case 'habit':
          return await this.handleHabitQuery(query, intent);
        case 'productivity':
          return await this.handleProductivityQuery(query, intent);
        case 'search':
          return await this.handleSearchQuery(query, intent);
        case 'create':
          return await this.handleCreateQuery(query, intent);
        default:
          return await this.handleGeneralQuery(query, intent);
      }
    } catch (error) {
      console.error('LocalAssistant error:', error);
      return "I'm having trouble processing your request right now. Please try again.";
    }
  }

  private async loadContext(): Promise<void> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log('Loading context for user:', this.userEmail);

    // Check if database is available
    if (!process.env.NEON_DATABASE_URL) {
      console.log('No database connection available, using fallback responses');
      this.context = {
        userId: this.userEmail,
        tasks: [],
        notes: [],
        habits: [],
        habitCompletions: [],
        journalEntries: [],
        calendarEvents: [],
        meetings: [],
        userSettings: null
      };
      return;
    }

    try {
      const results = await Promise.allSettled([
        db.select().from(tasks)
          .where(and(
            eq(tasks.user_email, this.userEmail),
            gte(tasks.createdAt, thirtyDaysAgo)
          ))
          .orderBy(desc(tasks.createdAt)),

        db.select().from(notes)
          .where(and(
            eq(notes.user_email, this.userEmail),
            gte(notes.createdAt, thirtyDaysAgo)
          ))
          .orderBy(desc(notes.createdAt)),

        db.select().from(habits)
          .where(eq(habits.userId, this.userEmail))
          .orderBy(desc(habits.createdAt)),

        db.select().from(habitCompletions)
          .where(and(
            eq(habitCompletions.userId, this.userEmail),
            gte(habitCompletions.timestamp, thirtyDaysAgo)
          ))
          .orderBy(desc(habitCompletions.timestamp)),

        db.select().from(journalEntries)
          .where(and(
            eq(journalEntries.user_email, this.userEmail),
            gte(journalEntries.createdAt, thirtyDaysAgo)
          ))
          .orderBy(desc(journalEntries.createdAt)),

        db.select().from(calendarEvents)
          .where(eq(calendarEvents.user_email, this.userEmail)),

        db.select().from(meetings)
          .where(and(
            eq(meetings.userId, this.userEmail),
            gte(meetings.createdAt, thirtyDaysAgo)
          ))
          .orderBy(desc(meetings.createdAt)),

        db.select().from(userSettings)
          .where(eq(userSettings.user_email, this.userEmail))
          .limit(1)
      ]);

      const [
        tasksResult, notesResult, habitsResult, habitCompletionsResult,
        journalEntriesResult, calendarEventsResult, meetingsResult, settingsResult
      ] = results;

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const queryNames = ['tasks', 'notes', 'habits', 'habitCompletions', 'journalEntries', 'calendarEvents', 'meetings', 'settings'];
          console.warn(`Query failed for ${queryNames[index]}:`, result.reason);
        }
      });

      this.context = {
        userId: this.userEmail,
        tasks: tasksResult.status === 'fulfilled' ? tasksResult.value : [],
        notes: notesResult.status === 'fulfilled' ? notesResult.value : [],
        habits: habitsResult.status === 'fulfilled' ? habitsResult.value : [],
        habitCompletions: habitCompletionsResult.status === 'fulfilled' ? habitCompletionsResult.value : [],
        journalEntries: journalEntriesResult.status === 'fulfilled' ? journalEntriesResult.value : [],
        calendarEvents: calendarEventsResult.status === 'fulfilled' ? calendarEventsResult.value : [],
        meetings: meetingsResult.status === 'fulfilled' ? meetingsResult.value : [],
        userSettings: settingsResult.status === 'fulfilled' ? settingsResult.value[0] || null : null
      };

      console.log('Context loaded successfully:', {
        tasks: this.context.tasks.length,
        notes: this.context.notes.length,
        habits: this.context.habits.length,
        calendarEvents: this.context.calendarEvents.length,
        meetings: this.context.meetings.length
      });

    } catch (error) {
      console.error('Error loading context:', error);
      // Create empty context as fallback
      this.context = {
        userId: this.userEmail,
        tasks: [],
        notes: [],
        habits: [],
        habitCompletions: [],
        journalEntries: [],
        calendarEvents: [],
        meetings: [],
        userSettings: null
      };
      console.log('Using empty context as fallback');
    }
  }

  private analyzeIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();
    console.log('Analyzing intent for query:', query);
    
    const intent: QueryIntent = {
      type: 'general',
      action: 'query',
      entities: {},
      confidence: 0.5
    };

    // Calendar queries
    if (lowerQuery.includes('meeting') || lowerQuery.includes('event') || 
        lowerQuery.includes('schedule') || lowerQuery.includes('calendar') ||
        lowerQuery.includes('appointment') || lowerQuery.includes('airport') ||
        lowerQuery.includes('flight') || lowerQuery.includes('mum') || 
        lowerQuery.includes('mom') || lowerQuery.includes('dad') ||
        (lowerQuery.includes('when') && (lowerQuery.includes('do i') || lowerQuery.includes('am i')))) {
      intent.type = 'calendar';
      intent.confidence = 0.9;
      
      if (lowerQuery.includes('today')) intent.entities.timeRef = 'today';
      else if (lowerQuery.includes('tomorrow')) intent.entities.timeRef = 'tomorrow';
      else if (lowerQuery.includes('next')) intent.entities.timeRef = 'next';
    }

    // Task queries
    else if (lowerQuery.includes('task') || lowerQuery.includes('todo') || 
             lowerQuery.includes('deadline') || lowerQuery.includes('due')) {
      intent.type = 'task';
      intent.confidence = 0.8;
      
      if (lowerQuery.includes('add') || lowerQuery.includes('create') || 
          lowerQuery.includes('new') || lowerQuery.includes('make')) {
        intent.action = 'create';
        intent.entities.task = this.extractTaskText(query);
      }
    }

    // Note queries
    else if (lowerQuery.includes('note') || lowerQuery.includes('notes') || 
             lowerQuery.includes('journal') || lowerQuery.includes('write')) {
      intent.type = 'note';
      intent.confidence = 0.8;
      
      if (lowerQuery.includes('add') || lowerQuery.includes('create') || 
          lowerQuery.includes('write')) {
        intent.action = 'create';
        intent.entities.topic = this.extractTopicText(query);
      }
    }

    // Journal queries
    else if (lowerQuery.includes('journal') || lowerQuery.includes('insight') || 
             lowerQuery.includes('mood') || lowerQuery.includes('entry')) {
      intent.type = 'journal';
      intent.confidence = 0.8;
    }

    // Meeting queries (specific to meeting notes)
    else if (lowerQuery.includes('meeting') && (lowerQuery.includes('talk') || 
             lowerQuery.includes('discuss') || lowerQuery.includes('last') || 
             lowerQuery.includes('what'))) {
      intent.type = 'meeting';
      intent.confidence = 0.9;
      intent.entities.topic = this.extractMeetingSearchTerms(query);
    }

    // Habit queries
    else if (lowerQuery.includes('habit') || lowerQuery.includes('streak') || 
             lowerQuery.includes('routine')) {
      intent.type = 'habit';
      intent.confidence = 0.8;
    }

    // Productivity queries
    else if (lowerQuery.includes('productive') || lowerQuery.includes('progress') || 
             lowerQuery.includes('how am i') || lowerQuery.includes('insights')) {
      intent.type = 'productivity';
      intent.confidence = 0.7;
    }

    // Search queries
    else if (lowerQuery.includes('when did i') || lowerQuery.includes('last time') || 
             lowerQuery.includes('find') || lowerQuery.includes('search') ||
             lowerQuery.includes('show me') || lowerQuery.includes('talk about')) {
      intent.type = 'search';
      intent.confidence = 0.8;
      intent.entities.topic = this.extractSearchTerms(query);
    }

    console.log('Intent analysis result:', intent);
    return intent;
  }

  private async handleCalendarQuery(query: string, intent: QueryIntent): Promise<string> {
    const { now, today, tomorrow } = this.getTimezoneAwareDates();
    
    // Handle specific contextual queries like "when am I taking mum to the airport"
    if (intent.entities.timeRef === undefined) {
      const contextKeywords = this.extractCalendarKeywords(query);
      if (contextKeywords.length > 0) {
        const matchingEvents = this.context!.calendarEvents.filter(event => {
          const eventText = `${event.summary || ''} ${event.description || ''} ${event.location || ''}`.toLowerCase();
          return contextKeywords.some(keyword => eventText.includes(keyword));
        });

        if (matchingEvents.length > 0) {
          const upcomingMatches = matchingEvents
            .filter(event => {
              const eventDate = new Date(event.start || event.date);
              return eventDate >= today;
            })
            .sort((a, b) => {
              const dateA = new Date(a.start || a.date);
              const dateB = new Date(b.start || b.date);
              return dateA.getTime() - dateB.getTime();
            });

          if (upcomingMatches.length > 0) {
            const nextEvent = upcomingMatches[0];
            const eventDate = new Date(nextEvent.start || nextEvent.date);
            const dayName = formatInTimeZone(eventDate, this.getUserTimezone(), 'eeee');
            const dateStr = formatInTimeZone(eventDate, this.getUserTimezone(), 'MMMM d');
            const timeStr = formatInTimeZone(eventDate, this.getUserTimezone(), 'h:mm a');
            
            const timeDiff = eventDate.getTime() - now.getTime();
            const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            let whenText = "";
            if (daysUntil === 0) whenText = "today";
            else if (daysUntil === 1) whenText = "tomorrow";
            else if (daysUntil <= 7) whenText = `this ${dayName}`;
            else whenText = `on ${dayName}, ${dateStr}`;
            
            let response = `📅 **${nextEvent.summary}** is scheduled for **${whenText}** at **${timeStr}**`;
            
            if (nextEvent.location) {
              response += `\n📍 Location: ${nextEvent.location}`;
            }
            
            if (nextEvent.description) {
              response += `\n📝 ${nextEvent.description.substring(0, 150)}${nextEvent.description.length > 150 ? '...' : ''}`;
            }
            
            return response;
          }
        }
      }
    }

    // Handle time-specific queries
    if (intent.entities.timeRef === 'today') {
      const todayEvents = this.context!.calendarEvents.filter(event => {
        const eventDate = new Date(event.start || event.date);
        const eventInUserTz = toZonedTime(eventDate, this.getUserTimezone());
        return eventInUserTz.getDate() === today.getDate() && 
               eventInUserTz.getMonth() === today.getMonth() && 
               eventInUserTz.getFullYear() === today.getFullYear();
      });

      if (todayEvents.length === 0) {
        return "You don't have any events scheduled for today.";
      } else if (todayEvents.length === 1) {
        const event = todayEvents[0];
        const eventDate = new Date(event.start || event.date);
        const time = formatInTimeZone(eventDate, this.getUserTimezone(), 'h:mm a');
        return `Your only event today is **${event.summary}** at **${time}**${event.location ? ` (${event.location})` : ''}.`;
      } else {
        const eventList = todayEvents.map(event => {
          const eventDate = new Date(event.start || event.date);
          const time = formatInTimeZone(eventDate, this.getUserTimezone(), 'h:mm a');
          return `• ${time} - **${event.summary}**${event.location ? ` (${event.location})` : ''}`;
        }).join('\n');
        
        return `📅 **Today's Schedule** (${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''}):\n\n${eventList}`;
      }
    }

    if (intent.entities.timeRef === 'tomorrow') {
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      
      const tomorrowEvents = this.context!.calendarEvents.filter(event => {
        const eventDate = new Date(event.start || event.date);
        const eventInUserTz = toZonedTime(eventDate, this.getUserTimezone());
        return eventInUserTz.getDate() === tomorrow.getDate() && 
               eventInUserTz.getMonth() === tomorrow.getMonth() && 
               eventInUserTz.getFullYear() === tomorrow.getFullYear();
      });

      if (tomorrowEvents.length === 0) {
        return "You don't have any events scheduled for tomorrow.";
      } else if (tomorrowEvents.length === 1) {
        const event = tomorrowEvents[0];
        const eventDate = new Date(event.start || event.date);
        const time = formatInTimeZone(eventDate, this.getUserTimezone(), 'h:mm a');
        return `Your only event tomorrow is **${event.summary}** at **${time}**${event.location ? ` (${event.location})` : ''}.`;
      } else {
        const eventList = tomorrowEvents.map(event => {
          const eventDate = new Date(event.start || event.date);
          const time = formatInTimeZone(eventDate, this.getUserTimezone(), 'h:mm a');
          return `• ${time} - **${event.summary}**${event.location ? ` (${event.location})` : ''}`;
        }).join('\n');
        
        return `📅 **Tomorrow's Schedule** (${tomorrowEvents.length} event${tomorrowEvents.length !== 1 ? 's' : ''}):\n\n${eventList}`;
      }
    }

    // Default: show next few events
    const upcomingEvents = this.context!.calendarEvents
      .filter(event => {
        const eventDate = new Date(event.start || event.date);
        return eventDate >= today;
      })
      .sort((a, b) => {
        const dateA = new Date(a.start || a.date);
        const dateB = new Date(b.start || b.date);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);

    if (upcomingEvents.length === 0) {
      return "You have no upcoming events scheduled.";
    }

    // If user is asking specifically about meetings, filter for meetings
    if (lowerQuery.includes('meeting') || lowerQuery.includes('next meeting')) {
      const meetingEvents = upcomingEvents.filter(event => {
        const eventText = `${event.summary || ''} ${event.description || ''}`.toLowerCase();
        return eventText.includes('meeting') || eventText.includes('call') || eventText.includes('standup');
      });

      if (meetingEvents.length === 0) {
        return "You have no upcoming meetings scheduled.";
      }

      if (meetingEvents.length === 1) {
        const event = meetingEvents[0];
        const eventDate = new Date(event.start || event.date);
        const dayName = formatInTimeZone(eventDate, this.getUserTimezone(), 'eeee');
        const dateStr = formatInTimeZone(eventDate, this.getUserTimezone(), 'MMM d');
        const time = formatInTimeZone(eventDate, this.getUserTimezone(), 'h:mm a');
        
        return `📅 **Your Next Meeting**:\n\n**${event.summary}**\n📅 ${dayName}, ${dateStr} at ${time}${event.location ? `\n📍 ${event.location}` : ''}`;
      } else {
        let response = `📅 **Your Upcoming Meetings** (${meetingEvents.length}):\n\n`;
        meetingEvents.forEach((event, index) => {
          const eventDate = new Date(event.start || event.date);
          const dayName = formatInTimeZone(eventDate, this.getUserTimezone(), 'eeee');
          const dateStr = formatInTimeZone(eventDate, this.getUserTimezone(), 'MMM d');
          const time = formatInTimeZone(eventDate, this.getUserTimezone(), 'h:mm a');
          response += `${index + 1}. **${event.summary}** - ${dayName}, ${dateStr} at ${time}${event.location ? ` (${event.location})` : ''}\n`;
        });
        return response;
      }
    }

    const eventList = upcomingEvents.map(event => {
      const eventDate = new Date(event.start || event.date);
      const dayName = formatInTimeZone(eventDate, this.getUserTimezone(), 'eeee');
      const dateStr = formatInTimeZone(eventDate, this.getUserTimezone(), 'MMM d');
      const time = formatInTimeZone(eventDate, this.getUserTimezone(), 'h:mm a');
      return `• ${dayName}, ${dateStr} at ${time} - **${event.summary}**${event.location ? ` (${event.location})` : ''}`;
    }).join('\n');

    return `📅 **Your Next Events**:\n\n${eventList}`;
  }

  private async handleTaskQuery(query: string, intent: QueryIntent): Promise<string> {
    if (intent.action === 'create') {
      const taskText = intent.entities.task || this.extractTaskText(query);
      if (!taskText) {
        return "I couldn't understand what task you want to create. Please try again.";
      }

      try {
        // Create task directly in database
        const newTask = await db.insert(tasks).values({
          text: taskText,
          done: false,
          user_email: this.userEmail,
          source: 'ai_assistant',
          createdAt: new Date()
        }).returning();

        if (newTask.length > 0) {
          return `✅ I've created the task "${taskText}" for you.`;
        } else {
          return "I had trouble creating that task. Please try again.";
        }
      } catch (error) {
        console.error('Error creating task:', error);
        return "I couldn't create the task right now. Please try again.";
      }
    }

    // Show tasks
    const pendingTasks = this.context!.tasks.filter(task => !task.done);
    const completedTasks = this.context!.tasks.filter(task => task.done);

    if (pendingTasks.length === 0) {
      return "You have no pending tasks! 🎉";
    }

    const taskList = pendingTasks.slice(0, 10).map(task => {
      const created = new Date(task.createdAt);
      const timeAgo = this.formatTimeAgo(created);
      return `• **${task.text}** (created ${timeAgo})`;
    }).join('\n');

    return `📋 **Your Pending Tasks** (${pendingTasks.length} total):\n\n${taskList}${pendingTasks.length > 10 ? '\n\n... and more tasks' : ''}`;
  }

  private async handleNoteQuery(query: string, intent: QueryIntent): Promise<string> {
    if (intent.action === 'create') {
      const noteText = intent.entities.topic || this.extractTopicText(query);
      if (!noteText) {
        return "I couldn't understand what note you want to create. Please try again.";
      }

      try {
        // Create note directly in database
        const newNote = await db.insert(notes).values({
          title: noteText,
          content: noteText,
          user_email: this.userEmail,
          source: 'ai_assistant',
          createdAt: new Date()
        }).returning();

        if (newNote.length > 0) {
          return `✅ I've created a note titled "${noteText}" for you.`;
        } else {
          return "I had trouble creating that note. Please try again.";
        }
      } catch (error) {
        console.error('Error creating note:', error);
        return "I couldn't create the note right now. Please try again.";
      }
    }

    // Show recent notes with decryption
    const recentNotes = this.context!.notes.slice(0, 5);
    if (recentNotes.length === 0) {
      return "You don't have any notes yet.";
    }

    const noteList = recentNotes.map(note => {
      const created = new Date(note.createdAt);
      const timeAgo = this.formatTimeAgo(created);
      
      // Decrypt note content
      let decryptedTitle = note.title;
      let decryptedContent = note.content;
      
      try {
        if (note.title && typeof note.title === 'object' && note.title.isEncrypted) {
          decryptedTitle = retrieveContentFromStorage(note.title);
        }
        if (note.content && typeof note.content === 'object' && note.content.isEncrypted) {
          decryptedContent = retrieveContentFromStorage(note.content);
        }
      } catch (error) {
        console.error('Error decrypting note:', error);
      }
      
      return `• **${decryptedTitle}** (${timeAgo})`;
    }).join('\n');

    return `📝 **Your Recent Notes**:\n\n${noteList}`;
  }

  private async handleJournalQuery(query: string, intent: QueryIntent): Promise<string> {
    const journalEntries = this.context!.journalEntries;
    const journalMoods = this.context!.journalMoods;

    if (journalEntries.length === 0 && journalMoods.length === 0) {
      return "You don't have any journal entries yet. Start journaling to get insights about your mood and activities!";
    }

    let response = "📔 **Your Journal Insights**:\n\n";

    // Show recent journal entries
    if (journalEntries.length > 0) {
      const recentEntries = journalEntries.slice(0, 3);
      response += "📝 **Recent Entries**:\n";
      recentEntries.forEach(entry => {
        const created = new Date(entry.createdAt);
        const timeAgo = this.formatTimeAgo(created);
        
        // Decrypt entry content
        let decryptedContent = entry.content;
        try {
          if (entry.content && typeof entry.content === 'object' && entry.content.isEncrypted) {
            decryptedContent = retrieveContentFromStorage(entry.content);
          }
        } catch (error) {
          console.error('Error decrypting journal entry:', error);
        }
        
        response += `• ${timeAgo}: ${decryptedContent.substring(0, 100)}${decryptedContent.length > 100 ? '...' : ''}\n`;
      });
      response += '\n';
    }

    // Show mood insights
    if (journalMoods.length > 0) {
      const recentMoods = journalMoods.slice(0, 7);
      const moodCounts: { [mood: string]: number } = {};
      
      recentMoods.forEach(mood => {
        let decryptedMood = mood.mood;
        try {
          if (mood.mood && typeof mood.mood === 'object' && mood.mood.isEncrypted) {
            decryptedMood = retrieveContentFromStorage(mood.mood);
          }
        } catch (error) {
          console.error('Error decrypting mood:', error);
        }
        
        moodCounts[decryptedMood] = (moodCounts[decryptedMood] || 0) + 1;
      });

      const mostCommonMood = Object.entries(moodCounts)
        .sort(([,a], [,b]) => b - a)[0];

      if (mostCommonMood) {
        response += `😊 **Mood Trend**: Your most common mood recently has been "${mostCommonMood[0]}" (${mostCommonMood[1]} times)\n\n`;
      }
    }

    response += "💡 **Tip**: Regular journaling helps track patterns in your mood and productivity!";

    return response;
  }

  private async handleMeetingQuery(query: string, intent: QueryIntent): Promise<string> {
    // Look for meeting notes specifically
    const meetingNotes = this.context!.notes.filter(note => 
      note.eventId || note.isAdhoc || 
      (note.title && note.title.toLowerCase().includes('meeting'))
    );

    if (meetingNotes.length === 0) {
      return "You don't have any meeting notes yet. Start taking notes during meetings to track what was discussed!";
    }

    // Sort by creation date (most recent first)
    const sortedNotes = meetingNotes.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const lastMeeting = sortedNotes[0];
    const created = new Date(lastMeeting.createdAt);
    const timeAgo = this.formatTimeAgo(created);

    // Decrypt meeting content
    let decryptedTitle = lastMeeting.title;
    let decryptedContent = lastMeeting.content;
    
    try {
      if (lastMeeting.title && typeof lastMeeting.title === 'object' && lastMeeting.title.isEncrypted) {
        decryptedTitle = retrieveContentFromStorage(lastMeeting.title);
      }
      if (lastMeeting.content && typeof lastMeeting.content === 'object' && lastMeeting.content.isEncrypted) {
        decryptedContent = retrieveContentFromStorage(lastMeeting.content);
      }
    } catch (error) {
      console.error('Error decrypting meeting note:', error);
    }

    let response = `📅 **Your Last Meeting** (${timeAgo}):\n\n`;
    response += `**${decryptedTitle}**\n\n`;
    
    // Show content summary
    if (decryptedContent && decryptedContent.length > 0) {
      const summary = decryptedContent.length > 300 
        ? decryptedContent.substring(0, 300) + '...' 
        : decryptedContent;
      response += `**Discussion**: ${summary}\n\n`;
    }

    // Show actions if available
    if (lastMeeting.actions && Array.isArray(lastMeeting.actions)) {
      const actions = lastMeeting.actions;
      if (actions.length > 0) {
        response += `**Actions**:\n`;
        actions.forEach((action: any, index: number) => {
          response += `${index + 1}. ${action.text || action}\n`;
        });
        response += '\n';
      }
    }

    return response;
  }

  private async handleHabitQuery(query: string, intent: QueryIntent): Promise<string> {
    const habits = this.context!.habits;
    const completions = this.context!.habitCompletions;

    if (habits.length === 0) {
      return "You don't have any habits set up yet. Would you like to create some?";
    }

    // Analyze habit performance
    const habitStats = habits.map(habit => {
      const habitCompletions = completions.filter(comp => comp.habitId === habit.id);
      const recentCompletions = habitCompletions.filter(comp => {
        const compDate = new Date(comp.timestamp);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return compDate >= thirtyDaysAgo && comp.completed;
      });

      let expectedDays = 30;
      if (habit.frequency === 'weekly') expectedDays = Math.floor(30 / 7);
      else if (habit.frequency === 'custom' && habit.customDays) {
        expectedDays = Math.floor((habit.customDays as string[]).length * 30 / 7);
      }

      const consistencyScore = expectedDays > 0 ? (recentCompletions.length / expectedDays) * 100 : 0;

      return {
        ...habit,
        consistencyScore,
        completionCount: recentCompletions.length,
        expectedCount: expectedDays
      };
    });

    const strugglingHabits = habitStats.filter(h => h.consistencyScore < 50);
    const successfulHabits = habitStats.filter(h => h.consistencyScore > 80);

    let response = "📊 **Your Habit Overview**:\n\n";

    if (strugglingHabits.length > 0) {
      response += `⚠️ **Habits that need attention**:\n`;
      strugglingHabits.forEach(habit => {
        response += `• "${habit.name}" - ${Math.round(habit.consistencyScore)}% consistency\n`;
      });
      response += '\n';
    }

    if (successfulHabits.length > 0) {
      response += `✅ **Habits you're crushing**:\n`;
      successfulHabits.forEach(habit => {
        response += `• "${habit.name}" - ${Math.round(habit.consistencyScore)}% consistency\n`;
      });
      response += '\n';
    }

    if (strugglingHabits.length === 0 && successfulHabits.length === 0) {
      response += "Your habits are doing okay! Keep up the good work. 💪\n";
    }

    return response;
  }

  private async handleProductivityQuery(query: string, intent: QueryIntent): Promise<string> {
    const tasks = this.context!.tasks;
    const completedTasks = tasks.filter(task => task.done);
    const pendingTasks = tasks.filter(task => !task.done);
    const overdueTasks = pendingTasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < new Date()
    );

    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

    let response = "📈 **Your Productivity Insights**:\n\n";

    response += `✅ **Task Completion Rate**: ${Math.round(completionRate)}%\n`;
    response += `📋 **Total Tasks**: ${tasks.length}\n`;
    response += `✅ **Completed**: ${completedTasks.length}\n`;
    response += `⏳ **Pending**: ${pendingTasks.length}\n`;

    if (overdueTasks.length > 0) {
      response += `⚠️ **Overdue**: ${overdueTasks.length}\n`;
    }

    // Add insights based on data
    if (completionRate > 80) {
      response += "\n🎉 **You're doing great!** Your completion rate is excellent.";
    } else if (completionRate > 60) {
      response += "\n💪 **Good progress!** Consider breaking down larger tasks.";
    } else {
      response += "\n🤔 **Consider reviewing** your task management strategy.";
    }

    if (overdueTasks.length > 5) {
      response += `\n\n⚠️ **You have ${overdueTasks.length} overdue tasks.** Consider prioritizing the most important ones.`;
    }

    return response;
  }

  private async handleSearchQuery(query: string, intent: QueryIntent): Promise<string> {
    const searchTerms = intent.entities.topic || this.extractSearchTerms(query);
    console.log('Search query:', query);
    console.log('Extracted search terms:', searchTerms);
    
    if (!searchTerms) {
      return "What would you like me to search for?";
    }

    // Check if we have any data to search
    if (!this.context || (this.context.tasks.length === 0 && this.context.notes.length === 0 && 
        this.context.calendarEvents.length === 0 && this.context.habits.length === 0)) {
      return `I don't have any data to search through right now. Once you start adding tasks, notes, calendar events, or habits, I'll be able to help you find information about "${searchTerms}".`;
    }

    const keywords = searchTerms.toLowerCase().split(' ').filter(word => word.length > 2);
    console.log('Search keywords:', keywords);
    
    // Search across all data types with decryption
    const matchingTasks = this.context!.tasks.filter(task => {
      const taskText = task.text.toLowerCase();
      return keywords.some(keyword => taskText.includes(keyword));
    });

    const matchingNotes = this.context!.notes.filter(note => {
      let noteText = '';
      try {
        // Decrypt note content for search
        let decryptedTitle = note.title;
        let decryptedContent = note.content;
        
        if (note.title && typeof note.title === 'object' && note.title.isEncrypted) {
          decryptedTitle = retrieveContentFromStorage(note.title);
        }
        if (note.content && typeof note.content === 'object' && note.content.isEncrypted) {
          decryptedContent = retrieveContentFromStorage(note.content);
        }
        
        noteText = `${decryptedTitle} ${decryptedContent}`.toLowerCase();
      } catch (error) {
        console.error('Error decrypting note for search:', error);
        noteText = `${note.title} ${note.content}`.toLowerCase();
      }
      
      return keywords.some(keyword => noteText.includes(keyword));
    });

    const matchingEvents = this.context!.calendarEvents.filter(event => {
      const eventText = `${event.summary || ''} ${event.description || ''} ${event.location || ''}`.toLowerCase();
      return keywords.some(keyword => eventText.includes(keyword));
    });

    const matchingHabits = this.context!.habits.filter(habit => {
      const habitText = habit.name.toLowerCase();
      return keywords.some(keyword => habitText.includes(keyword));
    });

    console.log('Search results:', {
      tasks: matchingTasks.length,
      notes: matchingNotes.length,
      events: matchingEvents.length,
      habits: matchingHabits.length
    });

    const totalMatches = matchingTasks.length + matchingNotes.length + matchingEvents.length + matchingHabits.length;

    if (totalMatches === 0) {
      return `I couldn't find anything related to "${searchTerms}" in your data. Try searching for something else or add some content first.`;
    }

    let response = `🔍 **Search Results for "${searchTerms}"**:\n\n`;

    if (matchingTasks.length > 0) {
      response += `📋 **Tasks** (${matchingTasks.length}):\n`;
      matchingTasks.slice(0, 3).forEach(task => {
        const timeAgo = this.formatTimeAgo(new Date(task.createdAt));
        response += `• "${task.text}" (${timeAgo})\n`;
      });
      response += '\n';
    }

    if (matchingNotes.length > 0) {
      response += `📝 **Notes** (${matchingNotes.length}):\n`;
      matchingNotes.slice(0, 3).forEach(note => {
        const timeAgo = this.formatTimeAgo(new Date(note.createdAt));
        
        // Decrypt note title for display
        let decryptedTitle = note.title;
        try {
          if (note.title && typeof note.title === 'object' && note.title.isEncrypted) {
            decryptedTitle = retrieveContentFromStorage(note.title);
          }
        } catch (error) {
          console.error('Error decrypting note title:', error);
        }
        
        response += `• "${decryptedTitle}" (${timeAgo})\n`;
      });
      response += '\n';
    }

    if (matchingEvents.length > 0) {
      response += `📅 **Events** (${matchingEvents.length}):\n`;
      matchingEvents.slice(0, 3).forEach(event => {
        const eventDate = new Date(event.start || event.date);
        const timeAgo = this.formatTimeAgo(eventDate);
        response += `• "${event.summary}" (${timeAgo})\n`;
      });
      response += '\n';
    }

    if (matchingHabits.length > 0) {
      response += `🔄 **Habits** (${matchingHabits.length}):\n`;
      matchingHabits.slice(0, 3).forEach(habit => {
        response += `• "${habit.name}"\n`;
      });
      response += '\n';
    }

    return response;
  }

  private async handleCreateQuery(query: string, intent: QueryIntent): Promise<string> {
    // This would handle creating various items
    return "I can help you create tasks, notes, and other items. What would you like to create?";
  }

  private async handleGeneralQuery(query: string, intent: QueryIntent): Promise<string> {
    return `I can help you with:

🔍 **Finding Information**:
• "When did I last work on [project]?"
• "Show me notes about [topic]"
• "What meetings do I have with [person]?"

📊 **Analyzing Patterns**:
• "How are my habits doing?"
• "What's my productivity like?"
• "Which tasks am I struggling with?"

🏷️ **Organizing by Tags**:
• "Show me everything tagged [tag]"
• "What's related to [topic]?"

💡 **Getting Suggestions**:
• "Give me productivity tips"
• "How can I improve my habits?"

Try asking me something specific about your tasks, notes, meetings, or habits!`;
  }

  // Helper methods
  private extractCalendarKeywords(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const stopWords = ['when', 'do', 'i', 'am', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'to', 'for', 'with', 'at', 'on', 'in', 'take', 'have', 'get', 'go', 'my', 'me'];
    
    const words = lowerQuery
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
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
    
    return Array.from(new Set(expandedKeywords));
  }

  private extractTaskText(query: string): string {
    const patterns = [
      /(?:add|create|new|make)\s+(?:a\s+)?task\s+(.+)/i,
      /(?:add|create|new|make)\s+(.+?)\s+(?:to\s+)?(?:my\s+)?(?:task\s+)?list/i,
      /task:?\s*(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return query.replace(/^(add|create|new|make|task|todo)\s*/i, '').trim();
  }

  private extractTopicText(query: string): string {
    const patterns = [
      /(?:add|create|write)\s+(?:a\s+)?note\s+(.+)/i,
      /(?:note|write)\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return query.replace(/^(add|create|write|note)\s*/i, '').trim();
  }

  private extractSearchTerms(query: string): string {
    const patterns = [
      /(?:when did i|last time i)\s+(?:talk about|discuss|mention|work on)\s+(.+)/i,
      /(?:when did i|last time i)\s+(.+)/i,
      /(?:find|search|show me)\s+(.+)/i,
      /(?:talk about|discuss|mention)\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        console.log('Extracted search terms from pattern:', pattern, 'Result:', extracted);
        return extracted;
      }
    }
    
    // Fallback: remove common words and extract the rest
    const fallback = query.replace(/^(when did i|last time i|find|search|show me|talk about|discuss|mention)\s*/i, '').trim();
    console.log('Fallback search terms extraction:', fallback);
    return fallback;
  }

  private extractMeetingSearchTerms(query: string): string {
    const patterns = [
      /(?:what did i|what was|what did we)\s+(?:talk about|discuss|mention)\s+(?:in my|in the|in our)\s+(?:last|recent|latest)\s+(?:meeting|call)/i,
      /(?:what did i|what was|what did we)\s+(?:talk about|discuss|mention)\s+(?:in my|in the|our)\s+(?:meeting|call)/i,
      /(?:my|the|our)\s+(?:last|recent|latest)\s+(?:meeting|call)\s+(?:was about|discussed|talked about)\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        console.log('Extracted meeting search terms from pattern:', pattern, 'Result:', extracted);
        return extracted;
      }
    }
    
    // If no specific pattern matches, return empty to indicate general meeting query
    return '';
  }

  private getUserTimezone(): string {
    return (global as any).currentUserTimezone || 'UTC';
  }

  private getTimezoneAwareDates() {
    const userTimezone = this.getUserTimezone();
    const now = new Date();
    const nowInUserTz = toZonedTime(now, userTimezone);
    
    const today = new Date(nowInUserTz.getFullYear(), nowInUserTz.getMonth(), nowInUserTz.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return { now: nowInUserTz, today, tomorrow, userTimezone };
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
}