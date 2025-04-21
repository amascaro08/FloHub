// pages/api/assistant.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession }            from "next-auth/next";
import { authOptions }                 from "./auth/[...nextauth]";
import chatWithFloCat from "@/lib/assistant";
import { firestore }   from "@/lib/firebaseAdmin";
import admin            from "firebase-admin";
import { google }      from "googleapis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end();
  }

  // ─── 1) AUTH ───────────────────────────────────────────
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !session.user.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const email = session.user.email;

  // ─── 2) PARSE & CLEAN PROMPT ──────────────────────────
  const { history, prompt } = req.body as {
    history: { role: string; content: string | null }[];
    prompt:  string;
  };
  if (!prompt?.trim()) {
    return res.status(400).json({ error: "Empty prompt" });
  }
  const lc = prompt.toLowerCase();

  // ─── 3) SETUP Google Calendar client ───────────────────
  const oAuth2 = new google.auth.OAuth2();
  oAuth2.setCredentials({
    access_token:  session.user.accessToken,
    refresh_token: session.user.refreshToken!,
  });
  const calendar = google.calendar({ version: "v3", auth: oAuth2 });

  // ─── 4) HANDLE “create a task” ───────────────────────
  if (lc.includes("create") && lc.includes("task")) {
    // naively pull name + due keyword
    const m = prompt.match(/task\s+(?:called\s+)?["“]?(.+?)["”]?\s+due\s+(\w+)/i);
    let name = prompt, dueDateIso: string | undefined;
    if (m) {
      name = m[1];
      const due = m[2].toLowerCase();
      if (due === "tomorrow") {
        const t = new Date();
        t.setDate(t.getDate()+1);
        dueDateIso = t.toISOString();
      }
    }
    // write directly to Firestore:
    const ref = await firestore
      .collection("users")
      .doc(email)
      .collection("tasks")
      .add({
        text:      name.trim(),
        done:      false,
        dueDate:   dueDateIso ? new Date(dueDateIso) : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    return res
      .status(200)
      .json({ reply: `Got it—your task **${name.trim()}** has been created${dueDateIso ? ` due ${dueDateIso.split("T")[0]}` : ""}.` });
  }

  // ─── 5) HANDLE “create a calendar event” ──────────────
  if (lc.includes("create") && lc.includes("calendar event") || lc.includes("block")) {
    const m = prompt.match(/at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+called?\s+(.+)/i);
    let tm = "4pm", summary = prompt;
    if (m) {
      tm = m[1];
      summary = m[2];
    }
    // build start/end
    const dt = new Date();
    let hour = parseInt(tm,10);
    if (tm.toLowerCase().includes("pm") && hour < 12) hour += 12;
    dt.setHours(hour,0,0,0);
    const dtEnd = new Date(dt);
    dtEnd.setHours(dtEnd.getHours()+1);

    // direct insert
    await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: summary.trim(),
        start:   { dateTime: dt.toISOString() },
        end:     { dateTime: dtEnd.toISOString() },
      },
    });
    return res
      .status(200)
      .json({ reply: `All set—**${summary.trim()}** is on your calendar at ${tm}.` });
  }

  // ─── 6) OTHERWISE: build context & chat ───────────────
  // (fetch tasks + events just like before, build system prompt, etc.)
  // … your existing code to load pending/overdue tasks + upcoming events …
  // … then call chatWithFloCat(messages) …

  // For brevity, here’s a simplified version:
  const systemMsg = {
    role:    "system" as const,
    content: `You are FloCat, a friendly AI assistant for FloHub…`,
  };
  const cleanHistory = (history||[])
    .filter(h => (h.role==="user"||h.role==="assistant") && h.content?.trim())
    .map(h => ({ role: h.role as "user"|"assistant", content: h.content!.trim() }));
  const messages = [
    systemMsg,
    ...cleanHistory,
    { role: "user" as const, content: prompt.trim() },
  ];
  try {
    const reply = await chatWithFloCat(messages);
    return res.status(200).json({ reply });
  } catch (e:any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
