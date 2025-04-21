import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession }             from "next-auth/next";
import { authOptions }                  from "./auth/[...nextauth]";
console.log("authOptions:", authOptions);
import { google }                       from "googleapis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) grab the logged‑in user’s tokens
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.accessToken) {
    console.log("Session:", session);
    return res.status(401).json({ error: "Not signed in", session });
  }

  // 2) set up an OAuth2 client with their tokens
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
        calendarId:   "primary",
        timeMin:      new Date().toISOString(),
        singleEvents: true,
        orderBy:      "startTime",
      });
      console.log("Calendar events:", data.items);
      return res.status(200).json(data.items);
    } catch (error: any) {
      console.error("Error fetching calendar events:", error);
      return res.status(500).json({ error: "Failed to fetch calendar events", message: error.message });
    }
  }

  // 3b) POST: create or update an event
  if (req.method === "POST") {
    const { id, summary, start, end } = req.body;
    if (id) {
      // update existing
      const updated = await calendar.events.update({
        calendarId: "primary",
        eventId:    id,
        requestBody: { summary, start: { dateTime: start }, end: { dateTime: end } },
      });
      console.log("Updated event:", updated.data);
      return res.status(200).json(updated.data);
    } else {
      // create new
      const created = await calendar.events.insert({
        calendarId: "primary",
        requestBody: { summary, start: { dateTime: start }, end: { dateTime: end } },
      });
      console.log("Created event:", created.data);
      return res.status(201).json(created.data);
    }
  }

  res.setHeader("Allow", ["GET","POST"]);
  res.status(405).end(`Method ${req.method} not supported`);
}
