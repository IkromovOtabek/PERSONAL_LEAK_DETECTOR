import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { formatKST } from '../utils/dateUtils';
import {
  Cog6ToothIcon,
  EnvelopeIcon,
  LinkIcon,
  TrashIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  StopIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { useNavigate, Link } from 'react-router-dom';

export default function Settings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [credentialsFile, setCredentialsFile] = useState(null);
  const [tokenFile, setTokenFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [scanningAccount, setScanningAccount] = useState(null);
  const [currentScanId, setCurrentScanId] = useState(null); // Track current scan ID
  const [showGmailGuideModal, setShowGmailGuideModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false); // Modal for scan progress
  const [scanStatus, setScanStatus] = useState(null); // 'running', 'completed', 'failed', 'cancelled'
  const [scanResult, setScanResult] = useState(null); // Scan result data
  const [showPasswordModal, setShowPasswordModal] = useState(false); // Modal for password change
  const [showEmailModal, setShowEmailModal] = useState(false); // Modal for email change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Token bor-yo'qligini tekshirish
  const hasToken = !!localStorage.getItem('token');

  // Check for Gmail connection success from callback
  useEffect(() => {
    const gmailConnected = searchParams.get('gmail_connected');
    const email = searchParams.get('email');
    if (gmailConnected === 'true' && email) {
      setSuccessMessage(`Gmail hisob (${email}) muvaffaqiyatli ulandi!`);
      // Remove query params
      setSearchParams({});
      // Refresh connected accounts
      queryClient.invalidateQueries('connected-accounts');
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [searchParams, setSearchParams, queryClient]);

  const { data: accounts, isLoading: accountsLoading } = useQuery(
    'connected-accounts',
    async () => {
      try {
        const response = await api.get('/v1/oauth/accounts');
        return response.data;
      } catch (error) {
        // 401, 404 yoki network xatolarini ignore qilamiz
        if (error.response?.status === 401 || error.response?.status === 404 || error.code === 'ERR_NETWORK') {
          return [];
        }
        console.error('Error fetching connected accounts:', error);
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

  const disconnectMutation = useMutation(
    async (accountId) => {
      await api.delete(`/v1/oauth/accounts/${accountId}`);
    },
    {
      onSuccess: () => {
        // Invalidate all related queries after disconnecting account
        queryClient.invalidateQueries('connected-accounts');
        queryClient.refetchQueries('connected-accounts'); // Avtomatik yangilash
        queryClient.invalidateQueries('scans');
        queryClient.refetchQueries('scans'); // Avtomatik yangilash
        queryClient.invalidateQueries('findings');
        queryClient.refetchQueries('findings'); // Avtomatik yangilash
      },
    }
  );

  // Parol almashtirish mutation
  const changePasswordMutation = useMutation(
    async ({ currentPassword, newPassword }) => {
      const response = await api.put('/v1/users/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      return response.data;
    },
    {
      onSuccess: () => {
        setSuccessMessage('Parol muvaffaqiyatli o\'zgartirildi!');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccessMessage(''), 5000);
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail || error.message || 'Parolni o\'zgartirishda xatolik yuz berdi';
        alert(`❌ Xatolik: ${errorMessage}`);
      },
    }
  );

  // Email almashtirish mutation
  const changeEmailMutation = useMutation(
    async ({ newEmail, password }) => {
      const response = await api.put('/v1/users/change-email', {
        new_email: newEmail,
        password: password
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        setSuccessMessage(`Email muvaffaqiyatli o'zgartirildi! Yangi email: ${data.new_email || newEmail}`);
        setShowEmailModal(false);
        setNewEmail('');
        setEmailPassword('');
        setTimeout(() => setSuccessMessage(''), 5000);
        // Invalidate user query to refresh user data
        queryClient.invalidateQueries('user');
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail || error.message || 'Emailni o\'zgartirishda xatolik yuz berdi';
        alert(`❌ Xatolik: ${errorMessage}`);
      },
    }
  );

  // Get scans to check status
  const { data: scans } = useQuery(
    'scans',
    async () => {
      try {
        const response = await api.get('/v1/scans/');
        return response.data;
      } catch (error) {
        // 401 xatosi bo'lsa, faqat log qilamiz - logout qilmaymiz
        // Chunki bu scan refetch xatosi bo'lishi mumkin va token hali ham to'g'ri bo'lishi mumkin
        if (error.response?.status === 401) {
          console.warn('Scans query: 401 Unauthorized - but not logging out to preserve scan completion state');
          // Token'ni o'chirmaymiz - bu scan tugagandan keyin bo'lishi mumkin
          return [];
        }
        // Network xatosi bo'lsa
        if (error.code === 'ERR_NETWORK') {
          console.warn('Scans query: Network error');
          return [];
        }
        // Boshqa xatolar
        console.error('Scans query error:', error);
        return [];
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true, // Oynaga qaytganda avtomatik yangilash
      enabled: hasToken, // Always enabled when token exists
      refetchInterval: scanningAccount ? 2000 : 30000, // Poll every 2 seconds when scanning, otherwise 30 seconds
      // 401 xatosi bo'lsa, faqat log qilamiz - logout qilmaymiz
      onError: (error) => {
        if (error.response?.status === 401) {
          // Faqat log qilamiz, token'ni o'chirmaymiz
          console.warn('Scans query onError: 401 Unauthorized - but not logging out');
          // Query'ni to'xtatmaymiz - scan tugagandan keyin refetch qilish mumkin
        }
      },
    }
  );

  // Restore scanning state from localStorage on mount and when component becomes visible
  useEffect(() => {
    const restoreScanningState = () => {
      try {
        const scanData = localStorage.getItem('gmail-scanning');
        const modalState = localStorage.getItem('gmail-scan-modal');
        
        if (scanData) {
          const data = JSON.parse(scanData);
          // Restore scanning state if scan is still in progress
          if (data.accountId) {
            setScanningAccount(data.accountId);
            // Restore modal state if it was open
            if (modalState) {
              const modalData = JSON.parse(modalState);
              if (modalData.isOpen) {
                setShowScanModal(true);
                setScanStatus(modalData.status || 'running');
                if (modalData.result) {
                  setScanResult(modalData.result);
                }
              }
            } else {
              // If scan is in progress but modal state not saved, open modal
              setShowScanModal(true);
              setScanStatus('running');
            }
            // Try to find current scan ID from scans if available
            // This will be updated when scans are loaded
          }
        }
      } catch (error) {
        console.error('Error restoring scan status:', error);
      }
    };

    // Restore on mount
    restoreScanningState();

    // Also restore when window becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        restoreScanningState();
      }
    };

    // Listen for storage changes (from other tabs/windows)
    const handleStorageChange = (e) => {
      if (e.key === 'gmail-scan-status-changed' || e.key === 'gmail-scanning' || e.key === 'gmail-scan-modal') {
        restoreScanningState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('gmail-scan-status-changed', restoreScanningState);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gmail-scan-status-changed', restoreScanningState);
    };
  }, []); // Only run on mount

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Listen for scan completion events from other tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'gmail-scan-completed' && e.newValue) {
        try {
          const scanData = JSON.parse(e.newValue);
          const message = scanData.message || 'Gmail tahlil tugallandi!';
          
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const notification = new Notification('Gmail Tahlil Tugallandi', {
                body: message,
                icon: '/favicon.svg',
                badge: '/favicon.svg',
                tag: `gmail-scan-${scanData.scanId}`,
                requireInteraction: false,
                silent: false,
              });

              setTimeout(() => {
                notification.close();
              }, 5000);

              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            } catch (error) {
              console.error('Error showing notification:', error);
            }
          }

          // Clear the storage event
          localStorage.removeItem('gmail-scan-completed');
        } catch (error) {
          console.error('Error parsing scan completion data:', error);
        }
      } else if (e.key === 'gmail-scan-failed' && e.newValue) {
        try {
          const scanData = JSON.parse(e.newValue);
          const errorMessage = scanData.message || 'Gmail tahlil muvaffaqiyatsiz';
          
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const notification = new Notification('Gmail Tahlil Muvaffaqiyatsiz', {
                body: errorMessage,
                icon: '/favicon.svg',
                badge: '/favicon.svg',
                tag: `gmail-scan-failed-${scanData.scanId}`,
                requireInteraction: false,
              });

              setTimeout(() => {
                notification.close();
              }, 5000);

              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            } catch (error) {
              console.error('Error showing notification:', error);
            }
          }

          // Clear the storage event
          localStorage.removeItem('gmail-scan-failed');
        } catch (error) {
          console.error('Error parsing scan failure data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Restore currentScanId from scans when scans are loaded and scanningAccount is restored
  useEffect(() => {
    if (scanningAccount && scans && accounts && !currentScanId) {
      const account = accounts?.find(a => a.id === scanningAccount);
      if (account) {
        // Try to find current scan ID from scans
        const accountScans = scans
          .filter(s => s.type === 'email')
          .filter(s => {
            if (s.summary?.email) {
              const scanEmail = s.summary.email?.toLowerCase().trim();
              const accountEmail = account.email?.toLowerCase().trim();
              return scanEmail === accountEmail;
            }
            return false;
          })
          .sort((a, b) => {
            const dateA = new Date(a.started_at || a.created_at || 0);
            const dateB = new Date(b.started_at || b.created_at || 0);
            return dateB - dateA;
          });

        // Get the latest running or pending scan
        const runningScan = accountScans.find(s => s.status === 'running' || s.status === 'pending');
        if (runningScan) {
          setCurrentScanId(runningScan.id);
        } else if (accountScans.length > 0) {
          // If no running scan, check the latest scan
          const latestScan = accountScans[0];
          if (latestScan.status === 'running' || latestScan.status === 'pending') {
            setCurrentScanId(latestScan.id);
          }
        }
      }
    }
  }, [scans, scanningAccount, accounts, currentScanId]);

  // Check if scan is completed
  useEffect(() => {
    // If modal is open but scanningAccount is null, check if we need to update modal with scan status
    if (showScanModal && !scanningAccount && currentScanId && scans) {
      // Find scan by ID
      const scan = scans.find(s => s.id === currentScanId && s.type === 'email');
      if (scan && scan.status === 'completed' && scanStatus !== 'completed') {
        // Scan completed but modal not updated yet
        const summary = scan.summary || {};
        
        
        // Extract statistics from summary - prioritize total_messages, dangerous_messages, other_messages
        // These are set by backend in scan_service.py _process_email_scan function
        let totalMessages = 0;
        let dangerousMessages = 0;
        let otherMessages = 0;
        
        // Get total_messages (this is the actual count of messages processed)
        if (summary.total_messages !== undefined && summary.total_messages !== null && typeof summary.total_messages === 'number') {
          totalMessages = summary.total_messages;
        } else if (summary.processed_messages !== undefined && summary.processed_messages !== null && typeof summary.processed_messages === 'number') {
          totalMessages = summary.processed_messages;
        }
        
        // Get dangerous_messages (phishing or high-risk messages)
        if (summary.dangerous_messages !== undefined && summary.dangerous_messages !== null && typeof summary.dangerous_messages === 'number') {
          dangerousMessages = summary.dangerous_messages;
        } else if (summary.phishing_detected !== undefined && summary.phishing_detected !== null && typeof summary.phishing_detected === 'number') {
          dangerousMessages = summary.phishing_detected;
        }
        
        // Get other_messages (non-dangerous messages)
        if (summary.other_messages !== undefined && summary.other_messages !== null && typeof summary.other_messages === 'number') {
          otherMessages = summary.other_messages;
        } else if (totalMessages > 0 && dangerousMessages >= 0) {
          // Calculate other_messages if not present
          otherMessages = Math.max(0, totalMessages - dangerousMessages);
        }
        
        const stats = [
          totalMessages > 0 ? `${totalMessages} xabar` : null,
          dangerousMessages > 0 ? `${dangerousMessages} xavfli` : null,
          otherMessages > 0 ? `${otherMessages} boshqa` : null,
        ].filter(Boolean).join(', ');
        
        const message = stats 
          ? `"${summary.email || 'Gmail'}" tahlil qilindi! ${stats}`
          : `"${summary.email || 'Gmail'}" tahlil qilindi!`;
        
        // Update modal with success status
        setScanStatus('completed');
        const scanResultData = {
          email: summary.email || 'Gmail',
          total_messages: totalMessages,
          dangerous_messages: dangerousMessages,
          other_messages: otherMessages,
          message: message
        };
        setScanResult(scanResultData);
        
        // Save modal state to localStorage (completed state)
        try {
          localStorage.setItem('gmail-scan-modal', JSON.stringify({
            isOpen: true,
            status: 'completed',
            result: scanResultData
          }));
        } catch (error) {
          console.error('Error saving modal state:', error);
        }
        
        // Don't clear currentScanId yet - we need it for refetch
        // setCurrentScanId(null);
        
        // Auto-close modal after 5 seconds when scan is completed
        const autoCloseTimer = setTimeout(() => {
          setShowScanModal(false);
          setScanStatus(null);
          setScanResult(null);
          setCurrentScanId(null);
          // Clear modal state from localStorage
          try {
            localStorage.removeItem('gmail-scan-modal');
          } catch (error) {
            console.error('Error clearing modal state:', error);
          }
        }, 5000); // 5 seconds delay
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries('scans');
        queryClient.invalidateQueries('findings');
        
        // Refetch scans to get latest summary data
        if (hasToken) {
          queryClient.refetchQueries('scans').then(() => {
            // After refetch, update scan result with latest data
            const updatedScans = queryClient.getQueryData('scans');
            if (updatedScans && currentScanId) {
              const updatedScan = updatedScans.find(s => s.id === currentScanId && s.type === 'email');
              if (updatedScan && updatedScan.summary) {
                const updatedSummary = updatedScan.summary || {};
                const updatedTotalMessages = updatedSummary.total_messages !== undefined && updatedSummary.total_messages !== null 
                  ? updatedSummary.total_messages 
                  : (updatedSummary.processed_messages !== undefined && updatedSummary.processed_messages !== null 
                      ? updatedSummary.processed_messages 
                      : totalMessages);
                const updatedDangerousMessages = updatedSummary.dangerous_messages !== undefined && updatedSummary.dangerous_messages !== null 
                  ? updatedSummary.dangerous_messages 
                  : (updatedSummary.phishing_detected !== undefined && updatedSummary.phishing_detected !== null 
                      ? updatedSummary.phishing_detected 
                      : dangerousMessages);
                const updatedOtherMessages = updatedSummary.other_messages !== undefined && updatedSummary.other_messages !== null 
                  ? updatedSummary.other_messages 
                  : (updatedTotalMessages - updatedDangerousMessages > 0 ? updatedTotalMessages - updatedDangerousMessages : 0);
                
                // Update scan result with latest data
                setScanResult(prev => ({
                  ...prev,
                  total_messages: updatedTotalMessages,
                  dangerous_messages: updatedDangerousMessages,
                  other_messages: updatedOtherMessages,
                  email: updatedSummary.email || prev?.email || 'Gmail'
                }));
              }
            }
          }).then(() => {
            // After refetch, clear currentScanId
            setCurrentScanId(null);
            // Clear auto-close timer if exists
            if (autoCloseTimer) {
              clearTimeout(autoCloseTimer);
            }
          }).catch((error) => {
            // 401 xatosi bo'lsa, faqat log qilamiz - logout qilmaymiz
            // Chunki bu scan refetch xatosi bo'lishi mumkin va token hali ham to'g'ri bo'lishi mumkin
            if (error.response?.status === 401) {
              console.warn('Refetch scans: 401 Unauthorized - but not logging out to preserve scan completion state');
              // Token'ni o'chirmaymiz - bu scan tugagandan keyin bo'lishi mumkin
            }
            // Clear currentScanId even on error
            setCurrentScanId(null);
            // Clear auto-close timer if exists
            if (autoCloseTimer) {
              clearTimeout(autoCloseTimer);
            }
          });
        } else {
          // No token, just clear currentScanId
          setCurrentScanId(null);
          // Clear auto-close timer if exists
          if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
          }
        }
        
        // Return cleanup function to clear timer if component unmounts
        return () => {
          if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
          }
        };
      } else if (scan.status === 'failed' && scanStatus !== 'failed') {
        // Scan failed but modal not updated yet
        const errorMessage = scan.error_message || 'Tahlil qilishda xatolik';
        setScanStatus('failed');
        const failedResult = { error: errorMessage };
        setScanResult(failedResult);
        
        // Save modal state to localStorage (failed state)
        try {
          localStorage.setItem('gmail-scan-modal', JSON.stringify({
            isOpen: true,
            status: 'failed',
            result: failedResult
          }));
        } catch (error) {
          console.error('Error saving modal state:', error);
        }
        
        setCurrentScanId(null);
      } else if (scan.status === 'cancelled' && scanStatus !== 'cancelled') {
        // Scan cancelled but modal not updated yet
        setScanStatus('cancelled');
        const cancelledResult = { message: 'Tahlil bekor qilindi.' };
        setScanResult(cancelledResult);
        
        // Save modal state to localStorage (cancelled state)
        try {
          localStorage.setItem('gmail-scan-modal', JSON.stringify({
            isOpen: true,
            status: 'cancelled',
            result: cancelledResult
          }));
        } catch (error) {
          console.error('Error saving modal state:', error);
        }
        
        setCurrentScanId(null);
      }
      return;
    }

    // If scanningAccount is null but localStorage still has gmail-scanning, clear it
    if (!scanningAccount) {
      try {
        const scanData = localStorage.getItem('gmail-scanning');
        if (scanData) {
          localStorage.removeItem('gmail-scanning');
          window.dispatchEvent(new Event('gmail-scan-status-changed'));
        }
      } catch (e) {
        console.error('Error clearing scan status:', e);
      }
      return;
    }

    if (scanningAccount && scans) {
      // Find the latest scan for this account
      const account = accounts?.find(a => a.id === scanningAccount);
      if (!account) {
        // Account not found, clear scanning state
        setScanningAccount(null);
        setCurrentScanId(null);
        try {
          localStorage.removeItem('gmail-scanning');
          window.dispatchEvent(new Event('gmail-scan-status-changed'));
        } catch (e) {
          console.error('Error clearing scan status:', e);
        }
        return;
      }

      // Find latest scan for this account - check by currentScanId first, then by email
      let latestScan = null;
      
      // First try to find by scan ID (most reliable)
      if (currentScanId) {
        latestScan = scans.find(s => s.id === currentScanId && s.type === 'email');
      }
      
      // If not found by ID, try to find by email (for cases where scan ID is not set yet)
      if (!latestScan) {
        // Get all email scans for this account
        const accountScans = scans
          .filter(s => s.type === 'email')
          .filter(s => {
            // Check if scan has email in summary
            if (s.summary?.email) {
              const scanEmail = s.summary.email?.toLowerCase().trim();
              const accountEmail = account.email?.toLowerCase().trim();
              return scanEmail === accountEmail;
            }
            return false;
          })
          .sort((a, b) => {
            // Sort by created_at or started_at (newest first)
            const dateA = new Date(a.started_at || a.created_at || 0);
            const dateB = new Date(b.started_at || b.created_at || 0);
            return dateB - dateA;
          });
        
        // Get the latest scan
        if (accountScans.length > 0) {
          latestScan = accountScans[0];
        }
      }
      
      if (latestScan && latestScan.status === 'completed') {
        // Scan completed - show success in modal
        const summary = latestScan.summary || {};
        
        
        // Extract statistics from summary - prioritize total_messages, dangerous_messages, other_messages
        // These are set by backend in scan_service.py _process_email_scan function
        let totalMessages = 0;
        let dangerousMessages = 0;
        let otherMessages = 0;
        
        // Get total_messages (this is the actual count of messages processed)
        if (summary.total_messages !== undefined && summary.total_messages !== null && typeof summary.total_messages === 'number') {
          totalMessages = summary.total_messages;
        } else if (summary.processed_messages !== undefined && summary.processed_messages !== null && typeof summary.processed_messages === 'number') {
          totalMessages = summary.processed_messages;
        }
        
        // Get dangerous_messages (phishing or high-risk messages)
        if (summary.dangerous_messages !== undefined && summary.dangerous_messages !== null && typeof summary.dangerous_messages === 'number') {
          dangerousMessages = summary.dangerous_messages;
        } else if (summary.phishing_detected !== undefined && summary.phishing_detected !== null && typeof summary.phishing_detected === 'number') {
          dangerousMessages = summary.phishing_detected;
        }
        
        // Get other_messages (non-dangerous messages)
        if (summary.other_messages !== undefined && summary.other_messages !== null && typeof summary.other_messages === 'number') {
          otherMessages = summary.other_messages;
        } else if (totalMessages > 0 && dangerousMessages >= 0) {
          // Calculate other_messages if not present
          otherMessages = Math.max(0, totalMessages - dangerousMessages);
        }
        
        const stats = [
          totalMessages > 0 ? `${totalMessages} xabar` : null,
          dangerousMessages > 0 ? `${dangerousMessages} xavfli` : null,
          otherMessages > 0 ? `${otherMessages} boshqa` : null,
        ].filter(Boolean).join(', ');
        
        const message = stats 
          ? `"${summary.email || 'Gmail'}" tahlil qilindi! ${stats}`
          : `"${summary.email || 'Gmail'}" tahlil qilindi!`;
        
        // Save scan ID before clearing state
        const completedScanId = latestScan.id;
        
        // Update modal with success status
        setScanStatus('completed');
        setScanResult({
          email: summary.email || 'Gmail',
          total_messages: totalMessages,
          dangerous_messages: dangerousMessages,
          other_messages: otherMessages,
          message: message
        });
        
        // Save scan ID before clearing state (for modal update)
        const savedScanId = latestScan.id;
        
        // Clear scanning state FIRST to stop polling
        setScanningAccount(null);
        // Don't clear currentScanId yet - we need it to update modal after refetch
        // setCurrentScanId(null);
        
        // Clear global banner IMMEDIATELY
        try {
          localStorage.removeItem('gmail-scanning');
          window.dispatchEvent(new Event('gmail-scan-status-changed'));
        } catch (e) {
          console.error('Error clearing scan status:', e);
        }
        
        // Invalidate ALL queries after state is cleared to refresh the entire app
        queryClient.invalidateQueries(); // Invalidate all queries
        queryClient.invalidateQueries('scans');
        queryClient.invalidateQueries('findings');
        queryClient.invalidateQueries('connected-accounts');
        
        // Auto-close modal after 5 seconds when scan is completed
        const autoCloseTimer = setTimeout(() => {
          setShowScanModal(false);
          setScanStatus(null);
          setScanResult(null);
          setCurrentScanId(null);
          // Clear modal state from localStorage
          try {
            localStorage.removeItem('gmail-scan-modal');
          } catch (error) {
            console.error('Error clearing modal state:', error);
          }
        }, 5000); // 5 seconds delay
        
        // Refetch scans to get latest summary data (only if token exists)
        if (hasToken) {
          queryClient.refetchQueries('scans').then(() => {
          // After refetch, update scan result with latest data
          const updatedScans = queryClient.getQueryData('scans');
          if (updatedScans && completedScanId) {
            const updatedScan = updatedScans.find(s => s.id === completedScanId && s.type === 'email');
            if (updatedScan && updatedScan.summary) {
              const updatedSummary = updatedScan.summary || {};
              
              // Extract statistics from updated summary with proper type checking
              let updatedTotalMessages = 0;
              let updatedDangerousMessages = 0;
              let updatedOtherMessages = 0;
              
              // Get total_messages
              if (updatedSummary.total_messages !== undefined && updatedSummary.total_messages !== null && typeof updatedSummary.total_messages === 'number') {
                updatedTotalMessages = updatedSummary.total_messages;
              } else if (updatedSummary.processed_messages !== undefined && updatedSummary.processed_messages !== null && typeof updatedSummary.processed_messages === 'number') {
                updatedTotalMessages = updatedSummary.processed_messages;
              } else {
                updatedTotalMessages = totalMessages; // Fallback to previous value
              }
              
              // Get dangerous_messages
              if (updatedSummary.dangerous_messages !== undefined && updatedSummary.dangerous_messages !== null && typeof updatedSummary.dangerous_messages === 'number') {
                updatedDangerousMessages = updatedSummary.dangerous_messages;
              } else if (updatedSummary.phishing_detected !== undefined && updatedSummary.phishing_detected !== null && typeof updatedSummary.phishing_detected === 'number') {
                updatedDangerousMessages = updatedSummary.phishing_detected;
              } else {
                updatedDangerousMessages = dangerousMessages; // Fallback to previous value
              }
              
              // Get other_messages
              if (updatedSummary.other_messages !== undefined && updatedSummary.other_messages !== null && typeof updatedSummary.other_messages === 'number') {
                updatedOtherMessages = updatedSummary.other_messages;
              } else if (updatedTotalMessages > 0 && updatedDangerousMessages >= 0) {
                updatedOtherMessages = Math.max(0, updatedTotalMessages - updatedDangerousMessages);
              } else {
                updatedOtherMessages = otherMessages; // Fallback to previous value
              }
              
              
              // Update scan result with latest data
              setScanResult(prev => ({
                ...prev,
                total_messages: updatedTotalMessages,
                dangerous_messages: updatedDangerousMessages,
                other_messages: updatedOtherMessages,
                email: updatedSummary.email || prev?.email || 'Gmail'
              }));
            }
          }
          }).then(() => {
            // After refetch, clear currentScanId
            setCurrentScanId(null);
            // Clear auto-close timer if exists
            if (autoCloseTimer) {
              clearTimeout(autoCloseTimer);
            }
          }).catch((error) => {
            // 401 xatosi bo'lsa, faqat log qilamiz - logout qilmaymiz
            // Chunki bu scan refetch xatosi bo'lishi mumkin va token hali ham to'g'ri bo'lishi mumkin
            if (error.response?.status === 401) {
              console.warn('Refetch scans: 401 Unauthorized - but not logging out to preserve scan completion state');
              // Token'ni o'chirmaymiz - bu scan tugagandan keyin bo'lishi mumkin
              // va foydalanuvchi hali ham tizimda bo'lishi kerak
            }
            // Clear auto-close timer if exists
            if (autoCloseTimer) {
              clearTimeout(autoCloseTimer);
            }
          });
        }
        
        // Return cleanup function to clear timer if component unmounts
        return () => {
          if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
          }
        };

        // Show browser notification (works in all tabs/windows)
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const notification = new Notification('Gmail Tahlil Tugallandi', {
              body: message,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              tag: `gmail-scan-${latestScan.id}`, // Prevent duplicate notifications
              requireInteraction: false,
              silent: false,
            });

            // Close notification after 5 seconds
            setTimeout(() => {
              notification.close();
            }, 5000);

            // Click notification to focus window
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch (error) {
            console.error('Error showing notification:', error);
          }
        }

        // Broadcast to other tabs/windows via localStorage
        try {
          localStorage.setItem('gmail-scan-completed', JSON.stringify({
            scanId: latestScan.id,
            message: message,
            timestamp: Date.now()
          }));
          // Trigger storage event manually for current tab
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'gmail-scan-completed',
            newValue: JSON.stringify({
              scanId: latestScan.id,
              message: message,
              timestamp: Date.now()
            })
          }));
        } catch (error) {
          console.error('Error broadcasting scan completion:', error);
        }
      } else if (latestScan && latestScan.status === 'failed') {
        // Scan failed - update modal
        const errorMessage = latestScan.error_message || 'Tahlil qilishda xatolik';
        setScanStatus('failed');
        const failedResult = { error: errorMessage };
        setScanResult(failedResult);
        
        // Save modal state to localStorage (failed state)
        try {
          localStorage.setItem('gmail-scan-modal', JSON.stringify({
            isOpen: true,
            status: 'failed',
            result: failedResult
          }));
        } catch (error) {
          console.error('Error saving modal state:', error);
        }
        
        setScanningAccount(null);
        setCurrentScanId(null);

        // Clear global banner
        try {
          localStorage.removeItem('gmail-scanning');
          window.dispatchEvent(new Event('gmail-scan-status-changed'));
        } catch (e) {
          console.error('Error clearing scan status:', e);
        }
      } else if (latestScan && latestScan.status === 'cancelled') {
        // Scan cancelled - update modal
        setScanStatus('cancelled');
        const cancelledResult = { message: 'Tahlil bekor qilindi.' };
        setScanResult(cancelledResult);
        
        // Save modal state to localStorage (cancelled state)
        try {
          localStorage.setItem('gmail-scan-modal', JSON.stringify({
            isOpen: true,
            status: 'cancelled',
            result: cancelledResult
          }));
        } catch (error) {
          console.error('Error saving modal state:', error);
        }
        
        setScanningAccount(null);
        setCurrentScanId(null);
        // Invalidate ALL queries after scan is cancelled
        queryClient.invalidateQueries(); // Invalidate all queries
        queryClient.invalidateQueries('scans');
        queryClient.invalidateQueries('findings');
        queryClient.invalidateQueries('connected-accounts');

        // Clear global banner
        try {
          localStorage.removeItem('gmail-scanning');
          window.dispatchEvent(new Event('gmail-scan-status-changed'));
        } catch (e) {
          console.error('Error clearing scan status:', e);
        }
      } else if (latestScan && latestScan.status === 'running') {
        // Scan is running - update current scan ID
        if (!currentScanId || currentScanId !== latestScan.id) {
          setCurrentScanId(latestScan.id);
        }
      } else if (!latestScan && scanningAccount) {
        // Scan not found - might have been deleted or doesn't exist yet
        // Keep scanning state for now, but check if we've been scanning for too long
        // (This handles edge cases where scan might not be created yet)
      }
    } else if (scanningAccount && !scans) {
      // Scans not loaded yet, keep waiting
    } else if (!scanningAccount && currentScanId) {
      // Scanning account cleared but scan ID still set - clear it
      setCurrentScanId(null);
      // Also clear localStorage if still present
      try {
        const scanData = localStorage.getItem('gmail-scanning');
        if (scanData) {
          localStorage.removeItem('gmail-scanning');
          window.dispatchEvent(new Event('gmail-scan-status-changed'));
        }
      } catch (e) {
        console.error('Error clearing scan status:', e);
      }
    }
  }, [scans, scanningAccount, accounts, queryClient, currentScanId, showScanModal, scanStatus, hasToken]);

  const scanGmailMutation = useMutation(
    async (accountId) => {
      // Set scanning account immediately when button is clicked
      setScanningAccount(accountId);
      
      // Find account email for global banner
      const account = accounts?.find(a => a.id === accountId);
      const accountEmail = account?.email || 'Gmail';
      
      // Open modal
      setShowScanModal(true);
      setScanStatus('running');
      setScanResult(null);
      
      // Save modal state to localStorage
      try {
        localStorage.setItem('gmail-scan-modal', JSON.stringify({
          isOpen: true,
          status: 'running',
          result: null
        }));
      } catch (error) {
        console.error('Error saving modal state:', error);
      }
      
      // Broadcast to all tabs/windows via localStorage
      try {
        localStorage.setItem('gmail-scanning', JSON.stringify({
          accountId: accountId,
          email: accountEmail,
          timestamp: Date.now()
        }));
        // Trigger custom event for same-tab updates
        window.dispatchEvent(new Event('gmail-scan-status-changed'));
      } catch (error) {
        console.error('Error broadcasting scan start:', error);
      }
      
      const response = await api.post(`/v1/oauth/gmail/scan/${accountId}`);
      return response.data;
    },
    {
      onSuccess: (data, accountId) => {
        // Scanning account already set, just refresh scans
        if (data.scan_id) {
          setCurrentScanId(data.scan_id);
        }
        // Invalidate scans query to get latest scan status
        queryClient.invalidateQueries('scans');
        queryClient.refetchQueries('scans'); // Avtomatik yangilash
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail || 'Gmail tahlil qilishda xatolik';
        setUploadError(errorMessage);
        setScanningAccount(null);
        setCurrentScanId(null);
        setScanStatus('failed');
        setScanResult({ error: errorMessage });
        
        // Clear global banner
        try {
          localStorage.removeItem('gmail-scanning');
          window.dispatchEvent(new Event('gmail-scan-status-changed'));
        } catch (e) {
          console.error('Error clearing scan status:', e);
        }
        
        setTimeout(() => setUploadError(''), 5000);
      },
    }
  );

  const handleGmailConnect = async () => {
    if (!hasToken) {
      alert('Gmail hisobini ulash uchun avval login qiling');
      return;
    }
    
    try {
      const response = await api.get('/v1/oauth/gmail/connect');
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error('Failed to connect Gmail:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to connect Gmail';
      if (error.response?.status === 401) {
        alert('Gmail hisobini ulash uchun avval login qiling');
      } else if (errorMessage.includes('not configured')) {
        setUploadError('Gmail OAuth sozlanmagan. Iltimos, avval credentials.json yuklang.');
        setShowCredentialsModal(true);
      } else {
        alert(errorMessage);
      }
    }
  };

  const uploadCredentialsMutation = useMutation(
    async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/v1/oauth/gmail/upload-credentials', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        setShowCredentialsModal(false);
        setCredentialsFile(null);
        setUploadError('');
        // Invalidate queries to refresh UI
        queryClient.invalidateQueries('connected-accounts');
        queryClient.refetchQueries('connected-accounts'); // Avtomatik yangilash
        alert('Credentials.json muvaffaqiyatli yuklandi! Endi Gmail hisobini ulashingiz mumkin.');
      },
      onError: (error) => {
        if (error.response?.status === 401) {
          setUploadError('Credentials.json yuklash uchun avval login qiling');
        } else {
          setUploadError(error.response?.data?.detail || 'Credentials.json yuklashda xatolik');
        }
      },
    }
  );

  const uploadTokenMutation = useMutation(
    async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/v1/oauth/gmail/upload-token', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        setShowTokenModal(false);
        setTokenFile(null);
        setUploadError('');
        // Invalidate all related queries after token upload
        queryClient.invalidateQueries('connected-accounts');
        queryClient.refetchQueries('connected-accounts'); // Avtomatik yangilash
        queryClient.invalidateQueries('scans');
        queryClient.refetchQueries('scans'); // Avtomatik yangilash
        queryClient.invalidateQueries('findings');
        queryClient.refetchQueries('findings'); // Avtomatik yangilash
        alert('Token.json muvaffaqiyatli yuklandi va Gmail hisob ulandi!');
      },
      onError: (error) => {
        if (error.response?.status === 401) {
          setUploadError('Token.json yuklash uchun avval login qiling');
        } else {
          setUploadError(error.response?.data?.detail || 'Token.json yuklashda xatolik');
        }
      },
    }
  );

  const handleCredentialsUpload = () => {
    if (!hasToken) {
      setUploadError('Credentials.json yuklash uchun avval login qiling');
      return;
    }
    
    if (!credentialsFile) {
      setUploadError('Iltimos, credentials.json faylini tanlang');
      return;
    }
    uploadCredentialsMutation.mutate(credentialsFile);
  };

  const handleTokenUpload = () => {
    if (!hasToken) {
      setUploadError('Token.json yuklash uchun avval login qiling');
      return;
    }
    
    if (!tokenFile) {
      setUploadError('Iltimos, token.json faylini tanlang');
      return;
    }
    uploadTokenMutation.mutate(tokenFile);
  };

  const handleDisconnect = async (accountId) => {
    if (window.confirm('Bu hisobni uzishni xohlaysizmi?')) {
      disconnectMutation.mutate(accountId);
    }
  };

  // Cancel scan mutation
  const cancelScanMutation = useMutation(
    async (scanId) => {
      const response = await api.post(`/v1/scans/${scanId}/cancel`);
      return response.data;
    },
    {
          onSuccess: () => {
            setScanningAccount(null);
            setCurrentScanId(null);
            setScanStatus('cancelled');
            setScanResult({ message: 'Tahlil muvaffaqiyatli bekor qilindi.' });
            // Invalidate ALL queries after cancelling scan
            queryClient.invalidateQueries(); // Invalidate all queries
            queryClient.invalidateQueries('scans');
            queryClient.invalidateQueries('findings');
            queryClient.invalidateQueries('connected-accounts');
            
            // Clear global banner
            try {
              localStorage.removeItem('gmail-scanning');
              window.dispatchEvent(new Event('gmail-scan-status-changed'));
            } catch (e) {
              console.error('Error clearing scan status:', e);
            }
          },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail || 'Tahlilni bekor qilishda xatolik';
        setUploadError(errorMessage);
        setTimeout(() => setUploadError(''), 5000);
      },
    }
  );

  const handleCancelScan = () => {
    // Try to find scan ID if not set
    let scanIdToCancel = currentScanId;
    
    if (!scanIdToCancel && scanningAccount && scans && accounts) {
      const account = accounts?.find(a => a.id === scanningAccount);
      if (account) {
        // Find the latest running or pending scan for this account
        const accountScans = scans
          .filter(s => s.type === 'email')
          .filter(s => {
            if (s.summary?.email) {
              const scanEmail = s.summary.email?.toLowerCase().trim();
              const accountEmail = account.email?.toLowerCase().trim();
              return scanEmail === accountEmail;
            }
            return false;
          })
          .filter(s => s.status === 'running' || s.status === 'pending')
          .sort((a, b) => {
            const dateA = new Date(a.started_at || a.created_at || 0);
            const dateB = new Date(b.started_at || b.created_at || 0);
            return dateB - dateA;
          });
        
        if (accountScans.length > 0) {
          scanIdToCancel = accountScans[0].id;
        }
      }
    }
    
    if (!scanIdToCancel) {
      alert('Tahlil topilmadi yoki allaqachon tugagan.');
      return;
    }
    
    if (window.confirm('Tahlilni bekor qilishni xohlaysizmi?')) {
      cancelScanMutation.mutate(scanIdToCancel);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sarlavha */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          <span className="text-gradient">{t('settings.title')}</span>
        </h1>
        <p className="text-lg text-gray-600">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Ulangan Hisoblar */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-6">
          <LinkIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('settings.connectedAccounts')}</h2>
          <button
            onClick={() => setShowGmailGuideModal(true)}
            className="ml-2 p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            title={t('settings.gmailGuide')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </button>
        </div>

        {/* Important Notice for Gmail Modify Scope */}
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900 mb-1">
                Muhim: Xabarlarni o'chirish va spam sifatida belgilash uchun
              </p>
              <p className="text-xs text-orange-800 mb-2">
                Agar siz Gmail xabarlarini o'chirish yoki spam sifatida belgilash funksiyalaridan foydalanmoqchi bo'lsangiz, Gmail hisobingizni <strong>qayta ulashingiz</strong> kerak. Bu yangi <code className="bg-orange-100 px-1 rounded">gmail.modify</code> scope'ini qo'shadi.
              </p>
              <p className="text-xs text-orange-800">
                <strong>Qanday qilish:</strong> Quyidagi ro'yxatdan Gmail hisobingizni o'chirib tashlang, keyin "Gmail Hisobini Ulash (OAuth)" tugmasini bosing va qayta ulang.
              </p>
            </div>
          </div>
        </div>


        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-slide-up">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-sm text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-slide-up">
            <div className="flex items-center">
              <InformationCircleIcon className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800 font-medium">{uploadError}</p>
            </div>
          </div>
        )}
        
        {accountsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : accounts?.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <EnvelopeIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{account.provider}</p>
                    <p className="text-sm text-gray-600">{account.email}</p>
                    {account.last_sync && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('settings.lastSync')}: {formatKST(account.last_sync, 'd MMM, yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                    {account.is_active && (
                      <span className="badge badge-success flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        {t('settings.active')}
                      </span>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (!hasToken) {
                        alert(t('settings.loginRequired'));
                        return;
                      }
                      if (window.confirm(t('settings.confirmAnalyze', { email: account.email }))) {
                        scanGmailMutation.mutate(account.id);
                      }
                    }}
                    disabled={!hasToken || scanGmailMutation.isLoading || scanningAccount === account.id}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('settings.analyze')}
                  >
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('settings.disconnect')}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <LinkIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">{t('settings.noAccounts')}</p>
          </div>
        )}
        
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
          {!hasToken && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm mb-3">
              {t('settings.loginRequired')}
            </div>
          )}
          <button
            onClick={() => {
              if (!hasToken) {
                alert(t('settings.loginRequired'));
                return;
              }
              setShowCredentialsModal(true);
            }}
            disabled={!hasToken}
            className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CloudArrowUpIcon className="h-5 w-5 mr-2.5" />
            <span className="font-semibold">{t('settings.credentialsUpload')}</span>
          </button>
          <button
            onClick={() => {
              if (!hasToken) {
                alert(t('settings.loginRequired'));
                return;
              }
              setShowTokenModal(true);
            }}
            disabled={!hasToken}
            className="btn-primary w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            <CloudArrowUpIcon className="h-5 w-5 mr-2.5" />
            <span className="font-semibold">{t('settings.tokenUpload')}</span>
          </button>
          <button
            onClick={handleGmailConnect}
            disabled={!hasToken}
            className="btn-primary w-full flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            <EnvelopeIcon className="h-5 w-5 mr-2.5" />
            <span className="font-semibold">{t('settings.connectGmail')}</span>
          </button>
        </div>
      </div>

      {/* Credentials.json Yuklash Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Credentials.json Yuklash</h3>
            
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {uploadError}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credentials.json Faylini Tanlang
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  setCredentialsFile(e.target.files[0]);
                  setUploadError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Google Cloud Console'dan olingan credentials.json faylini yuklang
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCredentialsUpload}
                disabled={uploadCredentialsMutation.isLoading || !credentialsFile}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadCredentialsMutation.isLoading ? 'Yuklanmoqda...' : 'Yuklash'}
              </button>
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setCredentialsFile(null);
                  setUploadError('');
                }}
                className="btn-secondary flex-1"
              >
                Bekor Qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token.json Yuklash Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Token.json Yuklash</h3>
            
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {uploadError}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token.json Faylini Tanlang
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  setTokenFile(e.target.files[0]);
                  setUploadError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                OAuth oqimi orqali olingan token.json faylini yuklang
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleTokenUpload}
                disabled={uploadTokenMutation.isLoading || !tokenFile}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadTokenMutation.isLoading ? 'Yuklanmoqda...' : 'Yuklash'}
              </button>
              <button
                onClick={() => {
                  setShowTokenModal(false);
                  setTokenFile(null);
                  setUploadError('');
                }}
                className="btn-secondary flex-1"
              >
                Bekor Qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xavfsizlik Sozlamalari */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('settings.security')}</h2>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900 mb-1">✓ {t('settings.dataEncryption')}</p>
            <p className="text-xs text-green-700">
              {t('settings.dataEncryptionDesc')}
            </p>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900 mb-1">✓ {t('settings.secureStorage')}</p>
            <p className="text-xs text-green-700">
              {t('settings.secureStorageDesc')}
            </p>
          </div>
          
          {/* Parol almashtirish */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">{t('settings.changePassword')}</p>
                <p className="text-xs text-blue-700">
                  {t('settings.changePasswordDesc')}
                </p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {t('settings.changePasswordButton')}
              </button>
            </div>
          </div>
          
          {/* Email almashtirish */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900 mb-1">{t('settings.changeEmail')}</p>
                <p className="text-xs text-purple-700">
                  {t('settings.changeEmailDesc')}
                </p>
              </div>
              <button
                onClick={() => setShowEmailModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {t('settings.changeEmailButton')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gmail Qo'llanmasi Modal */}
      {showGmailGuideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Gmail Hisobini Ulash Qo'llanmasi</h3>
              <button
                onClick={() => setShowGmailGuideModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-gray-800">
              {/* Gmail Hisobini Ulash Qo'llanmasi */}
              <div className="p-5 bg-pink-50 border border-pink-200 rounded-lg">
            <div className="flex items-start space-x-3 mb-3">
              <InformationCircleIcon className="h-6 w-6 text-pink-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-pink-900 mb-2">Gmail Hisobini Ulash (Ixtiyoriy)</h3>
                <div className="space-y-2 text-sm text-pink-800">
                  <p><strong>Maqsad:</strong> Gmail xabarlarida shaxsiy ma'lumotlaringiz oqib ketganini aniqlash</p>
                  
                  <p className="mt-3"><strong>📋 Google Cloud Console'da Credentials Olish (0 dan boshlab):</strong></p>
                  <ol className="list-decimal list-inside ml-2 space-y-2">
                    <li><strong>Google Cloud Console'ga kirish:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Google Cloud Console'ga kiring: <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">https://console.cloud.google.com/</a></li>
                        <li>Google hisobingiz bilan login qiling (Gmail hisobingiz bilan bir xil bo'lishi shart emas)</li>
                      </ul>
                    </li>
                    
                    <li><strong>Yangi loyiha yaratish:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Yuqoridagi "Loyiha tanlash" yoki "Select a project" tugmasini bosing</li>
                        <li>"YANGI LOYIHA" (NEW PROJECT) tugmasini bosing</li>
                        <li>Loyiha nomini kiriting (masalan: <code className="bg-pink-100 px-1 rounded">Personal Leak Detector</code>)</li>
                        <li>"Yaratish" (CREATE) tugmasini bosing</li>
                        <li>Loyiha yaratilgandan so'ng, uni tanlang</li>
                      </ul>
                    </li>
                    
                    <li><strong>Gmail API'ni faollashtirish (MUHIM!):</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Chap menudan <strong>"API va xizmatlar"</strong> (APIs &amp; Services) &gt; <strong>"Kutubxona"</strong> (Library) bo'limiga o'ting</li>
                        <li>Qidiruv qutisiga <code className="bg-pink-100 px-1 rounded">Gmail API</code> yozing</li>
                        <li>"Gmail API" ni tanlang</li>
                        <li><strong>"FAOLLASHTIRISH"</strong> (ENABLE) tugmasini bosing</li>
                        <li>Yoki to'g'ridan-to'g'ri: <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">Gmail API'ni faollashtirish</a></li>
                        <li>API faollashtirilgandan keyin 2-3 daqiqa kutib turing</li>
                      </ul>
                    </li>
                    
                    <li><strong>OAuth consent screen sozlash:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Chap menudan <strong>"API va xizmatlar"</strong> (APIs &amp; Services) &gt; <strong>"OAuth consent screen"</strong> bo'limiga o'ting</li>
                        <li><strong>User type:</strong> <code className="bg-pink-100 px-1 rounded">External</code> ni tanlang (yoki <code className="bg-pink-100 px-1 rounded">Internal</code> agar Google Workspace bo'lsa)</li>
                        <li>"Yaratish" (CREATE) tugmasini bosing</li>
                        <li><strong>App name:</strong> <code className="bg-pink-100 px-1 rounded">Personal Leak Detector</code> yozing</li>
                        <li><strong>User support email:</strong> Sizning email manzilingizni kiriting (masalan: <code className="bg-pink-100 px-1 rounded">siz@misol.com</code>)</li>
                        <li><strong>Developer contact information:</strong> Sizning email manzilingizni kiriting</li>
                        <li>"Saqlash va davom etish" (SAVE AND CONTINUE) tugmasini bosing</li>
                      </ul>
                    </li>
                    
                    <li><strong>Scopes qo'shish (MUHIM!):</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>"Scopes" bo'limiga o'ting</li>
                        <li>"ADD OR REMOVE SCOPES" tugmasini bosing</li>
                        <li>Quyidagi scope'larni qidirib, tanlang va "UPDATE" tugmasini bosing:
                          <div className="mt-2 p-3 bg-pink-100 border border-pink-300 rounded-lg">
                            <p className="font-semibold text-pink-900 mb-2">Kerakli Scope'lar (URI'lar):</p>
                            <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                              <li><code className="bg-white px-1 rounded">https://www.googleapis.com/auth/gmail.readonly</code> - Gmail'ni o'qish uchun</li>
                              <li><code className="bg-white px-1 rounded font-semibold">https://www.googleapis.com/auth/gmail.modify</code> - <strong>Xabarlarni o'chirish va spam sifatida belgilash uchun (MUHIM!)</strong></li>
                              <li><code className="bg-white px-1 rounded">https://www.googleapis.com/auth/userinfo.email</code> - Email manzilini olish uchun</li>
                              <li><code className="bg-white px-1 rounded">https://www.googleapis.com/auth/userinfo.profile</code> - Profil ma'lumotlarini olish uchun</li>
                            </ul>
                            <p className="text-xs text-pink-700 mt-2 italic">⚠️ Eslatma: Agar siz xabarlarni o'chirish yoki spam sifatida belgilash funksiyalaridan foydalanmoqchi bo'lsangiz, <code className="bg-white px-1 rounded">gmail.modify</code> scope'ini qo'shish shart!</p>
                          </div>
                        </li>
                        <li>"Saqlash va davom etish" (SAVE AND CONTINUE) tugmasini bosing</li>
                      </ul>
                    </li>
                    
                    <li><strong>Test users qo'shish (agar "Testing" holatida bo'lsa):</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>"Test users" bo'limiga o'ting</li>
                        <li>"ADD USERS" tugmasini bosing</li>
                        <li>Gmail email manzilingizni kiriting (masalan: <code className="bg-pink-100 px-1 rounded">siz@gmail.com</code>)</li>
                        <li>"ADD" tugmasini bosing</li>
                        <li>"Saqlash va davom etish" (SAVE AND CONTINUE) tugmasini bosing</li>
                      </ul>
                    </li>
                    
                    <li><strong>OAuth 2.0 Client ID yaratish:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Chap menudan <strong>"API va xizmatlar"</strong> (APIs &amp; Services) &gt; <strong>"Credentials"</strong> bo'limiga o'ting</li>
                        <li>Yuqoridagi <strong>"+ CREDENTIALS"</strong> tugmasini bosing</li>
                        <li><strong>"OAuth client ID"</strong> ni tanlang</li>
                        <li><strong>Application type:</strong> <code className="bg-pink-100 px-1 rounded">Web application</code> ni tanlang</li>
                        <li><strong>Name:</strong> <code className="bg-pink-100 px-1 rounded">Personal Leak Detector</code> yozing</li>
                        <li><strong>Authorized redirect URIs:</strong> bo'limiga quyidagi manzilni qo'shing:
                          <div className="mt-1 p-2 bg-pink-100 border border-pink-300 rounded">
                            <code className="text-xs">http://localhost:8000/api/v1/oauth/gmail/callback</code>
                          </div>
                        </li>
                        <li>"Yaratish" (CREATE) tugmasini bosing</li>
                        <li><strong>⚠️ MUHIM:</strong> Client ID va Client Secret'ni ko'chirib oling va xavfsiz joyda saqlang!</li>
                        <li>"OK" tugmasini bosing</li>
                      </ul>
                    </li>
                    
                    <li><strong>Credentials.json faylini yuklab olish:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>"Credentials" sahifasida yaratilgan OAuth 2.0 Client ID yonidagi <strong>⬇️ Download</strong> ikonkasini bosing</li>
                        <li>Yoki Client ID'ni bosing va "Download JSON" tugmasini bosing</li>
                        <li><code className="bg-pink-100 px-1 rounded">client_secret_*.json</code> fayli yuklab olinadi</li>
                        <li>Bu faylni <code className="bg-pink-100 px-1 rounded">credentials.json</code> deb nomlang</li>
                      </ul>
                    </li>
                  </ol>
                  
                  <p className="mt-3"><strong>📤 Credentials.json faylini yuklash:</strong></p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>Navigation bar'da "Sozlamalar" bo'limiga o'ting</li>
                    <li>"Credentials.json Yuklash" tugmasini bosing</li>
                    <li>Yuklab olgan <code className="bg-pink-100 px-1 rounded">credentials.json</code> faylini tanlang</li>
                    <li>"Yuklash" tugmasini bosing</li>
                    <li>Muvaffaqiyatli yuklangandan so'ng, "Gmail Hisobini Ulash (OAuth)" tugmasini bosing</li>
                  </ol>
                  
                  <p className="mt-3"><strong>🔗 Gmail hisobini ulash:</strong></p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>"Gmail Hisobini Ulash (OAuth)" tugmasini bosing</li>
                    <li>Google'ga yo'naltiriladi - Google account bilan login qiling</li>
                    <li>Ruxsat bering (Gmail'ni o'qish va o'zgartirish uchun - <strong>gmail.modify</strong> scope'ini tanlashni unutmang!)</li>
                    <li>Muvaffaqiyatli ulangan bo'lsa, hisob ro'yxatda ko'rinadi</li>
                  </ol>
                  
                  <p className="mt-3"><strong>🔍 Gmail tahlil qilish:</strong></p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>Ulangan Gmail hisob yonidagi <strong>🔍 Tahlil qilish</strong> tugmasini bosing</li>
                    <li>Tahlil qilish boshlanadi</li>
                    <li>Topilmalar "Topilmalar" sahifasida ko'rinadi</li>
                  </ol>
                  
                  <p className="mt-2"><strong>⚠️ Muhim:</strong> Redirect URI to'g'ri sozlanishi kerak!</p>
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-semibold text-red-900 mb-1">⚠️ "Gmail API has not been used" yoki "accessNotConfigured" xatosi bo'lsa:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1 text-sm text-red-800">
                          <li>Gmail API faollashtirilmagan bo'lishi mumkin</li>
                          <li>Google Cloud Console'da <strong>API va xizmatlar &gt; Kutubxona</strong> bo'limiga o'ting</li>
                          <li>"Gmail API" ni qidiring va <strong>FAOLLASHTIRISH</strong> tugmasini bosing</li>
                          <li>Yoki to'g'ridan-to'g'ri: <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">Gmail API'ni faollashtirish</a></li>
                          <li>API faollashtirilgandan keyin 2-3 daqiqa kutib turing</li>
                          <li>Keyin qayta tahlil qilishni urinib ko'ring</li>
                        </ul>
                      </div>
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-semibold text-yellow-900 mb-1">⚠️ "redirect_uri_mismatch" xatosi bo'lsa:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1 text-yellow-800">
                      <li>Google Cloud Console'da <strong>Authorized redirect URIs</strong> ga quyidagi manzilni qo'shing:</li>
                      <li><code className="bg-yellow-100 px-1 rounded">http://localhost:8000/api/v1/oauth/gmail/callback</code></li>
                      <li>Yoki credentials.json faylida <code className="bg-yellow-100 px-1 rounded">redirect_uris</code> bo'limiga qo'shing</li>
                      <li>Sozlamalarni saqlang va 5-10 daqiqa kutib turing</li>
                    </ul>
                  </div>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-semibold text-red-900 mb-1">🚫 "403: access_denied" yoki "ilova tekshirilmagan" xatosi bo'lsa:</p>
                    <p className="text-sm text-red-800 mb-2">Bu xato Google Cloud Console'da ilova "Testing" holatida bo'lganda chiqadi.</p>
                    <p className="text-sm font-medium text-red-900 mb-1">Yechim 1: OAuth consent screen'ni Production'ga o'zgartirish (Tavsiya etiladi):</p>
                    <ol className="list-decimal list-inside ml-2 space-y-1 text-sm text-red-800">
                      <li>Google Cloud Console'ga kiring: <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://console.cloud.google.com/</a></li>
                      <li>Loyihani tanlang</li>
                      <li>API va xizmatlar &gt; <strong>OAuth consent screen</strong> bo'limiga o'ting</li>
                      <li>Quyidagi maydonlarni to'ldiring:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li><strong>User type:</strong> <code className="bg-red-100 px-1 rounded">External</code> (yoki Internal agar Google Workspace bo'lsa)</li>
                          <li><strong>App name:</strong> <code className="bg-red-100 px-1 rounded">Personal Leak Detector</code></li>
                          <li><strong>User support email:</strong> Sizning email manzilingiz</li>
                          <li><strong>Developer contact information:</strong> Sizning email manzilingiz</li>
                        </ul>
                      </li>
                      <li><strong>Scopes</strong> bo'limiga quyidagilarni qo'shing (MUHIM: Xabarlarni o'chirish va spam sifatida belgilash uchun <code className="bg-red-100 px-1 rounded">gmail.modify</code> scope'ini qo'shing!):
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li><code className="bg-red-100 px-1 rounded">https://www.googleapis.com/auth/gmail.readonly</code> - Gmail'ni o'qish uchun</li>
                          <li><code className="bg-red-100 px-1 rounded font-semibold">https://www.googleapis.com/auth/gmail.modify</code> - <strong>Xabarlarni o'chirish va spam sifatida belgilash uchun (MUHIM!)</strong></li>
                          <li><code className="bg-red-100 px-1 rounded">https://www.googleapis.com/auth/userinfo.email</code> - Email manzilini olish uchun</li>
                          <li><code className="bg-red-100 px-1 rounded">https://www.googleapis.com/auth/userinfo.profile</code> - Profil ma'lumotlarini olish uchun</li>
                        </ul>
                        <p className="text-xs text-red-700 mt-2 italic">⚠️ Eslatma: Agar siz xabarlarni o'chirish yoki spam sifatida belgilash funksiyalaridan foydalanmoqchi bo'lsangiz, <code className="bg-red-100 px-1 rounded">gmail.modify</code> scope'ini qo'shish shart!</p>
                      </li>
                      <li><strong>Test users</strong> bo'limiga o'zingizning email manzilingizni qo'shing (agar Testing holatida bo'lsa)</li>
                      <li>Oxirida <strong>"PUBLISH APP"</strong> tugmasini bosing</li>
                      <li>Google'ning tasdiqlash jarayonini kutib turing (bir necha daqiqa yoki kun)</li>
                    </ol>
                    <p className="text-sm font-medium text-red-900 mt-3 mb-1">Yechim 2: Test ro'yxatiga qo'shish (Tezkor yechim):</p>
                    <ol className="list-decimal list-inside ml-2 space-y-1 text-sm text-red-800">
                      <li>Google Cloud Console'da <strong>OAuth consent screen</strong> bo'limiga o'ting</li>
                      <li><strong>Test users</strong> bo'limiga o'zingizning email manzilingizni qo'shing</li>
                      <li>Sozlamalarni saqlang</li>
                      <li>Endi o'sha email bilan login qilish mumkin bo'ladi</li>
                    </ol>
                    <p className="text-xs text-red-700 mt-2 italic">Eslatma: Testing holatida faqat test ro'yxatidagi foydalanuvchilar login qila oladi. Production holatida barcha foydalanuvchilar login qila oladi.</p>
                  </div>
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-semibold text-blue-900 mb-2">✅ To'liq ruxsat olish uchun (Xabarlarni o'chirish va spam sifatida belgilash):</p>
                    <ol className="list-decimal list-inside ml-2 space-y-1 text-sm text-blue-800">
                      <li>Google Cloud Console'ga kiring: <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://console.cloud.google.com/</a></li>
                      <li>Loyihani tanlang</li>
                      <li>API va xizmatlar &gt; <strong>OAuth consent screen</strong> bo'limiga o'ting</li>
                      <li><strong>Scopes</strong> bo'limiga quyidagi scope'ni qo'shing:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li><code className="bg-blue-100 px-1 rounded">https://www.googleapis.com/auth/gmail.modify</code></li>
                        </ul>
                      </li>
                      <li>Sozlamalarni saqlang</li>
                      <li>Settings sahifasida Gmail hisobingizni o'chirib tashlang (agar mavjud bo'lsa)</li>
                      <li>"Gmail Hisobini Ulash (OAuth)" tugmasini bosing va qayta ulang</li>
                      <li>Google'da ruxsat berishda <strong>barcha scope'lar</strong>ni tanlashni unutmang!</li>
                    </ol>
                  </div>
                  <p className="mt-2"><strong>Qanday ulash:</strong></p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>Navigation bar'da "Sozlamalar" bo'limiga o'ting</li>
                    <li>"Credentials.json Yuklash" tugmasini bosib, Google Cloud Console'dan olingan credentials.json faylini yuklang</li>
                    <li>"Gmail Hisobini Ulash (OAuth)" tugmasini bosing</li>
                    <li>Google'ga yo'naltiriladi - Google account bilan login qiling</li>
                    <li>Ruxsat bering (Gmail'ni o'qish va o'zgartirish uchun - <strong>gmail.modify</strong> scope'ini tanlashni unutmang!)</li>
                    <li>Muvaffaqiyatli ulangan bo'lsa, hisob ro'yxatda ko'rinadi</li>
                  </ol>
                  <p className="mt-2"><strong>Uzish:</strong> Hisob yonidagi quti ikonkasini bosing va tasdiqlang</p>
                </div>
              </div>
            </div>
          </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowGmailGuideModal(false)}
                className="btn-primary px-6 py-2"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Tahlil Modal */}
      {showScanModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={(e) => {
            // Only allow closing modal when clicking outside if scan is completed, failed, or cancelled
            if (scanStatus === 'completed' || scanStatus === 'failed' || scanStatus === 'cancelled') {
              setShowScanModal(false);
              setScanStatus(null);
              setScanResult(null);
              setCurrentScanId(null);
              // Clear modal state from localStorage
              try {
                localStorage.removeItem('gmail-scan-modal');
              } catch (error) {
                console.error('Error clearing modal state:', error);
              }
            } else if (scanStatus === 'running') {
              // Prevent closing modal when clicking outside if scan is running
              e.stopPropagation();
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {scanStatus === 'running' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Gmail Tahlil Qilinmoqda</h3>
                  <button
                    onClick={handleCancelScan}
                    disabled={cancelScanMutation.isLoading}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Tahlilni to'xtatish"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="text-center mb-6">
                  <div className="relative inline-block mb-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto">
                      <EnvelopeIcon className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                    </div>
                  </div>
                  
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    {scanningAccount && accounts?.find(a => a.id === scanningAccount)?.email || 'Gmail'} hisobi tahlil qilinmoqda
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Iltimos, kuting. Bu biroz vaqt olishi mumkin...
                  </p>
                  
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm text-blue-700 font-medium">Tahlil jarayonida...</span>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCancelScan}
                    disabled={cancelScanMutation.isLoading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span>Ortga (To'xtatish)</span>
                  </button>
                </div>
              </>
            )}
            
            {scanStatus === 'completed' && scanResult && (() => {
              // Get latest scan data from scans query to ensure we have the most up-to-date statistics
              const latestScan = scans?.find(s => 
                s.type === 'email' && 
                (s.id === currentScanId || (scanResult.email && s.summary?.email === scanResult.email)) &&
                s.status === 'completed'
              );
              
              // Extract statistics from latest scan if available, otherwise use scanResult
              let displayTotalMessages = scanResult.total_messages || 0;
              let displayDangerousMessages = scanResult.dangerous_messages || 0;
              let displayOtherMessages = scanResult.other_messages || 0;
              let displayEmail = scanResult.email || 'Gmail';
              
              if (latestScan && latestScan.summary) {
                const summary = latestScan.summary;
                
                // Get total_messages
                if (summary.total_messages !== undefined && summary.total_messages !== null && typeof summary.total_messages === 'number') {
                  displayTotalMessages = summary.total_messages;
                } else if (summary.processed_messages !== undefined && summary.processed_messages !== null && typeof summary.processed_messages === 'number') {
                  displayTotalMessages = summary.processed_messages;
                }
                
                // Get dangerous_messages
                if (summary.dangerous_messages !== undefined && summary.dangerous_messages !== null && typeof summary.dangerous_messages === 'number') {
                  displayDangerousMessages = summary.dangerous_messages;
                } else if (summary.phishing_detected !== undefined && summary.phishing_detected !== null && typeof summary.phishing_detected === 'number') {
                  displayDangerousMessages = summary.phishing_detected;
                }
                
                // Get other_messages
                if (summary.other_messages !== undefined && summary.other_messages !== null && typeof summary.other_messages === 'number') {
                  displayOtherMessages = summary.other_messages;
                } else if (displayTotalMessages > 0 && displayDangerousMessages >= 0) {
                  displayOtherMessages = Math.max(0, displayTotalMessages - displayDangerousMessages);
                }
                
                // Get email
                if (summary.email) {
                  displayEmail = summary.email;
                }
              }
              
              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Gmail Tahlil Tugallandi</h3>
                    <button
                      onClick={() => {
                        // Only allow closing if scan is completed, failed, or cancelled
                        if (scanStatus === 'completed' || scanStatus === 'failed' || scanStatus === 'cancelled') {
                          setShowScanModal(false);
                          setScanStatus(null);
                          setScanResult(null);
                          // Clear modal state from localStorage
                          try {
                            localStorage.removeItem('gmail-scan-modal');
                          } catch (error) {
                            console.error('Error clearing modal state:', error);
                          }
                        }
                      }}
                      disabled={scanStatus === 'running'}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={scanStatus === 'running' ? 'Tahlil tugamaguncha yopib bo\'lmaydi' : 'Yopish'}
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircleIcon className="h-10 w-10 text-white" />
                    </div>
                    
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      Muvaffaqiyatli yakunlandi!
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      {scanResult.message || `"${displayEmail}" tahlil qilindi!`}
                    </p>
                    
                    {/* Always show statistics if we have any data */}
                    {(displayTotalMessages > 0 || displayDangerousMessages > 0 || displayOtherMessages > 0) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-blue-600">{displayTotalMessages}</p>
                            <p className="text-xs text-gray-600 mt-1">Jami xabar</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-red-600">{displayDangerousMessages}</p>
                            <p className="text-xs text-gray-600 mt-1">Xavfli</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-600">{displayOtherMessages}</p>
                            <p className="text-xs text-gray-600 mt-1">Boshqa</p>
                          </div>
                        </div>
                      </div>
                    )}
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      📋 Tahlil natijalarini qayerdan ko'rish mumkin?
                    </p>
                    <ul className="text-sm text-green-800 space-y-1 text-left">
                      <li>• <strong>Topilmalar</strong> sahifasida barcha topilgan xabarlarni ko'rishingiz mumkin</li>
                      <li>• <strong>Skanlar</strong> sahifasida barcha tahlil tarixini ko'rishingiz mumkin</li>
                      <li>• <strong>Boshqaruv Paneli</strong> sahifasida umumiy statistikani ko'rishingiz mumkin</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Link
                    to="/findings"
                    onClick={() => {
                      setShowScanModal(false);
                      setScanStatus(null);
                      setScanResult(null);
                      // Clear modal state from localStorage
                      try {
                        localStorage.removeItem('gmail-scan-modal');
                      } catch (error) {
                        console.error('Error clearing modal state:', error);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <span>Topilmalarni Ko'rish</span>
                  </Link>
                  <button
                    onClick={() => {
                      setShowScanModal(false);
                      setScanStatus(null);
                      setScanResult(null);
                      // Clear modal state from localStorage
                      try {
                        localStorage.removeItem('gmail-scan-modal');
                      } catch (error) {
                        console.error('Error clearing modal state:', error);
                      }
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                  >
                    Yopish
                  </button>
                </div>
              </>
            );
            })()}
            
            {scanStatus === 'failed' && scanResult && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Gmail Tahlil Muvaffaqiyatsiz</h3>
                  <button
                    onClick={() => {
                      setShowScanModal(false);
                      setScanStatus(null);
                      setScanResult(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExclamationTriangleIcon className="h-10 w-10 text-white" />
                  </div>
                  
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    Tahlil muvaffaqiyatsiz yakunlandi
                  </p>
                  <p className="text-sm text-red-600 mb-4">
                    {scanResult.error || 'Tahlil qilishda xatolik yuz berdi'}
                  </p>
                </div>
                
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowScanModal(false);
                          setScanStatus(null);
                          setScanResult(null);
                          // Clear modal state from localStorage
                          try {
                            localStorage.removeItem('gmail-scan-modal');
                          } catch (error) {
                            console.error('Error clearing modal state:', error);
                          }
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                      >
                        Yopish
                      </button>
                    </div>
                  </>
                )}
                
                {scanStatus === 'cancelled' && scanResult && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Gmail Tahlil Bekor Qilindi</h3>
                      <button
                        onClick={() => {
                          setShowScanModal(false);
                          setScanStatus(null);
                          setScanResult(null);
                          // Clear modal state from localStorage
                          try {
                            localStorage.removeItem('gmail-scan-modal');
                          } catch (error) {
                            console.error('Error clearing modal state:', error);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <InformationCircleIcon className="h-10 w-10 text-white" />
                  </div>
                  
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    Tahlil bekor qilindi
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    {scanResult.message || 'Tahlil muvaffaqiyatli bekor qilindi.'}
                  </p>
                </div>
                
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowScanModal(false);
                          setScanStatus(null);
                          setScanResult(null);
                          // Clear modal state from localStorage
                          try {
                            localStorage.removeItem('gmail-scan-modal');
                          } catch (error) {
                            console.error('Error clearing modal state:', error);
                          }
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                      >
                        Yopish
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Parol almashtirish Modal */}
          {showPasswordModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Parolni o'zgartirish</h3>
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Joriy parol
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="input-field w-full pr-10"
                        placeholder="Joriy parolingizni kiriting"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yangi parol
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input-field w-full pr-10"
                        placeholder="Yangi parolingizni kiriting"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yangi parolni tasdiqlash
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field w-full pr-10"
                        placeholder="Yangi parolingizni qayta kiriting"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">Parollar mos kelmaydi!</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowPasswordModal(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                    >
                      Bekor qilish
                    </button>
                    <button
                      onClick={() => {
                        if (!currentPassword || !newPassword || !confirmPassword) {
                          alert('Iltimos, barcha maydonlarni to\'ldiring!');
                          return;
                        }
                        if (newPassword !== confirmPassword) {
                          alert('Parollar mos kelmaydi!');
                          return;
                        }
                        if (newPassword.length < 8) {
                          alert('Yangi parol kamida 8 belgidan iborat bo\'lishi kerak!');
                          return;
                        }
                        changePasswordMutation.mutate({
                          currentPassword,
                          newPassword
                        });
                      }}
                      disabled={changePasswordMutation.isLoading || newPassword !== confirmPassword}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {changePasswordMutation.isLoading ? 'Kuting...' : 'Parolni o\'zgartirish'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email almashtirish Modal */}
          {showEmailModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Emailni o'zgartirish</h3>
                  <button
                    onClick={() => {
                      setShowEmailModal(false);
                      setNewEmail('');
                      setEmailPassword('');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yangi email
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="input-field w-full"
                      placeholder="Yangi email manzilingizni kiriting"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parolni tasdiqlash
                    </label>
                    <div className="relative">
                      <input
                        type={showEmailPassword ? "text" : "password"}
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        className="input-field w-full pr-10"
                        placeholder="Parolingizni kiriting (tasdiqlash uchun)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailPassword(!showEmailPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showEmailPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Eslatma: Email o'zgargandan so'ng, yangi email bilan login qilishingiz kerak bo'ladi.
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowEmailModal(false);
                        setNewEmail('');
                        setEmailPassword('');
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                    >
                      Bekor qilish
                    </button>
                    <button
                      onClick={() => {
                        if (!newEmail || !emailPassword) {
                          alert('Iltimos, barcha maydonlarni to\'ldiring!');
                          return;
                        }
                        if (!newEmail.includes('@')) {
                          alert('Iltimos, to\'g\'ri email manzil kiriting!');
                          return;
                        }
                        changeEmailMutation.mutate({
                          newEmail,
                          password: emailPassword
                        });
                      }}
                      disabled={changeEmailMutation.isLoading}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {changeEmailMutation.isLoading ? 'Kuting...' : 'Emailni o\'zgartirish'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
