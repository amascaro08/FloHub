// pages/api/assistant/event.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession }            from "next-auth/next";
import { authOptions }                 from "../auth/[...nextauth]";
import { firestore }                   from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 1) Only signed‑in users
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Not signed in" });
  const email = session.user.email;

  // 2) Validate incoming payload
  const { type, payload, timestamp } = req.body as {
    type: string;
    payload: any;
    timestamp?: string;
  };
  if (!type || !payload) {
    return res.status(400).json({ error: "Missing type or payload" });
  }

  // 3) Write into Firestore under users/{email}/assistantEvents
  try {
    await firestore
      .collection("users")
      .doc(email)
      .collection("assistantEvents")
      .add({
        type,
        payload,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      });
    return res.status(201).json({ ok: true });
  } catch (err: any) {
    console.error("Error saving assistant event:", err);
    return res.status(500).json({ error: err.message });
  }
}
