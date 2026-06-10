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

  // ===== Lokal Agent: token + hisobotlar =====
  const [copied, setCopied] = useState(false);
  const { data: agentTokenData } = useQuery(
    'agent-token',
    async () => (await api.get('/v1/agent/token')).data,
    { retry: false, refetchOnWindowFocus: false }
  );
  const agentToken = agentTokenData?.agent_token || '';
  const { data: agentReports } = useQuery(
    'agent-reports',
    async () => (await api.get('/v1/agent/reports')).data,
    { retry: false, refetchInterval: 10000 }
  );
  const latestReport = Array.isArray(agentReports) && agentReports.length > 0 ? agentReports[0] : null;
  const copyToken = () => {
    navigator.clipboard.writeText(agentToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {/* ===== Lokal Agent — PC disklarini skanlash ===== */}
      <div className="card p-6 border-2 border-blue-100">
        <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
          <ComputerDesktopIcon className="h-6 w-6 text-blue-600" />
          <span>Lokal Agent — kompyuteringiz disklarini skanlash</span>
        </h2>
        <p className="text-gray-600 mb-4 text-sm">
          Brauzer xavfsizligi sababli sayt sizning disklaringizni (C:, D:) to'g'ridan-to'g'ri o'qiy olmaydi.
          Quyidagi <b>Agent</b> dasturini o'z kompyuteringizda ishga tushiring — u disklarni skanlab, natijani shu yerga yuboradi.
        </p>

        <label className="block text-sm font-semibold text-gray-700 mb-1">Agent token (maxfiy)</label>
        <div className="flex items-center space-x-2 mb-4">
          <input readOnly value={agentToken} className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-xs font-mono" />
          <button
            onClick={copyToken}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap"
          >
            {copied ? 'Nusxalandi ✓' : 'Nusxa olish'}
          </button>
        </div>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-6">
          <div className="text-gray-400"># 1) pld_agent.py ni yuklab oling (pastdagi havola)</div>
          <div className="text-gray-400"># 2) Terminal / CMD da ishga tushiring:</div>
          <div>python pld_agent.py --token &lt;NUSXALANGAN_TOKEN&gt;</div>
          <div className="text-gray-400"># Butun disklarni skanlash uchun: --full</div>
        </div>
        <a href="/pld_agent.py" className="inline-block mt-3 text-blue-600 underline text-sm">
          ⬇ pld_agent.py ni yuklab olish
        </a>

        {latestReport && (
          <div className="mt-5 border-t pt-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              Oxirgi skan: {latestReport.hostname} — {latestReport.platform}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {(latestReport.disks || []).map((d, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-2 border text-center">
                  <div className="font-semibold text-sm">{d.name}</div>
                  {d.total_size && (
                    <div className="text-xs text-gray-500">{(d.total_size / 1024 ** 3).toFixed(0)} GB</div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Topilgan maxfiy belgilar: <b className="text-red-600">{latestReport.findings_count}</b>
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {(latestReport.findings || []).slice(0, 50).map((f, i) => (
                <div key={i} className="text-xs bg-gray-50 rounded p-2 border flex justify-between gap-2">
                  <span className="font-mono text-gray-500 truncate">{f.path}</span>
                  <span className="text-red-600 whitespace-nowrap">{f.type}: {f.preview}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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

    </div>
  );
}

