/**
 * Sanitized Logger Utility
 * 
 * This utility provides logging functions that automatically sanitize
 * personal information to prevent data exposure in console logs.
 */

// Types of sensitive data patterns to sanitize
const SENSITIVE_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  TOKEN: /(?:token|access|refresh|bearer)\s*[:=]\s*['"]*([a-zA-Z0-9_.-]{20,})['"]*\s*/gi,
  PASSWORD: /(?:password|pwd|pass)\s*[:=]\s*['"]*([^'"\\s]{6,})['"]*\s*/gi,
  API_KEY: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]*([a-zA-Z0-9_.-]{20,})['"]*\s*/gi,
  AUTHORIZATION: /authorization\s*:\s*['"]*bearer\s+([a-zA-Z0-9_.-]+)['"]*\s*/gi,
  JWT: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]+/g,
  CREDIT_CARD: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  PHONE: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
  SSN: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  USER_ID: /(?:user[_-]?id|userid)\s*[:=]\s*['"]*([a-zA-Z0-9_.-]{8,})['"]*\s*/gi,
};

// Sanitization functions
function sanitizeEmail(text: string): string {
  return text.replace(SENSITIVE_PATTERNS.EMAIL, '[EMAIL_SANITIZED]');
}

function sanitizeToken(text: string): string {
  return text.replace(SENSITIVE_PATTERNS.TOKEN, (match, token) => {
    return match.replace(token, '[TOKEN_SANITIZED]');
  });
}

function sanitizePassword(text: string): string {
  return text.replace(SENSITIVE_PATTERNS.PASSWORD, (match, password) => {
    return match.replace(password, '[PASSWORD_SANITIZED]');
  });
}

function sanitizeApiKey(text: string): string {
  return text.replace(SENSITIVE_PATTERNS.API_KEY, (match, key) => {
    return match.replace(key, '[API_KEY_SANITIZED]');
  });
}

function sanitizeAuthorization(text: string): string {
  return text.replace(SENSITIVE_PATTERNS.AUTHORIZATION, (match, token) => {
    return match.replace(token, '[AUTH_TOKEN_SANITIZED]');
  });
}

function sanitizeJWT(text: string): string {
  return text.replace(SENSITIVE_PATTERNS.JWT, '[JWT_SANITIZED]');
}

function sanitizeCreditCard(text: string): string {
  return text.replace(SENSITIVE_PATTERNS.CREDIT_CARD, '[CREDIT_CARD_SANITIZED]');
}

function sanitizePhone(text: string): string {
  return text.replace(SENSITIVE_PATTERNS.PHONE, '[PHONE_SANITIZED]');
}

function sanitizeSSN(text: string): string {
  return text.replace(SENSITIVE_PATTERNS.SSN, '[SSN_SANITIZED]');
}

function sanitizeUserId(text: string): string {
  return text.replace(SENSITIVE_PATTERNS.USER_ID, (match, id) => {
    return match.replace(id, '[USER_ID_SANITIZED]');
  });
}

/**
 * Sanitizes a string by removing or masking sensitive information
 */
function sanitizeString(input: string): string {
  let sanitized = input;
  
  // Apply all sanitization functions
  sanitized = sanitizeEmail(sanitized);
  sanitized = sanitizeToken(sanitized);
  sanitized = sanitizePassword(sanitized);
  sanitized = sanitizeApiKey(sanitized);
  sanitized = sanitizeAuthorization(sanitized);
  sanitized = sanitizeJWT(sanitized);
  sanitized = sanitizeCreditCard(sanitized);
  sanitized = sanitizePhone(sanitized);
  sanitized = sanitizeSSN(sanitized);
  sanitized = sanitizeUserId(sanitized);
  
  return sanitized;
}

/**
 * Sanitizes any value (string, object, array, etc.)
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    
    // Handle objects
    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      // Check if the key itself suggests sensitive data
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('password') || 
          lowerKey.includes('token') || 
          lowerKey.includes('secret') || 
          lowerKey.includes('key') || 
          lowerKey.includes('email') ||
          lowerKey.includes('user_email') ||
          lowerKey.includes('refresh') ||
          lowerKey.includes('access')) {
        sanitized[key] = '[SANITIZED]';
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }
    return sanitized;
  }
  
  return value;
}

/**
 * Sanitized logger class that wraps console methods
 */
export class SanitizedLogger {
  private static sanitizeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return sanitizeString(arg);
      }
      return sanitizeValue(arg);
    });
  }

  static log(...args: any[]): void {
    const sanitizedArgs = this.sanitizeArgs(args);
    console.log(...sanitizedArgs);
  }

  static error(...args: any[]): void {
    const sanitizedArgs = this.sanitizeArgs(args);
    console.error(...sanitizedArgs);
  }

  static warn(...args: any[]): void {
    const sanitizedArgs = this.sanitizeArgs(args);
    console.warn(...sanitizedArgs);
  }

  static info(...args: any[]): void {
    const sanitizedArgs = this.sanitizeArgs(args);
    console.info(...sanitizedArgs);
  }

  static debug(...args: any[]): void {
    const sanitizedArgs = this.sanitizeArgs(args);
    console.debug(...sanitizedArgs);
  }

  /**
   * Utility function to sanitize a specific email for logging
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '[EMPTY_EMAIL]';
    return '[EMAIL_SANITIZED]';
  }

  /**
   * Utility function to sanitize a user object for logging
   */
  static sanitizeUser(user: any): any {
    if (!user) return '[NO_USER]';
    
    return {
      id: '[USER_ID_SANITIZED]',
      name: user.name ? '[NAME_PRESENT]' : '[NO_NAME]',
      email: '[EMAIL_SANITIZED]',
      hasAccounts: Array.isArray(user.accounts) ? user.accounts.length > 0 : false,
      accountCount: Array.isArray(user.accounts) ? user.accounts.length : 0,
    };
  }

  /**
   * Utility function to sanitize tokens for logging
   */
  static sanitizeToken(token: string | null | undefined): string {
    if (!token) return '[NO_TOKEN]';
    return '[TOKEN_SANITIZED]';
  }

  /**
   * Creates a sanitized version of user settings for logging
   */
  static sanitizeUserSettings(settings: any): any {
    if (!settings) return '[NO_SETTINGS]';
    
    return {
      hasSelectedCals: Array.isArray(settings.selectedCals) && settings.selectedCals.length > 0,
      selectedCalsCount: Array.isArray(settings.selectedCals) ? settings.selectedCals.length : 0,
      defaultView: settings.defaultView || '[NOT_SET]',
      hasCustomActivities: Array.isArray(settings.journalCustomActivities) && settings.journalCustomActivities.length > 0,
      customActivitiesCount: Array.isArray(settings.journalCustomActivities) ? settings.journalCustomActivities.length : 0,
      theme: settings.theme || '[NOT_SET]',
      hasActiveWidgets: Array.isArray(settings.activeWidgets) && settings.activeWidgets.length > 0,
      activeWidgetsCount: Array.isArray(settings.activeWidgets) ? settings.activeWidgets.length : 0,
    };
  }
}

// Default export for convenience
export default SanitizedLogger;

// Named exports for direct function access
export {
  sanitizeString,
  sanitizeValue,
  sanitizeEmail,
  sanitizeToken,
  sanitizePassword,
  sanitizeApiKey,
  sanitizeAuthorization,
  sanitizeJWT,
  sanitizeCreditCard,
  sanitizePhone,
  sanitizeSSN,
  sanitizeUserId,
};