import crypto from 'crypto';

// Configuration for content encryption
const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits

// Environment variable for encryption key
const getEncryptionKey = (): Buffer => {
  const key = process.env.CONTENT_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('CONTENT_ENCRYPTION_KEY environment variable is required');
  }
  // Derive a consistent key from the secret
  return crypto.pbkdf2Sync(key, 'flohub-content-salt', 100000, KEY_LENGTH, 'sha256');
};

interface EncryptedContent {
  data: string;
  iv: string;
  isEncrypted: boolean;
}

/**
 * Encrypt sensitive user content
 */
export const encryptContent = (content: string): EncryptedContent => {
  if (!content || content.trim() === '') {
    return {
      data: content,
      iv: '',
      isEncrypted: false
    };
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      data: encrypted,
      iv: iv.toString('hex'),
      isEncrypted: true
    };
  } catch (error) {
    console.error('Content encryption failed:', error);
    // Fallback to unencrypted if encryption fails
    return {
      data: content,
      iv: '',
      isEncrypted: false
    };
  }
};

/**
 * Decrypt sensitive user content
 */
export const decryptContent = (encryptedData: EncryptedContent | string): string => {
  // Handle legacy unencrypted content (backward compatibility)
  if (typeof encryptedData === 'string') {
    return encryptedData;
  }

  // Handle unencrypted content marked as such
  if (!encryptedData.isEncrypted || !encryptedData.data) {
    return encryptedData.data || '';
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Content decryption failed:', error);
    // Return the raw data if decryption fails (might be corrupted or legacy format)
    return encryptedData.data || '';
  }
};

/**
 * Check if content is encrypted
 */
export const isContentEncrypted = (content: any): boolean => {
  return typeof content === 'object' && 
         content !== null && 
         content.isEncrypted === true &&
         typeof content.data === 'string' &&
         typeof content.iv === 'string';
};

/**
 * Safely handle content that might be encrypted or plain text
 */
export const safeDecryptContent = (content: any): string => {
  if (typeof content === 'string') {
    return content;
  }
  
  if (isContentEncrypted(content)) {
    return decryptContent(content);
  }
  
  // Handle edge cases
  if (content === null || content === undefined) {
    return '';
  }
  
  // If it's an object but not encrypted, try to stringify it
  if (typeof content === 'object') {
    try {
      return JSON.stringify(content);
    } catch {
      return '';
    }
  }
  
  return String(content);
};

/**
 * Prepare content for database storage
 */
export const prepareContentForStorage = (content: string): string => {
  const encrypted = encryptContent(content);
  return JSON.stringify(encrypted);
};

/**
 * Retrieve content from database storage
 */
export const retrieveContentFromStorage = (storedContent: string): string => {
  if (!storedContent) {
    return '';
  }
  
  try {
    const parsed = JSON.parse(storedContent);
    return safeDecryptContent(parsed);
  } catch {
    // If parsing fails, treat as legacy plain text
    return storedContent;
  }
};

/**
 * Generate a hash for content indexing (for search, etc.)
 * This is a one-way hash that can't be decrypted
 */
export const generateContentHash = (content: string): string => {
  if (!content || content.trim() === '') {
    return '';
  }
  
  return crypto.createHash('sha256').update(content.trim().toLowerCase()).digest('hex');
};

/**
 * Migration utility to convert existing plain text content to encrypted
 */
export const migrateContentToEncrypted = (plainTextContent: string): string => {
  if (!plainTextContent) {
    return plainTextContent;
  }
  
  // Check if already encrypted
  try {
    const parsed = JSON.parse(plainTextContent);
    if (isContentEncrypted(parsed)) {
      return plainTextContent; // Already encrypted
    }
  } catch {
    // Not JSON, treat as plain text
  }
  
  // Encrypt the plain text content
  return prepareContentForStorage(plainTextContent);
};