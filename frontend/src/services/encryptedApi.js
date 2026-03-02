/**
 * API service for sending encrypted data to backend
 * Demonstrates how to encrypt and send data to backend endpoints
 */
import api from './api';
import { prepareEncryptedPayload } from '../utils/encryption';

/**
 * Send encrypted string to backend
 * @param {string} plaintext - The text to encrypt and send
 * @returns {Promise} - API response
 */
export async function sendEncryptedString(plaintext) {
  try {
    // Prepare encrypted payload
    const payload = await prepareEncryptedPayload(plaintext, 'string');
    
    // Send to backend
    const response = await api.post('/v1/encryption/decrypt', payload);
    return response.data;
  } catch (error) {
    console.error('Error sending encrypted string:', error);
    throw error;
  }
}

/**
 * Send encrypted file to backend
 * @param {File} file - The file to encrypt and send
 * @returns {Promise} - API response
 */
export async function sendEncryptedFile(file) {
  try {
    // Prepare encrypted payload
    const payload = await prepareEncryptedPayload(file, 'file');
    
    // Debug: Log payload structure
    console.log('Sending encrypted file payload:', {
      hasEncryptedData: !!payload.encrypted_data,
      encryptedDataLength: payload.encrypted_data?.length || 0,
      metadata: payload.metadata,
      encryption: payload.encryption
    });
    
    // Send to backend
    const response = await api.post('/v1/encryption/decrypt', payload);
    return response.data;
  } catch (error) {
    console.error('Error sending encrypted file:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    throw error;
  }
}

/**
 * Send encrypted file and request scanning
 * @param {File} file - The file to encrypt, send, and scan
 * @returns {Promise} - API response with scan results
 */
export async function sendEncryptedFileForScan(file) {
  try {
    // Prepare encrypted payload
    const payload = await prepareEncryptedPayload(file, 'file');
    
    // Send to backend for decryption and scanning
    const response = await api.post('/v1/encryption/decrypt-and-scan', payload);
    return response.data;
  } catch (error) {
    console.error('Error sending encrypted file for scan:', error);
    throw error;
  }
}

/**
 * Send encrypted JSON object to backend
 * @param {object} data - The object to encrypt and send
 * @returns {Promise} - API response
 */
export async function sendEncryptedJSON(data) {
  try {
    // Prepare encrypted payload
    const payload = await prepareEncryptedPayload(data, 'json');
    
    // Send to backend
    const response = await api.post('/v1/encryption/decrypt', payload);
    return response.data;
  } catch (error) {
    console.error('Error sending encrypted JSON:', error);
    throw error;
  }
}

