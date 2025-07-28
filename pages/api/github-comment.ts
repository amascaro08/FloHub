import type { NextApiRequest, NextApiResponse } from "next";
import { Octokit } from "@octokit/rest";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { feedback } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
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

  const { issueNumber, comment } = req.body;

  if (!issueNumber || !comment?.trim()) {
    return res.status(400).json({ error: "Issue number and comment are required" });
  }

  // Verify the user owns this feedback
  const [feedbackEntry] = await db
    .select()
    .from(feedback)
    .where(
      and(
        eq(feedback.githubIssueNumber, issueNumber),
        eq(feedback.userId, user.email)
      )
    );

  if (!feedbackEntry) {
    return res.status(403).json({ error: "You can only comment on your own feedback" });
  }

  // Validate environment variables
  const githubToken = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_REPO_OWNER;
  const repoName = process.env.GITHUB_REPO_NAME;

  if (!githubToken || !repoOwner || !repoName) {
    return res.status(500).json({ 
      error: "GitHub integration not configured" 
    });
  }

  try {
    // Initialize Octokit
    const octokit = new Octokit({
      auth: githubToken,
    });

    // Add user info to comment
    const formattedComment = `**Follow-up from ${user.email}:**\n\n${comment}`;

    // Post comment to GitHub issue
    const commentResponse = await octokit.rest.issues.createComment({
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber,
      body: formattedComment,
    });

    return res.status(201).json({
      success: true,
      comment: {
        id: commentResponse.data.id,
        body: commentResponse.data.body,
        createdAt: commentResponse.data.created_at,
        url: commentResponse.data.html_url,
      },
      message: "Comment posted successfully"
    });

  } catch (error: any) {
    console.error("Error posting GitHub comment:", error);
    
    if (error.status === 404) {
      return res.status(404).json({ 
        error: "Issue not found" 
      });
    } else if (error.status === 403) {
      return res.status(500).json({ 
        error: "Insufficient permissions to comment. Please contact admin." 
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to post comment" 
    });
  }
}