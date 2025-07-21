import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: "Not signed in" });
    }
    
    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      return res.status(401).json({ error: "User not found" });
    }

    // Get user settings
    const userSettingsRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/userSettings`, {
      headers: {
        Cookie: req.headers.cookie || "",
      },
    });

    let userSettings = null;
    if (userSettingsRes.ok) {
      userSettings = await userSettingsRes.json();
    }

    // Get Google account info
    const googleAccount = user.accounts?.find(account => account.provider === 'google');

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
      },
      googleAccount: googleAccount ? {
        provider: googleAccount.provider,
        hasAccessToken: !!googleAccount.access_token,
        hasRefreshToken: !!googleAccount.refresh_token,
        expiresAt: googleAccount.expires_at,
        isExpired: googleAccount.expires_at ? Date.now() / 1000 > googleAccount.expires_at : false,
      } : null,
      userSettings: {
        calendarSources: userSettings?.calendarSources || [],
        powerAutomateUrl: userSettings?.powerAutomateUrl || null,
        selectedCals: userSettings?.selectedCals || [],
      },
      environment: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      },
    });
  } catch (error) {
    console.error('Calendar debug error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}