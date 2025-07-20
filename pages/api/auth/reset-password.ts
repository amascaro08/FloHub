import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/drizzle';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

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

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await db.update(users)
      .set({
        resetToken,
        resetTokenExpiry,
      })
      .where(eq(users.email, email));

    // In a real application, you would send an email here
    // For now, we'll just return the token (in production, send via email)
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // TODO: Send email with resetUrl
    console.log('Password reset URL:', resetUrl);

    return res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}