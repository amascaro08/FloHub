import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { firestore } from "../../lib/firebaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userEmail = token.email;
  try {
    const settingsCollectionRef = firestore.collection("users").doc(userEmail).collection("settings");
    const snapshot = await settingsCollectionRef.get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    return res.status(200).json({ documents: docs });
  } catch (error) {
    console.error("Error listing user settings documents for", userEmail, error);
    return res.status(500).json({ error: "Failed to list user settings documents" });
  }
}