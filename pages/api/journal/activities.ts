import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, limit } from 'firebase/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userEmail = session.user.email;
  
  // Handle GET request - retrieve activities data
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const activitiesRef = collection(db, 'journal_activities');
      const q = query(
        activitiesRef,
        where('userEmail', '==', userEmail),
        where('date', '==', date),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return res.status(404).json({ error: 'Activities data not found' });
      }
      
      const activitiesData = snapshot.docs[0].data();
      return res.status(200).json(activitiesData);
    } catch (error) {
      console.error('Error retrieving activities data:', error);
      return res.status(500).json({ error: 'Failed to retrieve activities data' });
    }
  }
  
  // Handle POST request - save activities data
  if (req.method === 'POST') {
    const { date, activities } = req.body;
    
    if (!date || !Array.isArray(activities)) {
      return res.status(400).json({ error: 'Date and activities array are required' });
    }
    
    try {
      // Check if activities data already exists for this date
      const activitiesRef = collection(db, 'journal_activities');
      const q = query(
        activitiesRef,
        where('userEmail', '==', userEmail),
        where('date', '==', date),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Create new activities entry
        await addDoc(collection(db, 'journal_activities'), {
          userEmail,
          date,
          activities,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        // Update existing activities entry
        const docId = snapshot.docs[0].id;
        const docRef = doc(db, 'journal_activities', docId);
        await updateDoc(docRef, {
          activities,
          updatedAt: new Date().toISOString()
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving activities data:', error);
      return res.status(500).json({ error: 'Failed to save activities data' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}