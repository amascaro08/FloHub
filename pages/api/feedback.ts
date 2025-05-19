import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs } from "firebase/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    // 1) Authenticate via JWT
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.email) {
      return res.status(401).json({ error: "Not signed in" });
    }
    const userId = token?.email as string;

    // 2) Validate input
    const { feedbackType, feedbackText } = req.body;
    if (!feedbackText || typeof feedbackText !== "string" || feedbackText.trim() === "") {
      return res.status(400).json({ error: "Feedback text is required" });
    }

    try {
      // 3) Save the feedback to the database
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
  } else if (req.method === "GET") {
    // 1) Authenticate via JWT
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.email) {
      return res.status(401).json({ error: "Not signed in" });
    }
    const userId = token?.email as string;

    try {
      // 2) Retrieve feedback from the database
      const feedbackQuery = query(
        collection(db, "feedback"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(feedbackQuery);

      const feedback = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.status(200).json(feedback);
    } catch (err: any) {
      console.error("Get feedback error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
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