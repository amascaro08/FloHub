// lib/assistant.ts

// This function should only be called from server-side code
export default async function chatWithFloCat(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string> {
  // Check if we're on the server side
  if (typeof window !== 'undefined') {
    console.error('chatWithFloCat should only be called from server-side code');
    return "Error: This function can only be used on the server side.";
  }

  try {
    // Make a request to our API endpoint instead of using OpenAI directly
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.reply || "Sorry, I couldn't process that request.";
  } catch (error) {
    console.error('Error in chatWithFloCat:', error);
    return "Sorry, there was an error processing your request.";
  }
}
