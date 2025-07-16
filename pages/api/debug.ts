import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Disable caching
  res.setHeader('Cache-Control', 'no-store');
  
  try {
    // Get the token
    const user = await auth(req);
    
    // Return debug information
    return res.status(200).json({
      authenticated: !!user,
      user: user ? {
        email: user.email,
        name: user.name,
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