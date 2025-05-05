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

  const { ids } = req.body; // Assuming an array of note IDs is sent in the request body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'An array of Note IDs is required' });
  }

  try {
    // Optional: Verify user's authentication and ownership of the notes
    // This would involve checking each note's ownership before deleting
    // For simplicity, this is omitted in this example but recommended for production

    const batch = db.batch();
    ids.forEach(id => {
      const noteRef = db.collection('notes').doc(id);
      batch.delete(noteRef);
    });

    await batch.commit();

    res.status(200).json({ message: `${ids.length} notes deleted successfully` });
  } catch (error) {
    console.error('Error deleting notes:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
}