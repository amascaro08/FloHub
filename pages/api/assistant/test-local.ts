import type { NextApiRequest, NextApiResponse } from "next";
import { LocalAssistant } from "@/lib/assistant/localAssistant";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('Testing LocalAssistant with query:', query);

    // Test LocalAssistant with a mock user email
    const localAssistant = new LocalAssistant('test@example.com');
    const response = await localAssistant.processQuery(query);

    console.log('LocalAssistant response:', response);

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