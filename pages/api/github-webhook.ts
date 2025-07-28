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

  if (req.method !== "POST") {
    console.log(`Webhook received ${req.method} request, expected POST`);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  console.log("GitHub webhook received:", {
    method: req.method,
    headers: {
      'x-github-event': req.headers['x-github-event'],
      'x-github-delivery': req.headers['x-github-delivery'],
      'x-hub-signature-256': req.headers['x-hub-signature-256'] ? 'present' : 'missing'
    },
    body: req.body
  });

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

  const { action, issue } = req.body;

  // Log the webhook event
  console.log("GitHub webhook event:", {
    action,
    issue: issue ? {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      html_url: issue.html_url
    } : 'no issue data'
  });

  // Only handle issue closed events
  if (action !== "closed") {
    console.log(`Ignoring webhook action: ${action}`);
    return res.status(200).json({ message: "Event ignored" });
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
      userId: feedbackEntry.userId,
      status: feedbackEntry.status,
      notificationSent: feedbackEntry.notificationSent
    });

    // Update feedback status to completed
    await db
      .update(feedback)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(feedback.id, feedbackEntry.id));

    console.log(`Updated feedback ${feedbackEntry.id} to completed status`);

    // Send notification email if not already sent
    if (!feedbackEntry.notificationSent) {
      console.log(`Sending completion notification to ${feedbackEntry.userId}`);
      
      const success = await sendFeedbackCompletionEmail(
        feedbackEntry.userId,
        issue.title,
        feedbackEntry.githubIssueUrl || issue.html_url
      );

      if (success) {
        // Mark notification as sent
        await db
          .update(feedback)
          .set({ notificationSent: true })
          .where(eq(feedback.id, feedbackEntry.id));
        
        console.log("Notification sent and marked as sent");
      } else {
        console.error("Failed to send notification email");
      }
    } else {
      console.log("Notification already sent for this feedback");
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
  issueUrl: string
): Promise<boolean> {
  const subject = "Your FloHub Feedback Has Been Completed";
  
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

Thank you for helping improve FloHub! Your input is valuable and helps us build a better product for everyone.

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