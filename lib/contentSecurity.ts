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
 * Encrypt array of strings (for tags, activities, etc.)
 */
export const encryptArray = (array: string[]): EncryptedContent => {
  if (!array || array.length === 0) {
    return {
      data: JSON.stringify([]),
      iv: '',
      isEncrypted: false
    };
  }

  try {
    const serialized = JSON.stringify(array);
    return encryptContent(serialized);
  } catch (error) {
    console.error('Array encryption failed:', error);
    return {
      data: JSON.stringify(array),
      iv: '',
      isEncrypted: false
    };
  }
};

/**
 * Decrypt array of strings
 */
export const decryptArray = (encryptedData: EncryptedContent | string[]): string[] => {
  // Handle legacy unencrypted arrays
  if (Array.isArray(encryptedData)) {
    return encryptedData;
  }

  try {
    const decrypted = decryptContent(encryptedData as EncryptedContent);
    if (!decrypted) return [];
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Array decryption failed:', error);
    return [];
  }
};

/**
 * Encrypt JSONB data (for complex objects)
 */
export const encryptJSONB = (data: any): EncryptedContent => {
  if (!data) {
    return {
      data: JSON.stringify(null),
      iv: '',
      isEncrypted: false
    };
  }

  try {
    const serialized = JSON.stringify(data);
    return encryptContent(serialized);
  } catch (error) {
    console.error('JSONB encryption failed:', error);
    return {
      data: JSON.stringify(data),
      iv: '',
      isEncrypted: false
    };
  }
};

/**
 * Decrypt JSONB data
 */
