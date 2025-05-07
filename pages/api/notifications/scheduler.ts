// pages/api/notifications/scheduler.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { runNotificationScheduler } from '@/lib/notificationScheduler';

type Data = {
  success: boolean;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Check for API key authentication
    const apiKey = req.headers['x-api-key'];
    
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Run the notification scheduler
    await runNotificationScheduler();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Notification scheduler executed successfully' 
    });
  } catch (error: any) {
    console.error('Error running notification scheduler:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Error running notification scheduler: ${error.message}` 
    });
  }
}