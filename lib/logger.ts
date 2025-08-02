/**
 * Secure Logger Utility
 * Replaces console.log with structured logging and sensitive data filtering
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogContext {
  userId?: string | number;
  email?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  responseSize?: number;
  error?: string;
  action?: string;
  query?: string;
  timeMin?: string;
  timeMax?: string;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  hasIdToken?: boolean;
  accountId?: number;
  provider?: string;
  isDryRun?: boolean;
  batchSize?: number;
  processed?: number;
  encrypted?: number;
  skipped?: number;
  errors?: number;
  hasDecryptedAccessToken?: boolean;
  hasDecryptedRefreshToken?: boolean;
  hasDecryptedIdToken?: boolean;
  stats?: any;
  hasJwtSecret?: boolean;
  hasTokenKey?: boolean;
  hasEncrypted?: boolean;
  hasIv?: boolean;
  hasTag?: boolean;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.level = this.getLogLevel();
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private sanitizeMessage(message: string): string {
    // Remove sensitive patterns
    return message
      .replace(/(password|token|secret|key|auth)[\s]*[:=][\s]*['"]?[^'"\s]+['"]?/gi, '$1: [REDACTED]')
      .replace(/(email)[\s]*[:=][\s]*['"]?[^'"\s@]+@[^'"\s]+\.[^'"\s]+['"]?/gi, 'email: [REDACTED]')
      .replace(/(access_token|refresh_token|id_token)[\s]*[:=][\s]*['"]?[^'"\s]+['"]?/gi, '$1: [REDACTED]')
      .replace(/(jwt|bearer)[\s]*[:=][\s]*['"]?[^'"\s]+['"]?/gi, '$1: [REDACTED]');
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
    return `[${timestamp}] ${level}${contextStr}: ${this.sanitizeMessage(message)}`;
  }

  private log(level: LogLevel, levelName: string, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(levelName, message, context);
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.log(formattedMessage);
        break;
    }
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, 'ERROR', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  // Specialized logging methods
  auth(message: string, context?: LogContext): void {
    this.info(`[AUTH] ${message}`, context);
  }

  api(message: string, context?: LogContext): void {
    this.info(`[API] ${message}`, context);
  }

  security(message: string, context?: LogContext): void {
    this.warn(`[SECURITY] ${message}`, context);
  }

  performance(message: string, context?: LogContext): void {
    this.debug(`[PERF] ${message}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logError = (message: string, context?: LogContext) => logger.error(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logAuth = (message: string, context?: LogContext) => logger.auth(message, context);
export const logApi = (message: string, context?: LogContext) => logger.api(message, context);
export const logSecurity = (message: string, context?: LogContext) => logger.security(message, context);
export const logPerformance = (message: string, context?: LogContext) => logger.performance(message, context);