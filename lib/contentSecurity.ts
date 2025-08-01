import crypto from 'crypto';

// Configuration for content encryption
const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits

// Environment variable for encryption key
const getEncryptionKey = (): Buffer => {
  const key = process.env.CONTENT_ENCRYPTION_KEY;
  console.log('ContentSecurity: Checking encryption key...');
  console.log('ContentSecurity: Key exists:', !!key);
  console.log('ContentSecurity: Key length:', key?.length);
  
  if (!key) {
    console.error('ContentSecurity: CONTENT_ENCRYPTION_KEY environment variable is required');
    // In production, we should fail gracefully and log the issue
    if (process.env.NODE_ENV === 'production') {
      console.error('ContentSecurity: Encryption key missing in production - data will not be encrypted');
      // Return a fallback key for development/testing
      const fallbackKey = 'fallback-key-for-missing-encryption-key-in-production';
      return crypto.pbkdf2Sync(fallbackKey, 'flohub-content-salt', 100000, KEY_LENGTH, 'sha256');
    }
    throw new Error('CONTENT_ENCRYPTION_KEY environment variable is required');
  }
  
  // Derive a consistent key from the secret
  const derivedKey = crypto.pbkdf2Sync(key, 'flohub-content-salt', 100000, KEY_LENGTH, 'sha256');
  console.log('ContentSecurity: Derived key length:', derivedKey.length);
  return derivedKey;
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
  console.log('ContentSecurity: encryptContent input:', content);
  
  if (!content || content.trim() === '') {
    console.log('ContentSecurity: encryptContent - empty content, returning unencrypted');
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
    
    const result = {
      data: encrypted,
      iv: iv.toString('hex'),
      isEncrypted: true
    };
    
    console.log('ContentSecurity: encryptContent - encrypted result:', result);
    return result;
  } catch (error) {
    console.error('ContentSecurity: Content encryption failed:', error);
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
  console.log('ContentSecurity: decryptContent input:', encryptedData);
  
  // Handle legacy unencrypted content (backward compatibility)
  if (typeof encryptedData === 'string') {
    console.log('ContentSecurity: decryptContent - string input, returning as-is');
    return encryptedData;
  }

  // Handle unencrypted content marked as such
  if (!encryptedData.isEncrypted || !encryptedData.data) {
    console.log('ContentSecurity: decryptContent - unencrypted content, returning data');
    return encryptedData.data || '';
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('ContentSecurity: decryptContent - decrypted result:', decrypted);
    return decrypted;
  } catch (error) {
    console.error('ContentSecurity: Content decryption failed:', error);
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
  console.log('ContentSecurity: decryptJSONB input:', encryptedData);
  
  // Handle legacy unencrypted objects
  if (typeof encryptedData === 'object' && !encryptedData?.isEncrypted) {
    console.log('ContentSecurity: decryptJSONB - unencrypted object, returning as-is');
    return encryptedData;
  }

  try {
    const decrypted = decryptContent(encryptedData as EncryptedContent);
    console.log('ContentSecurity: decryptJSONB - decrypted content:', decrypted);
    
    if (!decrypted) {
      console.log('ContentSecurity: decryptJSONB - no decrypted content, returning null');
      return null;
    }
    
    const parsed = JSON.parse(decrypted);
    console.log('ContentSecurity: decryptJSONB - parsed result:', parsed);
    return parsed;
  } catch (error) {
    console.error('ContentSecurity: JSONB decryption failed:', error);
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
export const retrieveJSONBFromStorage = (storedData: string | any): any => {
  console.log('retrieveJSONBFromStorage input:', storedData);
  
  if (!storedData) {
    console.log('retrieveJSONBFromStorage: no data, returning null');
    return null;
  }
  
  // If it's already an object (from JSONB column), handle it directly
  if (typeof storedData === 'object') {
    console.log('retrieveJSONBFromStorage: object input, handling directly');
    const result = safeDecryptJSONB(storedData);
    console.log('retrieveJSONBFromStorage result:', result);
    return result;
  }
  
  // If it's a string, try to parse it
  if (typeof storedData === 'string') {
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
  }
  
  console.log('retrieveJSONBFromStorage: unexpected type, returning null');
  return null;
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
  
  try {
    if (settings.preferredName) {
      encrypted.preferredName = prepareContentForStorage(settings.preferredName);
    }
    
    // Handle globalTags - support both PostgreSQL arrays and encrypted JSON
    if (settings.globalTags && Array.isArray(settings.globalTags)) {
      console.log('Processing globalTags (PostgreSQL array):', settings.globalTags);
      // Keep as array - no encryption needed for PostgreSQL arrays
      encrypted.globalTags = settings.globalTags;
    }
    
    // Handle tags - support both PostgreSQL arrays and encrypted JSON
    if (settings.tags && Array.isArray(settings.tags)) {
      console.log('Processing tags (PostgreSQL array):', settings.tags);
      // Keep as array - no encryption needed for PostgreSQL arrays
      encrypted.tags = settings.tags;
    }
    
    // Handle floCatPersonality - support both PostgreSQL arrays and encrypted JSON
    if (settings.floCatPersonality && Array.isArray(settings.floCatPersonality)) {
      console.log('Processing floCatPersonality (PostgreSQL array):', settings.floCatPersonality);
      // Keep as array - no encryption needed for PostgreSQL arrays
      encrypted.floCatPersonality = settings.floCatPersonality;
    }
    
    if (settings.journalCustomActivities) {
      console.log('Encrypting journalCustomActivities:', settings.journalCustomActivities);
      encrypted.journalCustomActivities = prepareJSONBForStorage(settings.journalCustomActivities);
      console.log('Encrypted journalCustomActivities:', encrypted.journalCustomActivities);
    }
    
    console.log('encryptUserSettingsFields output:', encrypted);
    return encrypted;
  } catch (error) {
    console.error('Error in encryptUserSettingsFields:', error);
    // Return original settings if encryption fails
    return settings;
  }
};

/**
 * Utility to decrypt user settings fields
 */
export const decryptUserSettingsFields = (settings: any) => {
  console.log('decryptUserSettingsFields input:', settings);
  const decrypted = { ...settings };
  
  try {
    if (settings.preferredName) {
      decrypted.preferredName = retrieveContentFromStorage(settings.preferredName);
    }
    
    // Handle globalTags - support both PostgreSQL arrays and encrypted JSON
    if (settings.globalTags) {
      console.log('Processing globalTags from database:', settings.globalTags);
      console.log('globalTags type:', typeof settings.globalTags);
      
      if (Array.isArray(settings.globalTags)) {
        // PostgreSQL array - no decryption needed
        console.log('globalTags is PostgreSQL array, using as-is');
        decrypted.globalTags = settings.globalTags;
      } else if (typeof settings.globalTags === 'string') {
        // Encrypted JSON string - needs decryption
        console.log('globalTags is encrypted JSON string, decrypting');
        decrypted.globalTags = retrieveArrayFromStorage(settings.globalTags);
      } else {
        // Fallback
        console.log('globalTags is unknown format, using empty array');
        decrypted.globalTags = [];
      }
      console.log('Processed globalTags:', decrypted.globalTags);
    }
    
    // Handle tags - support both PostgreSQL arrays and encrypted JSON
    if (settings.tags) {
      console.log('Processing tags from database:', settings.tags);
      console.log('tags type:', typeof settings.tags);
      
      if (Array.isArray(settings.tags)) {
        // PostgreSQL array - no decryption needed
        console.log('tags is PostgreSQL array, using as-is');
        decrypted.tags = settings.tags;
      } else if (typeof settings.tags === 'string') {
        // Encrypted JSON string - needs decryption
        console.log('tags is encrypted JSON string, decrypting');
        decrypted.tags = retrieveArrayFromStorage(settings.tags);
      } else {
        // Fallback
        console.log('tags is unknown format, using empty array');
        decrypted.tags = [];
      }
      console.log('Processed tags:', decrypted.tags);
    }
    
    // Handle floCatPersonality - support both PostgreSQL arrays and encrypted JSON
    if (settings.floCatPersonality) {
      console.log('Processing floCatPersonality from database:', settings.floCatPersonality);
      console.log('floCatPersonality type:', typeof settings.floCatPersonality);
      
      if (Array.isArray(settings.floCatPersonality)) {
        // PostgreSQL array - no decryption needed
        console.log('floCatPersonality is PostgreSQL array, using as-is');
        decrypted.floCatPersonality = settings.floCatPersonality;
      } else if (typeof settings.floCatPersonality === 'string') {
        // Encrypted JSON string - needs decryption
        console.log('floCatPersonality is encrypted JSON string, decrypting');
        decrypted.floCatPersonality = retrieveArrayFromStorage(settings.floCatPersonality);
      } else {
        // Fallback
        console.log('floCatPersonality is unknown format, using empty array');
        decrypted.floCatPersonality = [];
      }
      console.log('Processed floCatPersonality:', decrypted.floCatPersonality);
    }
    
    if (settings.journalCustomActivities) {
      console.log('Decrypting journalCustomActivities:', settings.journalCustomActivities);
      console.log('journalCustomActivities type:', typeof settings.journalCustomActivities);
      decrypted.journalCustomActivities = retrieveJSONBFromStorage(settings.journalCustomActivities);
      console.log('Decrypted journalCustomActivities:', decrypted.journalCustomActivities);
    }
    
    console.log('decryptUserSettingsFields output:', decrypted);
    return decrypted;
  } catch (error) {
    console.error('Error in decryptUserSettingsFields:', error);
    // Return original settings if decryption fails
    return settings;
  }
};