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
  
  const lowerInput = userInput.toLowerCase();

  for (const capability of floCatCapabilities) {
    // Check for trigger phrases first
    const matchingPhrase = capability.triggerPhrases.find(phrase => lowerInput.includes(phrase.toLowerCase()));

    if (matchingPhrase) {
      // If a trigger phrase is found, try to match a command
      for (const command of capability.supportedCommands) {
        // Simple check: does the input contain the command after the trigger phrase?
        if (lowerInput.includes(command.toLowerCase(), lowerInput.indexOf(matchingPhrase.toLowerCase()))) {
           // Extract arguments (simple approach: everything after the command)
           const commandIndex = lowerInput.indexOf(command.toLowerCase(), lowerInput.indexOf(matchingPhrase.toLowerCase()));
           const args = userInput.substring(commandIndex + command.length).trim();

          return { capability, command, args };
        }
      }
    }
  }

  return null; // No matching capability found
}