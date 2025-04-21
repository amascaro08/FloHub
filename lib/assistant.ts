// lib/assistant.ts

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Send a chat‑style conversation to OpenAI and return FloCat’s reply.
 *
 * @param messages - an array of { role, content } objects,
 *                   where role is "system" | "user" | "assistant"
 */
export default async function chatWithFloCat(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string> {
  // You can override the model via env; otherwise use gpt-3.5-turbo
  const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });

  // content may be null, so coalesce to empty string
  return completion.choices[0].message.content ?? "";
}
