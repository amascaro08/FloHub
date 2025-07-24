import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
const ical = require('node-ical');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Verify user is authenticated
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Convert webcal:// to https://
    let processedUrl = url.trim();
    if (processedUrl.startsWith('webcal://')) {
      processedUrl = 'https://' + processedUrl.substring(9);
    }

    if (!processedUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid URL format. Must start with http://, https://, or webcal://' });
    }

    console.log('Testing iCal URL:', processedUrl);

    // Parse the iCal feed
    const events = await ical.async.fromURL(processedUrl, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'FloHub Calendar Integration/1.0'
      }
    });

    // Count events and extract basic info
    let eventCount = 0;
    let upcomingEvents = 0;
    const now = new Date();
    const calendarInfo: any = {};

    for (const key in events) {
      const event = events[key];
      
      if (event.type === 'VEVENT') {
        eventCount++;
        
        // Check if event is upcoming
        const startDate = event.start ? new Date(event.start) : null;
        if (startDate && startDate > now) {
          upcomingEvents++;
        }
      } else if (event.type === 'VCALENDAR') {
        // Extract calendar metadata
        if (event['X-WR-CALNAME']) {
          calendarInfo.name = event['X-WR-CALNAME'];
        }
        if (event['X-WR-CALDESC']) {
          calendarInfo.description = event['X-WR-CALDESC'];
        }
        if (event['X-WR-TIMEZONE']) {
          calendarInfo.timezone = event['X-WR-TIMEZONE'];
        }
      }
    }

    return res.status(200).json({
      success: true,
      eventCount,
      upcomingEvents,
      calendarInfo,
      message: `Successfully parsed iCal feed with ${eventCount} total events (${upcomingEvents} upcoming)`
    });

  } catch (error: any) {
    console.error('Error testing iCal URL:', error);
    
    let errorMessage = 'Failed to parse iCal feed';
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'URL not found or unreachable';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timed out';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(400).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}