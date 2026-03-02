import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatKST } from '../utils/dateUtils';
import { useFindingsStats } from '../hooks/useFindingsStats';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { t } = useTranslation();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const navigate = useNavigate();
  // Token bor-yo'qligini tekshirish
  const hasToken = !!localStorage.getItem('token');
  
  // Handle email click - navigate to Findings with email and severity filters
  const handleEmailClick = (email) => {
    // Navigate to Findings page with email filter and severity filter for dangerous messages
    navigate(`/findings?email=${encodeURIComponent(email)}&severity=high`);
  };

  // Umumiy statistika hook'ini ishlatish
  const { stats: findingsStats, findings, isLoading: findingsLoading, error: findingsError } = useFindingsStats();
  
  // Dashboard uchun faqat oxirgi 20 ta findings'ni ko'rsatish
  const recentFindings = findings?.slice(0, 20) || [];

  const { data: scans, isLoading: scansLoading, error: scansError } = useQuery(
    'scans',
    async () => {
      try {
        const response = await api.get('/v1/scans/?limit=100'); // Ko'proq skanlarni olish (Gmail statistikasi uchun)
        return response.data;
      } catch (error) {
        // 401, 404 yoki network xatolarini ignore qilamiz
        if (error.response?.status === 401 || error.response?.status === 404 || error.code === 'ERR_NETWORK') {
          return [];
        }
        console.error('Error fetching scans:', error);
        return [];
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true, // Window focus bo'lganda yangilash
      enabled: hasToken, // Faqat token bo'lsa ishlaydi
      refetchInterval: 5000, // 5 soniyada bir yangilash (real-time)
    }
  );

  const { data: items, error: itemsError } = useQuery(
    'sensitive-items',
    async () => {
      try {
        const response = await api.get('/v1/sensitive-items/');
        return response.data;
      } catch (error) {
        // 401, 404 yoki network xatolarini ignore qilamiz
        if (error.response?.status === 401 || error.response?.status === 404 || error.code === 'ERR_NETWORK') {
          return [];
        }
        console.error('Error fetching sensitive items:', error);
        return [];
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: false,
      enabled: hasToken, // Faqat token bo'lsa ishlaydi
    }
  );

  // Get connected accounts to show Gmail statistics
  const { data: accounts } = useQuery(
    'connected-accounts',
    async () => {
      try {
        const response = await api.get('/v1/oauth/accounts');
        return response.data;
      } catch (error) {
        if (error.response?.status === 401 || error.code === 'ERR_NETWORK') {
          return [];
        }
        return [];
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true, // Window focus bo'lganda yangilash
      enabled: hasToken,
      refetchInterval: 10000, // 10 soniyada bir yangilash (real-time)
    }
  );

  // Filter Gmail accounts only
  const gmailAccounts = accounts?.filter(acc => acc.provider === 'gmail' && acc.is_active) || [];
  const showGmailStats = gmailAccounts.length > 1;

  // Calculate detailed statistics for each Gmail account
  const gmailStats = gmailAccounts.length > 0 ? gmailAccounts.map(account => {
    // Find scans for this email account (case-insensitive comparison)
    const accountScans = scans?.filter(s => {
      if (s.type !== 'email') return false;
      const scanEmail = s.summary?.email;
      if (!scanEmail) return false;
      // Case-insensitive email comparison
      return scanEmail.toLowerCase() === account.email.toLowerCase();
    }) || [];
    
    // Calculate total messages from all scans for this account
    // IMPORTANT: Don't sum messages from different scans - use the latest scan's total_messages
    // This prevents double-counting when multiple scans exist for the same account
    let totalMessages = 0;
    let dangerousMessages = 0;
    let otherMessages = 0;
    let lastScanDate = null;
    
    if (accountScans.length > 0) {
      // Use the most recent scan's total_messages (or processed_messages)
      // Sort by created_at descending to get the latest scan
      const sortedScans = [...accountScans].sort((a, b) => {
        const aTime = new Date(a.created_at || a.started_at || 0).getTime();
        const bTime = new Date(b.created_at || b.started_at || 0).getTime();
        return bTime - aTime;
      });
      
      const latestScan = sortedScans[0];
      lastScanDate = latestScan.created_at || latestScan.started_at;
      
      const messages = latestScan.summary?.total_messages;
      if (messages !== undefined && messages !== null && typeof messages === 'number') {
        totalMessages = messages; // Use latest scan's total, don't sum
      } else {
        const processedMessages = latestScan.summary?.processed_messages;
        if (processedMessages !== undefined && processedMessages !== null && typeof processedMessages === 'number') {
          totalMessages = processedMessages; // Use latest scan's processed, don't sum
        }
      }
      
      // Get dangerous_messages (phishing or high-risk messages)
      if (latestScan.summary?.dangerous_messages !== undefined && latestScan.summary?.dangerous_messages !== null && typeof latestScan.summary?.dangerous_messages === 'number') {
        dangerousMessages = latestScan.summary.dangerous_messages;
      } else if (latestScan.summary?.phishing_detected !== undefined && latestScan.summary?.phishing_detected !== null && typeof latestScan.summary?.phishing_detected === 'number') {
        dangerousMessages = latestScan.summary.phishing_detected;
      }
      
      // Get other_messages (non-dangerous messages)
      if (latestScan.summary?.other_messages !== undefined && latestScan.summary?.other_messages !== null && typeof latestScan.summary?.other_messages === 'number') {
        otherMessages = latestScan.summary.other_messages;
      } else if (totalMessages > 0 && dangerousMessages >= 0) {
        otherMessages = Math.max(0, totalMessages - dangerousMessages);
      }
    }
    
    // Calculate findings (xabarlar) count for this Gmail account
    // Findings'larda source_url_or_message_id format: gmail:{message_id}:{thread_id}:{message_id_header}
    // Account'ga tegishli findings'larni topish uchun scan_id orqali filtrlash
    const accountFindings = findings?.filter(f => {
      if (f.source_type !== 'email') return false;
      if (!f.source_url_or_message_id || !f.source_url_or_message_id.startsWith('gmail:')) return false;
      
      // Scan orqali email'ni tekshirish
      const findingScan = scans?.find(s => s.id === f.scan_id && s.type === 'email');
      if (findingScan && findingScan.summary?.email) {
        const scanEmail = findingScan.summary.email.toLowerCase().trim();
        return scanEmail === account.email.toLowerCase().trim();
      }
      return false;
    }) || [];
    
    // Unique xabarlar sonini hisoblash (message_id asosida)
    const uniqueMessages = new Set();
    let highSeverityCount = 0;
    let phishingCount = 0;
    
    accountFindings.forEach(finding => {
      if (finding.source_url_or_message_id && finding.source_url_or_message_id.startsWith('gmail:')) {
        // Format: gmail:{message_id}:{thread_id}:{message_id_header}
        const parts = finding.source_url_or_message_id.split(':');
        if (parts.length >= 2) {
          const messageId = parts[1]; // message_id
          uniqueMessages.add(messageId);
        }
      }
      
      // Count by severity
      if (finding.severity === 'high') {
        highSeverityCount++;
      }
      if (finding.is_phishing) {
        phishingCount++;
      }
    });
    
    const findingsMessagesCount = uniqueMessages.size;
    
    return {
      email: account.email,
      accountId: account.id,
      totalMessages: totalMessages,
      dangerousMessages: dangerousMessages,
      otherMessages: otherMessages,
      scansCount: accountScans.length,
      findingsMessagesCount: findingsMessagesCount, // Gmail'ga tegishli xabarlar soni (findings'dan)
      highSeverityCount: highSeverityCount,
      phishingCount: phishingCount,
      lastScanDate: lastScanDate,
      completedScans: accountScans.filter(s => s.status === 'completed').length,
      runningScans: accountScans.filter(s => s.status === 'running' || s.status === 'pending').length,
      failedScans: accountScans.filter(s => s.status === 'failed').length
    };
  }) : [];
  
  // showGmailStats is already declared above (line 107)

  // Umumiy statistika hook'idan olingan ma'lumotlarni ishlatish
  const highFindings = findingsStats?.high || 0;
  const unresolvedFindings = findingsStats?.unresolved || 0;
  const phishingFindings = findingsStats?.phishing || 0;
  const totalFindings = findingsStats?.total || 0;
  const resolvedFindings = findingsStats?.resolved || 0;
  
  // Jami xabarlar sonini hisoblash (har bir hisob uchun faqat eng so'nggi scan'dan)
  // Bu double-counting oldini oladi (bir xil hisob uchun bir nechta scan bo'lsa)
  // Barcha scan'lardan jami xabarlar sonini olamiz
  const totalMessages = (() => {
    if (!scans || scans.length === 0) return 0;
    
    // Agar Gmail hisoblar mavjud bo'lsa, har bir hisob uchun eng so'nggi scan'dan olamiz
    if (gmailAccounts.length > 0) {
      return gmailAccounts.reduce((sum, account) => {
        // Find scans for this email account
        const accountScans = scans.filter(s => {
          if (s.type !== 'email') return false;
          const scanEmail = s.summary?.email;
          if (!scanEmail) return false;
          return scanEmail.toLowerCase() === account.email.toLowerCase();
        });
        
        if (accountScans.length > 0) {
          // Use the most recent scan's total_messages (or processed_messages)
          const sortedScans = [...accountScans].sort((a, b) => {
            const aTime = new Date(a.created_at || a.started_at || 0).getTime();
            const bTime = new Date(b.created_at || b.started_at || 0).getTime();
            return bTime - aTime;
          });
          
          const latestScan = sortedScans[0];
          const messages = latestScan.summary?.total_messages;
          if (messages !== undefined && messages !== null && typeof messages === 'number') {
            return sum + messages;
          }
          const processedMessages = latestScan.summary?.processed_messages;
          if (processedMessages !== undefined && processedMessages !== null && typeof processedMessages === 'number') {
            return sum + processedMessages;
          }
        }
        return sum;
      }, 0);
    }
    
    // Fallback: agar gmailAccounts bo'sh bo'lsa, barcha email scan'lardan yig'amiz
    return scans.reduce((sum, scan) => {
      if (scan.type === 'email' && scan.summary) {
        const messages = scan.summary?.total_messages;
        if (messages !== undefined && messages !== null && typeof messages === 'number') {
          return sum + messages;
        }
        const processedMessages = scan.summary?.processed_messages;
        if (processedMessages !== undefined && processedMessages !== null && typeof processedMessages === 'number') {
          return sum + processedMessages;
        }
      }
      return sum;
    }, 0);
  })();

  // Shaxsiy ma'lumotlar topilgan xabarlar sonini hisoblash (unique xabarlar)
  // Findings'larda type "phishing" bo'lmagan va source_type "email" bo'lgan findings'larni hisoblaymiz
  const sensitiveDataMessages = findings?.filter(f => {
    if (f.source_type !== 'email') return false;
    if (f.type === 'phishing') return false; // Phishing xabarlarni hisoblamaymiz
    if (!f.source_url_or_message_id || !f.source_url_or_message_id.startsWith('gmail:')) return false;
    return true;
  }).reduce((uniqueMessages, finding) => {
    // Format: gmail:{message_id}:{thread_id}:{message_id_header}
    const parts = finding.source_url_or_message_id.split(':');
    if (parts.length >= 2) {
      const messageId = parts[1]; // message_id
      uniqueMessages.add(messageId);
    }
    return uniqueMessages;
  }, new Set()).size || 0;

  // Backend ulanib turganini tekshirish
  const hasNetworkError = findingsError?.code === 'ERR_NETWORK' || 
                          scansError?.code === 'ERR_NETWORK' || 
                          itemsError?.code === 'ERR_NETWORK' ||
                          findingsError?.message === 'Network Error' ||
                          scansError?.message === 'Network Error' ||
                          itemsError?.message === 'Network Error';
  
  const hasAuthError = findingsError?.response?.status === 401 ||
                       scansError?.response?.status === 401 ||
                       itemsError?.response?.status === 401;
  
  const isBackendConnected = !hasNetworkError;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Sarlavha */}
      <div className="text-center relative">
        <div className="flex items-center justify-center space-x-2">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {t('dashboard.securityDashboard')}
            </h1>
            <p className="text-lg text-gray-600">
              {t('dashboard.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowGuideModal(true)}
            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            title={t('dashboard.userGuide')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Backend Ulanish Xatosi */}
      {!isBackendConnected && (
        <div className="card p-6 bg-red-50 border-2 border-red-200 animate-slide-up">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">{t('dashboard.backendConnectionError')}</h3>
              <p className="text-red-700 mb-4">
                {t('dashboard.backendConnectionErrorDesc')} <code className="bg-red-100 px-2 py-1 rounded">http://localhost:8000</code> {t('dashboard.backendConnectionErrorDesc2')}
              </p>
              <div className="bg-red-100 p-4 rounded-lg">
                <p className="text-sm font-medium text-red-900 mb-2">{t('dashboard.fixSteps')}</p>
                <ol className="list-decimal list-inside text-sm text-red-800 space-y-1">
                  <li>{t('dashboard.fixStep1')} <code className="bg-red-200 px-1 rounded">backend</code></li>
                  <li>{t('dashboard.fixStep2')} <code className="bg-red-200 px-1 rounded">venv\Scripts\activate</code></li>
                  <li>{t('dashboard.fixStep3')} <code className="bg-red-200 px-1 rounded">start_local.bat</code></li>
                  <li>{t('dashboard.fixStep4')} <code className="bg-red-200 px-1 rounded">http://localhost:8000</code></li>
                  <li>{t('dashboard.fixStep5')}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Autentifikatsiya Xatosi */}
      {hasAuthError && !hasNetworkError && (
        <div className="card p-6 bg-yellow-50 border-2 border-yellow-200 animate-slide-up">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 mb-2">{t('dashboard.authRequired')}</h3>
              <p className="text-yellow-700 mb-4">
                {t('dashboard.authRequiredDesc')}
              </p>
              <div className="bg-yellow-100 p-4 rounded-lg">
                <p className="text-sm font-medium text-yellow-900 mb-2">{t('dashboard.authRequiredSteps')}</p>
                <p className="text-sm text-yellow-800">
                  {t('dashboard.authRequiredDesc2')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistika Kartalari */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.highSeverity')}</p>
              <p className="text-3xl font-bold text-red-600">{highFindings}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="stat-card border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.phishing')}</p>
              <p className="text-3xl font-bold text-purple-600">{phishingFindings}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <ExclamationCircleIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="stat-card border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.sensitiveData')}</p>
              <p className="text-3xl font-bold text-blue-600">{sensitiveDataMessages}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.totalScansTitle')}</p>
              <p className="text-3xl font-bold text-green-600">{scans?.length || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DocumentMagnifyingGlassIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Xulosa Kartalari */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Topilmalar Xulosa */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.findingsSummary')}</h2>
            <Link
              to="/findings"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              {t('dashboard.viewAll')}
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
                <span className="font-medium text-gray-900">{t('dashboard.unresolved')}</span>
              </div>
              <span className="text-2xl font-bold text-red-600">{unresolvedFindings}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                <span className="font-medium text-gray-900">{t('dashboard.resolved')}</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{resolvedFindings}</span>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('dashboard.totalFindings')}</span>
                <span className="text-lg font-bold text-gray-900">{totalFindings}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Oxirgi Skanlar */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.recentScansTitle')}</h2>
            <Link
              to="/scans"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              {t('dashboard.viewAll')}
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          {scansLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : scans?.length > 0 ? (
            <div className="space-y-3">
              {scans.slice(0, 5).map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <DocumentMagnifyingGlassIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {scan.type === 'email' && scan.summary?.email 
                          ? `${t('dashboard.emailScan')} - ${scan.summary.email}`
                          : `${scan.type} ${t('dashboard.scanType')}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatKST(scan.created_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`badge flex-shrink-0 ml-2 ${
                      scan.status === 'completed'
                        ? 'badge-success'
                        : scan.status === 'running'
                        ? 'badge-low'
                        : scan.status === 'failed'
                        ? 'badge-high'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {scan.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DocumentMagnifyingGlassIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>{t('dashboard.noScansYet')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Qo'llanma Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{t('dashboard.guideTitle')}</h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-gray-800">
              <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-start space-x-3 mb-3">
                  <InformationCircleIcon className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-indigo-900 mb-2">{t('dashboard.title')}</h3>
                    <div className="space-y-2 text-sm text-indigo-800">
                      <p><strong>{t('dashboard.guidePurpose')}</strong> {t('dashboard.guidePurposeDesc')}</p>
                      <p><strong>{t('dashboard.guideShows')}</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>{t('dashboard.statCards')}</strong>
                          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                            <li>{t('dashboard.statHigh')}</li>
                            <li>{t('dashboard.statMedium')}</li>
                            <li>{t('dashboard.statLow')}</li>
                            <li>{t('dashboard.statPhishing')}</li>
                            <li>{t('dashboard.statSensitive')}</li>
                            <li>{t('dashboard.statTotalScans')}</li>
                          </ul>
                        </li>
                        <li><strong>{t('dashboard.findingsSummarySection')}</strong>
                          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                            <li>{t('dashboard.findingsUnresolved')}</li>
                            <li>{t('dashboard.findingsResolved')}</li>
                            <li>{t('dashboard.findingsTotal')}</li>
                          </ul>
                        </li>
                        <li><strong>{t('dashboard.recentScansSection')}</strong> {t('dashboard.recentScansDesc')}</li>
                        <li><strong>{t('dashboard.recentFindingsSection')}</strong> {t('dashboard.recentFindingsDesc')}</li>
                      </ul>
                      <p className="mt-2"><strong>{t('dashboard.viewAll')}:</strong> {t('dashboard.viewAllDesc')}</p>
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
