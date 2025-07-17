import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/neon';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies['auth-token'];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const { rows } = await query('SELECT id, email FROM users WHERE id = $1', [decoded.userId]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
}