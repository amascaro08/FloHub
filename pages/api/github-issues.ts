import type { NextApiRequest, NextApiResponse } from "next";
import { Octokit } from "@octokit/rest";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers for cross-domain support
  const allowedOrigins = [
    'https://flohub.xyz',
    'https://www.flohub.xyz', 
    'https://flohub.vercel.app',
    'http://localhost:3000' // for development
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Authenticate user
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }

  // Extract feedback data from request
  const { feedbackType, feedbackText, tags = [] } = req.body;

  if (!feedbackText || typeof feedbackText !== "string" || feedbackText.trim() === "") {
    return res.status(400).json({ error: "Feedback text is required" });
  }

  // Validate environment variables
  const githubToken = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_REPO_OWNER;
  const repoName = process.env.GITHUB_REPO_NAME;

  if (!githubToken || !repoOwner || !repoName) {
    console.error("Missing GitHub configuration in environment variables");
    console.error("Required env vars: GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME");
    return res.status(500).json({ 
      error: "GitHub integration not configured. Please contact admin." 
    });
  }

  try {
    // Initialize Octokit with personal access token
    const octokit = new Octokit({
      auth: githubToken,
    });

    // Create appropriate issue title based on feedback type
    const titlePrefixes: Record<string, string> = {
      'bug': '🐛 Bug Report',
      'feature': '✨ Feature Request', 
      'ui': '🎨 UI Issue',
      'calendar': '📅 Calendar Issue',
      'performance': '⚡ Performance Issue',
      'general': '💬 General Feedback'
    };
    
    const titlePrefix = titlePrefixes[feedbackType] || '💬 Feedback';

    const title = `${titlePrefix}: ${feedbackText.slice(0, 50)}${feedbackText.length > 50 ? '...' : ''}`;

    // Create issue body with user info and tags
    const issueBody = `
## Feedback Details

**Type:** ${feedbackType}
**Submitted by:** ${user.email}
**Date:** ${new Date().toISOString()}

## Description

${feedbackText}

${tags.length > 0 ? `\n## Tags\n\n${tags.map((tag: string) => `- ${tag}`).join('\n')}` : ''}

---
*This issue was automatically created from user feedback.*
    `.trim();

    // Determine labels based on feedback type and tags
    const labels = ['feedback'];
    
    // Add type-specific labels
    if (feedbackType === 'bug') {
      labels.push('bug');
    } else if (feedbackType === 'feature') {
      labels.push('enhancement');
    } else if (feedbackType === 'ui') {
      labels.push('ui/ux');
    } else if (feedbackType === 'calendar') {
      labels.push('calendar');
    } else if (feedbackType === 'performance') {
      labels.push('performance');
    }

    // Add custom tags as labels
    tags.forEach((tag: string) => {
      if (tag && typeof tag === 'string') {
        labels.push(tag.toLowerCase().replace(/\s+/g, '-'));
      }
    });

    // Create the GitHub issue
    const issue = await octokit.rest.issues.create({
      owner: repoOwner,
      repo: repoName,
      title,
      body: issueBody,
      labels,
    });

    return res.status(201).json({
      success: true,
      issueNumber: issue.data.number,
      issueUrl: issue.data.html_url,
      message: "Feedback submitted successfully! You can track the progress on GitHub."
    });

  } catch (error: any) {
    console.error("Error creating GitHub issue:", error);
    
    // Handle specific GitHub API errors
    if (error.status === 401) {
      return res.status(500).json({ 
        error: "GitHub authentication failed. Please contact admin." 
      });
    } else if (error.status === 404) {
      return res.status(500).json({ 
        error: "GitHub repository not found. Please contact admin." 
      });
    } else if (error.status === 403) {
      return res.status(500).json({ 
        error: "Insufficient permissions to create GitHub issue. Please contact admin." 
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to submit feedback. Please try again later." 
    });
  }
}