/**
 * API service for encrypted file sharing
 * Handles uploading encrypted files and creating shareable links
 */
import api from './api';
import { encryptFile } from '../utils/encryption';

/**
 * Upload encrypted file and get shareable link
 * @param {File} file - The file to encrypt and upload
 * @param {object} options - Upload options
 * @param {number} options.expiresInHours - Hours until file expires (default: 24)
 * @param {number} options.maxDownloads - Maximum number of downloads (default: 1)
 * @param {boolean} options.isOneTime - One-time download flag (default: true)
 * @returns {Promise} - API response with token and access code
 */
export async function uploadEncryptedFile(file, options = {}) {
  try {
    const {
      expiresInHours = 24,
      maxDownloads = 1,
      isOneTime = true
    } = options;

    // Step 1: Request upload (get token and access code)
    const uploadRequest = await api.post('/v1/encrypted-files/upload', {
      filename: file.name,
      size: file.size,
      mime_type: file.type,
      expires_in_hours: expiresInHours,
      max_downloads: maxDownloads,
      is_one_time: isOneTime
    });

    const { token, access_code } = uploadRequest.data;

    // Step 2: Encrypt file client-side
    const encryptedData = await encryptFile(file);

    // Step 3: Complete upload (send encrypted data)
    const completeResponse = await api.post('/v1/encrypted-files/upload-complete', {
      token: token,
      encrypted_data: encryptedData
    });

    return {
      ...completeResponse.data,
      access_code: access_code,  // Return access code for sharing
      token: token
    };
  } catch (error) {
    console.error('Error uploading encrypted file:', error);
    throw error;
  }
}

/**
 * Get encrypted file information
 * @param {string} token - File token
 * @returns {Promise} - File information
 */
export async function getEncryptedFileInfo(token) {
  try {
    const response = await api.get(`/v1/encrypted-files/info/${token}`);
    return response.data;
  } catch (error) {
    console.error('Error getting file info:', error);
    throw error;
  }
}

/**
 * Download encrypted file (requires access code)
 * @param {string} token - File token
 * @param {string} accessCode - 6-digit access code
 * @returns {Promise} - Encrypted file data
 */
export async function downloadEncryptedFile(token, accessCode) {
  try {
    const response = await api.post('/v1/encrypted-files/download', {
      token: token,
      access_code: accessCode
    });
    return response.data;
  } catch (error) {
    console.error('Error downloading encrypted file:', error);
    throw error;
  }
}

/**
 * List all encrypted files uploaded by current user
 * @returns {Promise} - List of encrypted files
 */
export async function listEncryptedFiles() {
  try {
    const response = await api.get('/v1/encrypted-files/list');
    return response.data;
  } catch (error) {
    console.error('Error listing encrypted files:', error);
    throw error;
  }
}

/**
 * Delete encrypted file
 * @param {string} token - File token
 * @returns {Promise} - Delete response
 */
export async function deleteEncryptedFile(token) {
  try {
    const response = await api.delete(`/v1/encrypted-files/${token}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting encrypted file:', error);
    throw error;
  }
}

