import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { query } from "@/lib/neon";
import { UserSettings } from "@/types/app";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ message: string } | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const userEmail = token.email as string;
  const newSettings: UserSettings = req.body;

  try {
    // Check if settings exist for the user
    const { rows: existingSettings } = await query(
      'SELECT * FROM user_settings WHERE user_email = $1',
      [userEmail]
    );

    if (existingSettings.length > 0) {
      // Update existing settings
      await query(
        `UPDATE user_settings SET
          flo_cat_style = $1,
          flo_cat_personality = $2,
          preferred_name = $3
        WHERE user_email = $4`,
        [
          newSettings.floCatStyle || 'default',
          newSettings.floCatPersonality || [],
          newSettings.preferredName || '',
          userEmail,
        ]
      );
    } else {
      // Insert new settings
      await query(
        `INSERT INTO user_settings (user_email, flo_cat_style, flo_cat_personality, preferred_name)
        VALUES ($1, $2, $3, $4)`,
        [
          userEmail,
          newSettings.floCatStyle || 'default',
          newSettings.floCatPersonality || [],
          newSettings.preferredName || '',
        ]
      );
    }

    return res.status(200).json({ message: "Settings updated successfully" });
  } catch (error: any) {
    console.error("Error updating user settings:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}