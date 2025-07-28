import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test basic endpoint access
    if (req.method === 'GET') {
      return res.status(200).json({ 
        message: 'Simple test endpoint is working',
        timestamp: new Date().toISOString(),
        method: req.method
      });
    }

    if (req.method === 'POST') {
      // Test authentication
      const decoded = auth(req);
      
      return res.status(200).json({ 
        message: 'POST endpoint is working',
        authenticated: !!decoded,
        userId: decoded?.userId || null,
        timestamp: new Date().toISOString(),
        body: req.body
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Simple test error:', error);
    return res.status(500).json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}