import { db } from "./firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import type { Note } from "@/types/app";
import type { CalendarEvent } from "@/pages/api/calendar/events";
type ConversationMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: any;
};

type Conversation = {
  id?: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: any;
};
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function fetchUserNotes(userId: string): Promise<Note[]> {
  const notesRef = collection(db, "notes");
  const q = query(notesRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const notes: Note[] = [];
  snapshot.forEach((doc) => {
    notes.push(doc.data() as Note);
  });
  return notes;
}

export async function fetchUserMeetingNotes(userId: string): Promise<Note[]> {
  const notesRef = collection(db, "notes");
  const q = query(
    notesRef,
    where("userId", "==", userId),
    // Additional filters for meeting notes can be added here if needed
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  const meetingNotes: Note[] = [];
  snapshot.forEach((doc) => {
    const note = doc.data() as Note;
    if (note.eventId || note.isAdhoc) {
      meetingNotes.push(note);
    }
  });
  return meetingNotes;
}

export async function fetchUserConversations(userId: string): Promise<Conversation[]> {
  const conversationsRef = collection(db, "conversations");
  const q = query(conversationsRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const conversations: Conversation[] = [];
  snapshot.forEach((doc) => {
    conversations.push(doc.data() as Conversation);
  });
  return conversations;
}

// Placeholder for fetching calendar events - actual implementation may require API calls with accessToken
export async function fetchUserCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  // TODO: Implement calendar event fetching using user's accessToken and calendarId
  return [];
}

// Generate embedding for a given text
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Compute cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// Find relevant context using semantic similarity
export async function findRelevantContextSemantic(
  query: string,
  notes: Note[],
  meetings: Note[],
  conversations: Conversation[]
): Promise<string> {
  const queryEmbedding = await generateEmbedding(query);

  type ScoredContext = {
    text: string;
    score: number;
  };

  const contexts: ScoredContext[] = [];

  // Prepare context texts
  notes.forEach((note) => {
    const text = `Note: ${note.title ?? "(no title)"} - ${note.content}`;
    contexts.push({ text, score: 0 });
  });

  meetings.forEach((meeting) => {
    const text = `Meeting Note: ${meeting.eventTitle ?? "(no title)"} - ${meeting.content}`;
    contexts.push({ text, score: 0 });
  });

  conversations.forEach((conv) => {
    let convText = "Past Conversation:\n";
    conv.messages.forEach((msg: { role: string; content: string }) => {
      convText += `${msg.role}: ${msg.content}\n`;
    });
    contexts.push({ text: convText, score: 0 });
  });

  // Compute similarity scores
  for (let i = 0; i < contexts.length; i++) {
    const embedding = await generateEmbedding(contexts[i].text);
    contexts[i].score = cosineSimilarity(queryEmbedding, embedding);
  }

  // Sort by descending similarity score
  contexts.sort((a, b) => b.score - a.score);

  // Select top 5 relevant contexts
  const topContexts = contexts.slice(0, 5);

  // Aggregate relevant context text
  let contextText = "";
  topContexts.forEach((ctx) => {
    contextText += ctx.text + "\n";
  });

  return contextText;
}