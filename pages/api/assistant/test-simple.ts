import type { NextApiRequest, NextApiResponse } from "next";

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

    console.log('Testing query processing:', query);

    // Simple intent analysis without database
    const lowerQuery = query.toLowerCase();
    let response = "I'm processing your query...";

    if (lowerQuery.includes('when did i') && lowerQuery.includes('talk about')) {
      const searchTerms = query.replace(/^when did i\s+last\s+talk about\s+/i, '').trim();
      response = `🔍 **Search Results for "${searchTerms}"**:\n\nI don't have any data to search through right now. Once you start adding tasks, notes, calendar events, or habits, I'll be able to help you find information about "${searchTerms}".`;
    } else if (lowerQuery.includes('calendar') || lowerQuery.includes('schedule')) {
      response = "📅 **Your Calendar**:\n\nI don't have any calendar events to show right now. Once you connect your calendar, I'll be able to help you with schedule queries.";
    } else if (lowerQuery.includes('task')) {
      response = "📋 **Your Tasks**:\n\nI don't have any tasks to show right now. Once you start adding tasks, I'll be able to help you manage them.";
    } else if (lowerQuery.includes('habit')) {
      response = "🔄 **Your Habits**:\n\nI don't have any habits to show right now. Once you start tracking habits, I'll be able to help you analyze your progress.";
    } else {
      response = `I understand you're asking: "${query}". I'm designed to help you with:\n\n• Calendar and schedule queries\n• Task management\n• Note searching\n• Habit tracking\n• Productivity insights\n\nTry asking me something specific about your data!`;
    }

    console.log('Response:', response);

    return res.status(200).json({ 
      reply: response,
      query: query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing your request.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}