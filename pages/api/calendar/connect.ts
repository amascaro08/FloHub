import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { getGoogleOAuthUrl } from "@/lib/googleMultiAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  const { provider } = req.query;

  if (provider === "google") {
    // Encode user information in state parameter
    const state = Buffer.from(JSON.stringify({ email: user.email })).toString('base64');

    // Use the robust OAuth URL generator from googleMultiAuth
    const url = getGoogleOAuthUrl(state);

    res.redirect(url);
  } else {
    res.status(400).json({ error: "Invalid provider" });
  }
}