import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { query } from "@/lib/neon";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const user = await auth(req);

  if (!user?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const userEmail = user.email;

  if (req.method === "GET") {
    try {
      const { rows } = await query('SELECT layouts FROM user_settings WHERE user_email = $1', [userEmail]);
      if (rows.length > 0 && rows[0].layouts) {
        return res.status(200).json({ layouts: rows[0].layouts });
      } else {
        return res.status(200).json({ layouts: null });
      }
    } catch (error: any) {
      console.error("Error fetching user layouts:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  } else if (req.method === "POST") {
    const { layouts } = req.body;
    if (!layouts) {
      return res.status(400).json({ error: "Layouts data is required" });
    }

    try {
      // Check if settings exist for the user
      const { rows: existingSettings } = await query(
        'SELECT user_email FROM user_settings WHERE user_email = $1',
        [userEmail]
      );

      if (existingSettings.length > 0) {
        // Update existing settings
        await query(
          'UPDATE user_settings SET layouts = $1 WHERE user_email = $2',
          [layouts, userEmail]
        );
      } else {
        // Insert new settings with layouts
        await query(
          'INSERT INTO user_settings (user_email, layouts) VALUES ($1, $2)',
          [userEmail, layouts]
        );
      }

      return res.status(204).end();
    } catch (error: any) {
      console.error("Error saving user layouts:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}