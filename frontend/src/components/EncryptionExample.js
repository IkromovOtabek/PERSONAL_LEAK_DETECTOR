/**
 * Component for encrypting files and sharing via links
 * Also includes decrypt functionality for encrypted files
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadEncryptedFile, listEncryptedFiles, deleteEncryptedFile } from '../services/encryptedFilesApi';
import { decryptFile } from '../utils/encryption';
import {
  LinkIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  CheckCircleIcon,
  LockOpenIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { formatKST } from '../utils/dateUtils';

export default function EncryptionExample() {
  const { t } = useTranslation();
  // Encrypted file sharing state
  const [shareFileInput, setShareFileInput] = useState(null);
  const [shareExpiresInHours, setShareExpiresInHours] = useState(24);
  const [shareMaxDownloads, setShareMaxDownloads] = useState(1);
  const [shareIsOneTime, setShareIsOneTime] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareResult, setShareResult] = useState(null);
  const [shareError, setShareError] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [shareAccessCode, setShareAccessCode] = useState('');
  const [encryptedFiles, setEncryptedFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  
  // Decrypt state
  const [decryptFileInput, setDecryptFileInput] = useState(null);
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptError, setDecryptError] = useState(null);
  const [decryptSuccess, setDecryptSuccess] = useState(null);

  // Shifrlangan faylni decrypt qilish
  const handleDecryptFile = async (e) => {
    e.preventDefault();
    if (!decryptFileInput) return;

    setDecryptLoading(true);
    setDecryptError(null);
    setDecryptSuccess(null);

    try {
      // Read file as text (encrypted data is base64 string)
      const fileText = await decryptFileInput.text();
      
      // Decrypt the file
      const decryptedFile = await decryptFile(
        fileText.trim(),
        decryptFileInput.name.replace('.enc', '') || 'decrypted_file',
        decryptFileInput.type || 'application/octet-stream'
      );

      // Create download link
      const url = window.URL.createObjectURL(decryptedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = decryptedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDecryptSuccess(`${t('encryption.fileOpenedSuccess')}: ${decryptedFile.name}`);
      
      // Reset form
      setDecryptFileInput(null);
      const fileInput = document.getElementById('decrypt-file-input');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      setDecryptError(err.message || t('encryption.openError'));
    } finally {
      setDecryptLoading(false);
    }
  };

  // Shifrlangan faylni yuklash va link yaratish
  const handleShareFileUpload = async (e) => {
    e.preventDefault();
    if (!shareFileInput) return;

    setShareLoading(true);
    setShareError(null);
    setShareResult(null);
    setShareLink('');
    setShareAccessCode('');

    try {
      const response = await uploadEncryptedFile(shareFileInput, {
        expiresInHours: shareExpiresInHours,
        maxDownloads: shareMaxDownloads,
        isOneTime: shareIsOneTime
      });

      setShareResult(response);
      setShareLink(response.download_url);
      setShareAccessCode(response.access_code);
      
      // Refresh file list
      loadEncryptedFiles();
      
      // Reset form
      setShareFileInput(null);
      const fileInput = document.getElementById('share-file-input');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      setShareError(err.response?.data?.detail || err.message || t('encryption.uploadError'));
    } finally {
      setShareLoading(false);
    }
  };

  // Encrypted files ro'yxatini yuklash
  const loadEncryptedFiles = async () => {
    try {
      setFilesLoading(true);
      const response = await listEncryptedFiles();
      // Fayllarni yuklangan vaqt bo'yicha tartiblash (eng yangisidan eng eskisiga)
      const files = (response.files || []).sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA; // Descending order (newest first)
      });
      setEncryptedFiles(files);
    } catch (err) {
      console.error('Error loading encrypted files:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  // Component mount bo'lganda files ro'yxatini yuklash
  React.useEffect(() => {
    loadEncryptedFiles();
  }, []);

  // Link'ni nusxalash (faqat link, kod alohida)
  const copyLink = (link) => {
    navigator.clipboard.writeText(link).then(() => {
      alert(t('encryption.linkCopied'));
    });
  };
  
  // Kod'ni nusxalash
  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      alert(t('encryption.codeCopied'));
    });
  };

  // Faylni o'chirish
  const handleDeleteFile = async (token) => {
    if (!window.confirm(t('encryption.deleteConfirm'))) {
      return;
    }

    try {
      await deleteEncryptedFile(token);
      loadEncryptedFiles();
      alert(t('encryption.fileDeleted'));
    } catch (err) {
      alert(err.response?.data?.detail || err.message || t('encryption.deleteError'));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-gray-900">{t('encryption.title')}</h2>

      {/* Shifrlangan Fayl Ulashish */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">{t('encryption.shareFileTitle')}</h3>
        <form onSubmit={handleShareFileUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('encryption.selectFile')}:
            </label>
            <input
              id="share-file-input"
              type="file"
              onChange={(e) => setShareFileInput(e.target.files[0])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {shareFileInput && (
              <p className="mt-2 text-sm text-gray-600">
                {t('encryption.fileSelected')}: {shareFileInput.name} ({(shareFileInput.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('encryption.expiresInHours')}:
              </label>
              <input
                type="number"
                value={shareExpiresInHours}
                onChange={(e) => setShareExpiresInHours(parseInt(e.target.value) || 24)}
                min="1"
                max="168"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('encryption.maxDownloads')}:
              </label>
              <input
                type="number"
                value={shareMaxDownloads}
                onChange={(e) => setShareMaxDownloads(parseInt(e.target.value) || 1)}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('encryption.oneTime')}:
              </label>
              <input
                type="checkbox"
                checked={shareIsOneTime}
                onChange={(e) => setShareIsOneTime(e.target.checked)}
                className="h-5 w-5"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={shareLoading || !shareFileInput}
            className="btn-primary disabled:opacity-50 w-full"
          >
            {shareLoading ? t('encryption.uploading') : t('encryption.encryptAndCreateLink')}
          </button>
        </form>

        {/* Share Result */}
        {shareError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{shareError}</p>
          </div>
        )}

        {shareLink && shareAccessCode && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <p className="text-green-800 font-medium">{t('encryption.linkCreated')}</p>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('encryption.link')}:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <button
                    onClick={() => copyLink(shareLink)}
                    className="btn-secondary flex items-center space-x-1"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    <span>{t('encryption.copy')}</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('encryption.accessCode')}:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={shareAccessCode}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-center text-xl font-mono tracking-widest"
                  />
                  <button
                    onClick={() => copyCode(shareAccessCode)}
                    className="btn-secondary flex items-center space-x-1"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    <span>{t('encryption.copy')}</span>
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {t('encryption.linkWarning')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Shifrlangan Faylni Decrypt Qilish */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">{t('encryption.decryptTitle')}</h3>
        <form onSubmit={handleDecryptFile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('encryption.selectEncryptedFile')}:
            </label>
            <input
              id="decrypt-file-input"
              type="file"
              accept=".txt,.enc"
              onChange={(e) => setDecryptFileInput(e.target.files[0])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {decryptFileInput && (
              <p className="mt-2 text-sm text-gray-600">
                {t('encryption.fileSelected')}: {decryptFileInput.name} ({(decryptFileInput.size / 1024).toFixed(2)} KB)
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              {t('encryption.fileFormatWarning')}
            </p>
          </div>

          <button
            type="submit"
            disabled={decryptLoading || !decryptFileInput}
            className="btn-primary disabled:opacity-50 w-full flex items-center justify-center space-x-2"
          >
            {decryptLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{t('encryption.opening')}</span>
              </>
            ) : (
              <>
                <LockOpenIcon className="h-5 w-5" />
                <span>{t('encryption.openAndDownload')}</span>
              </>
            )}
          </button>
        </form>

        {/* Decrypt Result */}
        {decryptError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{decryptError}</p>
          </div>
        )}

        {decryptSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <p className="text-green-800">{decryptSuccess}</p>
            </div>
          </div>
        )}
      </div>

      {/* Yuklangan Fayllar Ro'yxati */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">{t('encryption.uploadedFilesTitle')}</h3>
        {filesLoading ? (
          <p className="text-gray-600">{t('encryption.loading')}</p>
        ) : encryptedFiles.length === 0 ? (
          <p className="text-gray-600">{t('encryption.noFilesUploaded')}</p>
        ) : (
          <div className="space-y-4">
            {encryptedFiles.map((file, index) => (
              <div key={file.token} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                        <h4 className="font-semibold text-gray-900">{file.filename}</h4>
                      </div>
                      <div className="text-right ml-[10px]">
                        <p className="text-xs text-gray-500 font-medium mb-1">{t('encryption.uploadedAt')}</p>
                        {file.created_at ? (
                          <>
                            <p className="text-sm text-gray-700 font-semibold">{formatKST(file.created_at, 'd MMM, yyyy')}</p>
                            <p className="text-xs text-gray-500">{formatKST(file.created_at, 'HH:mm')}</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400">Noma'lum</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <p><span className="font-medium">{t('encryption.fileSize')}:</span> {(file.size / 1024).toFixed(2)} KB</p>
                        <p>
                          <span className="font-medium">{t('encryption.expiresAt')}:</span>{' '}
                          {file.expires_at ? (
                            <span>{formatKST(file.expires_at, 'd MMM, yyyy HH:mm')}</span>
                          ) : (
                            <span className="text-gray-400">Noma'lum</span>
                          )}
                        </p>
                        <p><span className="font-medium">{t('encryption.downloads')}:</span> {file.download_count} / {file.max_downloads}</p>
                        <p>
                          <span className="font-medium">{t('encryption.uploadedAt')}:</span>{' '}
                          {file.created_at ? (
                            <span>{formatKST(file.created_at, 'd MMM, yyyy HH:mm')}</span>
                          ) : (
                            <span className="text-gray-400">Noma'lum</span>
                          )}
                        </p>
                        <p>
                          <span className="font-medium">{t('encryption.status')}:</span>{' '}
                          {file.is_one_time && file.is_used ? (
                            <span className="text-red-600">✅ {t('encryption.oneTimeUsed')}</span>
                          ) : (
                            <span className="text-green-600">✅ {t('common.active')}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={`${typeof window !== 'undefined' ? window.location.origin : ''}/encrypted-download/${file.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center space-x-1"
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span>{t('encryption.link')}</span>
                    </a>
                    <button
                      onClick={() => handleDeleteFile(file.token)}
                      className="btn-secondary text-red-600 hover:text-red-700 flex items-center space-x-1"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span>{t('encryption.delete')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

