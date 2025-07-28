import type { NextApiRequest, NextApiResponse } from "next";

/**
 * PERFORMANCE FIX: Legacy assistant endpoint 
 * Redirects to the new modular chat endpoint
 * 
 * This file previously contained 1637 lines of code which has been
 * decomposed into smaller, more maintainable modules:
 * - /lib/assistant/types.ts - Type definitions
 * - /lib/assistant/intentAnalyzer.ts - Intent analysis
 * - /lib/assistant/calendarProcessor.ts - Calendar processing
 * - /lib/assistant/dateUtils.ts - Date utilities
 * - /api/assistant/chat.ts - Main chat handler
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // PERFORMANCE FIX: Redirect to new modular endpoint
  if (req.method === 'POST') {
    // Forward the request to the new chat endpoint
    const chatEndpoint = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/assistant/chat`;
    
    try {
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || '',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('Legacy assistant redirect error:', error);
      return res.status(500).json({ 
        error: 'Service temporarily unavailable. Please try again.' 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
