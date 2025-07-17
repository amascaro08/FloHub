import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
// Remove unused imports
// import { parseISO } from 'date-fns';
// import { zonedTimeToUtc } from 'date-fns-tz';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await auth(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  // Placeholder for accessToken, as it's not directly available from `auth`
  const accessToken = user.accessToken;

  // POST = create, PUT = update
  if (req.method === "POST") {
    const { calendarId, summary, start, end, timeZone, description, tags, source } = req.body;
    if (!calendarId || !summary || !start || !end) {
      console.error("[API] Missing required fields for create:", { calendarId, summary, start, end });
      return res.status(400).json({ error: "Missing required fields for create" });
    }
    
    // Check if this is a Google Calendar or another type
    const isGoogleCalendar = !calendarId.startsWith('o365_') && !calendarId.startsWith('apple_') && !calendarId.startsWith('other_');
    // Check if this is an OAuth-based O365 calendar
    const isO365OAuth = calendarId.startsWith('o365_') && description?.includes("oauth:");
    
    // If not a Google Calendar, we need to handle it differently
    if (!isGoogleCalendar) {
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

    // Call Google API to create event
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!apiRes.ok) {
      const err = await apiRes.json();
      console.error("Google Calendar API create error:", apiRes.status, err);
      return res.status(apiRes.status).json({ error: err.error?.message || "Google API create error" });
    }

    const data = await apiRes.json();
    return res.status(200).json(data);
  }

  if (req.method === "PUT") {
    const { calendarId, summary, start, end, timeZone, description, tags, source } = req.body;
    const { id } = req.query; // Get eventId from query parameters

    if (!id || !calendarId || !summary || !start || !end) {
      console.error("[API] Missing required fields for update:", { id, calendarId, summary, start, end });
      return res.status(400).json({ error: "Missing required fields for update" });
    }
    
    // Check if this is a Google Calendar or another type
    const isGoogleCalendar = !calendarId.startsWith('o365_') && !calendarId.startsWith('apple_') && !calendarId.startsWith('other_');
    
    // If not a Google Calendar, we need to handle it differently
    if (!isGoogleCalendar) {
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
  if (req.method === "DELETE") {
    const { id, calendarId } = req.query;

    if (!id || !calendarId) {
      console.error("[API] Missing required fields for delete:", { id, calendarId });
      return res.status(400).json({ error: "Missing required fields for delete" });
    }
    
    // Check if this is a Google Calendar or another type
    const calId = calendarId as string;
    const isGoogleCalendar = !calId.startsWith('o365_') && !calId.startsWith('apple_') && !calId.startsWith('other_');
    
    // If not a Google Calendar, we need to handle it differently
    if (!isGoogleCalendar) {
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
