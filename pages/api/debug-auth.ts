import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('Debug auth endpoint called');
    console.log('Cookies:', req.cookies);
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
    
    const token = req.cookies['auth-token'];
    console.log('Token exists:', !!token);
    console.log('Token length:', token?.length || 0);
    
    const decoded = auth(req);
    console.log('Auth result:', decoded);
    
    res.status(200).json({
      hasToken: !!token,
      tokenLength: token?.length || 0,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
      authResult: decoded,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug auth error:', error);
    res.status(500).json({ error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}