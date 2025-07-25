import type { FloCatCapability } from "../floCatCapabilities";

async function handleCalendarCommand(command: string, args: string, userId: string): Promise<string> {
  console.log(`[DEBUG] handleCalendarCommand called with command: "${command}", args: "${args}", userId: "${userId}"`);
  
  try {
    switch (command.toLowerCase()) {
      case "show":
      case "list":
      case "view":
      case "get":
        return await showCalendarEvents(args, userId);
      
      case "today":
      case "today's":
        return await showTodayEvents(userId);
      
      case "tomorrow":
      case "tomorrow's":
        return await showTomorrowEvents(userId);
      
      case "week":
      case "weekly":
        return await showWeeklyEvents(userId);
      
      default:
        return `I can help you view your calendar. Try: "show my calendar", "today's events", or "this week's schedule".`;
    }
  } catch (error) {
    console.error("Error in calendar command:", error);
    return "Sorry, there was an error accessing your calendar. Please try again.";
  }
}

async function showCalendarEvents(args: string, userId: string): Promise<string> {
  const lowerArgs = args.toLowerCase();
  
  // Check for specific day queries
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const matchedDay = dayNames.find(day => lowerArgs.includes(day));
  
  if (matchedDay) {
    return await showSpecificDayEvents(matchedDay, args, userId);
  } else if (lowerArgs.includes("today")) {
    return await showTodayEvents(userId);
  } else if (lowerArgs.includes("tomorrow")) {
    return await showTomorrowEvents(userId);
  } else if (lowerArgs.includes("week")) {
    return await showWeeklyEvents(userId);
  } else {
    // Default to upcoming events
    return await showUpcomingEvents(userId);
  }
}

async function showSpecificDayEvents(dayName: string, args: string, userId: string): Promise<string> {
  try {
    const lowerArgs = args.toLowerCase();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = dayNames.indexOf(dayName.toLowerCase());
    
    const now = new Date();
    const currentDay = now.getDay();
    let daysToAdd = (dayIndex - currentDay + 7) % 7;
    if (daysToAdd === 0 && !lowerArgs.includes("today")) daysToAdd = 7; // Next week if same day
    
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const contextData = (global as any).currentContextData;
    const events = contextData?.events || contextData?.allEvents || [];
    
    const dayEvents = events.filter((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      return eventDate >= targetDate && eventDate < nextDay;
    });

    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    if (dayEvents.length === 0) {
      return `📅 No events scheduled for ${capitalizedDay}! ✨`;
    }

    if (lowerArgs.includes("first meeting") || lowerArgs.includes("next meeting")) {
      // Show only the first meeting
      const firstEvent = dayEvents[0];
      const time = new Date(firstEvent.start?.dateTime || firstEvent.start?.date || firstEvent.start).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      let response = `📅 **Your first meeting on ${capitalizedDay}**:\n\n• ${time} - **${firstEvent.summary}**\n`;
      if (firstEvent.location) {
        response += `  📍 ${firstEvent.location}\n`;
      }
      if (firstEvent.description) {
        response += `  📝 ${firstEvent.description.substring(0, 100)}${firstEvent.description.length > 100 ? '...' : ''}\n`;
      }
      return response;
    } else {
      // Show all events for the day
      let response = `📅 **${capitalizedDay}'s Schedule** (${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}):\n\n`;
      
      dayEvents.forEach((event: any) => {
        const time = new Date(event.start?.dateTime || event.start?.date || event.start).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        response += `• ${time} - **${event.summary}**\n`;
        if (event.location) {
          response += `  📍 ${event.location}\n`;
        }
      });

      return response;
    }
  } catch (error) {
    console.error("Error showing specific day events:", error);
    return "Sorry, I couldn't retrieve events for that day. Please try again.";
  }
}

async function showTodayEvents(userId: string): Promise<string> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Use global context data if available
    const contextData = (global as any).currentContextData;
    const events = contextData?.events || contextData?.allEvents || [];
    
    const todayEvents = events.filter((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      return eventDate >= today && eventDate < tomorrow;
    });

    if (todayEvents.length === 0) {
      return "📅 No events scheduled for today! ✨ Enjoy your free time.";
    }

    let response = `📅 **Today's Schedule** (${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''}):\n\n`;
    
    todayEvents.forEach((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      const time = eventDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      response += `• ${time} - **${event.summary}**\n`;
      if (event.location) {
        response += `  📍 ${event.location}\n`;
      }
    });

    return response;
  } catch (error) {
    console.error("Error showing today's events:", error);
    return "Sorry, I couldn't retrieve today's events. Please try again.";
  }
}

