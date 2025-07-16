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

export async function handleAuth(token?: string | null) {
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;

  const decoded = payload as { userId: string; email: string; name: string };
  return {
    id: decoded.userId,
    email: decoded.email,
    name: decoded.name,
  };
}
