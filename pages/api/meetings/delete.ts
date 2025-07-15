// pages/api/meetings/delete.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/neon';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    // Handle preflight request
    res.setHeader('Allow', 'DELETE');
    return res.status(204).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.body; // Assuming the note ID is sent in the request body

  if (!id) {
    return res.status(400).json({ message: 'Meeting Note ID is required' }); // Updated error message
  }

  try {
    // Optional: Verify user's authentication and ownership of the note
    // const user = await auth.verifyIdToken(req.headers.authorization?.split(' ')[1]);
    // const userId = user.uid;
    // const noteRef = db.collection('notes').doc(id); // Still reference the 'notes' collection
    // const noteDoc = await noteRef.get();
    // if (!noteDoc.exists || noteDoc.data()?.userId !== userId) {
    //   return res.status(403).json({ message: 'Unauthorized' });
    // }

    await query('DELETE FROM notes WHERE id = $1', [id]);
    res.status(200).json({ message: 'Meeting note deleted successfully' }); // Updated success message
  } catch (error) {
    console.error('Error deleting meeting note:', error); // Updated error log
    res.status(500).json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
}