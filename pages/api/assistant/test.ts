import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { SmartAIAssistant } from "@/lib/aiAssistant";
import { analyzeUserIntent } from "@/lib/assistant/intentAnalyzer";
import { findMatchingCapability } from "@/lib/floCatCapabilities";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use POST or GET.' });
  }

  try {
    // Test authentication
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const message = req.method === 'GET' ? 'test message' : req.body?.message;
    if (!message && req.method === 'POST') {
      return res.status(400).json({ error: 'Message is required for POST requests' });
    }

    // Test each component
    const tests = {
      openai_available: !!openai,
      user_id: decoded.userId,
      user_email: user.email,
      message: message,
      intent: null as any,
      capability_match: null as any,
      smart_assistant_test: null as any
    };

    // Test intent analysis
    try {
      tests.intent = analyzeUserIntent(message);
    } catch (error) {
      tests.intent = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test capability matching
    try {
      tests.capability_match = findMatchingCapability(message);
    } catch (error) {
      tests.capability_match = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test SmartAIAssistant
    try {
      const smartAssistant = new SmartAIAssistant(user.email);
      tests.smart_assistant_test = await smartAssistant.processNaturalLanguageQuery("Hello");
    } catch (error) {
      tests.smart_assistant_test = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    return res.status(200).json({
      message: 'Test completed',
      tests
    });

  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}