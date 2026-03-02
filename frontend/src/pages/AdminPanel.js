import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatKST } from '../utils/dateUtils';
import {
  UserGroupIcon,
  ClockIcon,
  ChartBarIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  DocumentIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [editingPassword, setEditingPassword] = useState({});
  const [newPassword, setNewPassword] = useState({});

  const handleExit = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get all users
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery(
    'admin-users',
    async () => {
      try {
        const response = await api.get('/v1/admin/users');
        return response.data;
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Admin ruxsati yo\'q');
        }
        throw error;
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true, // Oynaga qaytganda avtomatik yangilash
      refetchInterval: 30000, // 30 soniyada bir avtomatik yangilash
    }
  );

  // Get login history
  const { data: loginHistory, isLoading: historyLoading } = useQuery(
    'admin-login-history',
    async () => {
      try {
        const response = await api.get('/v1/admin/login-history');
        return response.data;
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          return [];
        }
        return [];
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true, // Oynaga qaytganda avtomatik yangilash
      refetchInterval: 30000, // 30 soniyada bir avtomatik yangilash
    }
  );

  // Get stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    'admin-stats',
    async () => {
      try {
        const response = await api.get('/v1/admin/stats');
        return response.data;
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          return null;
        }
        return null;
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true, // Oynaga qaytganda avtomatik yangilash
      refetchInterval: 30000, // 30 soniyada bir avtomatik yangilash
    }
  );

  // Get user activity
  const { data: userActivity, isLoading: activityLoading } = useQuery(
    ['admin-user-activity', selectedUser],
    async () => {
      if (!selectedUser) return null;
      try {
        const response = await api.get(`/v1/admin/users/${selectedUser}/activity`);
        return response.data;
      } catch (error) {
        return null;
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true, // Oynaga qaytganda avtomatik yangilash
      refetchInterval: 30000, // 30 soniyada bir avtomatik yangilash
      enabled: !!selectedUser,
    }
  );

  const updateUserMutation = useMutation(
    async ({ userId, data }) => {
      const response = await api.put(`/v1/admin/users/${userId}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
        queryClient.refetchQueries('admin-users'); // Avtomatik yangilash
        queryClient.invalidateQueries('admin-stats');
        queryClient.refetchQueries('admin-stats'); // Avtomatik yangilash
      },
    }
  );

  const updatePasswordMutation = useMutation(
    async ({ userId, newPassword }) => {
      const response = await api.put(`/v1/admin/users/${userId}/password`, {
        new_password: newPassword,
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
        queryClient.refetchQueries('admin-users'); // Avtomatik yangilash
        setEditingPassword({});
        setNewPassword({});
      },
    }
  );

  const deleteUserMutation = useMutation(
    async (userId) => {
      await api.delete(`/v1/admin/users/${userId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
        queryClient.refetchQueries('admin-users'); // Avtomatik yangilash
        queryClient.invalidateQueries('admin-stats');
        queryClient.refetchQueries('admin-stats'); // Avtomatik yangilash
        queryClient.invalidateQueries('admin-login-history');
        queryClient.refetchQueries('admin-login-history'); // Avtomatik yangilash
        setSelectedUser(null);
      },
    }
  );

  const togglePasswordVisibility = (userId) => {
    setShowPassword((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleUpdateUser = (userId, field, value) => {
    updateUserMutation.mutate({
      userId,
      data: { [field]: value },
    });
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Bu foydalanuvchini o\'chirishni xohlaysizmi?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleEditPassword = (userId) => {
    setEditingPassword((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
    if (!editingPassword[userId]) {
      setNewPassword((prev) => ({
        ...prev,
        [userId]: '',
      }));
    }
  };

  const handleSavePassword = (userId) => {
    const password = newPassword[userId];
    if (!password || password.length < 6) {
      alert('Parol kamida 6 belgidan iborat bo\'lishi kerak');
      return;
    }
    updatePasswordMutation.mutate({ userId, newPassword: password });
  };

  const handleCancelPasswordEdit = (userId) => {
    setEditingPassword((prev) => {
      const newState = { ...prev };
      delete newState[userId];
      return newState;
    });
    setNewPassword((prev) => {
      const newState = { ...prev };
      delete newState[userId];
      return newState;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="text-gradient">Admin Panel</span>
          </h1>
          <p className="text-lg text-gray-600">
            Barcha foydalanuvchilarni boshqarish va tizim statistikasini ko'rish
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExit}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
            title="Admin paneldan chiqish"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Chiqish
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-all duration-200 hover:shadow-md"
            title="Tizimdan chiqish"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="stat-card border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-600 mb-1">Jami Foydalanuvchilar</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total_users}</p>
          </div>
          <div className="stat-card border-l-4 border-green-500">
            <p className="text-sm font-medium text-gray-600 mb-1">Faol Foydalanuvchilar</p>
            <p className="text-3xl font-bold text-green-600">{stats.active_users}</p>
          </div>
          <div className="stat-card border-l-4 border-purple-500">
            <p className="text-sm font-medium text-gray-600 mb-1">Admin Foydalanuvchilar</p>
            <p className="text-3xl font-bold text-purple-600">{stats.admin_users}</p>
          </div>
          <div className="stat-card border-l-4 border-indigo-500">
            <p className="text-sm font-medium text-gray-600 mb-1">Jami Skanlar</p>
            <p className="text-3xl font-bold text-indigo-600">{stats.total_scans}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card p-6">
        <div className="flex space-x-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserGroupIcon className="h-5 w-5 inline mr-2" />
            Foydalanuvchilar
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClockIcon className="h-5 w-5 inline mr-2" />
            Kirish Tarixi
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'stats'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ChartBarIcon className="h-5 w-5 inline mr-2" />
            Statistika
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'files'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DocumentIcon className="h-5 w-5 inline mr-2" />
            Fayllar
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : usersError ? (
              <div className="text-center py-8">
                <p className="text-red-600">{usersError.message}</p>
              </div>
            ) : users?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Holat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Yaratilgan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amallar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                          {user.is_admin && (
                            <span className="ml-2 badge badge-high">Admin</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {editingPassword[user.id] ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={newPassword[user.id] || ''}
                                onChange={(e) =>
                                  setNewPassword((prev) => ({
                                    ...prev,
                                    [user.id]: e.target.value,
                                  }))
                                }
                                placeholder="Yangi parol"
                                className="px-2 py-1 border border-gray-300 rounded text-sm w-40"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSavePassword(user.id)}
                                className="text-green-600 hover:text-green-700"
                                title="Saqlash"
                                disabled={updatePasswordMutation.isLoading}
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleCancelPasswordEdit(user.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Bekor qilish"
                              >
                                <XCircleIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs text-gray-400">
                                {showPassword[user.id]
                                  ? user.password_hash
                                  : user.password_hash.substring(0, 20) + '...'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(user.id)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Hash'ni ko'rsatish/yashirish"
                              >
                                {showPassword[user.id] ? (
                                  <EyeSlashIcon className="h-4 w-4" />
                                ) : (
                                  <EyeIcon className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEditPassword(user.id)}
                                className="text-purple-600 hover:text-purple-700"
                                title="Parolni o'zgartirish"
                              >
                                <LockClosedIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateUser(user.id, 'is_active', !user.is_active)}
                              className={`p-1 rounded ${
                                user.is_active
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title={user.is_active ? 'Faol' : 'Nofaol'}
                            >
                              {user.is_active ? (
                                <CheckCircleIcon className="h-5 w-5" />
                              ) : (
                                <XCircleIcon className="h-5 w-5" />
                              )}
                            </button>
                            <span className={user.is_active ? 'text-green-600' : 'text-red-600'}>
                              {user.is_active ? 'Faol' : 'Nofaol'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatKST(user.created_at, 'd MMM, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedUser(user.id)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Faollikni ko'rish"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleUpdateUser(user.id, 'is_admin', !user.is_admin)}
                              className={`p-1 rounded ${
                                user.is_admin
                                  ? 'text-purple-600 hover:bg-purple-50'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                              title={user.is_admin ? 'Admin' : 'Oddiy foydalanuvchi'}
                            >
                              <ShieldCheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                              title="O'chirish"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Foydalanuvchilar topilmadi</p>
              </div>
            )}
          </div>
        )}

        {/* Login History Tab */}
        {activeTab === 'history' && (
          <div>
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : loginHistory?.length > 0 ? (
              <div className="space-y-4">
                {loginHistory.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      log.action === 'login_success'
                        ? 'bg-green-50 border-green-500'
                        : 'bg-red-50 border-red-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {log.user_email || 'Noma\'lum'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {log.action === 'login_success' ? 'Muvaffaqiyatli kirish' : 'Kirish xatosi'}
                        </p>
                        {log.meta?.reason && (
                          <p className="text-xs text-gray-500 mt-1">
                            Sabab: {log.meta.reason}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {formatKST(log.timestamp, 'd MMM, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Kirish tarixi topilmadi</p>
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div>
            {statsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="stat-card border-l-4 border-blue-500">
                  <p className="text-sm font-medium text-gray-600 mb-1">Jami Foydalanuvchilar</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.total_users}</p>
                </div>
                <div className="stat-card border-l-4 border-green-500">
                  <p className="text-sm font-medium text-gray-600 mb-1">Faol Foydalanuvchilar</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active_users}</p>
                </div>
                <div className="stat-card border-l-4 border-purple-500">
                  <p className="text-sm font-medium text-gray-600 mb-1">Admin Foydalanuvchilar</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.admin_users}</p>
                </div>
                <div className="stat-card border-l-4 border-yellow-500">
                  <p className="text-sm font-medium text-gray-600 mb-1">Tasdiqlangan Foydalanuvchilar</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.verified_users}</p>
                </div>
                <div className="stat-card border-l-4 border-indigo-500">
                  <p className="text-sm font-medium text-gray-600 mb-1">Jami Skanlar</p>
                  <p className="text-3xl font-bold text-indigo-600">{stats.total_scans}</p>
                </div>
                <div className="stat-card border-l-4 border-red-500">
                  <p className="text-sm font-medium text-gray-600 mb-1">Jami Topilmalar</p>
                  <p className="text-3xl font-bold text-red-600">{stats.total_findings}</p>
                </div>
                <div className="stat-card border-l-4 border-teal-500">
                  <p className="text-sm font-medium text-gray-600 mb-1">Jami Sensitive Items</p>
                  <p className="text-3xl font-bold text-teal-600">{stats.total_sensitive_items}</p>
                </div>
                <div className="stat-card border-l-4 border-pink-500">
                  <p className="text-sm font-medium text-gray-600 mb-1">Ulangan Hisoblar</p>
                  <p className="text-3xl font-bold text-pink-600">{stats.total_connected_accounts}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Statistika topilmadi</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Activity Modal */}
      {selectedUser && userActivity && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Foydalanuvchi Faolligi: {userActivity.user?.email}
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Skanlar ({userActivity.scans?.length || 0})</h4>
                <div className="space-y-2">
                  {userActivity.scans?.map((scan) => (
                    <div key={scan.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">{scan.type}</span> - {scan.status} -{' '}
                        {formatKST(scan.created_at, 'd MMM, yyyy HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Topilmalar ({userActivity.findings?.length || 0})</h4>
                <div className="space-y-2">
                  {userActivity.findings?.map((finding) => (
                    <div key={finding.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">{finding.type}</span> - {finding.severity} -{' '}
                        {formatKST(finding.created_at, 'd MMM, yyyy HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Kirish Tarixi ({userActivity.login_history?.length || 0})
                </h4>
                <div className="space-y-2">
                  {userActivity.login_history?.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg ${
                        log.action === 'login_success' ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <p className="text-sm">
                        {log.action === 'login_success' ? 'Muvaffaqiyatli' : 'Xatolik'} -{' '}
                        {formatKST(log.timestamp, 'd MMM, yyyy HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

