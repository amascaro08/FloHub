import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Move getUserById function here to avoid shared import issues
async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
        },
      },
    },
  });

  return user || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const decoded = auth(req);

  if (!decoded) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = await getUserById(decoded.userId);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  res.status(200).json(user);
}