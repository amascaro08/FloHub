import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

export function auth(req: NextApiRequest) {
  const token = req.cookies['auth-token'];

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
    return decoded;
  } catch (error) {
    return null;
  }
}