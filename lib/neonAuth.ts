import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS_URL = `https://api.stack-auth.com/api/v1/projects/${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWKS);
    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function handleAuth(token?: string | null) {
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.sub as string,
    email: payload.email as string,
    name: payload.name as string,
  };
}
