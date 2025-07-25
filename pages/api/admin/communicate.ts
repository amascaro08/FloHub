import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { emailService } from '@/lib/emailService';
import { db } from '@/lib/drizzle';
import { users } from '@/db/schema';
import { inArray, eq } from 'drizzle-orm';

interface CommunicationRequest {
  type: 'individual' | 'group' | 'broadcast';
  recipients: string[]; // email addresses
  subject: string;
  message: string;
  messageType: 'announcement' | 'notification' | 'support' | 'update';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user and verify admin access
    const decoded = auth(req);
    if (!decoded) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const user = await getUserById(decoded.userId);
    if (!user || user.email !== 'amascaro08@gmail.com') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { type, recipients, subject, message, messageType }: CommunicationRequest = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients specified' });
    }

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Get user details for personalization
    let targetUsers: any[] = [];
    
    if (type === 'broadcast') {
      // Get all users
      targetUsers = await db.select().from(users);
    } else {
      // Get specific users
      targetUsers = await db
        .select()
        .from(users)
        .where(inArray(users.email, recipients));
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found' });
    }

    // Send emails
    const emailResults = await Promise.all(
      targetUsers.map(async (targetUser) => {
        try {
          const success = await emailService.sendEmail({
            to: targetUser.email,
            subject: subject,
            html: generateEmailTemplate(targetUser.name, message, messageType),
            text: generatePlainTextEmail(targetUser.name, message),
          });
          return { email: targetUser.email, success };
        } catch (error) {
          console.error(`Failed to send email to ${targetUser.email}:`, error);
          return { email: targetUser.email, success: false, error: error instanceof Error ? error.message : String(error) };
        }
      })
    );

    const successCount = emailResults.filter(result => result.success).length;
    const failureCount = emailResults.length - successCount;

    // Log the message to history
    try {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/admin/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || ''
        },
        body: JSON.stringify({
          type,
          subject,
          messageType,
          recipientCount: targetUsers.length,
          recipients: targetUsers.map(u => u.email),
          success: successCount > 0
        })
      });
      if (!response.ok) {
        console.error('Failed to log message to history:', await response.text());
      }
    } catch (error) {
      console.error('Failed to log message to history:', error);
    }

    res.status(200).json({
      message: `Email sent to ${successCount} recipients`,
      details: {
        sent: successCount,
        failed: failureCount,
        results: emailResults,
      },
    });

  } catch (error) {
    console.error('Error in admin communication API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateEmailTemplate(userName: string, message: string, messageType: string): string {
  const typeConfig = {
    announcement: { icon: '📢', color: '#2563eb', title: 'Announcement' },
    notification: { icon: '🔔', color: '#059669', title: 'Notification' },
    support: { icon: '🤝', color: '#7c3aed', title: 'Support Message' },
    update: { icon: '🚀', color: '#dc2626', title: 'Update' },
  };

  const config = typeConfig[messageType] || typeConfig.notification;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${config.title} - FloHub</title>
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
          border-bottom: 3px solid ${config.color};
          padding-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: ${config.color};
          margin-bottom: 10px;
        }
        .message-content {
          background: white;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
          border-left: 4px solid ${config.color};
        }
        .footer {
          margin-top: 30px;
          font-size: 14px;
          color: #666;
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${config.icon} FloHub</div>
          <h1>${config.title}</h1>
        </div>
        
        <p>Hi ${userName},</p>
        
        <div class="message-content">
          ${message.replace(/\n/g, '<br>')}
        </div>
        
        <div class="footer">
          <p>Best regards,<br>The FloHub Team</p>
          <p>This message was sent from the FloHub Admin Panel.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePlainTextEmail(userName: string, message: string): string {
  return `
Hi ${userName},

${message}

Best regards,
The FloHub Team

This message was sent from the FloHub Admin Panel.
  `;
}