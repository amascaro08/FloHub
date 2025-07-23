import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Support multiple email providers
    const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

    try {
      if (emailProvider === 'gmail') {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER!,
            pass: process.env.EMAIL_PASS!,
          },
        });
      } else if (emailProvider === 'smtp') {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST!,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER!,
            pass: process.env.SMTP_PASS!,
          },
        });
      } else {
        console.warn('No email provider configured. Email functionality will be disabled.');
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  private isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Email service not configured. Email not sent.');
      return false;
    }

    try {
      const info = await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetUrl: string, userName?: string): Promise<boolean> {
    const subject = 'Reset Your Password - FloHub';
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
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
          .button:hover {
            background: #1d4ed8;
          }
          .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            font-size: 14px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloHub</div>
            <h1>Reset Your Password</h1>
          </div>
          
          <p>Hi${userName ? ` ${userName}` : ''},</p>
          
          <p>We received a request to reset your password for your FloHub account. If you didn't make this request, you can safely ignore this email.</p>
          
          <p>To reset your password, click the button below:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security. If the link has expired, you can request a new password reset from the login page.
          </div>
          
          <div class="footer">
            <p>This is an automated message from FloHub. Please do not reply to this email.</p>
            <p>If you're having trouble with the button above, copy and paste the URL into your web browser.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Reset Your Password - FloHub

Hi${userName ? ` ${userName}` : ''},

We received a request to reset your password for your FloHub account. If you didn't make this request, you can safely ignore this email.

To reset your password, copy and paste this link into your browser:
${resetUrl}

This link will expire in 1 hour for your security.

If you're having trouble, you can request a new password reset from the login page.

This is an automated message from FloHub.
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const subject = 'Welcome to FloHub!';
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to FloHub</title>
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
          .feature {
            margin: 15px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border-left: 3px solid #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloHub</div>
            <h1>Welcome to FloHub!</h1>
          </div>
          
          <p>Hi ${userName},</p>
          
          <p>Welcome to FloHub! We're excited to have you on board. FloHub is your all-in-one productivity platform designed to help you manage your workflow efficiently.</p>
          
          <h3>What you can do with FloHub:</h3>
          
          <div class="feature">
            <strong>📅 Calendar Integration</strong><br>
            Connect your Google Calendar and manage all your events in one place.
          </div>
          
          <div class="feature">
            <strong>📝 Task Management</strong><br>
            Create, organize, and track your tasks with our intuitive task manager.
          </div>
          
          <div class="feature">
            <strong>🤖 AI Assistant</strong><br>
            Get help with scheduling, task planning, and productivity insights.
          </div>
          
          <div class="feature">
            <strong>📊 Analytics</strong><br>
            Track your productivity and get insights into your work patterns.
          </div>
          
          <p>Ready to get started? Log in to your account and explore all the features FloHub has to offer!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Go to FloHub
            </a>
          </div>
          
          <p>If you have any questions or need help getting started, feel free to reach out to our support team.</p>
          
          <p>Happy productivity!</p>
          <p>The FloHub Team</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to FloHub!

Hi ${userName},

Welcome to FloHub! We're excited to have you on board. FloHub is your all-in-one productivity platform designed to help you manage your workflow efficiently.

What you can do with FloHub:
- Calendar Integration: Connect your Google Calendar and manage all your events in one place
- Task Management: Create, organize, and track your tasks with our intuitive task manager  
- AI Assistant: Get help with scheduling, task planning, and productivity insights
- Analytics: Track your productivity and get insights into your work patterns

Ready to get started? Visit ${process.env.NEXTAUTH_URL || 'http://localhost:3000'} to log in and explore all the features FloHub has to offer!

If you have any questions or need help getting started, feel free to reach out to our support team.

Happy productivity!
The FloHub Team
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }
}

// Create and export a singleton instance
export const emailService = new EmailService();
export default emailService;