import { CalendarSource, UserSettings } from "@/types/app";
import { calendarCache } from './calendarCache';

/**
 * Generate a hash string from calendar sources to detect changes
 */
export const generateCalendarSourcesHash = (calendarSources?: CalendarSource[]): string => {
  if (!calendarSources || calendarSources.length === 0) {
    return 'empty';
  }
  
  // Sort sources by ID to ensure consistent ordering
  const sortedSources = [...calendarSources].sort((a, b) => a.id.localeCompare(b.id));
  
  // Create hash based on enabled sources only
  const enabledSources = sortedSources.filter(source => source.isEnabled);
  const hashInput = enabledSources.map(source => 
    `${source.id}:${source.type}:${source.sourceId}:${source.isEnabled}:${(source.tags || []).join(',')}`
  ).join('|');
  
  // Simple hash function (you could use a more robust one if needed)
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString();
};

/**
 * Clear all calendar-related caches
 */
// DEPRECATED: Use clearCalendarCaches with userEmail parameter instead
export const clearAllCalendarCaches = async (userEmail?: string): Promise<void> => {
  console.warn('clearAllCalendarCaches is deprecated. Use clearCalendarCaches with userEmail parameter.');
  
  if (!userEmail) {
    console.error('userEmail is required for cache clearing to maintain user privacy');
    return;
  }
  
  return clearCalendarCaches(userEmail);
};

/**
 * Extract Microsoft Teams meeting links from event description
 */
export const extractTeamsLinks = (description: string): string[] => {
  if (!description) return [];
  
  // Common patterns for Teams meeting links - comprehensive patterns
  const patterns = [
    // Direct Teams links without HTML
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"'<>]+/gi,
    /https:\/\/teams\.live\.com\/meet\/[^\s"'<>]+/gi,
    // Teams links in HTML anchors
    /(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^"'<>\s]+)/gi,
    /(https:\/\/teams\.live\.com\/meet\/[^"'<>\s]+)/gi,
    // Teams links with various protocols
    /https:\/\/[a-z0-9-]+\.teams\.microsoft\.com\/[^\s"'<>]+/gi,
    // Alternative Teams meeting patterns
    /https:\/\/teams\.microsoft\.com\/[^\s"'<>]+/gi
  ];
  
  const links: string[] = [];
  
  for (const pattern of patterns) {
    pattern.lastIndex = 0; // Reset regex state
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const url = match[1] || match[0];
      const cleanUrl = url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      if (!links.includes(cleanUrl)) {
        links.push(cleanUrl);
      }
    }
  }
  
  return links;
};

/**
 * Extract first Microsoft Teams meeting link from event description
 */
export const extractTeamsLink = (description: string): string | null => {
  const links = extractTeamsLinks(description);
  return links.length > 0 ? links[0] : null;
};

// Function to clear all calendar caches when sources change - USER SCOPED
export const clearCalendarCaches = async (userEmail: string): Promise<void> => {
  console.log(`Clearing calendar caches for user: ${userEmail}`);
  
  try {
    // Clear localStorage calendar cache - USER SCOPED
    const localKeys = Object.keys(localStorage);
    localKeys.forEach(key => {
      if (key.startsWith('calendar_') || key.startsWith('events_') || key.startsWith('cache:')) {
        // Only clear if it belongs to this user or is not user-scoped (legacy)
        if (key.includes(userEmail) || !key.includes('@')) {
          localStorage.removeItem(key);
        }
      }
    });

    // Clear IndexedDB cache - USER SCOPED
    await calendarCache.clearAllCache(userEmail);
    
    console.log(`✅ Cleared all calendar caches for user: ${userEmail}`);
  } catch (error) {
    console.error(`❌ Error clearing calendar caches for user ${userEmail}:`, error);
  }
};

// Updated function with user context
export const updateCalendarSources = async (
  userSettings: UserSettings, 
  newSources: CalendarSource[],
  userEmail: string
): Promise<UserSettings> => {
  const updatedSettings = {
    ...userSettings,
    calendarSources: newSources
  };

  // Clear caches when sources change - USER SCOPED
  await clearCalendarCaches(userEmail);

  return updatedSettings;
};