// lib/floCatCapabilities.ts

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

// Import capabilities from specific widget configurations
// Example: Importing capabilities from the TaskWidget
// import { taskFloCatCapabilities } from '../components/widgets/TaskWidget/floCatConfig';
// import { meetingFloCatCapabilities } from '../components/meetings/floCatConfig'; // Assuming meetings also has a config

export const floCatCapabilities: FloCatCapability[] = [
  // Spread the imported capabilities into the main array
  // ...(taskFloCatCapabilities || []),
  // ...(meetingFloCatCapabilities || []),

  // Add any core FloCat capabilities here if needed
];

/**
 * Finds the best matching capability and command for a given user input.
 * @param userInput The user's input string.
 * @returns An object containing the matched capability, command, and arguments, or null if no match is found.
 */
export function findMatchingCapability(userInput: string): { capability: FloCatCapability; command: string; args: string } | null {
  const lowerInput = userInput.toLowerCase();

  for (const capability of floCatCapabilities) {
    // Check for trigger phrases first
    const matchingPhrase = capability.triggerPhrases.find(phrase => lowerInput.includes(phrase.toLowerCase()));

    if (matchingPhrase) {
      // If a trigger phrase is found, try to match a command
      for (const command of capability.supportedCommands) {
        // Simple check: does the input contain the command after the trigger phrase?
        // This can be made more sophisticated with regex or fuzzy matching later.
        if (lowerInput.includes(command.toLowerCase(), lowerInput.indexOf(matchingPhrase.toLowerCase()))) {
           // Extract arguments (simple approach: everything after the command)
           const commandIndex = lowerInput.indexOf(command.toLowerCase(), lowerInput.indexOf(matchingPhrase.toLowerCase()));
           const args = userInput.substring(commandIndex + command.length).trim();

          return { capability, command, args };
        }
      }
       // If a trigger phrase is found but no command, maybe default to a primary command or ask for clarification
       // For now, we'll just continue searching other capabilities
    }
  }

  return null; // No matching capability found
}