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
  signature: string;
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

    const { type, recipients, subject, message, messageType, signature }: CommunicationRequest = req.body;

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
            html: generateEmailTemplate(targetUser.name, message, messageType, signature || 'The FloHub Team'),
            text: generatePlainTextEmail(targetUser.name, message, signature || 'The FloHub Team'),
          });
          return { email: targetUser.email, success };
        } catch (error) {
          console.error(`Failed to send email to [SANITIZED]:`, error);
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

function generateEmailTemplate(userName: string, message: string, messageType: string, signature: string): string {
  const typeConfig = {
    announcement: { icon: '📢', color: '#FF6B6B', title: 'Announcement' }, // FloCoral
    notification: { icon: '🔔', color: '#00C9A7', title: 'Notification' }, // FloTeal
    support: { icon: '🤝', color: '#00C9A7', title: 'Support Message' }, // FloTeal
    update: { icon: '🚀', color: '#FF6B6B', title: 'Update' }, // FloCoral
  } as const;

  const config = (typeConfig as any)[messageType] || typeConfig.notification;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${config.title} - FloHub</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.6;
          color: #1E1E2F;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #FDFDFD;
        }
        .container {
          background: #FDFDFD;
          border-radius: 16px;
          padding: 40px;
          margin: 20px 0;
          box-shadow: 0 10px 25px rgba(30, 30, 47, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 2px solid ${config.color};
        }
        .logo-container {
          margin-bottom: 20px;
        }
        .logo-text {
          font-family: 'Poppins', sans-serif;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
          color: #1E1E2F;
        }
        .flo {
          color: #00C9A7;
        }
        .hub {
          color: #FF6B6B;
        }
        .tagline {
          font-size: 14px;
          color: #9CA3AF;
          font-style: italic;
          margin-bottom: 20px;
        }
        .message-type {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: ${config.color};
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
        }
        .greeting {
          font-size: 18px;
          color: #1E1E2F;
          margin: 30px 0 20px 0;
        }
        .message-content {
          background: #FDFDFD;
          padding: 30px;
          border-radius: 12px;
          margin: 30px 0;
          border-left: 4px solid ${config.color};
          border: 1px solid #E5E7EB;
          font-size: 16px;
          line-height: 1.6;
        }
        .footer {
          margin-top: 40px;
          font-size: 14px;
          color: #9CA3AF;
          text-align: center;
          border-top: 1px solid #E5E7EB;
          padding-top: 30px;
        }
        .signature {
          color: #1E1E2F;
          font-weight: 500;
          margin-bottom: 15px;
        }
        .disclaimer {
          font-size: 12px;
          color: #9CA3AF;
        }
        .flocat-emoji {
          font-size: 20px;
          margin-right: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-container">
            <img src="${process.env.NEXTAUTH_URL || 'https://flohub.vercel.app'}/FloHub_Logo_Transparent.png" 
                 alt="FloHub Logo" 
                 style="max-width: 120px; height: auto; margin-bottom: 10px;" />
          </div>
          <div class="logo-text">
            <span class="flo">Flo</span><span class="hub">Hub</span>
          </div>
          <div class="tagline">Work smarter, flow better.</div>
          <div class="message-type">
            <span>${config.icon}</span>
            <span>${config.title}</span>
          </div>
        </div>
        
        <div class="greeting">Hi ${userName},</div>
        
        <div class="message-content">
          ${message.replace(/\n/g, '<br>')}
        </div>
        
        <div class="footer">
          <div class="signature">
            Best regards,<br>
            <strong>${signature}</strong>
          </div>
          <div class="disclaimer">
            <span class="flocat-emoji">🐾</span>
            You are receiving this message as you are a registered user of FloHub.<br>
            <em>"Your day. Your way. Guided by Flo."</em>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePlainTextEmail(userName: string, message: string, signature: string): string {
  return `
FloHub - "Work smarter, flow better."
================================

Hi ${userName},

${message}

Best regards,
${signature}

🐾 You are receiving this message as you are a registered user of FloHub.
"Your day. Your way. Guided by Flo."

FloHub Team
  `;
}