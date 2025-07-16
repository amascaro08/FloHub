import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await auth(req);
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}