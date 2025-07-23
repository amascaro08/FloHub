import { NextApiRequest, NextApiResponse } from 'next';
import { emailService } from '../../lib/emailService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development for security
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, type = 'test' } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    let result = false;

    switch (type) {
      case 'reset':
        const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=test-token-123`;
        result = await emailService.sendPasswordResetEmail(email, resetUrl, 'Test User');
        break;
      
      case 'welcome':
        result = await emailService.sendWelcomeEmail(email, 'Test User');
        break;
      
      case 'test':
      default:
        result = await emailService.sendEmail({
          to: email,
          subject: 'Test Email - FloHub',
          html: `
            <h1>Test Email</h1>
            <p>This is a test email from FloHub to verify email configuration is working.</p>
            <p>Time: ${new Date().toISOString()}</p>
          `,
          text: `Test Email - FloHub\n\nThis is a test email from FloHub to verify email configuration is working.\n\nTime: ${new Date().toISOString()}`
        });
        break;
    }

    if (result) {
      res.status(200).json({ 
        message: `${type} email sent successfully`,
        success: true 
      });
    } else {
      res.status(500).json({ 
        message: `Failed to send ${type} email. Check email configuration.`,
        success: false 
      });
    }

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}