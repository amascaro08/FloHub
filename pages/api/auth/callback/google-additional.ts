import type { NextApiRequest, NextApiResponse } from "next";
import { getGoogleTokens } from "@/lib/googleMultiAuth";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, state, error } = req.query;

  if (error) {
    console.error("OAuth error:", error);
    return res.redirect("/dashboard/settings?tab=calendar&error=oauth_error");
  }

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    // Decode state to get user email
    const stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
    const userEmail = stateData.email;

    if (!userEmail) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    // Get the current user from JWT token
    const decoded = auth(req);
    if (!decoded) {
      // If not authenticated, redirect to login with return URL
      const returnUrl = encodeURIComponent("/dashboard/settings?tab=calendar&success=google_connected");
      return res.redirect(`/dashboard/login?returnUrl=${returnUrl}`);
    }

    const user = await getUserById(decoded.userId);
    if (!user || user.email !== userEmail) {
      return res.status(401).json({ error: "User mismatch" });
    }

    // Exchange authorization code for tokens
    const tokens = await getGoogleTokens(code);

    if (!tokens.access_token) {
      throw new Error("No access token received from Google");
    }

    // Check if Google account already exists for this user
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, user.id),
        eq(accounts.provider, "google")
      ),
    });

    const accountData = {
      userId: user.id,
      type: "oauth",
      provider: "google",
      providerAccountId: tokens.sub || "default", // Use token's sub claim as account ID
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
      token_type: tokens.token_type || "Bearer",
      scope: tokens.scope,
      id_token: tokens.id_token,
    };

    if (existingAccount) {
      // Update existing account
      await db.update(accounts)
        .set(accountData)
        .where(eq(accounts.id, existingAccount.id));
    } else {
      // Create new account
      await db.insert(accounts).values(accountData);
    }

    console.log("Google OAuth account successfully connected for user:", user.email);

    // Redirect to settings page with success message
    return res.redirect("/dashboard/settings?tab=calendar&success=google_connected");
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    return res.redirect("/dashboard/settings?tab=calendar&error=oauth_failed");
  }
}