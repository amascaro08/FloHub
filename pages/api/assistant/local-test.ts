import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { LocalAssistant } from "@/lib/assistant/localAssistant";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authentication
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Test LocalAssistant
    const localAssistant = new LocalAssistant(user.email);
    const response = await localAssistant.processQuery(query);

    return res.status(200).json({ 
      reply: response,
      query: query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LocalAssistant test error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing your request.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}