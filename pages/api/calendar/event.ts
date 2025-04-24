// pages/api/calendar/events.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // parse calendarId, timeMin, timeMax from req.query
  // fetch from https://www.googleapis.com/calendar/v3/calendars/{id}/events?timeMin=...&timeMax=...
  // aggregate results from all calendars and return
}
