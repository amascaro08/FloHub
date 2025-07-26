import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Require authentication for this test endpoint
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Check environment variables (without exposing sensitive data)
  const githubToken = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_REPO_OWNER;
  const repoName = process.env.GITHUB_REPO_NAME;

  const config = {
    hasGithubToken: !!githubToken,
    tokenLength: githubToken ? githubToken.length : 0,
    repoOwner: repoOwner || "Not set",
    repoName: repoName || "Not set",
    environment: process.env.NODE_ENV || "unknown",
    timestamp: new Date().toISOString()
  };

  return res.status(200).json({
    message: "GitHub configuration check",
    config,
    allConfigured: !!(githubToken && repoOwner && repoName)
  });
}