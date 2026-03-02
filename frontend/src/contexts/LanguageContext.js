import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Initialize from localStorage or browser language
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage && ['uz', 'ko'].includes(savedLanguage)) {
      return savedLanguage;
    }
    // Detect browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('ko')) {
      return 'ko';
    }
    return 'uz'; // Default to Uzbek
  });

  useEffect(() => {
    // Sync with i18n on mount
    const savedLanguage = localStorage.getItem('i18nextLng') || currentLanguage;
    if (savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
      setCurrentLanguage(savedLanguage);
    }
    
    // Set document language attribute
    document.documentElement.lang = currentLanguage;
    document.documentElement.setAttribute('translate', 'no');
    
    // Add language class to body for CSS targeting
    document.body.classList.remove('lang-uz', 'lang-ko');
    document.body.classList.add(`lang-${currentLanguage}`);
  }, []);

  // Listen to i18n language changes
  useEffect(() => {
    const handleLanguageChanged = (lng) => {
      setCurrentLanguage(lng);
      document.documentElement.lang = lng;
      document.body.classList.remove('lang-uz', 'lang-ko');
      document.body.classList.add(`lang-${lng}`);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  const changeLanguage = (lang) => {
    if (!['uz', 'ko'].includes(lang)) {
      console.warn(`Invalid language code: ${lang}. Defaulting to 'uz'.`);
      lang = 'uz';
    }
    
    setCurrentLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    
    // Update document attributes
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('translate', 'no');
    document.body.classList.remove('lang-uz', 'lang-ko');
    document.body.classList.add(`lang-${lang}`);
    
    // Trigger custom event for other components
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

