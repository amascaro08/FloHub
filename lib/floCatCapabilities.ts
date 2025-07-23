// lib/floCatCapabilities.ts
import { habitCapability } from './capabilities/habitCapability';
import { taskCapability } from './capabilities/taskCapability';

/**
 * Defines the structure for a FloCat capability.
 */
export interface FloCatCapability {
  featureName: string;
  supportedCommands: string[]; // e.g., "add", "show", "summarize"
  triggerPhrases: string[]; // Phrases that trigger this capability, e.g., ["create task", "add new task"]
  handler: (command: string, args: string) => Promise<string>; // Function to handle the command execution
}

/**
 * The registry of all available FloCat capabilities.
 * New features should register their capabilities here by adding their config file import.
 */

// Register all capabilities here
export const floCatCapabilities: FloCatCapability[] = [
  habitCapability,
  taskCapability,
  // Add more capabilities as they are developed
];

/**
 * Finds the best matching capability and command for a given user input.
 * This is a safe version that can be used on both client and server.
 * @param userInput The user's input string.
 * @returns An object containing the matched capability, command, and arguments, or null if no match is found.
 */
export function findMatchingCapability(userInput: string): { capability: FloCatCapability; command: string; args: string } | null {
  // If we're on the client side, just return null to avoid errors
  if (typeof window !== 'undefined') {
    // In a real implementation, we would make an API call to a server endpoint
    // that would handle the capability matching
    console.log("Client-side capability matching is not supported");
    return null;
  }
  
  const lowerInput = userInput.toLowerCase().trim();
  console.log(`[DEBUG] Matching capability for input: "${userInput}"`);

  for (const capability of floCatCapabilities) {
    console.log(`[DEBUG] Checking capability: ${capability.featureName}`);
    
    // Flexible matching for common variations (check this first for better results)
    if (capability.featureName === "Task Management") {
      // Handle variations like "add a task", "create new task", etc.
      if ((lowerInput.includes("add") || lowerInput.includes("create") || lowerInput.includes("new") || lowerInput.includes("make")) && 
          (lowerInput.includes("task"))) {
        const command = "add";
        const args = extractTaskFromInput(userInput);
        console.log(`[DEBUG] Task add match found. Args: "${args}"`);
        return { capability, command, args };
      }
      
      // Handle "my tasks", "show tasks", "list tasks"
      if ((lowerInput.includes("my") || lowerInput.includes("show") || lowerInput.includes("list")) && 
          lowerInput.includes("task")) {
        const command = "list";
        const args = "";
        console.log(`[DEBUG] Task list match found`);
        return { capability, command, args };
      }
    }
    
    // Check for trigger phrases with more flexible matching
    for (const phrase of capability.triggerPhrases) {
      const lowerPhrase = phrase.toLowerCase();
      
      // Direct match
      if (lowerInput.includes(lowerPhrase)) {
        const command = extractCommandFromPhrase(phrase);
        const args = extractArgsAfterPhrase(userInput, phrase);
        console.log(`[DEBUG] Direct phrase match: "${phrase}", command: ${command}, args: "${args}"`);
        return { capability, command, args };
      }
    }
  }

  return null; // No matching capability found
}

function extractCommandFromPhrase(phrase: string): string {
  const words = phrase.toLowerCase().split(' ');
  return words[0]; // First word is usually the command
}

function extractArgsAfterPhrase(userInput: string, phrase: string): string {
  const lowerInput = userInput.toLowerCase();
  const lowerPhrase = phrase.toLowerCase();
  const phraseIndex = lowerInput.indexOf(lowerPhrase);
  
  if (phraseIndex !== -1) {
    return userInput.substring(phraseIndex + phrase.length).trim();
  }
  
  return "";
}

function extractTaskFromInput(userInput: string): string {
  const lowerInput = userInput.toLowerCase();
  
  // Common patterns to look for
  const patterns = [
    /add\s+(?:a\s+)?task:?\s*(.+)/i,
    /create\s+(?:a\s+)?task:?\s*(.+)/i,
    /new\s+task:?\s*(.+)/i,
    /make\s+(?:a\s+)?task:?\s*(.+)/i,
    /add\s+(.+?)\s+(?:to\s+)?(?:my\s+)?(?:task\s+)?list/i,
    /task:?\s*(.+)/i
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const match = userInput.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: remove common command words and extract the rest
  let taskText = userInput;
  const commandWords = ["add", "create", "new", "make", "a", "an", "the", "task", "todo", "item"];
  
  let words = taskText.split(' ');
  let startIndex = 0;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase();
    if (!commandWords.includes(word) && word !== ':') {
      startIndex = i;
      break;
    }
  }
  
  const result = words.slice(startIndex).join(' ').trim();
  return result.replace(/^(task:?|todo:?|item:?)\s*/i, '').trim();
}