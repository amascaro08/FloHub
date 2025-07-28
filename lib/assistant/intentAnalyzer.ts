/**
 * Intent analysis utilities for the AI Assistant
 */
import { UserIntent } from './types';

export function analyzeUserIntent(input: string): UserIntent {
  const lowerInput = input.toLowerCase().trim();
  
  // Default intent structure
  const intent: UserIntent = {
    type: 'general',
    category: 'general',
    entities: {},
    confidence: 0.5
  };

  // Analyze intent type
  if (lowerInput.includes('?') || lowerInput.startsWith('what') || lowerInput.startsWith('when') || 
      lowerInput.startsWith('where') || lowerInput.startsWith('who') || lowerInput.startsWith('how') ||
      lowerInput.startsWith('why') || lowerInput.includes('tell me')) {
    intent.type = 'question';
    intent.confidence += 0.2;
  } else if (lowerInput.includes('create') || lowerInput.includes('add') || lowerInput.includes('new') ||
             lowerInput.includes('schedule') || lowerInput.includes('book') || lowerInput.includes('set')) {
    intent.type = 'command';
    intent.action = 'create';
    intent.confidence += 0.3;
  } else if (lowerInput.includes('find') || lowerInput.includes('search') || lowerInput.includes('look for') ||
             lowerInput.includes('show me')) {
    intent.type = 'search';
    intent.action = 'read';
    intent.confidence += 0.2;
  } else if (lowerInput.includes('update') || lowerInput.includes('change') || lowerInput.includes('modify') ||
             lowerInput.includes('edit')) {
    intent.type = 'command';
    intent.action = 'update';
    intent.confidence += 0.2;
  } else if (lowerInput.includes('delete') || lowerInput.includes('remove') || lowerInput.includes('cancel')) {
    intent.type = 'command';
    intent.action = 'delete';
    intent.confidence += 0.2;
  }

  // Analyze category
  if (lowerInput.includes('calendar') || lowerInput.includes('event') || lowerInput.includes('meeting') ||
      lowerInput.includes('appointment') || lowerInput.includes('schedule') || lowerInput.includes('today') ||
      lowerInput.includes('tomorrow') || lowerInput.includes('this week') || lowerInput.includes('next week')) {
    intent.category = 'calendar';
    intent.confidence += 0.2;
  } else if (lowerInput.includes('task') || lowerInput.includes('todo') || lowerInput.includes('remind') ||
             lowerInput.includes('due') || lowerInput.includes('deadline')) {
    intent.category = 'tasks';
    intent.confidence += 0.2;
  } else if (lowerInput.includes('habit') || lowerInput.includes('routine') || lowerInput.includes('daily') ||
             lowerInput.includes('weekly')) {
    intent.category = 'habits';
    intent.confidence += 0.1;
  } else if (lowerInput.includes('note') || lowerInput.includes('notes') || lowerInput.includes('journal') ||
             lowerInput.includes('write down')) {
    intent.category = 'notes';
    intent.confidence += 0.1;
  }

  // Extract time references
  const timePatterns = [
    /\b(today|tonight)\b/i,
    /\b(tomorrow)\b/i,
    /\b(yesterday)\b/i,
    /\b(this week|next week|last week)\b/i,
    /\b(this month|next month|last month)\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(in \d+ days?)\b/i,
    /\b(at \d{1,2}:\d{2})\b/i
  ];

  for (const pattern of timePatterns) {
    const match = input.match(pattern);
    if (match) {
      intent.entities.timeRef = match[1].toLowerCase();
      intent.confidence += 0.1;
      break;
    }
  }

  // Extract task/event descriptions
  if (intent.category === 'tasks') {
    const taskPatterns = [
      /(?:task|todo|remind me to)\s+(.+?)(?:\s+(?:for|due|by)\s+|$)/i,
      /(?:add|create|new)\s+task\s+(.+?)(?:\s+(?:for|due|by)\s+|$)/i
    ];

    for (const pattern of taskPatterns) {
      const match = input.match(pattern);
      if (match) {
        intent.entities.task = match[1].trim();
        intent.confidence += 0.2;
        break;
      }
    }
  } else if (intent.category === 'calendar') {
    const eventPatterns = [
      /(?:event|meeting|appointment)\s+(.+?)(?:\s+(?:on|at|for)\s+|$)/i,
      /(?:schedule|book)\s+(.+?)(?:\s+(?:on|at|for)\s+|$)/i
    ];

    for (const pattern of eventPatterns) {
      const match = input.match(pattern);
      if (match) {
        intent.entities.event = match[1].trim();
        intent.confidence += 0.2;
        break;
      }
    }
  }

  // Extract urgency indicators
  if (lowerInput.includes('urgent') || lowerInput.includes('asap') || lowerInput.includes('immediately')) {
    intent.entities.urgency = 'high';
    intent.confidence += 0.1;
  } else if (lowerInput.includes('soon') || lowerInput.includes('priority')) {
    intent.entities.urgency = 'medium';
    intent.confidence += 0.05;
  }

  // Extract location references
  const locationPatterns = [
    /\b(at|in|from)\s+([A-Za-z\s]+?)(?:\s+(?:on|at|for|with)|$)/i
  ];

  for (const pattern of locationPatterns) {
    const match = input.match(pattern);
    if (match && match[2].length > 2) {
      intent.entities.location = match[2].trim();
      intent.confidence += 0.1;
      break;
    }
  }

  // Normalize confidence to 0-1 range
  intent.confidence = Math.min(intent.confidence, 1.0);

  return intent;
}

// Extract task description from user input based on intent
export function extractTaskFromIntent(userInput: string, intent: UserIntent): string {
  if (intent.entities.task) {
    return intent.entities.task;
  }

  // Fallback extraction patterns
  const patterns = [
    /(?:remind me to|task to|need to)\s+(.+?)(?:\s+(?:for|due|by)\s+|$)/i,
    /(?:add|create|new)\s+(?:task|todo)\s*[:]\s*(.+?)(?:\s+(?:for|due|by)\s+|$)/i,
    /(?:i need to|have to|must)\s+(.+?)(?:\s+(?:for|due|by)\s+|$)/i
  ];

  for (const pattern of patterns) {
    const match = userInput.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // If no specific pattern matches, return the entire input as task
  return userInput.replace(/^(add|create|new|task|todo|remind me to)\s*/i, '').trim();
}