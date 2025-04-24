// pages/api/calendar.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken }                            from "next-auth/jwt";

// Mirror your front-end CalendarEvent type
export interface CalendarEvent {
  id:      string;
  summary: string;
  start:   { dateTime?: string; date?: string };
  end?:    { dateTime?: string; date?: string };
}

type Data = CalendarEvent[] | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Only GET is supported
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1) Authenticate via JWT
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const accessToken = token.accessToken as string;

  // 2) Fetch from Google Calendar (stubbed here)
  // Replace the below with your actual Google Calendar API call:
  //   const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
  //     headers: { Authorization: `Bearer ${accessToken}` },
  //   });
  //   const events = await resp.json();
  //   return res.status(200).json(events.items);

  // For now, return an empty array so your front-end compiles:
  return res.status(200).json([]);
}
