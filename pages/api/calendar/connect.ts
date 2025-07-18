import type { NextApiRequest, NextApiResponse } from "next";
import { getGoogleOAuthUrl } from "@/lib/googleMultiAuth";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { provider } = req.query;

  if (provider === "google") {
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: "Not signed in" });
    }
    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      return res.status(401).json({ error: "User not found" });
    }

    const state = Buffer.from(JSON.stringify({ email: user.email })).toString("base64");
    const url = getGoogleOAuthUrl(state);

    res.redirect(url);
  } else {
    res.status(400).json({ error: "Unsupported provider" });
  }
}