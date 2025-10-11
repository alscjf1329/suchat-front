'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/contexts/I18nContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Input, Button, BottomNavigation } from '@/components/ui'
import Toast, { ToastType } from '@/components/ui/Toast'
import { 
  initializePushNotifications, 
  registerServiceWorker, 
  getPushSubscription,
  unsubscribeFromPush,
  removeSubscriptionFromServer,
  sendTestPush
} from '@/lib/push'

interface SettingSection {
  id: string
  title: string
  icon: string
  items: SettingItem[]
}

interface SettingItem {
  id: string
  label: string
  type: 'toggle' | 'select' | 'button' | 'input'
  value?: any
  options?: { label: string; value: any }[]
  action?: () => void
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { theme, setTheme, actualTheme } = useTheme()
  const router = useRouter()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [isCheckingPush, setIsCheckingPush] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type })
  }

  // 푸시 알림 상태 확인
  useEffect(() => {
    checkPushStatus()
  }, [])

  const checkPushStatus = async () => {
    try {
      const registration = await registerServiceWorker()
      if (registration) {
        const subscription = await getPushSubscription(registration)
        setPushEnabled(!!subscription)
      }
    } catch (error) {
      console.error('푸시 상태 확인 실패:', error)
    } finally {
      setIsCheckingPush(false)
    }
  }

  const handlePushToggle = async (enabled: boolean) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      showToast('로그인이 필요합니다', 'error')
      return
    }

    try {
      if (enabled) {
        // 푸시 알림 활성화
        const result = await initializePushNotifications(token)
        
        if (result.success) {
          setPushEnabled(true)
          showToast('푸시 알림이 활성화되었습니다', 'success')
        } else {
          if (result.reason === 'permission_denied') {
            showToast('알림 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.', 'error')
          } else {
            const errorMsg = result.error?.message || '알 수 없는 오류'
            showToast(`푸시 알림 활성화에 실패했습니다: ${errorMsg}`, 'error')
          }
        }
      } else {
        // 푸시 알림 비활성화
        const registration = await registerServiceWorker()
        if (registration) {
          const subscription = await getPushSubscription(registration)
          if (subscription) {
            await removeSubscriptionFromServer(subscription, token)
            await unsubscribeFromPush(registration)
            setPushEnabled(false)
            showToast('푸시 알림이 비활성화되었습니다', 'info')
          }
        }
      }
    } catch (error) {
      console.error('푸시 토글 실패:', error)
      showToast('오류가 발생했습니다', 'error')
    }
  }

  const handleTestPush = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      showToast('로그인이 필요합니다', 'error')
      return
    }

    if (!pushEnabled) {
      showToast('먼저 푸시 알림을 활성화해주세요', 'error')
      return
    }

    const success = await sendTestPush(token)
    if (success) {
      showToast('테스트 알림을 전송했습니다. 잠시 후 알림을 확인하세요.', 'success')
    } else {
      showToast('테스트 알림 전송에 실패했습니다', 'error')
    }
  }

  const handleLogout = () => {
    router.push('/login')
  }

  const handleDeleteAccount = () => {
    if (confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      console.log('계정 삭제')
    }
  }

  const settingSections: SettingSection[] = [
    {
      id: 'profile',
      title: t('settings.profile'),
      icon: '👤',
      items: [
        { id: 'profilePicture', label: t('settings.profilePicture'), type: 'button', action: () => console.log('프로필 사진 변경') },
        { id: 'displayName', label: t('settings.displayName'), type: 'input', value: '사용자' },
        { id: 'status', label: t('settings.status'), type: 'input', value: '온라인' },
        { id: 'phoneNumber', label: t('settings.phoneNumber'), type: 'input', value: '+82 10-1234-5678' },
        { id: 'bio', label: t('settings.bio'), type: 'input', value: '안녕하세요!' },
      ]
    },
    {
      id: 'privacy',
      title: t('settings.privacy'),
      icon: '🔒',
      items: [
        { 
          id: 'onlineStatus', 
          label: t('settings.onlineStatus'), 
          type: 'toggle', 
          value: true 
        },
        { 
          id: 'readReceipts', 
          label: t('settings.readReceipts'), 
          type: 'toggle', 
          value: true 
        },
        { 
          id: 'lastSeen', 
          label: t('settings.lastSeen'), 
          type: 'select',
          value: 'friends',
          options: [
            { label: t('settings.everyone'), value: 'everyone' },
            { label: t('settings.friends'), value: 'friends' },
            { label: t('settings.nobody'), value: 'nobody' }
          ]
        },
        { 
          id: 'profileVisibility', 
          label: t('settings.profileVisibility'), 
          type: 'select',
          value: 'friends',
          options: [
            { label: t('settings.everyone'), value: 'everyone' },
            { label: t('settings.friends'), value: 'friends' },
            { label: t('settings.nobody'), value: 'nobody' }
          ]
        }
      ]
    },
    {
      id: 'notifications',
      title: t('settings.notifications'),
      icon: '🔔',
      items: [
        { 
          id: 'pushNotifications', 
          label: t('settings.pushNotifications'), 
          type: 'toggle', 
          value: pushEnabled 
        },
        { 
          id: 'testPushNotification', 
          label: '🧪 테스트 알림 보내기', 
          type: 'button', 
          action: handleTestPush 
        },
        { 
          id: 'messageNotifications', 
          label: t('settings.messageNotifications'), 
          type: 'toggle', 
          value: true 
        },
        { 
          id: 'friendRequestNotifications', 
          label: t('settings.friendRequestNotifications'), 
          type: 'toggle', 
          value: true 
        },
        { 
          id: 'soundNotifications', 
          label: t('settings.soundNotifications'), 
          type: 'toggle', 
          value: false 
        },
        { 
          id: 'vibrationNotifications', 
          label: t('settings.vibrationNotifications'), 
          type: 'toggle', 
          value: true 
        }
      ]
    },
    {
      id: 'appearance',
      title: t('settings.appearance'),
      icon: '🎨',
      items: [
        { 
          id: 'theme', 
          label: t('settings.theme'), 
          type: 'select',
          value: theme,
          options: [
            { label: t('theme.light'), value: 'light' },
            { label: t('theme.dark'), value: 'dark' },
            { label: t('theme.system'), value: 'system' }
          ]
        },
        { 
          id: 'fontSize', 
          label: t('settings.fontSize'), 
          type: 'select',
          value: 'medium',
          options: [
            { label: '작게', value: 'small' },
            { label: '보통', value: 'medium' },
            { label: '크게', value: 'large' }
          ]
        },
        { 
          id: 'compactMode', 
          label: t('settings.compactMode'), 
          type: 'toggle', 
          value: false 
        },
        { 
          id: 'showAvatars', 
          label: t('settings.showAvatars'), 
          type: 'toggle', 
          value: true 
        },
        { 
          id: 'showTimestamps', 
          label: t('settings.showTimestamps'), 
          type: 'toggle', 
          value: true 
        }
      ]
    },
    {
      id: 'account',
      title: t('settings.account'),
      icon: '⚙',
      items: [
        { id: 'changePassword', label: t('settings.changePassword'), type: 'button', action: () => console.log('비밀번호 변경') },
        { id: 'changeEmail', label: t('settings.changeEmail'), type: 'button', action: () => console.log('이메일 변경') },
        { id: 'logout', label: t('settings.logout'), type: 'button', action: handleLogout },
        { id: 'deleteAccount', label: t('settings.deleteAccount'), type: 'button', action: handleDeleteAccount },
      ]
    },
    {
      id: 'about',
      title: t('settings.about'),
      icon: 'ℹ',
      items: [
        { id: 'appVersion', label: t('settings.appVersion'), type: 'button', action: () => console.log('앱 버전: 1.0.0') },
        { id: 'termsOfService', label: t('settings.termsOfService'), type: 'button', action: () => console.log('서비스 약관') },
        { id: 'privacyPolicy', label: t('settings.privacyPolicy'), type: 'button', action: () => console.log('개인정보 처리방침') },
        { id: 'contactSupport', label: t('settings.contactSupport'), type: 'button', action: () => console.log('고객 지원') },
        { id: 'rateApp', label: t('settings.rateApp'), type: 'button', action: () => console.log('앱 평가') },
        { id: 'shareApp', label: t('settings.shareApp'), type: 'button', action: () => console.log('앱 공유') },
      ]
    }
  ]

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  const handleSettingChange = (sectionId: string, itemId: string, value: any) => {
    console.log('설정 변경:', sectionId, itemId, value)
    
    // 테마 변경 처리
    if (itemId === 'theme') {
      setTheme(value)
    }
    
    // 푸시 알림 토글 처리
    if (itemId === 'pushNotifications') {
      handlePushToggle(value)
    }
  }

  const renderSettingItem = (section: SettingSection, item: SettingItem) => {
    switch (item.type) {
      case 'toggle':
        return (
          <div key={item.id} className="flex items-center justify-between py-3 px-4">
            <span className="text-sm text-primary">{item.label}</span>
            <button
              onClick={() => handleSettingChange(section.id, item.id, !item.value)}
              className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                item.value ? 'bg-[#0064FF]' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                item.value ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        )

      case 'select':
        return (
          <div key={item.id} className="py-3 px-4">
            <span className="text-sm text-primary block mb-2">{item.label}</span>
            <select
              value={item.value}
              onChange={(e) => handleSettingChange(section.id, item.id, e.target.value)}
              className="w-full p-2 bg-secondary border border-divider rounded-lg text-sm text-primary"
            >
              {item.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )

      case 'input':
        return (
          <div key={item.id} className="py-3 px-4">
            <span className="text-sm text-primary block mb-2">{item.label}</span>
            <Input
              type="text"
              value={item.value}
              onChange={(e) => handleSettingChange(section.id, item.id, e.target.value)}
              className="w-full"
            />
          </div>
        )

      case 'button':
        return (
          <button
            key={item.id}
            onClick={item.action}
            className="w-full flex items-center justify-between py-3 px-4 hover:bg-secondary transition-colors duration-200"
          >
            <span className="text-sm text-primary">{item.label}</span>
            <span className="text-secondary">›</span>
          </button>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-screen w-full bg-primary flex flex-col">
      {/* 헤더 */}
      <header className="bg-primary border-b border-divider px-2 h-16 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="w-8"></div>
          <h1 className="text-lg font-semibold text-primary">{t('settings.title')}</h1>
          <div className="w-8"></div>
        </div>
      </header>

      {/* 설정 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-2 p-2">
          {settingSections.map((section) => (
            <div key={section.id} className="bg-primary border border-divider rounded-xl overflow-hidden">
              {/* 섹션 헤더 */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{section.icon}</span>
                  <span className="text-sm font-medium text-primary">{section.title}</span>
                </div>
                <span className="text-secondary">
                  {expandedSection === section.id ? '▲' : '▼'}
                </span>
              </button>

              {/* 섹션 내용 */}
              {expandedSection === section.id && (
                <div className="border-t border-divider">
                  {section.items.map((item) => renderSettingItem(section, item))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 하단 네비게이션 바 */}
      <BottomNavigation />

      {/* Toast 알림 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
