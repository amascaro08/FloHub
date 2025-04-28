import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

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
  if (req.method === "POST" || req.method === "PUT") {
    console.log("[API] /api/calendar/event received:", req.method, req.body); // Log incoming request
    const { calendarId, eventId, summary, start, end } = req.body;
    if (!calendarId || !summary || !start || !end) {
      console.error("[API] Missing required fields:", { calendarId, summary, start, end }); // Log missing fields
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Build endpoint URL
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`;
    const url =
      req.method === "POST"
        ? baseUrl
        : `${baseUrl}/${encodeURIComponent(eventId)}`;

    // Prepare payload
    const payload = {
      summary,
      start,
      end,
    };

    // Call Google API
    console.log("[API] Calling Google Calendar API:", url, { method: req.method, body: payload }); // Log Google API call details
    const apiRes = await fetch(url, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!apiRes.ok) {
      const err = await apiRes.json();
      console.error("Google Calendar API error:", apiRes.status, err); // Log Google API error status and body
      return res.status(apiRes.status).json({ error: err.error?.message || "Google API error" });
    }

    const data = await apiRes.json();
    console.log("[API] Google Calendar API success:", apiRes.status, data); // Log Google API success status and body
    return res.status(200).json(data);
  }

  // Method not allowed
  res.setHeader("Allow", ["POST", "PUT"]);
  res.status(405).json({ error: "Method Not Allowed" });
}
