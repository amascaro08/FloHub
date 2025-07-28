import type { NextApiRequest, NextApiResponse } from "next";
import { Octokit } from "@octokit/rest";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
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

  const { issueNumber } = req.query;

  if (!issueNumber || isNaN(Number(issueNumber))) {
    return res.status(400).json({ error: "Valid issue number is required" });
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

    // Fetch issue details and comments
    const [issueResponse, commentsResponse] = await Promise.all([
      octokit.rest.issues.get({
        owner: repoOwner,
        repo: repoName,
        issue_number: Number(issueNumber),
      }),
      octokit.rest.issues.listComments({
        owner: repoOwner,
        repo: repoName,
        issue_number: Number(issueNumber),
      })
    ]);

    const issue = issueResponse.data;
    const comments = commentsResponse.data;

    // Format the response
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      author: comment.user?.login || 'Unknown',
      authorAvatar: comment.user?.avatar_url,
      body: comment.body,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
    }));

    return res.status(200).json({
      issue: {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        author: issue.user?.login || 'Unknown',
        authorAvatar: issue.user?.avatar_url,
        labels: issue.labels.map(label => 
          typeof label === 'string' ? label : label.name
        ),
        url: issue.html_url,
      },
      comments: formattedComments,
    });

  } catch (error: any) {
    console.error("Error fetching GitHub comments:", error);
    
    if (error.status === 404) {
      return res.status(404).json({ 
        error: "Issue not found" 
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to fetch comments" 
    });
  }
}