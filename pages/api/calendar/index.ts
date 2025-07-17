import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { google } from "googleapis";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await auth(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { provider } = req.query;

  if (provider === "google") {
    const scopes = [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });

    res.redirect(url);
  } else {
    res.status(400).json({ error: "Invalid provider" });
  }
}