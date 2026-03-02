import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import {
  ComputerDesktopIcon,
  FolderIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function Monitoring() {
  const { t } = useTranslation();
  const [selectedDisk, setSelectedDisk] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Disk ro'yxatini olish
  const { data: disksData, isLoading: disksLoading, refetch: refetchDisks } = useQuery(
    'monitoring-disks',
    async () => {
      try {
        const response = await api.get('/v1/monitoring/disks');
        return response.data;
      } catch (error) {
        console.error('Error fetching disks:', error);
        setError(t('monitoring.errorLoadingDisks'));
        return { disks: [] };
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true,
    }
  );

  const disks = disksData?.disks || [];

  // Zararli fayllarni olish
  const { data: scanData, isLoading: scanLoading, refetch: refetchScan } = useQuery(
    ['monitoring-scan', selectedDisk],
    async () => {
      if (!selectedDisk) return { malicious_files: [], count: 0 };
      
      try {
        const encodedPath = encodeURIComponent(selectedDisk.path);
        const response = await api.get(`/v1/monitoring/scan?disk_path=${encodedPath}&max_depth=5`);
        return response.data;
      } catch (error) {
        console.error('Error scanning disk:', error);
        setError(error.response?.data?.detail || t('monitoring.errorScanning'));
        return { malicious_files: [], count: 0 };
      }
    },
    {
      retry: false,
      enabled: !!selectedDisk,
      refetchOnWindowFocus: false,
    }
  );

  const maliciousFiles = scanData?.malicious_files || [];
  const fileCount = scanData?.count || 0;

  // Faylni o'chirish
  const deleteMutation = useMutation(
    async (filePath) => {
      const encodedPath = encodeURIComponent(filePath);
      await api.delete(`/v1/monitoring/delete-file?file_path=${encodedPath}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['monitoring-scan', selectedDisk]);
        refetchScan();
      },
      onError: (err) => {
        setError(err.response?.data?.detail || t('monitoring.errorDeletingFile'));
      },
    }
  );

  const handleScan = () => {
    if (selectedDisk) {
      refetchScan();
      setScanning(true);
      setTimeout(() => setScanning(false), 2000);
    }
  };

  const handleOpenFile = async (filePath) => {
    try {
      setError('');
      // Backend orqali faylni Windows Explorer'da ochish
      const encodedPath = encodeURIComponent(filePath);
      const response = await api.post(`/v1/monitoring/open-file?file_path=${encodedPath}`);
      
      // Muvaffaqiyatli ochildi
      if (response.data && response.data.message) {
        // Kichik muvaffaqiyat xabari (agar kerak bo'lsa)
        // Backend allaqachon Windows Explorer'ni ochdi
      }
    } catch (error) {
      console.error('Error opening file:', error);
      const errorMessage = error.response?.data?.detail || t('monitoring.errorOpeningFile');
      setError(errorMessage);
      
      // Agar backend'da xatolik bo'lsa, fayl path'ni ko'rsatish
      if (error.response?.status === 404 || error.response?.status === 400) {
        alert(`${t('common.error')}: ${errorMessage}\n\n${t('monitoring.fullPath')} ${filePath}`);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString('uz-UZ');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('monitoring.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('monitoring.subtitle')}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 bg-red-50 border-2 border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Disk Selection */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <ComputerDesktopIcon className="h-6 w-6 text-blue-600" />
          <span>{t('monitoring.selectDisk')}</span>
        </h2>
        
        {disksLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('monitoring.loadingDisks')}</p>
          </div>
        ) : disks.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {disks.map((disk, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedDisk(disk);
                  setError('');
                }}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedDisk?.path === disk.path
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FolderIcon className="h-8 w-8 text-blue-600" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{disk.label}</h3>
                    <p className="text-sm text-gray-500">{disk.path}</p>
                    {disk.total_size && (
                      <p className="text-xs text-gray-400 mt-1">
                        {formatFileSize(disk.free_size)} {t('monitoring.free')} / {formatFileSize(disk.total_size)} {t('monitoring.total')}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ComputerDesktopIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">{t('monitoring.noDisks')}</p>
          </div>
        )}
      </div>

      {/* Scan Results */}
      {selectedDisk && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              <span>{t('monitoring.maliciousFiles')} - {selectedDisk.label}</span>
            </h2>
            <button
              onClick={handleScan}
              disabled={scanning || scanLoading}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-5 w-5 ${scanning || scanLoading ? 'animate-spin' : ''}`} />
              <span>{t('monitoring.rescan')}</span>
            </button>
          </div>

          {scanLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t('monitoring.scanning')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('monitoring.scanningDesc')}</p>
            </div>
          ) : maliciousFiles.length > 0 ? (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold">
                  {fileCount} {t('monitoring.filesFound')}
                </p>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {maliciousFiles.map((file, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <DocumentIcon className="h-5 w-5 text-red-600" />
                          <h3 className="font-semibold text-gray-900">{file.name}</h3>
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                            {file.extension || t('monitoring.unknown')}
                          </span>
                        </div>
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1">{t('monitoring.fullPath')}</p>
                          <p className="text-sm text-gray-700 font-mono break-all bg-gray-50 p-2 rounded border border-gray-200">
                            {file.path}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{t('monitoring.size')} {formatFileSize(file.size)}</span>
                          <span>{t('monitoring.modified')} {formatDate(file.modified)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleOpenFile(file.path)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                          title={t('monitoring.openFileTitle')}
                        >
                          {t('monitoring.openFile')}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`"${file.name}" ${t('monitoring.deleteConfirm')}`)) {
                              deleteMutation.mutate(file.path);
                            }
                          }}
                          disabled={deleteMutation.isLoading}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                          title={t('monitoring.deleteFileTitle')}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg text-gray-600 mb-2">{t('monitoring.noMaliciousFiles')}</p>
              <p className="text-sm text-gray-500">
                {selectedDisk.label} {t('monitoring.noMaliciousFilesDesc')}
              </p>
            </div>
          )}
        </div>
      )}

      {!selectedDisk && (
        <div className="card p-12 text-center">
          <FolderIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-600 mb-2">{t('monitoring.selectDiskPrompt')}</p>
          <p className="text-sm text-gray-500">
            {t('monitoring.selectDiskDesc')}
          </p>
        </div>
      )}
    </div>
  );
}

