import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { getGoogleOAuthUrl } from "@/lib/googleMultiAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🔥 OAuth connect request started for provider:', req.query.provider);
  
  const decoded = auth(req);
  if (!decoded) {
    console.error('❌ User not authenticated');
    return res.status(401).json({ error: "Not signed in" });
  }
  
  const user = await getUserById(decoded.userId);
  if (!user) {
    console.error('❌ User not found for ID:', decoded.userId);
    return res.status(401).json({ error: "User not found" });
  }
  
  console.log('✅ User authenticated:', user.email);

  const { provider } = req.query;

  if (provider === "google") {
    try {
      console.log('🔄 Generating Google OAuth URL...');
      
      // Encode user information in state parameter
      const state = Buffer.from(JSON.stringify({ email: user.email })).toString('base64');
      console.log('✅ State parameter created for user:', user.email);

      // Use the robust OAuth URL generator from googleMultiAuth
      const url = getGoogleOAuthUrl(state);
      console.log('✅ Google OAuth URL generated:', url.substring(0, 100) + '...');

      console.log('🚀 Redirecting to Google OAuth...');
      res.redirect(url);
    } catch (error) {
      console.error('❌ Error generating Google OAuth URL:', error);
      return res.status(500).json({ error: "Failed to generate OAuth URL" });
    }
  } else {
    console.error('❌ Invalid provider requested:', provider);
    res.status(400).json({ error: "Invalid provider" });
  }
}