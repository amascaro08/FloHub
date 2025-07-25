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

    // First, let's check what the URL returns with a basic fetch
    let responseInfo: any = {};
    try {
      const testResponse = await fetch(processedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'FloHub Calendar Integration/1.0'
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout for initial test
      });
      
      responseInfo = {
        status: testResponse.status,
        statusText: testResponse.statusText,
        contentType: testResponse.headers.get('content-type'),
        contentLength: testResponse.headers.get('content-length'),
        headers: Object.fromEntries(testResponse.headers.entries())
      };
      
      const responseText = await testResponse.text();
      responseInfo.responseLength = responseText.length;
      responseInfo.responsePreview = responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '');
      
      console.log('PowerAutomate Response Info:', responseInfo);
      
      // Check if response looks like iCal
      if (!responseText.includes('BEGIN:VCALENDAR')) {
        return res.status(400).json({ 
          error: 'URL does not return valid iCal data',
          details: 'Response does not contain BEGIN:VCALENDAR',
          responseInfo,
          responsePreview: responseInfo.responsePreview
        });
      }
      
    } catch (fetchError: any) {
      console.error('Initial fetch failed:', fetchError);
      
      // Provide specific guidance for timeout errors
      if (fetchError.name === 'TimeoutError' || fetchError.code === 23) {
        return res.status(400).json({ 
          error: 'PowerAutomate URL timeout',
          details: 'Your PowerAutomate Logic App is taking longer than 30 seconds to respond. This usually means the Logic App is processing complex logic or querying external data sources.',
          recommendations: [
            'Check your Logic App performance in the Azure portal',
            'Optimize any database queries or external API calls',
            'Consider caching data if the Logic App runs complex logic',
            'Verify the Logic App has data to return',
            'Try accessing the URL directly in a browser to confirm it works'
          ],
          code: fetchError.code,
          timeout: '30 seconds'
        });
      }
      
      return res.status(400).json({ 
        error: 'Failed to fetch URL',
        details: fetchError.message,
        code: fetchError.code
      });
    }

    // Parse the iCal feed with proper timeout
    const events = await ical.async.fromURL(processedUrl, {
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'FloHub Calendar Integration/1.0'
      },
      // Additional axios timeout configuration
      timeoutErrorMessage: 'iCal feed request timeout',
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
      responseInfo,
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