import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  getDocs,
  doc,
  updateDoc,
  getDoc,
  where
} from "firebase/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authenticate via JWT for all requests
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = token?.email as string;

  // Handle different HTTP methods
  if (req.method === "POST") {
    // Create new feedback
    const { feedbackType, feedbackText } = req.body;
    if (!feedbackText || typeof feedbackText !== "string" || feedbackText.trim() === "") {
      return res.status(400).json({ error: "Feedback text is required" });
    }

    try {
      const newFeedbackRef = await addDoc(collection(db, "feedback"), {
        userId: userId,
        feedbackType: feedbackType || "general",
        feedbackText: feedbackText,
        status: "open", // Default status
        createdAt: serverTimestamp(),
      });
      const feedbackId = newFeedbackRef.id;

      return res.status(201).json({ success: true, feedbackId });
    } catch (err: any) {
      console.error("Create feedback error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else if (req.method === "GET") {
    // Get feedback or backlog items
    const { type } = req.query;
    
    try {
      if (type === "backlog") {
        // Retrieve backlog items
        const backlogQuery = query(
          collection(db, "backlog"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(backlogQuery);

        const backlogItems = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return res.status(200).json(backlogItems);
      } else {
        // Retrieve feedback items
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
      }
    } catch (err: any) {
      console.error("Get feedback error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else if (req.method === "PUT" || req.method === "PATCH") {
    // Update feedback status
    const { id, status, notes } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: "Feedback ID is required" });
    }
    
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    try {
      const feedbackRef = doc(db, "feedback", id);
      const feedbackDoc = await getDoc(feedbackRef);
      
      if (!feedbackDoc.exists()) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      
      const updateData: any = { status };
      if (notes) {
        updateData.notes = notes;
      }
      
      await updateDoc(feedbackRef, updateData);
      
      // If status is "backlog", add to backlog collection
      if (status === "backlog") {
        const feedbackData = feedbackDoc.data();
        await addDoc(collection(db, "backlog"), {
          originalId: id,
          text: feedbackData.feedbackText,
          createdAt: serverTimestamp(),
          userId: userId
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Update feedback error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else if (req.method === "POST" && req.query.type === "backlog") {
    // Add item directly to backlog
    const { text } = req.body;
    
    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "Backlog text is required" });
    }
    
    try {
      const newBacklogRef = await addDoc(collection(db, "backlog"), {
        text,
        userId: userId,
        createdAt: serverTimestamp(),
      });
      
      return res.status(201).json({ 
        success: true, 
        backlogId: newBacklogRef.id 
      });
    } catch (err: any) {
      console.error("Create backlog error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "PUT", "PATCH"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}