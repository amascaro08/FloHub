import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, limit } from 'firebase/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use getToken instead of getSession for better compatibility with API routes
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  if (!token?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userEmail = token.email as string;
  
  // Handle GET request - retrieve mood data
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const moodsRef = collection(db, 'journal_moods');
      const q = query(
        moodsRef,
        where('userEmail', '==', userEmail),
        where('date', '==', date),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Return empty data instead of 404
        return res.status(200).json({ emoji: '', label: '', tags: [] });
      }
      
      const moodData = snapshot.docs[0].data();
      return res.status(200).json(moodData);
    } catch (error) {
      console.error('Error retrieving mood data:', error);
      return res.status(500).json({ error: 'Failed to retrieve mood data' });
    }
  }
  
  // Handle POST request - save mood data
  if (req.method === 'POST') {
    const { date, emoji, label, tags } = req.body;
    
    if (!date || !emoji || !label) {
      return res.status(400).json({ error: 'Date, emoji, and label are required' });
    }
    
    try {
      // Check if mood data already exists for this date
      const moodsRef = collection(db, 'journal_moods');
      const q = query(
        moodsRef,
        where('userEmail', '==', userEmail),
        where('date', '==', date),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Create new mood entry
        await addDoc(collection(db, 'journal_moods'), {
          userEmail,
          date,
          emoji,
          label,
          tags: tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        // Update existing mood entry
        const docId = snapshot.docs[0].id;
        const docRef = doc(db, 'journal_moods', docId);
        await updateDoc(docRef, {
          emoji,
          label,
          tags: tags || [],
          updatedAt: new Date().toISOString()
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving mood data:', error);
      return res.status(500).json({ error: 'Failed to save mood data' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}