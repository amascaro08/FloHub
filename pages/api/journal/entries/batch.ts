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
    const entriesRef = collection(db, 'journal_entries');
    const q = query(
      entriesRef,
      where('userEmail', '==', userEmail),
      where('date', 'in', dates)
    );
    
    const snapshot = await getDocs(q);
    
    // Create a map of date to hasContent
    const entries: Record<string, boolean> = {};
    
    // Initialize all dates to false
    dates.forEach(date => {
      entries[date] = false;
    });
    
    // Update entries that have content
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.date && data.content && data.content.trim() !== '') {
        entries[data.date] = true;
      }
    });
    
    return res.status(200).json({ entries });
  } catch (error) {
    console.error('Error retrieving batch entries:', error);
    return res.status(500).json({ error: 'Failed to retrieve batch entries' });
  }
}