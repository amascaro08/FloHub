import type { NextApiRequest, NextApiResponse } from "next";
import { getGoogleOAuthUrl } from "@/lib/googleMultiAuth";
import { auth } from "@/lib/auth";

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

    const state = Buffer.from(JSON.stringify({ email: user.email })).toString("base64");
    const url = getGoogleOAuthUrl(state);

    res.redirect(url);
  } else {
    res.status(400).json({ error: "Unsupported provider" });
  }
}