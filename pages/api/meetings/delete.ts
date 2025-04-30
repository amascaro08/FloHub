// pages/api/meetings/delete.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin'; // Import admin directly

// Ensure Firebase Admin is initialized (assuming it's initialized elsewhere, e.g., in lib/firebaseAdmin.ts)
// If not, uncomment the initialization block below:
/*
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}
*/

const db = getFirestore();
const auth = getAuth();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    // Handle preflight request
    res.setHeader('Allow', 'DELETE');
    return res.status(204).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  console.log("Received DELETE request for meeting note ID:", req.body.id); // Updated log message
  const { id } = req.body; // Assuming the note ID is sent in the request body

  if (!id) {
    return res.status(400).json({ message: 'Meeting Note ID is required' }); // Updated error message
  }

  try {
    // Optional: Verify user's authentication and ownership of the note
    // const session = await auth.verifyIdToken(req.headers.authorization?.split(' ')[1]);
    // const userId = session.uid;
    // const noteRef = db.collection('notes').doc(id); // Still reference the 'notes' collection
    // const noteDoc = await noteRef.get();
    // if (!noteDoc.exists || noteDoc.data()?.userId !== userId) {
    //   return res.status(403).json({ message: 'Unauthorized' });
    // }

    await db.collection('notes').doc(id).delete(); // Still delete from 'notes' collection
    console.log("Meeting note with ID", id, "deleted successfully."); // Updated log message
    res.status(200).json({ message: 'Meeting note deleted successfully' }); // Updated success message
  } catch (error) {
    console.error('Error deleting meeting note:', error); // Updated error log
    res.status(500).json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
}