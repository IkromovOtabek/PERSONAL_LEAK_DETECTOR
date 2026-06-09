import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import Scans from './pages/Scans';
import Findings from './pages/Findings';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import EncryptedDownload from './pages/EncryptedDownload';
import EncryptionExample from './components/EncryptionExample';
import Layout from './components/Layout';
import AuthCallback from './pages/AuthCallback';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Oynaga qaytganda avtomatik yangilash
      refetchOnReconnect: true, // Internet qayta ulanganda avtomatik yangilash
      refetchInterval: 30000, // 30 soniyada bir avtomatik yangilash
      retry: 1,
      staleTime: 10000, // 10 soniyadan keyin ma'lumot eski deb hisoblanadi
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <Router>
          <Routes>
            {/* Ochiq route'lar */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/encrypted-download/:token" element={<EncryptedDownload />} />
            
            {/* Default route - redirect to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Himoyalangan route'lar */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/monitoring"
              element={
                <PrivateRoute>
                  <Layout>
                    <Monitoring />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/scans"
              element={
                <PrivateRoute>
                  <Layout>
                    <Scans />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/findings"
              element={
                <PrivateRoute>
                  <Layout>
                    <Findings />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/encryption"
              element={
                <PrivateRoute>
                  <Layout>
                    <EncryptionExample />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Layout>
                    <AdminPanel />
                  </Layout>
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;

