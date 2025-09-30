'use client'

import React, { useState } from 'react'
import { useTranslation } from '@/contexts/I18nContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from './index'

export interface NavigationItem {
  id: string
  icon: string
  label: string
  onClick: () => void
}

interface BottomNavigationProps {
  items?: NavigationItem[]
  onMenuClick?: () => void
  onNewChatClick?: () => void
  onLogoutClick?: () => void
}

export default function BottomNavigation({ 
  items,
  onMenuClick, 
  onNewChatClick, 
  onLogoutClick 
}: BottomNavigationProps) {
  const { t } = useTranslation()
  const { theme, setTheme, actualTheme } = useTheme()
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  const themes = [
    { value: 'light', label: t('theme.light'), icon: '☀' },
    { value: 'dark', label: t('theme.dark'), icon: '🌙' },
    { value: 'system', label: t('theme.system'), icon: '💻' }
  ] as const

  // 기본 네비게이션 아이템 리스트 (items가 제공되지 않을 때 사용)
  const defaultNavigationItems: NavigationItem[] = [
    {
      id: 'friends',
      icon: '👥',
      label: t('chat.friends'),
      onClick: () => console.log('친구창 열기')
    },
    {
      id: 'chats',
      icon: '💬',
      label: t('chat.chats'),
      onClick: () => console.log('채팅방 목록')
    },
    {
      id: 'settings',
      icon: '⚙',
      label: t('chat.settings'),
      onClick: () => console.log('설정 열기')
    }
  ]

  // 사용할 네비게이션 아이템 결정
  const navigationItems = items || defaultNavigationItems

  // 네비게이션 아이템 렌더링 함수
  const renderNavigationItem = (item: NavigationItem) => (
    <Button 
      key={item.id}
      variant="ghost" 
      onClick={item.onClick}
      className="flex-1 flex flex-col items-center py-2"
    >
      <span className="text-xl mb-1">{item.icon}</span>
      <span className="text-xs text-secondary">{item.label}</span>
    </Button>
  )

  return (
    <>
      {/* 테마 메뉴 오버레이 */}
      {showThemeMenu && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setShowThemeMenu(false)}
        />
      )}

      {/* 테마 선택 메뉴 */}
      {showThemeMenu && (
        <div className="fixed bottom-24 left-4 right-4 bg-primary rounded-xl shadow-lg border border-divider py-3 z-50">
          <div className="px-4 mb-2">
            <h3 className="text-sm font-medium text-primary">테마 선택</h3>
          </div>
          <div className="space-y-1">
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value)
                  setShowThemeMenu(false)
                }}
                className={`w-full flex items-center px-4 py-3 text-left hover:bg-secondary transition-colors duration-200 ${
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
        </div>
      )}

      {/* 하단 네비게이션 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-primary border-t border-divider px-4 py-2 z-30">
        <div className="flex items-center justify-between">
          {navigationItems.map(renderNavigationItem)}
        </div>
      </div>
    </>
  )
}
