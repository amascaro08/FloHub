// pages/api/calendar.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession }             from "next-auth/next";
import { authOptions }                  from "./auth/[...nextauth]";
import { google }                       from "googleapis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) grab the user’s tokens
  const session = await getServerSession(req, res, authOptions);

  // If no valid session or no tokens, just return an empty array
  if (!session?.user?.accessToken) {
    console.warn("Calendar API: no session or missing tokens:", session);
    return res.status(200).json([]);
  }

  // 2) set up OAuth2 client
  const oAuth2 = new google.auth.OAuth2();
  oAuth2.setCredentials({
    access_token:  session.user.accessToken,
    refresh_token: session.user.refreshToken,
  });
  const calendar = google.calendar({ version: "v3", auth: oAuth2 });

  // 3a) GET: list upcoming events
  if (req.method === "GET") {
    try {
      const { data } = await calendar.events.list({
        calendarId:   process.env.GOOGLE_CALENDAR_ID || "primary",
        timeMin:      new Date().toISOString(),
        singleEvents: true,
        orderBy:      "startTime",
      });

      // Ensure we always return an array
      const items = data.items ?? [];
      console.log("Calendar API: returning", items.length, "events");
      return res.status(200).json(items);
    } catch (error: any) {
      console.error("Calendar API error:", error);
      // On error, also return empty array
      return res.status(200).json([]);
    }
  }

  // 3b) POST: create or update events
  if (req.method === "POST") {
    try {
      const { id, summary, start, end } = req.body;

      if (id) {
        // update existing
        const updated = await calendar.events.update({
          calendarId:  process.env.GOOGLE_CALENDAR_ID || "primary",
          eventId:     id,
          requestBody: {
            summary,
            start: { dateTime: start },
            end:   { dateTime: end },
          },
        });
        return res.status(200).json(updated.data);
      } else {
        // create new
        const created = await calendar.events.insert({
          calendarId:  process.env.GOOGLE_CALENDAR_ID || "primary",
          requestBody: {
            summary,
            start: { dateTime: start },
            end:   { dateTime: end },
          },
        });
        return res.status(201).json(created.data);
      }
    } catch (error: any) {
      console.error("Calendar API (POST) error:", error);
      return res
        .status(500)
        .json({ error: "Unable to create/update event", message: error.message });
    }
  }

  // Method not allowed
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} not supported`);
}
