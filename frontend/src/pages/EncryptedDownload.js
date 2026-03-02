/**
 * Page for downloading encrypted files via shareable links
 * Requires access code to download
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  downloadEncryptedFile, 
  getEncryptedFileInfo 
} from '../services/encryptedFilesApi';
import {
  LockClosedIcon,
  ArrowDownTrayIcon,
  XCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { formatKST } from '../utils/dateUtils';

export default function EncryptedDownload() {
  const { token: rawToken } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Clean token - remove any extra text like "(Kod: ...)" that might be in URL
  // Also handle URL encoding and remove invalid characters
  const cleanToken = (raw) => {
    if (!raw) return null;
    try {
      // Decode URL encoding
      let cleaned = decodeURIComponent(raw);
      // Remove any text after space, parenthesis, or other invalid chars for token
      cleaned = cleaned.split(' ')[0].split('(')[0].split('%20')[0].trim();
      // Remove any non-alphanumeric characters except - and _ (token-safe chars)
      cleaned = cleaned.replace(/[^a-zA-Z0-9\-_]/g, '');
      return cleaned || null;
    } catch (e) {
      // If decode fails, try without decoding
      return raw.split(' ')[0].split('(')[0].split('%20')[0].trim().replace(/[^a-zA-Z0-9\-_]/g, '') || null;
    }
  };
  
  const token = cleanToken(rawToken);
  
  const [accessCode, setAccessCode] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Debug: Log token
  useEffect(() => {
    if (rawToken) {
      console.log('Raw token from URL:', rawToken);
      console.log('Cleaned token:', token);
    }
  }, [rawToken, token]);

  // Load file info on mount
  useEffect(() => {
    if (token) {
      loadFileInfo();
    } else {
      setError(t('encryption.tokenNotFound'));
    }
  }, [token, t]);

  const loadFileInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const info = await getEncryptedFileInfo(token);
      setFileInfo(info);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Error loading file info:', err);
      const errorMessage = err.response?.data?.detail || err.message || t('encryption.errorLoadingFileInfo');
      setError(errorMessage);
      setFileInfo(null); // Ensure fileInfo is null on error
    } finally {
      setLoading(false);
    }
  };

  // Encrypted faylni to'g'ridan-to'g'ri yuklab olish (decrypt qilmasdan)
  const handleDownload = async () => {
    if (!accessCode.trim() || accessCode.length !== 6) {
      setError(t('encryption.pleaseEnterCode'));
      return;
    }

    if (!fileInfo) {
      setError(t('encryption.fileNotFound'));
      return;
    }

    setDownloading(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Download encrypted file data
      const response = await downloadEncryptedFile(token, accessCode);
      const { encrypted_data, filename } = response;

      // Step 2: Create encrypted file (base64 string as text file)
      const encryptedBlob = new Blob([encrypted_data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(encryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.enc`; // Add .enc extension
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(t('encryption.downloadSuccess'));
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/encryption');
      }, 2000);

    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || t('encryption.downloadError');
      setError(errorMessage);
      
      // If access code is wrong, clear it
      if (errorMessage.includes('kirish kodi') || errorMessage.includes('access code')) {
        setAccessCode('');
        setError(t('encryption.invalidAccessCode'));
      }
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 max-w-md w-full text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('encryption.fileNotFound')}</h2>
          <p className="text-gray-600 mb-4">Havola noto‘g‘ri yoki token kiritilmagan.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Bosh sahifaga</button>
        </div>
      </div>
    );
  }

  if (!fileInfo && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 max-w-md w-full text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('encryption.fileNotFound')}</h2>
          <p className="text-gray-600 mb-4">{error || t('encryption.fileNotFoundDesc')}</p>
          <p className="text-sm text-gray-500 mb-4">Backend (API) ishlab turganini va havolani to‘g‘ri ochganingizni tekshiring.</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Bosh sahifaga
          </button>
        </div>
      </div>
    );
  }

  const isExpired = fileInfo.expires_at && new Date(fileInfo.expires_at) < new Date();
  const canDownload = !isExpired && !fileInfo.is_used && fileInfo.download_count < fileInfo.max_downloads;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="card p-8">
          <div className="text-center mb-6">
            <LockClosedIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('encryption.downloadTitle')}
            </h1>
            <p className="text-gray-600">
              {t('encryption.downloadSubtitle')}
            </p>
          </div>

          {/* File Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">{t('encryption.fileInfo')}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">{t('encryption.fileName')}:</span> {fileInfo.filename}</p>
                  <p><span className="font-medium">{t('encryption.fileSizeLabel')}:</span> {(fileInfo.size / 1024).toFixed(2)} KB</p>
                  <p><span className="font-medium">{t('encryption.uploadedAt')}:</span> {formatKST(fileInfo.created_at)}</p>
                  <p><span className="font-medium">{t('encryption.expiresAt')}:</span> {formatKST(fileInfo.expires_at)}</p>
                  <p><span className="font-medium">{t('encryption.downloads')}:</span> {fileInfo.download_count} / {fileInfo.max_downloads}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {isExpired && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <XCircleIcon className="h-5 w-5 text-red-500" />
                <p className="text-red-800 font-medium">{t('encryption.expired')}</p>
              </div>
            </div>
          )}

          {fileInfo.is_used && fileInfo.is_one_time && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <XCircleIcon className="h-5 w-5 text-red-500" />
                <p className="text-red-800 font-medium">{t('encryption.alreadyDownloaded')}</p>
              </div>
            </div>
          )}

          {fileInfo.download_count >= fileInfo.max_downloads && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <XCircleIcon className="h-5 w-5 text-red-500" />
                <p className="text-red-800 font-medium">{t('encryption.maxDownloadsReached')}</p>
              </div>
            </div>
          )}

          {/* Access Code Input */}
          {canDownload && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('encryption.enterAccessCode')}:
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => {
                  // Only allow digits, max 6 characters
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setAccessCode(value);
                  setError('');
                }}
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={6}
                disabled={downloading}
              />
              <p className="mt-2 text-sm text-gray-500">
                {t('encryption.accessCodePlaceholder')}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <p className="text-green-800">{success}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/encryption')}
              className="btn-secondary flex-1"
              disabled={downloading}
            >
              {t('common.back')}
            </button>
            {canDownload && (
              <button
                onClick={handleDownload}
                disabled={downloading || !accessCode || accessCode.length !== 6}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{t('encryption.uploading')}</span>
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="h-5 w-5" />
                    <span>{t('encryption.downloadEncrypted')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

