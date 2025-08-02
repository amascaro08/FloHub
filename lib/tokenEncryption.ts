import crypto from 'crypto';
import { logger } from './logger';

/**
 * Token Encryption Utilities
 * Encrypts OAuth tokens and session tokens before database storage
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits for GCM

interface EncryptedToken {
  encrypted: string;
  iv: string;
  tag: string;
  version: string;
}

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  
  if (!key) {
    logger.security('Token encryption key missing', { 
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasTokenKey: !!process.env.TOKEN_ENCRYPTION_KEY 
    });
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
  }
  
  // Derive a consistent key from the secret
  return crypto.pbkdf2Sync(key, 'flohub-token-salt', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a token (OAuth or session)
 */
export function encryptToken(token: string): string {
  if (!token || token.trim() === '') {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    const result: EncryptedToken = {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      version: '1'
    };
    
    return JSON.stringify(result);
  } catch (error) {
    logger.error('Token encryption failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt a token (OAuth or session)
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData || encryptedData.trim() === '') {
    return '';
  }

  try {
    // Handle legacy unencrypted tokens
    if (!encryptedData.startsWith('{')) {
      return encryptedData;
    }

    const data: EncryptedToken = JSON.parse(encryptedData);
    
    if (!data.encrypted || !data.iv || !data.tag) {
      logger.warn('Invalid encrypted token format', { hasEncrypted: !!data.encrypted, hasIv: !!data.iv, hasTag: !!data.tag });
      return encryptedData; // Return as-is for backward compatibility
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(data.iv, 'hex');
    const tag = Buffer.from(data.tag, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Token decryption failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    // Return original data for backward compatibility
    return encryptedData;
  }
}

/**
 * Hash a session token for storage
 */
export function hashSessionToken(token: string): string {
  if (!token || token.trim() === '') {
    return '';
  }

  try {
    const salt = process.env.SESSION_SALT || process.env.JWT_SECRET || 'default-session-salt';
    return crypto.pbkdf2Sync(token, salt, 100000, 64, 'sha256').toString('hex');
  } catch (error) {
    logger.error('Session token hashing failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new Error('Failed to hash session token');
  }
}

/**
 * Verify a session token hash
 */
export function verifySessionToken(token: string, hash: string): boolean {
  if (!token || !hash) {
    return false;
  }

  try {
    const salt = process.env.SESSION_SALT || process.env.JWT_SECRET || 'default-session-salt';
    const computedHash = crypto.pbkdf2Sync(token, salt, 100000, 64, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  } catch (error) {
    logger.error('Session token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

/**
 * Encrypt OAuth tokens for accounts table
 */
export function encryptOAuthTokens(tokens: {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
}): {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
} {
  const encrypted: any = {};
  
  if (tokens.access_token) {
    encrypted.access_token = encryptToken(tokens.access_token);
  }
  
  if (tokens.refresh_token) {
    encrypted.refresh_token = encryptToken(tokens.refresh_token);
  }
  
  if (tokens.id_token) {
    encrypted.id_token = encryptToken(tokens.id_token);
  }
  
  return encrypted;
}

/**
 * Decrypt OAuth tokens from accounts table
 */
export function decryptOAuthTokens(tokens: {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
}): {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
} {
  const decrypted: any = {};
  
  if (tokens.access_token) {
    decrypted.access_token = decryptToken(tokens.access_token);
  }
  
  if (tokens.refresh_token) {
    decrypted.refresh_token = decryptToken(tokens.refresh_token);
  }
  
  if (tokens.id_token) {
    decrypted.id_token = decryptToken(tokens.id_token);
  }
  
  return decrypted;
}

/**
 * Migrate existing unencrypted tokens to encrypted format
 */
export function migrateTokensToEncrypted(tokens: {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
}): {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
} {
  const migrated: any = {};
  
  if (tokens.access_token && !tokens.access_token.startsWith('{')) {
    migrated.access_token = encryptToken(tokens.access_token);
  } else if (tokens.access_token) {
    migrated.access_token = tokens.access_token;
  }
  
  if (tokens.refresh_token && !tokens.refresh_token.startsWith('{')) {
    migrated.refresh_token = encryptToken(tokens.refresh_token);
  } else if (tokens.refresh_token) {
    migrated.refresh_token = tokens.refresh_token;
  }
  
  if (tokens.id_token && !tokens.id_token.startsWith('{')) {
    migrated.id_token = encryptToken(tokens.id_token);
  } else if (tokens.id_token) {
    migrated.id_token = tokens.id_token;
  }
  
  return migrated;
}