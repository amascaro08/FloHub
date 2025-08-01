import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/drizzle";
import { feedback } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emailService } from "@/lib/emailService";
import crypto from "crypto";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add CORS headers to prevent redirect issues
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256, X-GitHub-Event, X-GitHub-Delivery');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log("=== GITHUB WEBHOOK RECEIVED ===");
  console.log("Method:", req.method);
  console.log("Headers:", {
    'x-github-event': req.headers['x-github-event'],
    'x-github-delivery': req.headers['x-github-delivery'],
    'x-hub-signature-256': req.headers['x-hub-signature-256'] ? 'present' : 'missing',
    'user-agent': req.headers['user-agent']
  });
  console.log("Body:", JSON.stringify(req.body, null, 2));

  if (req.method !== "POST") {
    console.log(`Webhook received ${req.method} request, expected POST`);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Verify GitHub webhook signature if secret is provided
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
      console.error("Missing GitHub webhook signature");
      return res.status(401).json({ error: "Missing signature" });
    }

    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      console.error("Invalid GitHub webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }
    console.log("GitHub webhook signature verified successfully");
  } else {
    console.warn("No GITHUB_WEBHOOK_SECRET configured, skipping signature verification");
  }

  const { action, issue, comment } = req.body;
  const eventType = req.headers['x-github-event'] as string;

  // Log the webhook event
  console.log("GitHub webhook event:", {
    eventType,
    action,
    issue: issue ? {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      html_url: issue.html_url
    } : 'no issue data',
    comment: comment ? {
      id: comment.id,
      body: comment.body?.substring(0, 100) + '...'
    } : 'no comment data'
  });

  // Handle different event types
  if (eventType === 'issues') {
    // Handle issue events (opened, closed, etc.)
    if (action !== "closed") {
      console.log(`Ignoring issue action: ${action}`);
      return res.status(200).json({ message: "Event ignored" });
    }
  } else if (eventType === 'issue_comment') {
    // Handle comment events (created, edited, deleted)
    if (action !== "created") {
      console.log(`Ignoring comment action: ${action}`);
      return res.status(200).json({ message: "Event ignored" });
    }
  } else {
    console.log(`Ignoring event type: ${eventType}`);
    return res.status(200).json({ message: "Event type ignored" });
  }

  if (!issue || !issue.number) {
    console.error("No issue data in webhook payload");
    return res.status(400).json({ error: "No issue data" });
  }

  try {
    console.log(`Looking for feedback entry with GitHub issue number: ${issue.number}`);
    
    // Find feedback entry by GitHub issue number
    const [feedbackEntry] = await db
      .select()
      .from(feedback)
      .where(eq(feedback.githubIssueNumber, issue.number));

    if (!feedbackEntry) {
      console.log(`No matching feedback found for issue #${issue.number}`);
      return res.status(200).json({ message: "No matching feedback found" });
    }

    console.log("Found feedback entry:", {
      id: feedbackEntry.id,
      userEmail: feedbackEntry.userEmail || feedbackEntry.userId, // Support both old and new format
      status: feedbackEntry.status,
      notificationSent: feedbackEntry.notificationSent
    });

    // Handle issue closed events
    if (eventType === 'issues' && action === "closed") {
      // Check if notification was already sent first
      if (feedbackEntry.notificationSent) {
        console.log("Notification already sent for this feedback");
        return res.status(200).json({ 
          message: "Notification already sent",
          feedbackId: feedbackEntry.id,
          issueNumber: issue.number
        });
      }

      // Update feedback status to completed and mark notification as sent atomically
      await db
        .update(feedback)
        .set({
          status: "completed",
          completedAt: new Date(),
          notificationSent: true, // Mark as sent immediately to prevent duplicates
        })
        .where(eq(feedback.id, feedbackEntry.id));

      console.log(`Updated feedback ${feedbackEntry.id} to completed status and marked notification as sent`);

      // Send notification email
      const userIdentifier = feedbackEntry.userEmail || feedbackEntry.userId;
      
      if (userIdentifier) {
        console.log(`Sending completion notification to ${userIdentifier}`);
        
        const success = await sendFeedbackCompletionEmail(
          userIdentifier,
          issue.title,
          feedbackEntry.githubIssueUrl || issue.html_url,
          comment?.body // Pass the closing comment if available
        );

        if (success) {
          console.log("Notification sent successfully");
        } else {
          console.error("Failed to send notification email");
          // Note: We don't reset notificationSent here to prevent spam
        }
      } else {
        console.warn("No user identifier found for feedback entry - cannot send notification");
      }
    }

    // Handle comment events (for capturing closing comments)
    if (eventType === 'issue_comment' && action === "created" && comment && comment.body) {
      console.log("Processing comment for issue:", comment.body.substring(0, 100));
      
      // Check if this is a closing comment (issue is closed and this is the last comment)
      if (issue.state === 'closed') {
        console.log("Comment received on closed issue - potential closing comment");
        console.log("Comment details:", {
          commentId: comment.id,
          issueNumber: issue.number,
          commentBody: comment.body.substring(0, 200) + '...',
          commentAuthor: comment.user?.login
        });
        
        // You could store the comment in the database if needed
        // For now, we'll just log it for debugging
      }
    }

    return res.status(200).json({ 
      message: "Feedback status updated and notification sent",
      feedbackId: feedbackEntry.id,
      issueNumber: issue.number
    });

  } catch (error: any) {
    console.error("GitHub webhook error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
}

async function sendFeedbackCompletionEmail(
  userEmail: string, 
  issueTitle: string, 
  issueUrl: string,
  closingComment?: string
): Promise<boolean> {
  const subject = "Your FloHub Feedback Has Been Completed";
  
  // Include the closing comment in the email if available
  const commentSection = closingComment ? `
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <h4 style="margin-top: 0; color: #1e40af;">Closing Comment:</h4>
      <p style="margin-bottom: 0; white-space: pre-wrap;">${closingComment}</p>
    </div>
  ` : '';
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Feedback Completed</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 30px;
          margin: 20px 0;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .status-badge {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          margin: 10px 0;
        }
        .button {
          display: inline-block;
          background: #2563eb;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">FloHub</div>
          <h1>✅ Feedback Completed</h1>
        </div>
        
        <p>Great news! Your feedback has been completed.</p>
        
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${issueTitle}</h3>
          <span class="status-badge">Completed</span>
        </div>
        
        ${commentSection}
        
        <p>Thank you for helping improve FloHub! Your input is valuable and helps us build a better product for everyone.</p>
        
        <div style="text-align: center;">
          <a href="${issueUrl}" class="button">View Details on GitHub</a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Have more feedback? We'd love to hear from you! Visit the feedback page in FloHub to share your thoughts.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Feedback Completed - FloHub

Great news! Your feedback has been completed.

"${issueTitle}"

${closingComment ? `Closing Comment:
${closingComment}

` : ''}Thank you for helping improve FloHub! Your input is valuable and helps us build a better product for everyone.

View details: ${issueUrl}

Have more feedback? We'd love to hear from you! Visit the feedback page in FloHub to share your thoughts.
  `;

  try {
    const result = await emailService.sendEmail({
      to: userEmail,
      subject,
      html,
      text,
    });
    
    console.log("Email service result:", result);
    return result;
  } catch (error) {
    console.error("Error sending feedback completion email:", error);
    return false;
  }
}