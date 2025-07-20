import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/drizzle';
import { users } from '../../../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Find user with valid reset token
    const user = await db.select().from(users).where(
      and(
        eq(users.resetToken, token),
        gt(users.resetTokenExpiry!, new Date())
      )
    ).limit(1);

    if (user.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    await db.update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      })
      .where(eq(users.id, user[0].id));

    return res.status(200).json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}