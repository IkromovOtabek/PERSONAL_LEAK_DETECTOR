import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
    
    // Listen for token expiration events
    const handleTokenExpired = () => {
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    };
    
    window.addEventListener('auth:token-expired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
    };
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Token yo'q - bu normal holat, login qilmagan
        setLoading(false);
        return null;
      }
      
      // Token bor - user ma'lumotlarini olishga harakat qilamiz
      const response = await api.get('/v1/user/');
      setUser(response.data);
      setLoading(false);
      return response.data;
    } catch (error) {
      // 401 xatosi - token noto'g'ri yoki eskirgan
      if (error.response?.status === 401) {
        // Token'ni o'chiramiz va user'ni null qilamiz
        localStorage.removeItem('token');
        setUser(null);
        setLoading(false);
        // Xatoni throw qilmaymiz - bu normal holat
        return null;
      }
      
      // Boshqa xatolar
      console.error('Error fetching user:', error);
      setLoading(false);
      setUser(null);
      return null;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/v1/auth/login', { email, password });
      const token = response.data.access_token;
      
      // Save token immediately
      localStorage.setItem('token', token);
      
      // Fetch user data and wait for it to complete - this is critical for navigation
      try {
        const userData = await fetchUser();
        // Ensure user state is set before returning
        if (userData) {
          setUser(userData);
        }
      } catch (fetchError) {
        // If fetchUser fails, still return login response but log the error
        console.error('Error fetching user after login:', fetchError);
        // Don't throw - login was successful, just user fetch failed
        // User will be fetched on next page load
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      // Remove token if login fails
      localStorage.removeItem('token');
      setUser(null);
      throw error;
    }
  };

  const register = async (email, password) => {
    try {
      const response = await api.post('/v1/auth/register', { email, password });
      return response.data;
    } catch (error) {
      // Re-throw with better error message
      const errorMessage = error.response?.data?.detail || error.message || 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