async function showTomorrowEvents(userId: string): Promise<string> {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const contextData = (global as any).currentContextData;
    const events = contextData?.events || contextData?.allEvents || [];
    
    const tomorrowEvents = events.filter((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      return eventDate >= tomorrow && eventDate < dayAfterTomorrow;
    });

    if (tomorrowEvents.length === 0) {
      return "📅 No events scheduled for tomorrow! 🌟";
    }

    let response = `📅 **Tomorrow's Schedule** (${tomorrowEvents.length} event${tomorrowEvents.length !== 1 ? 's' : ''}):\n\n`;
    
    tomorrowEvents.forEach((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      const time = eventDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      response += `• ${time} - **${event.summary}**\n`;
      if (event.location) {
        response += `  📍 ${event.location}\n`;
      }
    });

    return response;
  } catch (error) {
    console.error("Error showing tomorrow's events:", error);
    return "Sorry, I couldn't retrieve tomorrow's events. Please try again.";
  }
}

async function showWeeklyEvents(userId: string): Promise<string> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const contextData = (global as any).currentContextData;
    const events = contextData?.events || contextData?.allEvents || [];
    
    const weekEvents = events.filter((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      return eventDate >= today && eventDate <= nextWeek;
    });

    if (weekEvents.length === 0) {
      return "📅 No events scheduled for this week! 🆓 Perfect time to plan something new.";
    }

    // Group by day
    const eventsByDay = new Map<string, any[]>();
    weekEvents.forEach((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      const dayKey = eventDate.toDateString();
      if (!eventsByDay.has(dayKey)) {
        eventsByDay.set(dayKey, []);
      }
      eventsByDay.get(dayKey)!.push(event);
    });

    let response = `📅 **This Week's Schedule** (${weekEvents.length} event${weekEvents.length !== 1 ? 's' : ''}):\n\n`;
    
    for (const [dayKey, dayEvents] of Array.from(eventsByDay.entries())) {
      const dayDate = new Date(dayKey);
      const dayName = dayDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      
      response += `**${dayName}** (${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}):\n`;
      
      dayEvents.forEach((event: any) => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
        const time = eventDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        response += `• ${time} - ${event.summary}${event.location ? ` (${event.location})` : ''}\n`;
      });
      
      response += '\n';
    }

    return response.trim();
  } catch (error) {
    console.error("Error showing weekly events:", error);
    return "Sorry, I couldn't retrieve this week's events. Please try again.";
  }
}

async function showUpcomingEvents(userId: string): Promise<string> {
  try {
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const contextData = (global as any).currentContextData;
    const events = contextData?.events || contextData?.allEvents || [];
    
    const upcomingEvents = events.filter((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      return eventDate >= now && eventDate <= nextMonth;
    }).slice(0, 10);

    if (upcomingEvents.length === 0) {
      return "📅 No upcoming events in the next month! 🆓";
    }

    let response = `📅 **Upcoming Events** (${upcomingEvents.length} shown):\n\n`;
    
    upcomingEvents.forEach((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      const dateStr = eventDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      const timeStr = eventDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      response += `• ${dateStr} at ${timeStr} - **${event.summary}**\n`;
      if (event.location) {
        response += `  📍 ${event.location}\n`;
      }
    });

    return response;
  } catch (error) {
    console.error("Error showing upcoming events:", error);
    return "Sorry, I couldn't retrieve upcoming events. Please try again.";
  }
}

export const calendarCapability: FloCatCapability = {
  featureName: "Calendar Management",
  supportedCommands: ["show", "list", "view", "get", "today", "tomorrow", "week"],
  triggerPhrases: [
    "show calendar", "my calendar", "show events", "my events",
    "today's events", "today's schedule", "what's today", "what do I have today",
    "tomorrow's events", "tomorrow's schedule", "what's tomorrow", "what do I have tomorrow",
    "this week", "weekly schedule", "week's events", "show schedule",
    "upcoming events", "what's coming up", "my schedule", "calendar events",
    "first meeting", "next meeting", "meeting on", "events on",
    "what do I have on", "what's on", "meetings on monday", "meetings on tuesday",
    "meetings on wednesday", "meetings on thursday", "meetings on friday",
    "meetings on saturday", "meetings on sunday", "my meetings", "show meetings"
  ],
  handler: async (command: string, args: string) => {
    const userId = (global as any).currentUserId;
    if (!userId) {
      return "Sorry, I need to know who you are to access your calendar. Please make sure you're logged in.";
    }
    return await handleCalendarCommand(command, args, userId);
  }
};