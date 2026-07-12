'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from '@/contexts/I18nContext'
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
  const router = useRouter()
  const pathname = usePathname()

  // 기본 네비게이션 아이템 리스트 (items가 제공되지 않을 때 사용)
  const defaultNavigationItems: NavigationItem[] = [
    {
      id: 'friends',
      icon: '👥',
      label: t('chat.friends'),
      onClick: () => router.push('/friends')
    },
    {
      id: 'chats',
      icon: '💬',
      label: t('chat.chats'),
      onClick: () => router.push('/chat')
    },
    {
      id: 'settings',
      icon: '⚙',
      label: t('chat.settings'),
      onClick: () => router.push('/settings')
    }
  ]

  // 사용할 네비게이션 아이템 결정
  const navigationItems = items || defaultNavigationItems

  // 네비게이션 아이템 렌더링 함수
  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = (item.id === 'chats' && pathname === '/chat') ||
                    (item.id === 'friends' && pathname === '/friends') ||
                    (item.id === 'settings' && pathname === '/settings')

    return (
      <Button
        key={item.id}
        variant="ghost"
        onClick={item.onClick}
        className={`flex-1 flex flex-col items-center py-2 rounded-[20px] transition-all ${
          isActive ? 'text-[var(--icon-active)] bg-secondary' : 'text-secondary'
        }`}
      >
        <span className={`text-xl mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
        <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
      </Button>
    )
  }

  return (
    <div className="px-3 pb-3 pt-1">
      <div className="glass-dock rounded-[26px] px-3 py-1.5 flex items-center justify-between">
        {navigationItems.map(renderNavigationItem)}
      </div>
    </div>
  )
}