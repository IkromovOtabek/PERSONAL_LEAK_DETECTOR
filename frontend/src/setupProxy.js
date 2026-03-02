const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Faqat /api so'rovlarini backend'ga proxy qilish
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      // Favicon va boshqa static fayllar proxy qilinmaydi
      logLevel: 'warn', // Faqat xatolarni ko'rsatish
    })
  );
};

