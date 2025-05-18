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
  
  // Handle GET request - retrieve sleep data
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const sleepRef = collection(db, 'journal_sleep');
      const q = query(
        sleepRef,
        where('userEmail', '==', userEmail),
        where('date', '==', date),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Return empty data instead of 404
        return res.status(200).json({ quality: '', hours: 7 });
      }
      
      const sleepData = snapshot.docs[0].data();
      return res.status(200).json(sleepData);
    } catch (error) {
      console.error('Error retrieving sleep data:', error);
      return res.status(500).json({ error: 'Failed to retrieve sleep data' });
    }
  }
  
  // Handle POST request - save sleep data
  if (req.method === 'POST') {
    const { date, quality, hours } = req.body;
    
    if (!date || !quality || hours === undefined) {
      return res.status(400).json({ error: 'Date, quality, and hours are required' });
    }
    
    try {
      // Check if sleep data already exists for this date
      const sleepRef = collection(db, 'journal_sleep');
      const q = query(
        sleepRef,
        where('userEmail', '==', userEmail),
        where('date', '==', date),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Create new sleep entry
        await addDoc(collection(db, 'journal_sleep'), {
          userEmail,
          date,
          quality,
          hours,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        // Update existing sleep entry
        const docId = snapshot.docs[0].id;
        const docRef = doc(db, 'journal_sleep', docId);
        await updateDoc(docRef, {
          quality,
          hours,
          updatedAt: new Date().toISOString()
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving sleep data:', error);
      return res.status(500).json({ error: 'Failed to save sleep data' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}