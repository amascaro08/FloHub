import jwt from 'jsonwebtoken';

export async function verifyToken(token: string) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    return payload;
  } catch (error) {
    console.error('neonAuth: Error verifying token:', error);
    return null;
  }
}

import { query } from './neon';

export async function handleAuth(token?: string | null) {
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;

  const decoded = payload as { userId: string };
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
  const user = rows[0];

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