export const decryptJSONB = (encryptedData: EncryptedContent | any): any => {
  // Handle legacy unencrypted objects
  if (typeof encryptedData === 'object' && !encryptedData?.isEncrypted) {
    return encryptedData;
  }

  try {
    const decrypted = decryptContent(encryptedData as EncryptedContent);
    if (!decrypted) return null;
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('JSONB decryption failed:', error);
    return encryptedData;
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
 * Safely handle arrays that might be encrypted or plain arrays
 */
export const safeDecryptArray = (content: any): string[] => {
  if (Array.isArray(content)) {
    return content;
  }
  
  if (isContentEncrypted(content)) {
    return decryptArray(content);
  }
  
  return [];
};

/**
 * Safely handle JSONB that might be encrypted or plain objects
 */
export const safeDecryptJSONB = (content: any): any => {
  console.log('safeDecryptJSONB input:', content);
  console.log('isContentEncrypted:', isContentEncrypted(content));
  
  if (isContentEncrypted(content)) {
    const decrypted = decryptJSONB(content);
    console.log('safeDecryptJSONB decrypted:', decrypted);
    return decrypted;
  }
  
  console.log('safeDecryptJSONB returning content as-is:', content);
  return content;
};

/**
 * Prepare content for database storage
 */
export const prepareContentForStorage = (content: string): string => {
  const encrypted = encryptContent(content);
  return JSON.stringify(encrypted);
};

/**
 * Prepare array for database storage
 */
export const prepareArrayForStorage = (array: string[]): string => {
  const encrypted = encryptArray(array);
  return JSON.stringify(encrypted);
};

/**
 * Prepare JSONB for database storage
 */
export const prepareJSONBForStorage = (data: any): string => {
  const encrypted = encryptJSONB(data);
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
 * Retrieve array from database storage
 */
export const retrieveArrayFromStorage = (storedArray: string): string[] => {
  if (!storedArray) {
    return [];
  }
  
  try {
    const parsed = JSON.parse(storedArray);
    return safeDecryptArray(parsed);
  } catch {
    // If parsing fails, treat as legacy plain array
    try {
      return JSON.parse(storedArray);
    } catch {
      return [];
    }
  }
};

/**
 * Retrieve JSONB from database storage
 */
export const retrieveJSONBFromStorage = (storedData: string): any => {
  console.log('retrieveJSONBFromStorage input:', storedData);
  
  if (!storedData) {
    console.log('retrieveJSONBFromStorage: no data, returning null');
    return null;
  }
  
  try {
    const parsed = JSON.parse(storedData);
    console.log('retrieveJSONBFromStorage parsed:', parsed);
    const result = safeDecryptJSONB(parsed);
    console.log('retrieveJSONBFromStorage result:', result);
    return result;
  } catch (error) {
    console.log('retrieveJSONBFromStorage parse error:', error);
    // If parsing fails, treat as legacy plain object
    try {
      const legacyResult = JSON.parse(storedData);
      console.log('retrieveJSONBFromStorage legacy result:', legacyResult);
      return legacyResult;
    } catch (legacyError) {
      console.log('retrieveJSONBFromStorage legacy parse error:', legacyError);
      return null;
    }
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

/**
 * Migration utility to convert existing plain array to encrypted
 */
export const migrateArrayToEncrypted = (plainArray: string[] | string): string => {
  if (!plainArray) {
    return JSON.stringify([]);
  }
  
  // If it's already a string, check if it's encrypted
  if (typeof plainArray === 'string') {
    try {
      const parsed = JSON.parse(plainArray);
      if (isContentEncrypted(parsed)) {
        return plainArray; // Already encrypted
      }
      // If it's a valid array, encrypt it
      if (Array.isArray(parsed)) {
        return prepareArrayForStorage(parsed);
      }
    } catch {
      // Not valid JSON, return empty array
      return prepareArrayForStorage([]);
    }
  }
  
  // If it's an array, encrypt it
  if (Array.isArray(plainArray)) {
    return prepareArrayForStorage(plainArray);
  }
  
  return prepareArrayForStorage([]);
};

/**
 * Migration utility to convert existing plain JSONB to encrypted
 */
export const migrateJSONBToEncrypted = (plainData: any): string => {
  if (!plainData) {
    return JSON.stringify(null);
  }
  
  // If it's already a string, check if it's encrypted
  if (typeof plainData === 'string') {
    try {
      const parsed = JSON.parse(plainData);
      if (isContentEncrypted(parsed)) {
        return plainData; // Already encrypted
      }
      // Encrypt the parsed data
      return prepareJSONBForStorage(parsed);
    } catch {
      // Not valid JSON, return null
      return prepareJSONBForStorage(null);
    }
  }
  
  // If it's an object, encrypt it
  return prepareJSONBForStorage(plainData);
};

/**
 * Utility to encrypt user settings fields
 */
export const encryptUserSettingsFields = (settings: any) => {
  console.log('encryptUserSettingsFields input:', settings);
  const encrypted = { ...settings };
  
  if (settings.preferredName) {
    encrypted.preferredName = prepareContentForStorage(settings.preferredName);
  }
  
  if (settings.globalTags) {
    encrypted.globalTags = prepareArrayForStorage(settings.globalTags);
  }
  
  if (settings.tags) {
    encrypted.tags = prepareArrayForStorage(settings.tags);
  }
  
  if (settings.journalCustomActivities) {
    console.log('Encrypting journalCustomActivities:', settings.journalCustomActivities);
    encrypted.journalCustomActivities = prepareJSONBForStorage(settings.journalCustomActivities);
    console.log('Encrypted journalCustomActivities:', encrypted.journalCustomActivities);
  }
  
  console.log('encryptUserSettingsFields output:', encrypted);
  return encrypted;
};

/**
 * Utility to decrypt user settings fields
 */
export const decryptUserSettingsFields = (settings: any) => {
  console.log('decryptUserSettingsFields input:', settings);
  const decrypted = { ...settings };
  
  if (settings.preferredName) {
    decrypted.preferredName = retrieveContentFromStorage(settings.preferredName);
  }
  
  if (settings.globalTags) {
    decrypted.globalTags = retrieveArrayFromStorage(settings.globalTags);
  }
  
  if (settings.tags) {
    decrypted.tags = retrieveArrayFromStorage(settings.tags);
  }
  
  if (settings.journalCustomActivities) {
    console.log('Decrypting journalCustomActivities:', settings.journalCustomActivities);
    decrypted.journalCustomActivities = retrieveJSONBFromStorage(settings.journalCustomActivities);
    console.log('Decrypted journalCustomActivities:', decrypted.journalCustomActivities);
  }
  
  console.log('decryptUserSettingsFields output:', decrypted);
  return decrypted;
};