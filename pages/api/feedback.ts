import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = token?.email as string;

  const { feedbackType, feedbackText } = req.body;
  if (!feedbackText || typeof feedbackText !== "string" || feedbackText.trim() === "") {
    return res.status(400).json({ error: "Feedback text is required" });
  }

  try {
    const newFeedbackRef = await addDoc(collection(db, "feedback"), {
      userId: userId,
      feedbackType: feedbackType || "general",
      feedbackText: feedbackText,
      createdAt: serverTimestamp(),
    });
    const feedbackId = newFeedbackRef.id;

    return res.status(201).json({ success: true, feedbackId });
  } catch (err: any) {
    console.error("Create feedback error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}