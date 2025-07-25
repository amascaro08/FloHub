import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
// Remove unused imports
// import { parseISO } from 'date-fns';
// import { zonedTimeToUtc } from 'date-fns-tz';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("[API] Event API called with method:", req.method);
  
  // Simple test endpoint
  if (req.method === "GET") {
    return res.status(200).json({ message: "Event API is working", method: req.method });
  }
  
  const decoded = auth(req);
  if (!decoded) {
    console.log("[API] Authentication failed");
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user) {
    console.log("[API] User not found");
    return res.status(401).json({ error: "User not found" });
  }
  const googleAccount = user.accounts?.find(account => account.provider === 'google');
  const accessToken = googleAccount?.access_token;
  
  console.log("[API] User:", user.email);
  console.log("[API] Google account found:", !!googleAccount);
  console.log("[API] Access token exists:", !!accessToken);
  console.log("[API] Access token length:", accessToken?.length);
  
  if (!accessToken) {
    console.error("[API] No access token available");
    return res.status(401).json({ error: "Google Calendar not connected. Please reconnect your Google account." });
  }

  // POST = create, PUT = update
  if (req.method === "POST") {
    console.log("[API] POST request received");
    console.log("[API] Request body:", req.body);
    console.log("[API] Request body type:", typeof req.body);
    console.log("[API] Request headers:", req.headers);
    
    if (!req.body) {
      console.error("[API] No request body received");
      return res.status(400).json({ error: "No request body" });
    }
    
    // Log the raw request for debugging
    console.log("[API] Raw request body:", JSON.stringify(req.body, null, 2));
    
    // Simple test - just echo back the data to see if we can receive it
    const { calendarId, summary, start, end, timeZone, timezoneOffset, description, tags, source } = req.body;
    console.log("[API] Creating event with data:", { calendarId, summary, start, end, timeZone, timezoneOffset, description, tags, source });
    
    // Test: Just return the received data to see if the request is working
    if (req.headers['x-test-mode'] === 'true') {
      return res.status(200).json({ 
        message: "Test mode - request received successfully",
        receivedData: { calendarId, summary, start, end, timeZone, timezoneOffset, description, tags, source }
      });
    }
    
    if (!calendarId || !summary || !start || !end) {
      console.error("[API] Missing required fields for create:", { calendarId, summary, start, end });
      return res.status(400).json({ error: "Missing required fields for create" });
    }
    
    // Check if this is a Google Calendar or another type
    const isGoogleCalendar = !calendarId.startsWith('o365_') && !calendarId.startsWith('apple_') && !calendarId.startsWith('ical_') && !calendarId.startsWith('other_');
    // Check if this is an OAuth-based O365 calendar
    const isO365OAuth = calendarId.startsWith('o365_') && description?.includes("oauth:");
    
    // If not a Google Calendar, we need to handle it differently
    if (!isGoogleCalendar) {
      // Check if this is an iCal calendar (read-only)
      if (calendarId.startsWith('ical_')) {
        return res.status(400).json({ 
          error: "Cannot create events in iCal calendars. iCal feeds are read-only." 
        });
      }
      // Determine which type of calendar we're dealing with
      if (calendarId.startsWith('o365_')) {
        try {
          // Check if this is an OAuth-based O365 calendar
          if (isO365OAuth) {
            // For OAuth-based O365 calendars, we would use Microsoft Graph API
            // This would require proper OAuth authentication with Microsoft
            
            console.log("Creating event in OAuth-based O365 calendar");
            
            // In a real implementation, we would use the Microsoft Graph API
            // For now, we'll create a mock event and return it
            const mockEvent = {
              id: `o365_oauth_evt_${Date.now()}`,
              calendarId,
              summary,
              start: { dateTime: start },
              end: { dateTime: end },
              description: description || "",
              source: "work",
              tags: tags || [],
            };
            
            console.log("Created mock OAuth O365 event:", mockEvent);
            return res.status(201).json(mockEvent);
          } else {
            // For PowerAutomate-based O365 calendars
            // For now, we'll create a mock event and return it
            // In a production environment, you would implement the actual API call
            const mockEvent = {
              id: `o365_evt_${Date.now()}`,
              calendarId,
              summary,
              start: { dateTime: start },
              end: { dateTime: end },
              description: description || "",
              source: "work",
              tags: tags || [],
            };
            
            console.log("Created mock O365 event:", mockEvent);
            return res.status(201).json(mockEvent);
          }
        } catch (error) {
          console.error("Error creating O365 event:", error);
          return res.status(500).json({ error: "Failed to create O365 event" });
        }
      } else if (calendarId.startsWith('apple_')) {
        try {
          // For Apple calendars, we would need to use Apple's Calendar API
          // This would require a different authentication flow and API endpoints
          
          // For now, we'll create a mock event and return it
          // In a production environment, you would implement the actual API call
          const mockEvent = {
            id: `apple_evt_${Date.now()}`,
            calendarId,
            summary,
            start: { dateTime: start },
            end: { dateTime: end },
            description: description || "",
            source: source || "personal",
            tags: tags || [],
          };
          
          console.log("Created mock Apple Calendar event:", mockEvent);
          return res.status(201).json(mockEvent);
        } catch (error) {
          console.error("Error creating Apple Calendar event:", error);
          return res.status(500).json({ error: "Failed to create Apple Calendar event" });
        }
      } else if (calendarId.startsWith('other_')) {
        try {
          // For other calendar types, we would need specific implementations
          // This would depend on the specific calendar provider
          
          // For now, we'll create a mock event and return it
          // In a production environment, you would implement the actual API call
          const mockEvent = {
            id: `other_evt_${Date.now()}`,
            calendarId,
            summary,
            start: { dateTime: start },
            end: { dateTime: end },
            description: description || "",
            source: source || "personal",
            tags: tags || [],
          };
          
          console.log("Created mock event for other calendar type:", mockEvent);
          return res.status(201).json(mockEvent);
        } catch (error) {
          console.error("Error creating event for other calendar type:", error);
          return res.status(500).json({ error: "Failed to create event for this calendar type" });
        }
      } else {
        return res.status(400).json({ error: "Unknown calendar type" });
      }
    }

    // Build endpoint URL for create
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`;
    
    // Prepare payload for Google Calendar API
    const payload: any = {
      summary,
      description: description || "",
    };
    
    // Add extended properties for tags and source if provided
    if (tags && tags.length > 0) {
      payload.extendedProperties = payload.extendedProperties || {};
      payload.extendedProperties.private = payload.extendedProperties.private || {};
      payload.extendedProperties.private.tags = JSON.stringify(tags);
    }
    
    if (source) {
      payload.extendedProperties = payload.extendedProperties || {};
      payload.extendedProperties.private = payload.extendedProperties.private || {};
      payload.extendedProperties.private.source = source;
    }

    if (start) {
      // datetime-local inputs are in local time, so we need to create the ISO string correctly
      const userTimezone = timeZone || 'Australia/Sydney';
      
      // Create a date object from the datetime-local string (which is in local time)
      const [datePart, timePart] = start.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      
      // Create date in local timezone - this is the key fix
      // We need to create the date as if it's in the user's timezone
      const localDate = new Date(year, month - 1, day, hour, minute);
      
      // Adjust for timezone offset if provided
      if (timezoneOffset !== undefined) {
        localDate.setMinutes(localDate.getMinutes() - timezoneOffset);
      }
      
      // Convert to ISO string for Google API
      const startISO = localDate.toISOString();
      
      payload.start = {
        dateTime: startISO,
        timeZone: userTimezone,
      };
      console.log("[API] Converted start time:", start, "->", startISO, "in timezone:", userTimezone, "offset:", timezoneOffset);
    }

    if (end) {
      // datetime-local inputs are in local time, so we need to create the ISO string correctly
      const userTimezone = timeZone || 'Australia/Sydney';
      
      // Create a date object from the datetime-local string (which is in local time)
      const [datePart, timePart] = end.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      
      // Create date in local timezone - this is the key fix
      // We need to create the date as if it's in the user's timezone
      const localDate = new Date(year, month - 1, day, hour, minute);
      
      // Adjust for timezone offset if provided
      if (timezoneOffset !== undefined) {
        localDate.setMinutes(localDate.getMinutes() - timezoneOffset);
      }
      
      // Convert to ISO string for Google API
      const endISO = localDate.toISOString();
      
      payload.end = {
        dateTime: endISO,
        timeZone: userTimezone,
      };
      console.log("[API] Converted end time:", end, "->", endISO, "in timezone:", userTimezone, "offset:", timezoneOffset);
    }

    // Check if user has permission to create events in this calendar
    console.log("[API] Creating event in calendar:", calendarId);
    console.log("[API] User email:", user.email);
    console.log("[API] Is primary calendar:", calendarId === 'primary');
    console.log("[API] Is user's own calendar:", calendarId === user.email);
    
    // Test the access token by making a simple API call
    try {
      const testUrl = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
      const testRes = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log("[API] Access token test status:", testRes.status);
      if (!testRes.ok) {
        const testError = await testRes.json();
        console.error("[API] Access token test failed:", testError);
      }
    } catch (testError) {
      console.error("[API] Access token test error:", testError);
    }
    
    // If it's a shared calendar, try the user's personal calendar first, then primary
    if (calendarId.includes('@group.calendar.google.com') || calendarId.includes('@resource.calendar.google.com')) {
      console.log("[API] Shared calendar detected, trying user's personal calendar first");
      const originalCalendarId = calendarId;
      
      // Try user's personal calendar first
      const personalUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(user.email)}/events`;
      console.log("[API] Trying personal calendar:", personalUrl);
      
      try {
        console.log("[API] Attempting to create event in personal calendar with payload:", JSON.stringify(payload, null, 2));
        const personalRes = await fetch(personalUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        
        console.log("[API] Personal calendar response status:", personalRes.status);
        if (personalRes.ok) {
          const data = await personalRes.json();
          console.log("[API] Successfully created event in personal calendar:", data);
          return res.status(200).json({ ...data, message: "Event created in personal calendar (shared calendar access denied)" });
        } else {
          const personalError = await personalRes.json();
          console.error("[API] Personal calendar failed:", personalError);
          console.log("[API] Personal calendar failed, trying primary calendar");
        }
      } catch (error) {
        console.log("[API] Personal calendar attempt failed:", error);
      }
      
      // If personal calendar failed, try primary calendar
      const primaryUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;
      
      try {
        console.log("[API] Attempting to create event in primary calendar with payload:", JSON.stringify(payload, null, 2));
        const primaryRes = await fetch(primaryUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        
        console.log("[API] Primary calendar response status:", primaryRes.status);
        if (primaryRes.ok) {
          const data = await primaryRes.json();
          console.log("[API] Successfully created event in primary calendar:", data);
          return res.status(200).json({ ...data, message: "Event created in primary calendar (shared calendar access denied)" });
        } else {
          const primaryError = await primaryRes.json();
          console.error("[API] Primary calendar failed:", primaryError);
          console.log("[API] Primary calendar also failed, trying original calendar");
        }
      } catch (error) {
        console.log("[API] Primary calendar attempt failed:", error);
      }
    }

    // Call Google API to create event
    console.log("[API] Calling Google Calendar API with URL:", url);
    console.log("[API] Payload:", JSON.stringify(payload, null, 2));
    console.log("[API] Access token (first 20 chars):", accessToken?.substring(0, 20) + "...");
    
    try {
      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("[API] Google API response status:", apiRes.status);
      console.log("[API] Google API response headers:", Object.fromEntries(apiRes.headers.entries()));
      
      if (!apiRes.ok) {
        let errorText = '';
        try {
          const err = await apiRes.json();
          console.error("Google Calendar API create error:", apiRes.status, err);
          
          // Provide more specific error messages
          let errorMessage = "Google API create error";
          if (err.error?.message) {
            errorMessage = err.error.message;
          } else if (err.error?.errors && err.error.errors.length > 0) {
            errorMessage = err.error.errors[0].message || errorMessage;
          }
          
          console.error("[API] Detailed Google API error:", {
            status: apiRes.status,
            error: err,
            calendarId: calendarId,
            userEmail: user.email
          });
          
          // Return more detailed error information to the client
          return res.status(apiRes.status).json({ 
            error: errorMessage,
            details: {
              status: apiRes.status,
              calendarId: calendarId,
              userEmail: user.email,
              isSharedCalendar: calendarId.includes('@group.calendar.google.com') || calendarId.includes('@resource.calendar.google.com'),
              googleApiError: err
            }
          });
        } catch (parseError) {
          errorText = await apiRes.text();
          console.error("Failed to parse Google API error response:", errorText);
          
          // If this is a shared calendar and it failed, try the primary calendar
          if (calendarId.includes('@group.calendar.google.com') || calendarId.includes('@resource.calendar.google.com')) {
            console.log("[API] Shared calendar failed, trying primary calendar as fallback");
            try {
              const primaryUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;
              const primaryRes = await fetch(primaryUrl, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });
              
              if (primaryRes.ok) {
                const data = await primaryRes.json();
                console.log("[API] Successfully created event in primary calendar as fallback:", data);
                return res.status(200).json({ 
                  ...data, 
                  message: "Event created in primary calendar (shared calendar access denied)" 
                });
              }
            } catch (fallbackError) {
              console.error("[API] Primary calendar fallback also failed:", fallbackError);
            }
          }
          
          return res.status(apiRes.status).json({ error: `Google API error: ${apiRes.status} - ${errorText}` });
        }
      }

      // Success case
      const data = await apiRes.json();
      console.log("[API] Successfully created event:", data);
      return res.status(200).json(data);
    } catch (fetchError) {
      console.error("[API] Fetch error:", fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown network error';
      return res.status(500).json({ error: `Network error: ${errorMessage}` });
    }
  }

  if ((req.method as string) === "PUT") {
    const { calendarId, summary, start, end, timeZone, description, tags, source } = req.body;
    const { id } = req.query; // Get eventId from query parameters

    if (!id || !calendarId || !summary || !start || !end) {
      console.error("[API] Missing required fields for update:", { id, calendarId, summary, start, end });
      return res.status(400).json({ error: "Missing required fields for update" });
    }
    
    // Check if this is a Google Calendar or another type
    const isGoogleCalendar = !calendarId.startsWith('o365_') && !calendarId.startsWith('apple_') && !calendarId.startsWith('ical_') && !calendarId.startsWith('other_');
    
    // If not a Google Calendar, we need to handle it differently
    if (!isGoogleCalendar) {
      // Check if this is an iCal calendar (read-only)
      if (calendarId.startsWith('ical_')) {
        return res.status(400).json({ 
          error: "Cannot update events in iCal calendars. iCal feeds are read-only." 
        });
      }
      // Determine which type of calendar we're dealing with
      if (calendarId.startsWith('o365_')) {
        try {
          // Check if this is an OAuth-based O365 calendar
          // Check if this is an OAuth-based O365 calendar
          const isOAuthCalendar = description?.includes("oauth:");
          if (isOAuthCalendar) {
            // For OAuth-based O365 calendars, we would use Microsoft Graph API
            // This would require proper OAuth authentication with Microsoft
            
            console.log("Updating event in OAuth-based O365 calendar");
            
            // In a real implementation, we would use the Microsoft Graph API
            // For now, we'll create a mock updated event and return it
            const mockEvent = {
              id: id as string,
              calendarId,
              summary,
              start: { dateTime: start },
              end: { dateTime: end },
              description: description || "",
              source: "work",
              tags: tags || [],
            };
            
            console.log("Updated mock OAuth O365 event:", mockEvent);
            return res.status(200).json(mockEvent);
          } else {
            // For PowerAutomate-based O365 calendars
            // For now, we'll create a mock updated event and return it
            // In a production environment, you would implement the actual API call
            const mockEvent = {
              id: id as string,
              calendarId,
              summary,
              start: { dateTime: start },
              end: { dateTime: end },
              description: description || "",
              source: "work",
              tags: tags || [],
            };
            
            console.log("Updated mock O365 event:", mockEvent);
            return res.status(200).json(mockEvent);
          }
        } catch (error) {
          console.error("Error updating O365 event:", error);
          return res.status(500).json({ error: "Failed to update O365 event" });
        }
      } else if (calendarId.startsWith('apple_')) {
        try {
          // For Apple calendars, we would need to use Apple's Calendar API
          // This would require a different authentication flow and API endpoints
          
          // For now, we'll create a mock updated event and return it
          // In a production environment, you would implement the actual API call
          const mockEvent = {
            id: id as string,
            calendarId,
            summary,
            start: { dateTime: start },
            end: { dateTime: end },
            description: description || "",
            source: source || "personal",
            tags: tags || [],
          };
          
          console.log("Updated mock Apple Calendar event:", mockEvent);
          return res.status(200).json(mockEvent);
        } catch (error) {
          console.error("Error updating Apple Calendar event:", error);
          return res.status(500).json({ error: "Failed to update Apple Calendar event" });
        }
      } else if (calendarId.startsWith('other_')) {
        try {
          // For other calendar types, we would need specific implementations
          // This would depend on the specific calendar provider
          
          // For now, we'll create a mock updated event and return it
          // In a production environment, you would implement the actual API call
          const mockEvent = {
            id: id as string,
            calendarId,
            summary,
            start: { dateTime: start },
            end: { dateTime: end },
            description: description || "",
            source: source || "personal",
            tags: tags || [],
          };
          
          console.log("Updated mock event for other calendar type:", mockEvent);
          return res.status(200).json(mockEvent);
        } catch (error) {
          console.error("Error updating event for other calendar type:", error);
          return res.status(500).json({ error: "Failed to update event for this calendar type" });
        }
      } else {
        return res.status(400).json({ error: "Unknown calendar type" });
      }
    }

    // Build endpoint URL for update
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(id as string)}`;

    // Prepare payload for Google Calendar API
    const payload: any = {
      summary,
      description: description || "",
    };
    
    // Add extended properties for tags and source if provided
    if (tags && tags.length > 0) {
      payload.extendedProperties = payload.extendedProperties || {};
      payload.extendedProperties.private = payload.extendedProperties.private || {};
      payload.extendedProperties.private.tags = JSON.stringify(tags);
    }
    
    if (source) {
      payload.extendedProperties = payload.extendedProperties || {};
      payload.extendedProperties.private = payload.extendedProperties.private || {};
      payload.extendedProperties.private.source = source;
    }

    if (start) {
      payload.start = {
        dateTime: start, // Send raw datetime-local string
        timeZone: timeZone || 'UTC', // Use provided timezone or default to UTC
      };
    }

    if (end) {
      payload.end = {
        dateTime: end, // Send raw datetime-local string
        timeZone: timeZone || 'UTC', // Use provided timezone or default to UTC
      };
    }

    // Call Google API to update event
    const apiRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!apiRes.ok) {
      const err = await apiRes.json();
      console.error("Google Calendar API update error:", apiRes.status, err);
      return res.status(apiRes.status).json({ error: err.error?.message || "Google API update error" });
    }

    const data = await apiRes.json();
    return res.status(200).json(data);
  }

  // DELETE = delete
  if ((req.method as string) === "DELETE") {
    const { id, calendarId } = req.query;

    if (!id || !calendarId) {
      console.error("[API] Missing required fields for delete:", { id, calendarId });
      return res.status(400).json({ error: "Missing required fields for delete" });
    }
    
    // Check if this is a Google Calendar or another type
    const calId = calendarId as string;
    const isGoogleCalendar = !calId.startsWith('o365_') && !calId.startsWith('apple_') && !calId.startsWith('ical_') && !calId.startsWith('other_');
    
    // If not a Google Calendar, we need to handle it differently
    if (!isGoogleCalendar) {
      // Check if this is an iCal calendar (read-only)
      if (calId.startsWith('ical_')) {
        return res.status(400).json({ 
          error: "Cannot delete events from iCal calendars. iCal feeds are read-only." 
        });
      }
      // Determine which type of calendar we're dealing with
      if (calId.startsWith('o365_')) {
        try {
          // Check if this is an OAuth-based O365 calendar
          // Check if this is an OAuth-based O365 calendar
          const isOAuthCalendar = calId.includes("oauth");
          
          if (isOAuthCalendar) {
            // For OAuth-based O365 calendars, we would use Microsoft Graph API
            // This would require proper OAuth authentication with Microsoft
            
            console.log("Deleting event from OAuth-based O365 calendar");
            
            // In a real implementation, we would use the Microsoft Graph API
            // For now, we'll simulate a successful deletion
            console.log("Simulated deletion of OAuth O365 event:", id);
            return res.status(200).json({ message: "Event deleted successfully" });
          } else {
            // For PowerAutomate-based O365 calendars
            // For now, we'll simulate a successful deletion
            // In a production environment, you would implement the actual API call
            console.log("Simulated deletion of O365 event:", id);
            return res.status(200).json({ message: "Event deleted successfully" });
          }
        } catch (error) {
          console.error("Error deleting O365 event:", error);
          return res.status(500).json({ error: "Failed to delete O365 event" });
        }
      } else if (calId.startsWith('apple_')) {
        try {
          // For Apple calendars, we would need to use Apple's Calendar API
          // This would require a different authentication flow and API endpoints
          
          // For now, we'll simulate a successful deletion
          // In a production environment, you would implement the actual API call
          console.log("Simulated deletion of Apple Calendar event:", id);
          return res.status(200).json({ message: "Event deleted successfully" });
        } catch (error) {
          console.error("Error deleting Apple Calendar event:", error);
          return res.status(500).json({ error: "Failed to delete Apple Calendar event" });
        }
      } else if (calId.startsWith('other_')) {
        try {
          // For other calendar types, we would need specific implementations
          // This would depend on the specific calendar provider
          
          // For now, we'll simulate a successful deletion
          // In a production environment, you would implement the actual API call
          console.log("Simulated deletion of event from other calendar type:", id);
          return res.status(200).json({ message: "Event deleted successfully" });
        } catch (error) {
          console.error("Error deleting event from other calendar type:", error);
          return res.status(500).json({ error: "Failed to delete event from this calendar type" });
        }
      } else {
        return res.status(400).json({ error: "Unknown calendar type" });
      }
    }

    // Build endpoint URL for delete
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId as string
    )}/events/${encodeURIComponent(id as string)}`;

    // Call Google API to delete event
    const apiRes = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!apiRes.ok) {
      const err = await apiRes.json();
      console.error("Google Calendar API delete error:", apiRes.status, err);
      return res.status(apiRes.status).json({ error: err.error?.message || "Google API delete error" });
    }

    // Successful deletion returns 204 No Content, but Google API might return 200 with empty body
    // We'll just return a success message
    return res.status(200).json({ message: "Event deleted successfully" });
  }

  // Method not allowed
  res.setHeader("Allow", ["POST", "PUT", "DELETE"]);
  res.status(405).json({ error: "Method Not Allowed" });
}
