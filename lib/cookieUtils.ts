import { NextApiRequest } from 'next';
import { serialize } from 'cookie';

/**
 * Determines the appropriate cookie domain based on the request hostname
 * Supports multiple domains: flohub.xyz, www.flohub.xyz, and flohub.vercel.app
 */
export function getCookieDomain(req: NextApiRequest): string | undefined {
  const host = req.headers.host;
  
  if (process.env.NODE_ENV !== 'production') {
    return undefined; // No domain restriction for development
  }
  
  if (!host) {
    return undefined;
  }
  
  // Handle different domains
  if (host.includes('flohub.xyz')) {
    return '.flohub.xyz'; // Works for both flohub.xyz and www.flohub.xyz
  }
  
  if (host.includes('vercel.app')) {
    return undefined; // Vercel subdomains don't need explicit domain
  }
  
  // Default: no domain restriction for unknown hosts
  return undefined;
}

/**
 * Creates a secure cookie with appropriate domain settings
 */
export function createSecureCookie(
  req: NextApiRequest,
  name: string,
  value: string,
  options: {
    maxAge?: number;
    sameSite?: 'strict' | 'lax' | 'none';
    httpOnly?: boolean;
    secure?: boolean;
    path?: string;
  } = {}
): string {
  const {
    maxAge = 60 * 60 * 24, // 24 hours default
    sameSite = 'lax',
    httpOnly = true,
    secure = process.env.NODE_ENV !== 'development',
    path = '/',
  } = options;

  // Determine if this is a PWA request
  const userAgent = req.headers['user-agent'] || '';
  const isPWA = userAgent.includes('standalone') || 
                req.headers['sec-fetch-site'] === 'none' ||
                userAgent.includes('Mobile/') && userAgent.includes('Safari/') && !userAgent.includes('Chrome/'); // iOS PWA detection
  
  // PWA gets longer cookie expiry for better persistence
  const finalMaxAge = isPWA ? Math.max(maxAge, 90 * 24 * 60 * 60) : maxAge; // Minimum 90 days for PWA
  
  const cookieOptions = {
    httpOnly,
    secure,
    sameSite: isPWA ? 'none' as const : sameSite,
    maxAge: finalMaxAge,
    path,
    domain: getCookieDomain(req),
  };

  // Log cookie settings in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Setting cookie for ${isPWA ? 'PWA' : 'browser'}:`, {
      name,
      maxAge: finalMaxAge,
      sameSite: cookieOptions.sameSite,
      domain: cookieOptions.domain,
    });
  }

  return serialize(name, value, cookieOptions);
}

/**
 * Creates a cookie to clear/delete an existing cookie
 */
export function createClearCookie(
  req: NextApiRequest,
  name: string,
  path: string = '/'
): string {
  return serialize(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path,
    domain: getCookieDomain(req),
  });
}

/**
 * Gets the current domain info for debugging
 */
export function getDomainInfo(req: NextApiRequest) {
  const host = req.headers.host;
  const cookieDomain = getCookieDomain(req);
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    host,
    cookieDomain,
    isProduction,
    isFlohubDomain: host?.includes('flohub.xyz') || false,
    isVercelDomain: host?.includes('vercel.app') || false,
  };
}