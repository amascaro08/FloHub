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
  
  // Handle GET request - retrieve journal entry
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const entriesRef = collection(db, 'journal_entries');
      const q = query(
        entriesRef,
        where('userEmail', '==', userEmail),
        where('date', '==', date),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Return empty data instead of 404
        return res.status(200).json({ content: '', timestamp: new Date().toISOString() });
      }
      
      const entryData = snapshot.docs[0].data();
      return res.status(200).json(entryData);
    } catch (error) {
      console.error('Error retrieving journal entry:', error);
      return res.status(500).json({ error: 'Failed to retrieve journal entry' });
    }
  }
  
  // Handle POST request - save journal entry
  if (req.method === 'POST') {
    const { date, content, timestamp } = req.body;
    
    if (!date || !content) {
      return res.status(400).json({ error: 'Date and content are required' });
    }
    
    try {
      // Check if entry already exists
      const entriesRef = collection(db, 'journal_entries');
      const q = query(
        entriesRef,
        where('userEmail', '==', userEmail),
        where('date', '==', date),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Create new entry
        await addDoc(collection(db, 'journal_entries'), {
          userEmail,
          date,
          content,
          timestamp: timestamp || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        // Update existing entry
        const docId = snapshot.docs[0].id;
        const docRef = doc(db, 'journal_entries', docId);
        await updateDoc(docRef, {
          content,
          timestamp: timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving journal entry:', error);
      return res.status(500).json({ error: 'Failed to save journal entry' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}