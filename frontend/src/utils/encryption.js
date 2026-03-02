/**
 * AES-256 Encryption utilities for client-side encryption
 * Uses crypto-js library for AES-256-CBC encryption
 */

import CryptoJS from 'crypto-js';

/**
 * Get encryption key from environment variable or use default
 * MUST match backend ENCRYPTION_KEY
 * In production, set REACT_APP_ENCRYPTION_KEY in .env file
 * 
 * IMPORTANT: Backend uses the key as UTF-8 bytes, padded/truncated to 32 bytes.
 * CryptoJS needs the key in a format that matches this exactly.
 * 
 * We'll use CryptoJS.enc.Utf8.parse() to convert the key string to WordArray,
 * ensuring it matches backend's byte-by-byte key handling.
 */
function getSecretKey() {
  const keyString = process.env.REACT_APP_ENCRYPTION_KEY || 'change-me-32-byte-key-here!';
  
  // Convert to UTF-8 bytes to check actual byte length
  const encoder = new TextEncoder();
  let keyBytes = encoder.encode(keyString);
  
  // Ensure key is exactly 32 bytes for AES-256 (matching backend behavior)
  // If shorter, pad with null bytes (matching backend behavior)
  // If longer, truncate
  if (keyBytes.length < 32) {
    // Pad with null bytes (0x00)
    const padded = new Uint8Array(32);
    padded.set(keyBytes, 0);
    keyBytes = padded;
  } else if (keyBytes.length > 32) {
    // Truncate to 32 bytes
    keyBytes = keyBytes.slice(0, 32);
  }
  
  // Convert bytes to hex string, then parse as WordArray
  // This ensures exact byte-by-byte matching with backend
  const hexString = Array.from(keyBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  // Parse hex string to WordArray (32 bytes = 64 hex chars)
  return CryptoJS.enc.Hex.parse(hexString);
}

const SECRET_KEY = getSecretKey();

/**
 * Encrypt a string using AES-256-CBC
 * @param {string} plaintext - The text to encrypt
 * @returns {string} - Encrypted data in format: iv:encryptedData (base64)
 */
export function encryptString(plaintext) {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty');
  }

  try {
    // Generate random IV (Initialization Vector) for each encryption
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    
    // Debug: Log key info
    console.log('Encrypting with key:', {
      keyType: typeof SECRET_KEY,
      keyLength: SECRET_KEY.sigBytes,
      keyWords: SECRET_KEY.words.length
    });
    
    // Encrypt using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(plaintext, SECRET_KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    // Combine IV and encrypted data, then encode to base64
    const encryptedData = iv.concat(encrypted.ciphertext);
    const encryptedBase64 = CryptoJS.enc.Base64.stringify(encryptedData);
    
    // Debug: Log encryption info
    console.log('Encryption result:', {
      ivLength: iv.sigBytes,
      ciphertextLength: encrypted.ciphertext.sigBytes,
      totalLength: encryptedData.sigBytes,
      base64Length: encryptedBase64.length
    });

    return encryptedBase64;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Encrypt a file (converts to base64, then encrypts)
 * @param {File} file - The file to encrypt
 * @returns {Promise<string>} - Encrypted file data in base64 format
 */
export async function encryptFile(file) {
  if (!file) {
    throw new Error('File cannot be empty');
  }

  try {
    // Convert file to base64 string
    const fileBase64 = await fileToBase64(file);
    
    // Encrypt the base64 string
    const encrypted = encryptString(fileBase64);
    
    return encrypted;
  } catch (error) {
    console.error('File encryption error:', error);
    throw new Error(`File encryption failed: ${error.message}`);
  }
}

/**
 * Convert File object to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Base64 encoded file data
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    
    reader.onerror = (error) => {
      reject(new Error(`File reading failed: ${error.message}`));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Encrypt JSON object
 * @param {object} data - The object to encrypt
 * @returns {string} - Encrypted JSON string
 */
export function encryptJSON(data) {
  if (!data) {
    throw new Error('Data cannot be empty');
  }

  try {
    // Convert object to JSON string
    const jsonString = JSON.stringify(data);
    
    // Encrypt the JSON string
    const encrypted = encryptString(jsonString);
    
    return encrypted;
  } catch (error) {
    console.error('JSON encryption error:', error);
    throw new Error(`JSON encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a string using AES-256-CBC
 * @param {string} encryptedBase64 - Base64 encoded encrypted data (format: iv:encryptedData)
 * @returns {string} - Decrypted plaintext string
 */
export function decryptString(encryptedBase64) {
  if (!encryptedBase64) {
    throw new Error('Encrypted data cannot be empty');
  }

  try {
    // Decode from base64
    const encryptedData = CryptoJS.enc.Base64.parse(encryptedBase64);
    
    // Extract IV (first 16 bytes) and ciphertext (rest)
    const iv = CryptoJS.lib.WordArray.create(encryptedData.words.slice(0, 4)); // First 4 words = 16 bytes
    const ciphertext = CryptoJS.lib.WordArray.create(encryptedData.words.slice(4)); // Rest
    
    // Decrypt using AES-256-CBC
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      SECRET_KEY,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    // Convert to string
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!plaintext) {
      throw new Error('Decryption failed: Invalid key or corrupted data');
    }
    
    return plaintext;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a file (decrypts base64 string, then converts to File)
 * @param {string} encryptedBase64 - Base64 encoded encrypted file data
 * @param {string} filename - Original filename
 * @param {string} mimeType - Original MIME type
 * @returns {Promise<File>} - Decrypted file
 */
export async function decryptFile(encryptedBase64, filename = 'decrypted_file', mimeType = 'application/octet-stream') {
  if (!encryptedBase64) {
    throw new Error('Encrypted data cannot be empty');
  }

  try {
    // Decrypt the encrypted base64 string
    const decryptedBase64 = decryptString(encryptedBase64);
    
    // Convert base64 to Blob
    const byteCharacters = atob(decryptedBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    // Convert Blob to File
    return new File([blob], filename, { type: mimeType });
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error(`File decryption failed: ${error.message}`);
  }
}

/**
 * Decrypt JSON object
 * @param {string} encryptedBase64 - Base64 encoded encrypted JSON string
 * @returns {object} - Decrypted JSON object
 */
export function decryptJSON(encryptedBase64) {
  if (!encryptedBase64) {
    throw new Error('Encrypted data cannot be empty');
  }

  try {
    // Decrypt the encrypted JSON string
    const decryptedJsonString = decryptString(encryptedBase64);
    
    // Parse JSON
    return JSON.parse(decryptedJsonString);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
    console.error('JSON decryption error:', error);
    throw new Error(`JSON decryption failed: ${error.message}`);
  }
}

/**
 * Prepare encrypted payload for API
 * @param {string|File|object} data - Data to encrypt (string, file, or object)
 * @param {string} dataType - Type of data: 'string', 'file', or 'json'
 * @returns {Promise<object>} - Encrypted payload ready for API
 */
export async function prepareEncryptedPayload(data, dataType = 'string') {
  try {
    let encryptedData;
    let metadata = {};

    if (dataType === 'file') {
      if (!(data instanceof File)) {
        throw new Error('Data must be a File object for file type');
      }
      encryptedData = await encryptFile(data);
      metadata = {
        filename: data.name,
        mimeType: data.type,
        size: data.size
      };
    } else if (dataType === 'json') {
      encryptedData = encryptJSON(data);
      metadata = {
        type: 'json'
      };
    } else {
      // string type
      encryptedData = encryptString(data);
      metadata = {
        type: 'string'
      };
    }

    const payload = {
      encrypted_data: encryptedData,
      metadata: metadata,
      encryption: 'AES-256-CBC'
    };
    
    // Debug: Log payload structure
    console.log('Prepared payload:', {
      hasEncryptedData: !!payload.encrypted_data,
      encryptedDataLength: payload.encrypted_data?.length || 0,
      encryptedDataType: typeof payload.encrypted_data,
      metadata: payload.metadata,
      encryption: payload.encryption
    });
    
    return payload;
  } catch (error) {
    console.error('Payload preparation error:', error);
    throw error;
  }
}

