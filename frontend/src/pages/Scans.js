import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { formatKST } from '../utils/dateUtils';
import { useFindingsStats } from '../hooks/useFindingsStats';
import {
  DocumentMagnifyingGlassIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  TrashIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

export default function Scans() {
  const { t } = useTranslation();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Token bor-yo'qligini tekshirish
  const hasToken = !!localStorage.getItem('token');

  const { data: scans, isLoading, error: scansError } = useQuery(
    'scans',
    async () => {
      try {
        const response = await api.get('/v1/scans/');
        return response.data;
      } catch (error) {
        // 401 yoki network xatolarini ignore qilamiz
        if (error.response?.status === 401 || error.code === 'ERR_NETWORK') {
          return [];
        }
        console.error('Error fetching scans:', error);
        return [];
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true, // Oynaga qaytganda avtomatik yangilash
      refetchInterval: 30000, // 30 soniyada bir avtomatik yangilash
      enabled: hasToken, // Faqat token bo'lsa ishlaydi
    }
  );

  const uploadMutation = useMutation(
    async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/v1/scans/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('scans');
        queryClient.refetchQueries('scans'); // Avtomatik yangilash
        queryClient.invalidateQueries('findings'); // Findings ham yangilanishi kerak
        queryClient.refetchQueries('findings'); // Avtomatik yangilash
        setShowUploadModal(false);
        setSelectedFile(null);
        setError('');
      },
      onError: (err) => {
        setError(err.response?.data?.detail || 'Failed to upload file');
      },
    }
  );

  const deleteMutation = useMutation(
    async (scanId) => {
      await api.delete(`/v1/scans/${scanId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('scans');
        queryClient.refetchQueries('scans'); // Avtomatik yangilash
        queryClient.invalidateQueries('findings'); // Findings ham yangilanishi kerak
        queryClient.refetchQueries('findings'); // Avtomatik yangilash
      },
      onError: (err) => {
        console.error('Delete scan error:', err);
        const status = err.response?.status;
        const errorMessage = err.response?.data?.detail || err.message || t('scans.deleteError');
        
        if (status === 404) {
          // Skan topilmadi - ehtimol allaqachon o'chirilgan
          setError(t('scans.notFound'));
          // Ro'yxatni yangilash
          queryClient.invalidateQueries('scans');
        } else if (status === 401) {
          setError(t('scans.authError'));
        } else if (status === 403) {
          setError(t('scans.permissionError'));
        } else {
          setError(errorMessage);
        }
        setTimeout(() => setError(''), 5000);
      },
    }
  );

  const handleDelete = (scanId) => {
    if (window.confirm(t('scans.deleteConfirm'))) {
      // Avtomatik ravishda ro'yxatni yangilash (agar 404 bo'lsa)
      deleteMutation.mutate(scanId, {
        onError: (err) => {
          // 404 xatosi bo'lsa, ro'yxatni yangilash (skan allaqachon o'chirilgan bo'lishi mumkin)
          if (err.response?.status === 404) {
            queryClient.invalidateQueries('scans');
            queryClient.invalidateQueries('findings');
          }
        }
      });
    }
  };

  const handleFileUpload = (e) => {
    e.preventDefault();
    setError('');
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    } else {
      setError(t('scans.fileRequired'));
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600',
          bg: 'bg-green-100',
          border: 'border-green-500',
          label: t('scans.completed')
        };
      case 'running':
        return {
          icon: ClockIcon,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          border: 'border-blue-500',
          label: t('scans.running')
        };
      case 'failed':
        return {
          icon: ExclamationCircleIcon,
          color: 'text-red-600',
          bg: 'bg-red-100',
          border: 'border-red-500',
          label: t('scans.failed')
        };
      case 'pending':
        return {
          icon: ClockIcon,
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          border: 'border-gray-500',
          label: t('scans.pending')
        };
      default:
        return {
          icon: ClockIcon,
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          border: 'border-gray-500',
          label: status
        };
    }
  };

  const completedScans = scans?.filter(s => s.status === 'completed').length || 0;
  const runningScans = scans?.filter(s => s.status === 'running').length || 0;
  const failedScans = scans?.filter(s => s.status === 'failed').length || 0;
  
  // Umumiy statistika hook'idan total findings olish
  const { stats: findingsStats } = useFindingsStats();
  const totalFindings = findingsStats?.total || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sarlavha */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {t('scans.title')}
            </h1>
            <p className="text-lg text-gray-600">
              {t('scans.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowGuideModal(true)}
            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            title={t('scans.userGuide')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center font-semibold"
        >
          <CloudArrowUpIcon className="h-5 w-5 mr-2.5" />
          <span className="font-semibold">{t('scans.uploadFile')}</span>
        </button>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('scans.completed')}</p>
          <p className="text-3xl font-bold text-green-600">{completedScans}</p>
        </div>
        <div className="stat-card border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('scans.running')}</p>
          <p className="text-3xl font-bold text-blue-600">{runningScans}</p>
        </div>
        <div className="stat-card border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('scans.failed')}</p>
          <p className="text-3xl font-bold text-red-600">{failedScans}</p>
        </div>
        <div className="stat-card border-l-4 border-indigo-500">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('scans.totalFindings')}</p>
          <p className="text-3xl font-bold text-indigo-600">{totalFindings}</p>
        </div>
      </div>

      {/* Skanlar Ro'yxati */}
      {isLoading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : scans?.length > 0 ? (
        <div className="space-y-4">
          {scans.map((scan) => {
            const statusInfo = getStatusInfo(scan.status);
            const StatusIcon = statusInfo.icon;
            return (
              <div
                key={scan.id}
                className={`card p-6 border-l-4 ${statusInfo.border} hover:shadow-xl transition-all duration-300`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className={`p-3 rounded-lg ${statusInfo.bg} flex-shrink-0`}>
                      <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {scan.type === 'email' ? t('scans.emailScan') : `${scan.type} ${t('scans.scanType')}`}
                        </h3>
                        <span className={`badge ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                          {statusInfo.label}
                        </span>
                        {/* Email ko'rsatish (agar mavjud bo'lsa) */}
                        {scan.type === 'email' && scan.summary?.email && (
                          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 flex items-center space-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            <span>{scan.summary.email}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 flex-wrap">
                        <span>
                          {scan.started_at
                            ? formatKST(scan.started_at, 'd MMM, yyyy HH:mm')
                            : formatKST(scan.created_at, 'd MMM, yyyy HH:mm')}
                        </span>
                        {scan.summary && (
                          <>
                            <span>•</span>
                            <span className="font-medium">
                              {scan.summary.total_findings !== undefined && scan.summary.total_findings !== null 
                                ? scan.summary.total_findings 
                                : 0} {t('scans.findings')}
                            </span>
                            {scan.type === 'email' && (
                              <>
                                {scan.summary.total_messages !== undefined && scan.summary.total_messages > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-gray-500 font-medium">
                                      {scan.summary.total_messages} {t('scans.messages')}
                                    </span>
                                  </>
                                )}
                                {scan.summary.processed_messages !== undefined && 
                                 scan.summary.total_messages === undefined && 
                                 scan.summary.processed_messages > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-gray-500 font-medium">
                                      {scan.summary.processed_messages} {t('scans.messages')}
                                    </span>
                                  </>
                                )}
                                {scan.summary.dangerous_messages !== undefined && scan.summary.dangerous_messages > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-red-600 font-medium">
                                      {scan.summary.dangerous_messages} {t('scans.dangerous')}
                                    </span>
                                  </>
                                )}
                                {scan.summary.phishing_detected !== undefined && scan.summary.phishing_detected > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-purple-600 font-medium">
                                      {scan.summary.phishing_detected} {t('scans.phishing') || 'phishing'}
                                    </span>
                                  </>
                                )}
                                {scan.summary.other_messages !== undefined && scan.summary.other_messages > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-green-600 font-medium">
                                      {scan.summary.other_messages} {t('scans.other')}
                                    </span>
                                  </>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                      {scan.error_message && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
                            {scan.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(scan.id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title={t('scans.delete')}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <DocumentMagnifyingGlassIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-500 mb-2">{t('scans.noScans')}</p>
          <p className="text-sm text-gray-400 mb-4">{t('scans.noScansDesc')}</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary"
          >
            <CloudArrowUpIcon className="h-5 w-5 mr-2.5 inline" />
            <span className="font-semibold">{t('scans.startFirstScan')}</span>
          </button>
        </div>
      )}

      {/* Yuklash Modali */}
      {showUploadModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowUploadModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{t('scans.uploadFileForScan')}</h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                )}
                
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('scans.selectFile')}
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                      <div className="space-y-1 text-center">
                        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                            <span>{t('scans.uploadFileLabel')}</span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => setSelectedFile(e.target.files[0])}
                              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                            />
                          </label>
                          <p className="pl-1">{t('scans.dragDrop')}</p>
                        </div>
                        <p className="text-xs text-gray-500">{t('scans.fileFormats')}</p>
                      </div>
                    </div>
                    {selectedFile && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium">
                          {t('scans.selected')}: {selectedFile.name}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {t('scans.size')}: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={!selectedFile || uploadMutation.isLoading}
                      className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadMutation.isLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('scans.uploading')}
                        </span>
                      ) : (
                        <>
                          <CloudArrowUpIcon className="h-5 w-5 mr-2.5" />
                          <span className="font-semibold">{t('scans.uploadAndScan')}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="btn-secondary"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Qo'llanma Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{t('scans.guideTitle')}</h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-gray-800">
              <div className="p-5 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3 mb-3">
                  <InformationCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-900 mb-2">{t('scans.uploadFile')}</h3>
                    <div className="space-y-2 text-sm text-green-800">
                      <p><strong>{t('dashboard.guidePurpose')}</strong> {t('scans.subtitle')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="btn-primary px-6 py-2"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
