import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Disable caching
  res.setHeader('Cache-Control', 'no-store');
  
  try {
    // Get the token
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    // Return debug information
    return res.status(200).json({
      authenticated: !!token,
      token: token ? {
        email: token.email,
        name: token.name,
        picture: token.picture,
        // Don't include sensitive information
      } : null,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        cookie: req.headers.cookie ? 'Present' : 'Missing',
      },
      method: req.method,
      query: req.query,
    });
  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    return res.status(500).json({ error: error.message });
  }
}