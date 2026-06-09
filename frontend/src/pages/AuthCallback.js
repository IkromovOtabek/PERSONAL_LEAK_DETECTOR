import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * Backend redirects here after "Continue with Google" with ?token=JWT.
 * Save token and reload to dashboard so AuthContext picks it up.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
    } else {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <p className="text-gray-600">Kirish amalga oshirilmoqda...</p>
    </div>
  );
}
