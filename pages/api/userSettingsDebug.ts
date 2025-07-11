import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { query } from "../../lib/neon";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userEmail = token.email;
  try {
    const { rows } = await query('SELECT * FROM user_settings WHERE user_email = $1', [userEmail]);
    const docs = rows.map(row => ({ id: row.user_email, data: row }));
    return res.status(200).json({ documents: docs });
  } catch (error) {
    console.error("Error listing user settings documents for", userEmail, error);
    return res.status(500).json({ error: "Failed to list user settings documents" });
  }
}