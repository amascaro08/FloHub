// pages/api/calendar/list.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type CalItem = { id: string; summary: string };
type ErrorRes = { error: string; details?: any };

// Function to refresh Google access token
async function refreshGoogleToken(userId: number, refreshToken: string): Promise<string | null> {
  try {
    console.log('Calendar list API: Attempting to refresh Google token for user:', userId);
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Calendar list API: Failed to refresh Google token:', response.status, errorText);
      return null;
    }

    const tokenData = await response.json();
    
    // Update the access token in the database
    await db.update(accounts)
      .set({
        access_token: tokenData.access_token,
        expires_at: tokenData.expires_in ? Math.floor(Date.now() / 1000) + tokenData.expires_in : null,
      })
      .where(and(
        eq(accounts.userId, userId),
        eq(accounts.provider, 'google')
      ));

    console.log('Calendar list API: Successfully refreshed Google token for user:', userId);
    return tokenData.access_token;
  } catch (error) {
    console.error('Calendar list API: Error refreshing Google token:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CalItem[] | ErrorRes>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Authenticate
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }

  console.log('Calendar list API request for user:', user.email);

  const googleAccount = user.accounts?.find(account => account.provider === 'google');
  let accessToken = googleAccount?.access_token;

  console.log('Google account found:', !!googleAccount);
  console.log('Initial access token exists:', !!accessToken);

  if (!googleAccount) {
    console.log('No Google account found for user');
    return res.status(401).json({ 
      error: "Google Calendar not connected", 
      details: "Please connect your Google account in settings"
    });
  }

  // Check if token is expired and refresh if needed
  if (googleAccount && accessToken) {
    const expiresAt = googleAccount.expires_at;
    const currentTime = Math.floor(Date.now() / 1000);
    
    console.log('Token expires at:', expiresAt, 'Current time:', currentTime);
    
    if (expiresAt && expiresAt <= currentTime && googleAccount.refresh_token) {
      console.log('Google access token expired, attempting to refresh...');
      accessToken = await refreshGoogleToken(decoded.userId, googleAccount.refresh_token);
      if (!accessToken) {
        console.warn("Failed to refresh Google access token");
        return res.status(401).json({ 
          error: "Google Calendar authentication expired", 
          details: "Please reconnect your Google account in settings"
        });
      }
    }
  }

  if (!accessToken) {
    console.warn("No Google access token available");
    return res.status(401).json({ 
      error: "Google Calendar not connected", 
      details: "Please connect your Google account in settings"
    });
  }

  try {
    // Call Google Calendar API
    console.log('Fetching calendar list from Google API...');
    const resp = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!resp.ok) {
      const err = await resp.json();
      console.error('Google Calendar API error:', resp.status, err);
      
      // If unauthorized, try to refresh token once more
      if (resp.status === 401 && googleAccount?.refresh_token) {
        console.log('Unauthorized, attempting final token refresh...');
        const newToken = await refreshGoogleToken(decoded.userId, googleAccount.refresh_token);
        if (newToken) {
          // Retry the request with new token
          const retryResp = await fetch(
            "https://www.googleapis.com/calendar/v3/users/me/calendarList",
            { headers: { Authorization: `Bearer ${newToken}` } }
          );
          if (retryResp.ok) {
            const retryBody = await retryResp.json();
            const items = Array.isArray(retryBody.items)
              ? retryBody.items.map((c: any) => ({ id: c.id, summary: c.summary }))
              : [];
            console.log(`Successfully fetched ${items.length} calendars after token refresh`);
            return res.status(200).json(items);
          }
        }
      }
      
      return res
        .status(resp.status)
        .json({ 
          error: err.error?.message || "Google Calendar error",
          details: err
        });
    }

    const body = await resp.json();
    const items = Array.isArray(body.items)
      ? body.items.map((c: any) => ({ id: c.id, summary: c.summary }))
      : [];

    console.log(`Successfully fetched ${items.length} calendars`);
    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching calendar list:', error);
    return res.status(500).json({ 
      error: "Failed to fetch calendar list",
      details: error
    });
  }
}
