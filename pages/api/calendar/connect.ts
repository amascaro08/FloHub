import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { auth } from "@/lib/auth";

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { provider } = req.query;

  if (provider === "google") {
    const user = await auth(req);
    if (!user?.email) {
      return res.status(401).json({ error: "Not signed in" });
    }

    const scopes = [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events.readonly",
    ];

    const url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state: Buffer.from(JSON.stringify({ email: user.email })).toString(
        "base64"
      ),
    });

    res.redirect(url);
  } else {
    res.status(400).json({ error: "Unsupported provider" });
  }
}