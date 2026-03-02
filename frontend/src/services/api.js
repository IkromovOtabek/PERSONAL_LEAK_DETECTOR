import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// So'rovlarga token qo'shish
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Token bo'lmasa ham so'rov yuboriladi - lekin useQuery'da enabled: hasToken bilan boshqariladi
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Xatolarni boshqarish
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 xatolarini boshqarish (ruxsatsiz) - token eskirgan yoki noto'g'ri
    if (error.response?.status === 401) {
      // Token'ni tozalash
      const token = localStorage.getItem('token');
      if (token) {
        console.warn('401 Unauthorized: Token expired or invalid. Clearing token and redirecting to login...');
        localStorage.removeItem('token');
        
        // Foydalanuvchini login sahifasiga yo'naltirish
        // Faqat login sahifasida bo'lmasak
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          // Event yuborish - AuthContext va boshqa komponentlar eshitishi uchun
          window.dispatchEvent(new CustomEvent('auth:token-expired'));
          
          // Login sahifasiga yo'naltirish
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }
    }
    
    // 404 xatolarini boshqarish (topilmadi) - log qilamiz
    if (error.response?.status === 404) {
      console.error('404 Not Found:', error.config?.url);
      // 404 xatolarini ham silent qilamiz - useQuery'da handle qilinadi
    }
    
    // Debug uchun tarmoq xatolarini log qilish (faqat backend ulanib bo'lmaganda)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      // Tarmoq xatolarini ham silent qilamiz - useQuery'da handle qilinadi
      console.error('Network Error: Backend server is not running or not accessible');
    }
    
    return Promise.reject(error);
  }
);

export default api;

