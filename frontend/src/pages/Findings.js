import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { formatKST } from '../utils/dateUtils';
import { useFindingsStats } from '../hooks/useFindingsStats';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FunnelIcon,
  TrashIcon,
  ShieldExclamationIcon,
  EyeIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function Findings() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState('all');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const queryClient = useQueryClient();

  // Token bor-yo'qligini tekshirish
  const hasToken = !!localStorage.getItem('token');
  
  // Initialize filters from URL parameters
  useEffect(() => {
    const severityParam = searchParams.get('severity');
    
    if (severityParam) {
      setSeverityFilter(severityParam);
    }
  }, [searchParams]);


  // Get scans to extract email information for each finding
  const { data: scans } = useQuery(
    'scans',
    async () => {
      try {
        const response = await api.get('/v1/scans/?limit=100');
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
      refetchOnWindowFocus: false,
      enabled: hasToken,
    }
  );

  // Helper function to get email from scan for a finding
  const getEmailForFinding = (finding) => {
    if (!finding.scan_id || !scans) return null;
    
    const scan = scans.find(s => s.id === finding.scan_id && s.type === 'email');
    if (scan && scan.summary && scan.summary.email) {
      return scan.summary.email;
    }
    return null;
  };

  const { data: findingsData, isLoading, error: findingsError } = useQuery(
    ['findings', severityFilter, resolvedFilter],
    async () => {
      try {
        const params = new URLSearchParams();
        // Yuqori xavf xabarlari uchun limitni oshirish (1000 tagacha)
        if (severityFilter === 'high' || severityFilter === 'phishing') {
          params.append('limit', '1000');
        } else {
          params.append('limit', '500'); // Boshqa xabarlar uchun 500
        }
        if (severityFilter === 'phishing') {
          // Phishing uchun alohida parametr
          params.append('phishing', 'true');
        } else if (severityFilter !== 'all') {
          params.append('severity', severityFilter);
        }
        if (resolvedFilter !== 'all') {
          params.append('resolved', resolvedFilter === 'resolved');
        }
        const response = await api.get(`/v1/findings/?${params.toString()}`);
        
        // Ensure we always return a valid response structure
        if (!response.data || !response.data.items) {
          console.warn('Invalid response structure:', response.data);
          return { items: [], total: 0, skip: 0, limit: parseInt(params.get('limit') || '100') };
        }
        
        return response.data;
      } catch (error) {
        // 401, 404 yoki network xatolarini ignore qilamiz
        if (error.response?.status === 401 || error.response?.status === 404 || error.code === 'ERR_NETWORK') {
          return { items: [], total: 0 };
        }
        console.error('Error fetching findings:', error);
        return { items: [], total: 0 };
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true, // Oynaga qaytganda avtomatik yangilash
      refetchInterval: 30000, // 30 soniyada bir avtomatik yangilash
      enabled: hasToken, // Faqat token bo'lsa ishlaydi
    }
  );

  // Extract findings items and total count from response
  const findings = findingsData?.items || [];
  const totalFindingsCount = findingsData?.total || 0;

  const resolveMutation = useMutation(
    async ({ id, resolved, notes }) => {
      const response = await api.post(`/v1/findings/${id}/resolve`, { resolved, notes });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('findings');
        queryClient.refetchQueries('findings'); // Avtomatik yangilash
      },
    }
  );

  const deleteMessageMutation = useMutation(
    async (messageId) => {
      const response = await api.post(`/v1/oauth/gmail/message/${messageId}/delete`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('findings');
        queryClient.refetchQueries('findings'); // Avtomatik yangilash
        alert('Xabar muvaffaqiyatli o\'chirildi');
      },
      onError: (error) => {
        console.error('Delete message error:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Xatolik yuz berdi';
        
        if (error.response?.status === 403) {
          // Backend'dan kelgan batafsil xato xabarini ko'rsatish
          const detail = error.response?.data?.detail || '';
          
          // Batafsil xato xabarini ko'rsatish
          const fullMessage = detail || 'Xabarni o\'chirish uchun yetarli ruxsat yo\'q.';
          
          alert(
            `❌ Xatolik: ${fullMessage}\n\n` +
            `📋 Yechim:\n` +
            `1. Settings sahifasiga o'ting\n` +
            `2. Gmail hisobingizni o'chirib tashlang\n` +
            `3. Gmail hisobini qayta ulang\n` +
            `4. Google'da ruxsat berishda BARCHA scope'larni tanlang (gmail.modify ham!)`
          );
        } else if (error.response?.status === 401) {
          alert('❌ Xatolik: Token eskirgan. Iltimos, qayta login qiling.');
        } else if (error.response?.status === 404) {
          alert('❌ Xatolik: Xabar topilmadi. Xabar allaqachon o\'chirilgan bo\'lishi mumkin.');
        } else {
          alert(`❌ Xatolik: ${errorMessage}`);
        }
      },
    }
  );

  const spamMessageMutation = useMutation(
    async (messageId) => {
      const response = await api.post(`/v1/oauth/gmail/message/${messageId}/spam`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('findings');
        queryClient.refetchQueries('findings'); // Avtomatik yangilash
        alert('Xabar spam sifatida belgilandi');
      },
      onError: (error) => {
        console.error('Spam message error:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Xatolik yuz berdi';
        
        if (error.response?.status === 403) {
          // Backend'dan kelgan batafsil xato xabarini ko'rsatish
          const detail = error.response?.data?.detail || '';
          
          // Batafsil xato xabarini ko'rsatish
          const fullMessage = detail || 'Xabarni spam sifatida belgilash uchun yetarli ruxsat yo\'q.';
          
          alert(
            `❌ Xatolik: ${fullMessage}\n\n` +
            `📋 Yechim:\n` +
            `1. Settings sahifasiga o'ting\n` +
            `2. Gmail hisobingizni o'chirib tashlang\n` +
            `3. Gmail hisobini qayta ulang\n` +
            `4. Google'da ruxsat berishda BARCHA scope'larni tanlang (gmail.modify ham!)`
          );
        } else if (error.response?.status === 401) {
          alert('❌ Xatolik: Token eskirgan. Iltimos, qayta login qiling.');
        } else if (error.response?.status === 404) {
          alert('❌ Xatolik: Xabar topilmadi. Xabar allaqachon o\'chirilgan bo\'lishi mumkin.');
        } else {
          alert(`❌ Xatolik: ${errorMessage}`);
        }
      },
    }
  );

  const extractGmailInfo = (finding) => {
    if (!finding.source_url_or_message_id || !finding.source_url_or_message_id.startsWith('gmail:')) {
      return null;
    }
    
    // Parse source_id format: gmail:{messageId} or gmail:{messageId}:{threadId} or gmail:{messageId}:{threadId}:{messageIdHeader}
    const sourceId = finding.source_url_or_message_id.replace('gmail:', '');
    const parts = sourceId.split(':');
    const messageId = parts[0];  // Gmail API message ID
    const threadId = parts.length > 1 && parts[1] ? parts[1] : null;  // Thread ID (may be empty)
    const messageIdHeader = parts.length > 2 && parts[2] ? parts[2] : null;  // Message-ID from email headers
    
    
    const snippet = finding.snippet || '';
    
    // Extract from and date from snippet - multiline mode
    // Pattern: From: <email> or From: Name <email> or From: email
    const fromMatch = snippet.match(/From:\s*([^\n\r]+)/i);
    // Pattern: Date: <date string>
    const dateMatch = snippet.match(/Date:\s*([^\n\r]+)/i);
    
    // Clean up extracted values
    let from = '';
    let date = '';
    
    if (fromMatch && fromMatch[1]) {
      from = fromMatch[1].trim();
      // Extract email if format is "Name <email>" or "<email>"
      const emailMatch = from.match(/<([^>]+)>/);
      if (emailMatch) {
        from = emailMatch[1];
      } else {
        // If no angle brackets, use the whole string
        from = from.trim();
      }
    }
    
    if (dateMatch && dateMatch[1]) {
      date = dateMatch[1].trim();
    }
    
    return {
      messageId,  // Gmail API message ID
      threadId,   // Gmail thread ID
      messageIdHeader,  // Message-ID header from email
      from: from || 'Noma\'lum',
      date: date || 'Noma\'lum',
      snippet: snippet || ''  // Include snippet for search fallback
    };
  };

  const openGmailMessage = (messageId, threadId = null, messageIdHeader = null, gmailInfo = null) => {
    // Gmail'da anashi xabarni ochish: Message-ID bo'lsa qidiruv (bitta xabar belgilangan), aks holda thread
    // 1) rfc822msgid — aniq xabarni qidiruvda ko'rsatadi (belgilab ko'rsatadi)
    // 2) threadId — threadni ochadi (#all — arxivlanganlar ham)
    // 3) boshqa fallback'lar
    let gmailUrl;

    if (messageIdHeader && messageIdHeader.trim() !== '') {
      // Birinchi: Message-ID orqali aniq xabarni qidiruvda ochish — xabar belgilab ko'rinadi
      let cleanMessageId = messageIdHeader.trim().replace(/^<|>$/g, '');
      gmailUrl = 'https://mail.google.com/mail/u/0/#search/rfc822msgid:' + encodeURIComponent(cleanMessageId);
    } else if (threadId && threadId.trim() !== '') {
      // Ikkinchi: thread ID — #all ishlatamiz (inbox, arxiv, barcha joydagi xabar ochiladi)
      gmailUrl = `https://mail.google.com/mail/u/0/#all/${threadId}`;
    } else if (gmailInfo && (gmailInfo.from || gmailInfo.date || gmailInfo.snippet)) {
      // Fallback 2: Use Gmail search operators (from, subject, date)
      // Build search query using Gmail search operators
      let searchQuery = 'in:anywhere';  // Search everywhere (inbox, spam, archive, trash)
      
      // Add from: operator if available
      if (gmailInfo.from && gmailInfo.from !== 'Noma\'lum' && gmailInfo.from.includes('@')) {
        // Extract email from "Name <email@example.com>" format
        const emailMatch = gmailInfo.from.match(/<([^>]+)>/) || gmailInfo.from.match(/([^\s<>]+@[^\s<>]+)/);
        if (emailMatch) {
          const email = emailMatch[1] || emailMatch[0];
          searchQuery += ` from:${email}`;
        } else {
          searchQuery += ` from:${gmailInfo.from}`;
        }
      }
      
      // Add subject: operator if available (extract from snippet)
      if (gmailInfo.snippet) {
        const subjectMatch = gmailInfo.snippet.match(/Subject:\s*([^\n\r]+)/i);
        if (subjectMatch && subjectMatch[1] && subjectMatch[1] !== 'N/A') {
          const subject = subjectMatch[1].trim();
          // Remove quotes and escape special characters
          const cleanSubject = subject.replace(/"/g, '\\"');
          searchQuery += ` subject:"${cleanSubject}"`;
        }
      }
      
      // Add date: operator if available
      if (gmailInfo.date && gmailInfo.date !== 'Noma\'lum') {
        try {
          // Try to parse date and format for Gmail search
          const dateObj = new Date(gmailInfo.date);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            // Use after: operator to search for messages on or after this date
            searchQuery += ` after:${year}/${month}/${day}`;
            // Also add before: operator for the next day to narrow down
            const nextDay = new Date(dateObj);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextYear = nextDay.getFullYear();
            const nextMonth = String(nextDay.getMonth() + 1).padStart(2, '0');
            const nextDayStr = String(nextDay.getDate()).padStart(2, '0');
            searchQuery += ` before:${nextYear}/${nextMonth}/${nextDayStr}`;
          }
        } catch (e) {
          console.warn('Error parsing date for Gmail search:', e);
        }
      }
      
      // Add unique text from snippet if available (to narrow down search)
      if (gmailInfo.snippet) {
        // Extract a unique phrase from snippet (first 50 characters)
        const snippetText = gmailInfo.snippet.replace(/Subject:\s*[^\n\r]+/i, '')
          .replace(/From:\s*[^\n\r]+/i, '')
          .replace(/Date:\s*[^\n\r]+/i, '')
          .trim()
          .substring(0, 50);
        if (snippetText && snippetText.length > 5) {
          // Use quotes for exact phrase search
          const cleanSnippet = snippetText.replace(/"/g, '\\"');
          searchQuery += ` "${cleanSnippet}"`;
        }
      }
      
      // URL encode the search query
      gmailUrl = 'https://mail.google.com/mail/u/0/#search/' + encodeURIComponent(searchQuery);
    } else if (messageId && messageId.trim() !== '') {
      // Fallback 3: Try to use message ID as thread ID (sometimes they're the same)
      // Format: https://mail.google.com/mail/u/0/#inbox/{messageId}
      gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${messageId}`;
    } else {
      // Last resort: Try to open Gmail inbox
      // No valid Gmail identifiers found, opening inbox
      gmailUrl = `https://mail.google.com/mail/u/0/#inbox`;
    }
    
    // Check if user needs to login to Gmail
    try {
      window.open(gmailUrl, '_blank');
    } catch (error) {
      console.error('Error opening Gmail:', error);
      // Show alert if popup blocked or other error
      alert('Gmail oynasini ochishda xatolik yuz berdi. Iltimos, brauzer sozlamalarini tekshiring.');
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm('Bu xabarni o\'chirishni xohlaysizmi?')) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const handleSpamMessage = (messageId) => {
    if (window.confirm('Bu xabarni spam sifatida belgilashni xohlaysizmi?')) {
      spamMessageMutation.mutate(messageId);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return { bg: 'bg-red-50', border: 'border-red-500', badge: 'badge-high' };
      case 'medium':
        return { bg: 'bg-yellow-50', border: 'border-yellow-500', badge: 'badge-medium' };
      case 'low':
        return { bg: 'bg-blue-50', border: 'border-blue-500', badge: 'badge-low' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-500', badge: 'bg-gray-100 text-gray-800' };
    }
  };

  // Umumiy statistika hook'ini ishlatish
  const { stats: globalStats } = useFindingsStats();
  
  // Filtrlangan findings uchun lokal statistika
  // Lekin umumiy statistika uchun global stats ishlatamiz
  const totalFindings = globalStats?.total || 0;
  const highCount = globalStats?.high || 0;
  const mediumCount = globalStats?.medium || 0;
  const unresolvedCount = globalStats?.unresolved || 0;
  const phishingCount = globalStats?.phishing || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sarlavha */}
      <div className="flex items-center space-x-2">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('findings.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('findings.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowGuideModal(true)}
          className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
          title={t('findings.userGuide')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        </button>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('findings.high')}</p>
          <p className="text-2xl font-bold text-red-600">{highCount}</p>
        </div>
        <div className="stat-card border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('findings.phishing') || 'Phishing'}</p>
          <p className="text-2xl font-bold text-purple-600">{phishingCount}</p>
        </div>
        <div className="stat-card border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('findings.unresolved')}</p>
          <p className="text-2xl font-bold text-orange-600">{unresolvedCount}</p>
        </div>
        <div className="stat-card border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('findings.total')}</p>
          <p className="text-2xl font-bold text-green-600">{totalFindings}</p>
        </div>
      </div>

      {/* Filtrlar */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{t('findings.filtering')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('findings.severity')}</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">{t('findings.allSeverities')}</option>
              <option value="high">{t('findings.high')}</option>
              <option value="low">{t('findings.low')}</option>
              <option value="phishing">{t('findings.phishing')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('findings.status')}</label>
            <select
              value={resolvedFilter}
              onChange={(e) => setResolvedFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">{t('findings.allStatuses')}</option>
              <option value="unresolved">{t('findings.unresolvedStatus')}</option>
              <option value="resolved">{t('findings.resolvedStatus')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Topilmalar Ro'yxati */}
      {isLoading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : findings?.length > 0 ? (
        <div className="space-y-4">
          {findings.map((finding) => {
            // Backend allaqachon email bo'yicha filtrlashni amalga oshiradi,
            // shuning uchun frontend'da qo'shimcha filtrlash kerak emas
            const colors = getSeverityColor(finding.severity);
            return (
              <div
                key={finding.id}
                className={`card p-6 border-l-4 ${colors.border} hover:shadow-xl transition-all duration-300 overflow-hidden`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="font-semibold text-gray-900 capitalize">{finding.type}</span>
                      <span className={`badge ${colors.badge}`}>
                        {finding.severity}
                      </span>
                      {finding.resolved && (
                        <span className="badge badge-success flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Yechilgan
                        </span>
                      )}
                    </div>
                    <div className={`p-4 rounded-lg ${colors.bg} mb-3 overflow-hidden`}>
                      <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap overflow-wrap-anywhere">
                        {finding.snippet}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 flex-wrap">
                      <span>Manba: <span className="font-medium capitalize">{finding.source_type}</span></span>
                      <span>•</span>
                      <span>{formatKST(finding.created_at, 'd MMM, yyyy HH:mm')}</span>
                      {(() => {
                        // Get email from scan for this finding
                        const findingEmail = getEmailForFinding(finding);
                        if (findingEmail) {
                          return (
                            <>
                              <span>•</span>
                              <span className="flex items-center space-x-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-3 w-3 text-blue-600">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                <span>Email: <span className="font-medium text-blue-600">{findingEmail}</span></span>
                              </span>
                            </>
                          );
                        }
                        return null;
                      })()}
                      {(() => {
                        const gmailInfo = extractGmailInfo(finding);
                        if (gmailInfo) {
                          return (
                            <>
                              <span>•</span>
                              <span>Yuboruvchi: <span className="font-medium">{gmailInfo.from}</span></span>
                              <span>•</span>
                              <span>Vaqt: <span className="font-medium">{gmailInfo.date}</span></span>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {(() => {
                      const gmailInfo = extractGmailInfo(finding);
                      if (gmailInfo) {
                        return (
                          <>
                              <button
                                onClick={() => openGmailMessage(gmailInfo.messageId, gmailInfo.threadId, gmailInfo.messageIdHeader, gmailInfo)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Gmail'da ochish"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                            <button
                              onClick={() => handleSpamMessage(gmailInfo.messageId)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Spam sifatida belgilash"
                              disabled={spamMessageMutation.isLoading}
                            >
                              <ShieldExclamationIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(gmailInfo.messageId)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="O'chirish"
                              disabled={deleteMessageMutation.isLoading}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </>
                        );
                      }
                      return null;
                    })()}
                    {!finding.resolved && (
                      <button
                        onClick={() => resolveMutation.mutate({ id: finding.id, resolved: true })}
                        className="btn-primary whitespace-nowrap"
                      >
                        Yechilgan Deb Belgilash
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-500 mb-2">{t('findings.noFindings')}</p>
          <p className="text-sm text-gray-400">{t('findings.noFindingsDesc')}</p>
        </div>
      )}

      {/* Qo'llanma Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{t('findings.guideTitle')}</h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-gray-800">
              <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3 mb-3">
                  <InformationCircleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-yellow-900 mb-2">Topilmalarni Ko'rish va Boshqarish</h3>
                    <div className="space-y-2 text-sm text-yellow-800">
                      <p><strong>Maqsad:</strong> Aniqlangan shaxsiy ma'lumotlar oqib ketishlarini ko'rish va boshqarish</p>
                      <p><strong>Qanday ko'rish:</strong></p>
                      <ol className="list-decimal list-inside ml-2 space-y-1">
                        <li>Navigation bar'da "Topilmalar" bo'limiga o'ting</li>
                        <li>Barcha topilmalar ro'yxatda ko'rinadi</li>
                        <li>Har bir topilma quyidagi ma'lumotlarni ko'rsatadi:
                          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                            <li><strong>Turi:</strong> Aniqlangan ma'lumot turi (Email, Telefon, va hokazo)</li>
                            <li><strong>Daraja:</strong> Yuqori, O'rtacha yoki Past</li>
                            <li><strong>Matn qismi:</strong> Topilgan joyning ko'rinishi</li>
                            <li><strong>Manba:</strong> Qayerdan topilgan (fayl, email, va hokazo)</li>
                            <li><strong>Vaqt:</strong> Qachon topilgan</li>
                          </ul>
                        </li>
                      </ol>
                      <p className="mt-2"><strong>Filtrlash:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Daraja:</strong> Barcha, Yuqori, O'rtacha yoki Past</li>
                        <li><strong>Holat:</strong> Barcha, Yechilmagan yoki Yechilgan</li>
                      </ul>
                      <p className="mt-2"><strong>Yechilgan deb belgilash:</strong></p>
                      <ol className="list-decimal list-inside ml-2 space-y-1">
                        <li>Topilma yonidagi "Yechilgan Deb Belgilash" tugmasini bosing</li>
                        <li>Topilma "Yechilgan" holatiga o'tadi</li>
                        <li>Yechilgan topilmalar filtrda ko'rinmaydi (agar "Yechilmagan" tanlangan bo'lsa)</li>
                      </ol>
                      <p className="mt-2"><strong>Gmail xabarlari uchun:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Gmail'da ochish:</strong> Xabarni Gmail'da ochish uchun ko'z ikonkasini bosing</li>
                        <li><strong>Spam sifatida belgilash:</strong> Xabarni spam sifatida belgilash uchun qalqon ikonkasini bosing</li>
                        <li><strong>O'chirish:</strong> Xabarni o'chirish uchun quti ikonkasini bosing</li>
                      </ul>
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
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
