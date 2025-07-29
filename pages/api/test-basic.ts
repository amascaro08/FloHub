import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Basic test endpoint called:', req.method, req.url);
  
  return res.status(200).json({
    message: 'Basic test endpoint is working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    headers: {
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type']
    }
  });
}