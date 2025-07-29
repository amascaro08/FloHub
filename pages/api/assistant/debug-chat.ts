import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Debug chat endpoint called:', req.method);
  
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('Processing POST request');
    
    // Test authentication step by step
    console.log('Testing authentication...');
    const decoded = auth(req);
    if (!decoded) {
      console.log('Authentication failed');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('User authenticated:', decoded.userId);

    // Test user lookup
    console.log('Looking up user...');
    const user = await getUserById(decoded.userId);
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'User not found' });
    }
    
    console.log('User found:', user.email);

    // Test input validation
    const { userInput } = req.body;
    if (!userInput) {
      console.log('No user input provided');
      return res.status(400).json({ error: 'User input is required' });
    }
    
    console.log('User input received:', userInput);
    
    // Simple response without complex processing
    const response = `Debug response: I received your message \"${userInput}\". User ID: ${decoded.userId}, Email: ${user.email}`;
    
    console.log('Sending response:', response);
    
    return res.status(200).json({ 
      reply: response,
      debug: {
        userId: decoded.userId,
        userEmail: user.email,
        inputLength: userInput.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Debug chat error:', error);
    return res.status(500).json({ 
      error: 'Debug chat failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}