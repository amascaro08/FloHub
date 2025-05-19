import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use getToken instead of getSession for better compatibility with API routes
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  if (!token?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userEmail = token.email as string;
  
  // Get dates from request body
  const { dates } = req.body;
  
  if (!Array.isArray(dates)) {
    return res.status(400).json({ error: 'Dates array is required' });
  }
  
  try {
    const activitiesRef = collection(db, 'journal_activities');
    const q = query(
      activitiesRef,
      where('userEmail', '==', userEmail),
      where('date', 'in', dates)
    );
    
    const snapshot = await getDocs(q);
    
    // Create a map of date to activities array
    const activities: Record<string, string[]> = {};
    
    // Add activities for each date
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.date && Array.isArray(data.activities) && data.activities.length > 0) {
        activities[data.date] = data.activities;
      }
    });
    
    return res.status(200).json({ activities });
  } catch (error) {
    console.error('Error retrieving batch activities:', error);
    return res.status(500).json({ error: 'Failed to retrieve batch activities' });
  }
}