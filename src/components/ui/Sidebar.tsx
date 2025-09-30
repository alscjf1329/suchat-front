'use client'

import React, { useState } from 'react'
import { Button } from './index'
import { useTheme } from '@/contexts/ThemeContext'
import { useTranslation } from '@/contexts/I18nContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { theme, setTheme, actualTheme } = useTheme()
  const { t } = useTranslation()
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  const themes = [
    { value: 'light', label: t('theme.light'), icon: '☀' },
    { value: 'dark', label: t('theme.dark'), icon: '🌙' },
    { value: 'system', label: t('theme.system'), icon: '💻' }
  ] as const

  const menuItems = [
    { label: t('sidebar.profile'), icon: '👤', action: () => console.log('프로필') },
    { label: t('sidebar.settings'), icon: '⚙', action: () => console.log('설정') },
    { label: t('sidebar.notifications'), icon: '🔔', action: () => console.log('알림') },
    { label: t('sidebar.help'), icon: '?', action: () => console.log('도움말') },
    { label: t('sidebar.info'), icon: 'ℹ', action: () => console.log('정보') }
  ]

  return (
    <>
      {/* 오버레이 백드롭 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* 사이드바 */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-primary border-r border-divider z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-divider">
          <h2 className="text-xl font-bold text-primary">{t('sidebar.title')}</h2>
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="p-2"
          >
            <span className="text-secondary text-lg">✕</span>
          </Button>
        </div>

        {/* 메뉴 아이템들 */}
        <div className="p-4 space-y-2">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.action()
                onClose()
              }}
              className="w-full flex items-center px-4 py-4 text-left hover:bg-secondary transition-colors duration-200 text-primary rounded-xl"
            >
              <span className="text-2xl mr-4">{item.icon}</span>
              <span className="text-lg font-medium">{item.label}</span>
            </button>
          ))}
          
          {/* 테마 변경 메뉴 */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-secondary transition-colors duration-200 text-primary rounded-xl"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-4">🎨</span>
                <span className="text-lg font-medium">테마</span>
              </div>
              <span className="text-secondary">
                {showThemeMenu ? '▲' : '▼'}
              </span>
            </button>
            
            {showThemeMenu && (
              <div className="ml-4 mt-2 space-y-1">
                {themes.map((themeOption) => (
                  <button
                    key={themeOption.value}
                    onClick={() => {
                      setTheme(themeOption.value)
                      setShowThemeMenu(false)
                    }}
                    className={`w-full flex items-center px-4 py-3 text-left hover:bg-secondary transition-colors duration-200 rounded-lg ${
                      theme === themeOption.value 
                        ? 'text-[#0064FF] font-medium' 
                        : 'text-primary'
                    }`}
                  >
                    <span className="text-lg mr-3">{themeOption.icon}</span>
                    <div>
                      <div className="text-sm">{themeOption.label}</div>
                      {themeOption.value === 'system' && (
                        <div className="text-xs text-secondary">
                          {t('theme.current')}: {actualTheme === 'light' ? t('theme.light') : t('theme.dark')}
                        </div>
                      )}
                    </div>
                    {theme === themeOption.value && (
                      <span className="ml-auto text-[#0064FF]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 하단 사용자 정보 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-divider">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#0064FF] to-[#0052CC] rounded-xl flex items-center justify-center">
              <span className="text-white font-medium">U</span>
            </div>
            <div>
              <div className="text-primary font-medium">{t('sidebar.user')}</div>
              <div className="text-secondary text-sm">{t('sidebar.userEmail')}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
