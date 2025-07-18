import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';
import { db } from './drizzle';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function auth(req: NextApiRequest) {
  const token = req.cookies['auth-token'];

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
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
  } catch (error) {
    return null;
  }
}