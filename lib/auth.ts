import { NextApiRequest } from 'next';
import { handleAuth } from './neonAuth';

export async function auth(req: NextApiRequest) {
  let token: string | undefined;

  // Check for token in Authorization header
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  // Check for token in cookies (assuming a cookie named 'token' or similar)
  // You might need to adjust the cookie name based on your actual implementation
  if (!token && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return null;
  }

  const user = await handleAuth(token);
  return user;
}