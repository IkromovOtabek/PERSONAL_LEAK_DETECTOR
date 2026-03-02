import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { formatKST } from '../utils/dateUtils';
import { ShieldCheckIcon, PlusIcon, TrashIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export default function SensitiveItems() {
  const { t } = useTranslation();
  
  const PII_TYPES = [
    { value: 'email', label: t('sensitiveItems.piiTypes.email'), icon: '📧' },
    { value: 'phone', label: t('sensitiveItems.piiTypes.phone'), icon: '📱' },
    { value: 'credit_card', label: t('sensitiveItems.piiTypes.credit_card'), icon: '💳' },
    { value: 'passport', label: t('sensitiveItems.piiTypes.passport'), icon: '🛂' },
    { value: 'id_card', label: t('sensitiveItems.piiTypes.id_card'), icon: '🪪' },
    { value: 'secret_key', label: t('sensitiveItems.piiTypes.secret_key'), icon: '🔑' },
    { value: 'token', label: t('sensitiveItems.piiTypes.token'), icon: '🎫' },
    { value: 'document', label: t('sensitiveItems.piiTypes.document'), icon: '📄' },
    { value: 'other', label: t('sensitiveItems.piiTypes.other'), icon: '📋' },
  ];
  const [showModal, setShowModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [type, setType] = useState('email');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Token bor-yo'qligini tekshirish
  const hasToken = !!localStorage.getItem('token');

  const { data: items, isLoading, error: itemsError } = useQuery(
    'sensitive-items',
    async () => {
      try {
        const response = await api.get('/v1/sensitive-items/');
        return response.data;
      } catch (error) {
        // 401 yoki network xatolarini ignore qilamiz
        if (error.response?.status === 401 || error.code === 'ERR_NETWORK') {
          return [];
        }
        console.error('Error fetching sensitive items:', error);
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

  const createMutation = useMutation(
    async (data) => {
      const response = await api.post('/v1/sensitive-items/', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('sensitive-items');
        queryClient.refetchQueries('sensitive-items'); // Avtomatik yangilash
        queryClient.invalidateQueries('findings'); // Findings ham yangilanishi kerak
        queryClient.refetchQueries('findings'); // Avtomatik yangilash
        setShowModal(false);
        setValue('');
        setLabel('');
        setError('');
      },
      onError: (err) => {
        setError(err.response?.data?.detail || 'Failed to create item');
      },
    }
  );

  const deleteMutation = useMutation(
    async (id) => {
      await api.delete(`/v1/sensitive-items/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('sensitive-items');
        queryClient.refetchQueries('sensitive-items'); // Avtomatik yangilash
        queryClient.invalidateQueries('findings'); // Findings ham yangilanishi kerak
        queryClient.refetchQueries('findings'); // Avtomatik yangilash
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!value.trim()) {
      setError(t('sensitiveItems.valueRequired'));
      return;
    }
    
    createMutation.mutate({ type, value, label });
  };

  const getTypeInfo = (typeValue) => {
    return PII_TYPES.find(t => t.value === typeValue) || PII_TYPES[0];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {t('sensitiveItems.title')}
            </h1>
            <p className="text-lg text-gray-600">
              {t('sensitiveItems.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowGuideModal(true)}
            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            title={t('sensitiveItems.userGuide')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center font-semibold"
        >
          <PlusIcon className="h-5 w-5 mr-2.5" />
          <span className="font-semibold">{t('sensitiveItems.add')}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : items?.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const typeInfo = getTypeInfo(item.type);
            return (
              <div key={item.id} className="card p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center text-2xl">
                      {typeInfo.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.label || typeInfo.label}</h3>
                      <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('sensitiveItems.delete')}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
                    <p className="text-xs text-gray-500">
                  {t('sensitiveItems.added')}: {formatKST(item.created_at, 'd MMM, yyyy')}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <ShieldCheckIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-500 mb-4">{t('sensitiveItems.noItems')}</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2.5 inline" />
            <span className="font-semibold">{t('sensitiveItems.addFirst')}</span>
          </button>
        </div>
      )}

      {/* Ma'lumot Qo'shish Modali */}
      {showModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{t('sensitiveItems.addItem')}</h3>
                  <button
                    onClick={() => setShowModal(false)}
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
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('sensitiveItems.type')}</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="input-field"
                      required
                    >
                      {PII_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('sensitiveItems.value')}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="input-field"
                      placeholder={t('sensitiveItems.valuePlaceholder')}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('sensitiveItems.label')}</label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="input-field"
                      placeholder={t('sensitiveItems.labelPlaceholder')}
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={createMutation.isLoading}
                      className="btn-primary flex-1 disabled:opacity-50"
                    >
                      {createMutation.isLoading ? t('sensitiveItems.adding') : t('sensitiveItems.addButton')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
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
              <h3 className="text-2xl font-bold text-gray-900">{t('sensitiveItems.guideTitle')}</h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-gray-800">
              <div className="p-5 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start space-x-3 mb-3">
                  <InformationCircleIcon className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-purple-900 mb-2">{t('sensitiveItems.addItem')}</h3>
                    <div className="space-y-2 text-sm text-purple-800">
                      <p><strong>{t('dashboard.guidePurpose')}</strong> {t('sensitiveItems.subtitle')}</p>
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
