import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';
import { query } from './neon';

export async function auth(req: NextApiRequest) {
  const token = req.cookies['auth-token'];

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const { rows } = await query('SELECT id, email FROM users WHERE id = $1', [decoded.userId]);
    const user = rows[0];

    return user || null;
  } catch (error) {
    return null;
  }
}