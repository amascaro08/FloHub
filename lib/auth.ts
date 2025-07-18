import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

export function auth(req: NextApiRequest) {
  const token = req.cookies['auth-token'];

  if (!token) {
    console.log('No auth token found in cookies');
    return null;
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET environment variable not set');
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}