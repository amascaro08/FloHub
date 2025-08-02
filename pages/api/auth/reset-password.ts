import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/drizzle';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { generateSecureToken } from '../../../lib/auth';
import { emailService } from '../../../lib/emailService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (user.length === 0) {
      // For security reasons, don't reveal if user exists or not
      return res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // SECURITY FIX: Generate cryptographically secure reset token
    const resetToken = generateSecureToken(32);
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await db.update(users)
      .set({
        resetToken,
        resetTokenExpiry,
      })
      .where(eq(users.email, email));

    // Generate reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Send password reset email
    try {
      // Check email configuration first
      const emailConfigStatus = emailService.getConfigurationStatus();
      if (!emailConfigStatus.configured) {
        console.error('Email service not configured:', emailConfigStatus.error);
        
        // In development, still provide the reset URL
        if (process.env.NODE_ENV === 'development') {
          console.log('Development: Password reset URL generated (email not configured)');
        }
        
        // Return success to avoid revealing email existence, but log the issue
        return res.status(200).json({ 
          message: 'If an account with that email exists, a password reset link has been sent.',
          devNote: process.env.NODE_ENV === 'development' ? 'Email service not configured. Check server logs for reset URL.' : undefined
        });
      }

      const emailSent = await emailService.sendPasswordResetEmail(
        email, 
        resetUrl, 
        user[0].name || undefined
      );
      
      if (emailSent) {
        console.log('Password reset email sent successfully');
      } else {
        console.warn('Failed to send password reset email');
        // For development, log the reset URL
        if (process.env.NODE_ENV === 'development') {
          console.log('Development: Password reset URL generated');
        }
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      // For development, log the reset URL as fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('Development fallback: Password reset URL generated');
      }
    }

    return res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}