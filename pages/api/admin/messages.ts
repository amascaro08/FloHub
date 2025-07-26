import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';

// In a real implementation, you would store this in the database
// For now, we'll use in-memory storage as a simple example
interface MessageLog {
  id: string;
  timestamp: Date;
  type: 'individual' | 'group' | 'broadcast';
  subject: string;
  messageType: string;
  recipientCount: number;
  recipients: string[];
  success: boolean;
  adminEmail: string;
}

// In-memory storage (in production, use a database)
let messageHistory: MessageLog[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get user and verify admin access
    const decoded = auth(req);
    if (!decoded) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const user = await getUserById(decoded.userId);
    if (!user || user.email !== 'amascaro08@gmail.com') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Return message history
      const sortedHistory = messageHistory.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      res.status(200).json({ messages: sortedHistory });
    } else if (req.method === 'POST') {
      // Log a new message
      const { type, subject, messageType, recipientCount, recipients, success } = req.body;
      
      const newMessage: MessageLog = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type,
        subject,
        messageType,
        recipientCount,
        recipients: recipients.slice(0, 5), // Store only first 5 for privacy
        success,
        adminEmail: user.email!
      };
      
      messageHistory.push(newMessage);
      
      // Keep only last 100 messages to prevent memory issues
      if (messageHistory.length > 100) {
        messageHistory = messageHistory.slice(-100);
      }
      
      res.status(200).json({ message: 'Message logged successfully' });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in admin messages API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}