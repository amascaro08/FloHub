/**
 * Utility functions for handling dates with timezone support
 */

/**
 * Get the current date in YYYY-MM-DD format using the user's timezone
 * @param timezone The user's timezone (e.g., "America/New_York")
 * @returns The current date in YYYY-MM-DD format
 */
export function getCurrentDate(timezone?: string): string {
  if (!timezone) {
    // Default to browser's timezone if none provided
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  
  // Get current date in the specified timezone
  const now = new Date();
  
  // Create a formatter that will give us date parts in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
    hour12: false
  });
  
  // Get the parts
  const parts = formatter.formatToParts(now);
  
  // Extract year, month, and day from the parts
  const year = parts.find(part => part.type === 'year')?.value || '';
  const month = parts.find(part => part.type === 'month')?.value || '';
  const day = parts.find(part => part.type === 'day')?.value || '';
  
  // Format as YYYY-MM-DD
  return `${year}-${month}-${day}`;
}

/**
 * Format a date string using the user's timezone
 * @param dateStr The date string to format (YYYY-MM-DD)
 * @param timezone The user's timezone
 * @param options Intl.DateTimeFormatOptions
 * @returns The formatted date string
 */
export function formatDate(
  dateStr: string, 
  timezone?: string,
  options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric' 
  }
): string {
  if (!timezone) {
    // Default to browser's timezone if none provided
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    ...options,
    timeZone: timezone
  });
}

/**
 * Check if a date string is today in the user's timezone
 * @param dateStr The date string to check (YYYY-MM-DD)
 * @param timezone The user's timezone
 * @returns True if the date is today, false otherwise
 */
export function isToday(dateStr: string, timezone?: string): boolean {
  const today = getCurrentDate(timezone);
  return dateStr === today;
}

/**
 * Get a storage key with the current date in the user's timezone
 * @param prefix The prefix for the storage key
 * @param email The user's email
 * @param timezone The user's timezone
 * @param date Optional specific date to use (defaults to today)
 * @returns The storage key with the date
 */
export function getDateStorageKey(
  prefix: string,
  email: string,
  timezone?: string,
  date?: string
): string {
  const dateToUse = date || getCurrentDate(timezone);
  return `${prefix}_${email}_${dateToUse}`;
}