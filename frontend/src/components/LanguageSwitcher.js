import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

/**
 * Universal Language Switcher Component
 * Barcha sahifalarda ishlatish mumkin bo'lgan til o'zgartirish komponenti
 */
export default function LanguageSwitcher({ className = '', position = 'right' }) {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowLanguageMenu(false);
      }
    };

    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showLanguageMenu]);

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    setShowLanguageMenu(false);
    
    // Smooth scroll to top to see language change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const languages = [
    { code: 'uz', name: t('language.uzbek'), flag: '🇺🇿' },
    { code: 'ko', name: t('language.korean'), flag: '🇰🇷' },
  ];

  const positionClasses = {
    right: 'right-0',
    left: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
        className={`inline-flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          showLanguageMenu
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-105'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 hover:shadow-md'
        }`}
        title={t('language.switchLanguage')}
        aria-label={t('language.switchLanguage')}
        aria-expanded={showLanguageMenu}
      >
        <GlobeAltIcon className={`h-5 w-5 ${showLanguageMenu ? 'text-white' : 'text-gray-600'}`} />
        <span className="ml-2 hidden sm:inline-block font-semibold">
          {languages.find(lang => lang.code === currentLanguage)?.flag || '🌐'}
        </span>
      </button>
      
      {showLanguageMenu && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowLanguageMenu(false)}
            aria-hidden="true"
          ></div>
          <div 
            ref={menuRef}
            className={`absolute ${positionClasses[position]} mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-20 overflow-hidden animate-fade-in`}
          >
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {t('language.switchLanguage')}
              </p>
            </div>
            <div className="py-2">
              {languages.map((lang, index) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full text-left px-4 py-3.5 text-sm transition-all duration-150 flex items-center space-x-3 ${
                    index > 0 ? 'border-t border-gray-100' : ''
                  } ${
                    currentLanguage === lang.code
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold' 
                      : 'text-gray-700 hover:bg-blue-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="flex-1 font-medium">{lang.name}</span>
                  {currentLanguage === lang.code && (
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

