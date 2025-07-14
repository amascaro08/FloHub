import { jwtVerify, createRemoteJWKSet } from 'jose';

console.log('neonAuth: Initializing JWKS with NEXT_PUBLIC_STACK_PROJECT_ID:', process.env.NEXT_PUBLIC_STACK_PROJECT_ID);
const STACK_AUTH_BASE_URL = process.env.NEXT_PUBLIC_STACK_AUTH_BASE_URL || 'https://api.stack-auth.com';
const JWKS_URL = `${STACK_AUTH_BASE_URL}/api/v1/projects/${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));
console.log('neonAuth: JWKS_URL:', JWKS_URL);
console.log('neonAuth: STACK_AUTH_BASE_URL:', STACK_AUTH_BASE_URL);

export async function verifyToken(token: string) {
  try {
    console.log('neonAuth: Verifying token...');
    const { payload } = await jwtVerify(token, JWKS);
    console.log('neonAuth: Token verification successful. Payload:', payload);
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

  return {
    id: payload.sub as string,
    email: payload.email as string,
    name: payload.name as string,
  };
}
