import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Chat test endpoint called');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simulate the exact call the chat widget makes
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify({
        message: req.body.message || 'Hello',
        history: req.body.history || []
      }),
    });

    console.log('Assistant API response status:', response.status);
    console.log('Assistant API response headers:', response.headers);
    
    const responseText = await response.text();
    console.log('Assistant API raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return res.status(500).json({ 
        error: 'Invalid JSON response from assistant API',
        rawResponse: responseText,
        status: response.status
      });
    }

    return res.status(200).json({
      message: 'Chat test completed',
      assistantApiStatus: response.status,
      assistantApiResponse: data,
      success: response.ok
    });

  } catch (error) {
    console.error('Chat test error:', error);
    return res.status(500).json({ 
      error: 'Chat test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}