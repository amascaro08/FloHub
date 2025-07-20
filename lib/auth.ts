import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

export function auth(req: NextApiRequest) {
  const token = req.cookies['auth-token'];

  if (!token) {
    return null;
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}