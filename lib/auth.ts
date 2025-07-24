import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

export function auth(req: NextApiRequest) {
  const token = req.cookies['auth-token'];

  if (!token) {
    console.log("[auth] No auth token found in cookies");
    return null;
  }

  try {
    console.log("[auth] JWT_SECRET exists:", !!process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
    console.log("[auth] Token verified successfully:", decoded);
    return decoded;
  } catch (error) {
    console.log("[auth] Token verification failed:", error);
    return null;
  }
}