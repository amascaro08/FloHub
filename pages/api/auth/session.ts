import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const decoded = auth(req);

  if (!decoded) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = await getUserById(decoded.userId);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  console.log('Session API: user object =', user);
  res.status(200).json(user);
}