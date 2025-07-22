import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { CalendarEvent } from '@/types/calendar';

interface CalendarActionRequest {
  action: 'create' | 'update' | 'delete' | 'list';
  event?: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    calendarId?: string;
    source?: 'personal' | 'work';
    tags?: string[];
    location?: string;
  };
  eventId?: string;
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
}

interface CalendarActionResponse {
  success: boolean;
  message?: string;
  event?: CalendarEvent;
  events?: CalendarEvent[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CalendarActionResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ success: false, error: "Not signed in" });
  }

  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ success: false, error: "User not found" });
  }

  const { action, event, eventId, calendarId, timeMin, timeMax } = req.body as CalendarActionRequest;

  if (!action) {
    return res.status(400).json({ success: false, error: "Action is required" });
  }

  try {
    switch (action) {
      case 'create':
        return await handleCreateEvent(req, res, user, event);
      
      case 'update':
        return await handleUpdateEvent(req, res, user, eventId, event);
      
      case 'delete':
        return await handleDeleteEvent(req, res, user, eventId, calendarId);
      
      case 'list':
        return await handleListEvents(req, res, user, timeMin, timeMax);
      
      default:
        return res.status(400).json({ success: false, error: "Invalid action" });
    }
  } catch (error) {
    console.error('Calendar API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Internal server error" 
    });
  }
}

async function handleCreateEvent(
  req: NextApiRequest,
  res: NextApiResponse<CalendarActionResponse>,
  user: any,
  eventData?: any
) {
  if (!eventData || !eventData.summary || !eventData.start || !eventData.end) {
    return res.status(400).json({ 
      success: false, 
      error: "Event data with summary, start, and end times is required" 
    });
  }

  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        success: false, 
        error: errorData.error || 'Failed to create event' 
      });
    }

    const createdEvent = await response.json();
    return res.status(200).json({
      success: true,
      message: `Event "${eventData.summary}" created successfully`,
      event: createdEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create event' 
    });
  }
}

async function handleUpdateEvent(
  req: NextApiRequest,
  res: NextApiResponse<CalendarActionResponse>,
  user: any,
  eventId?: string,
  eventData?: any
) {
  if (!eventId || !eventData) {
    return res.status(400).json({ 
      success: false, 
      error: "Event ID and event data are required" 
    });
  }

  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/event?id=${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        success: false, 
        error: errorData.error || 'Failed to update event' 
      });
    }

    const updatedEvent = await response.json();
    return res.status(200).json({
      success: true,
      message: `Event "${eventData.summary}" updated successfully`,
      event: updatedEvent
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update event' 
    });
  }
}

async function handleDeleteEvent(
  req: NextApiRequest,
  res: NextApiResponse<CalendarActionResponse>,
  user: any,
  eventId?: string,
  calendarId?: string
) {
  if (!eventId || !calendarId) {
    return res.status(400).json({ 
      success: false, 
      error: "Event ID and calendar ID are required" 
    });
  }

  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/event?id=${eventId}&calendarId=${calendarId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        success: false, 
        error: errorData.error || 'Failed to delete event' 
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete event' 
    });
  }
}

async function handleListEvents(
  req: NextApiRequest,
  res: NextApiResponse<CalendarActionResponse>,
  user: any,
  timeMin?: string,
  timeMax?: string
) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);
    params.append('useCalendarSources', 'true');

    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        success: false, 
        error: errorData.error || 'Failed to fetch events' 
      });
    }

    const calendarData = await response.json();
    const events = calendarData.events || [];

    return res.status(200).json({
      success: true,
      message: `Found ${events.length} events`,
      events: events
    });
  } catch (error) {
    console.error('Error listing events:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch events' 
    });
  }
}