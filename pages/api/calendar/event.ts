import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
// Remove unused imports
// import { parseISO } from 'date-fns';
// import { zonedTimeToUtc } from 'date-fns-tz';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const accessToken = token.accessToken as string;

  // POST = create, PUT = update
  if (req.method === "POST") {
    const { calendarId, summary, start, end, timeZone } = req.body;
    if (!calendarId || !summary || !start || !end) {
      console.error("[API] Missing required fields for create:", { calendarId, summary, start, end });
      return res.status(400).json({ error: "Missing required fields for create" });
    }

    // Build endpoint URL for create
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`;

    // Prepare payload for Google Calendar API
    const payload: any = {
      summary,
    };

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
    const { calendarId, summary, start, end, timeZone } = req.body;
    const { id } = req.query; // Get eventId from query parameters

    if (!id || !calendarId || !summary || !start || !end) {
      console.error("[API] Missing required fields for update:", { id, calendarId, summary, start, end });
      return res.status(400).json({ error: "Missing required fields for update" });
    }

    // Build endpoint URL for update
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(id as string)}`;

    // Prepare payload for Google Calendar API
    const payload: any = {
      summary,
    };

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
