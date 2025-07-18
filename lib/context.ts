import type { Note } from "../types/app";
import type { CalendarEvent } from "../types/calendar";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

async function fetchFromAPI<T>(endpoint: string, userId: string): Promise<T> {
  const res = await fetch(`/api/${endpoint}?userId=${userId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return res.json();
}

export const fetchUserNotes = (userId: string): Promise<Note[]> => fetchFromAPI<Note[]>("notes", userId);
export const fetchUserMeetingNotes = (userId: string): Promise<Note[]> => fetchFromAPI<Note[]>("meetings", userId);
export const fetchUserConversations = (userId: string): Promise<Conversation[]> => fetchFromAPI<Conversation[]>("assistant/conversations", userId);

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
  // Generate query embedding asynchronously while preparing contexts
  const queryEmbeddingPromise = generateEmbedding(query);

  type ScoredContext = {
    text: string;
    score: number;
    index: number; // To maintain original order for stable sorting
  };

  // Prepare context texts
  const contexts: ScoredContext[] = [];

  notes.forEach((note, index) => {
    const text = `Note: ${note.title ?? "(no title)"} - ${note.content}`;
    contexts.push({ text, score: 0, index });
  });

  meetings.forEach((meeting, index) => {
    // Include AI summary if available
    const summaryText = meeting.aiSummary ? `Summary: ${meeting.aiSummary}\n` : '';
    const agendaText = meeting.agenda ? `Agenda: ${meeting.agenda}\n` : '';
    
    const text = `Meeting Note: ${meeting.eventTitle ?? "(no title)"}\n${summaryText}${agendaText}Content: ${meeting.content}`;
    contexts.push({ text, score: 0, index: notes.length + index });
    
    // Add actions as separate context if available
    if (meeting.actions && meeting.actions.length > 0) {
      const actionsText = `Meeting Actions for ${meeting.eventTitle ?? "(no title)"}: \n${meeting.actions.map(action =>
        `- ${action.description} (Assigned to: ${action.assignedTo}, Status: ${action.status})`
      ).join('\n')}`;
      contexts.push({ text: actionsText, score: 0, index: notes.length + meetings.length + index });
    }
  });

  conversations.forEach((conv, index) => {
    let convText = "Past Conversation:\n";
    conv.messages.forEach((msg: { role: string; content: string }) => {
      convText += `${msg.role}: ${msg.content}\n`;
    });
    contexts.push({ text: convText, score: 0, index: notes.length + meetings.length * 2 + index });
  });

  // Compute similarity scores in parallel
  const queryEmbedding = await queryEmbeddingPromise;
  
  // Process in batches to avoid rate limits (5 at a time)
  const batchSize = 5;
  for (let i = 0; i < contexts.length; i += batchSize) {
    const batch = contexts.slice(i, i + batchSize);
    const embeddings = await Promise.all(
      batch.map(context => generateEmbedding(context.text))
    );
    
    embeddings.forEach((embedding, j) => {
      if (i + j < contexts.length) {
        contexts[i + j].score = cosineSimilarity(queryEmbedding, embedding);
      }
    });
  }

  // Sort by descending similarity score, with index as tiebreaker for stable sort
  contexts.sort((a, b) => b.score !== a.score ? b.score - a.score : a.index - b.index);

  // Select top 5 relevant contexts
  const topContexts = contexts.slice(0, 5);

  // Aggregate relevant context text
  let contextText = "";
  topContexts.forEach((ctx) => {
    contextText += ctx.text + "\n";
  });

  return contextText;
}