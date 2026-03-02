import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import {
  HomeIcon,
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  EnvelopeIcon,
  UserIcon,
  ComputerDesktopIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
  DocumentMagnifyingGlassIcon as DocumentMagnifyingGlassIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ComputerDesktopIcon as ComputerDesktopIconSolid,
  KeyIcon as KeyIconSolid,
} from '@heroicons/react/24/solid';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: HomeIcon, iconSolid: HomeIconSolid },
    { name: t('monitoring.title'), href: '/monitoring', icon: ComputerDesktopIcon, iconSolid: ComputerDesktopIconSolid },
    { name: t('nav.scans'), href: '/scans', icon: DocumentMagnifyingGlassIcon, iconSolid: DocumentMagnifyingGlassIconSolid },
    { name: t('nav.findings'), href: '/findings', icon: ExclamationTriangleIcon, iconSolid: ExclamationTriangleIconSolid },
    { name: t('nav.encryption'), href: '/encryption', icon: KeyIcon, iconSolid: KeyIconSolid },
    { name: t('nav.settings'), href: '/settings', icon: Cog6ToothIcon, iconSolid: Cog6ToothIconSolid },
  ];

  const adminNavigation = [
    { name: t('nav.adminPanel'), href: '/admin', icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="w-full mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-3 lg:gap-4">
            {/* Logo - Left side */}
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldCheckIcon className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gradient whitespace-nowrap hidden sm:block">PLD</h1>
              </div>
            </div>
            
            {/* Navigation Items - Center */}
            <div className="hidden sm:flex sm:items-center sm:justify-center sm:gap-1 md:gap-2 lg:gap-3 flex-nowrap overflow-x-auto scrollbar-hide flex-1 px-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const IconComponent = isActive ? item.iconSolid : item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-2 sm:px-3 md:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 min-w-fit ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                      <span className="font-semibold leading-tight whitespace-nowrap overflow-visible inline-block">{item.name}</span>
                    </Link>
                  );
                })}
                {user?.is_admin && adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const IconComponent = isActive ? item.iconSolid : item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-2 sm:px-3 md:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 min-w-fit ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                          : 'text-purple-700 hover:bg-purple-50 hover:text-purple-900'
                      }`}
                    >
                      <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 flex-shrink-0 ${isActive ? 'text-white' : 'text-purple-600'}`} />
                      <span className="font-semibold leading-tight whitespace-nowrap overflow-visible inline-block">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            
            {/* Right side - Language, User, Logout */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Universal Language Switcher */}
              <LanguageSwitcher />
              <div className="hidden lg:flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                <UserIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{user?.email || t('nav.user')}</span>
              </div>
              {user && (
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 hover:shadow-md whitespace-nowrap flex-shrink-0"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="font-semibold hidden sm:inline">{t('nav.logout')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
