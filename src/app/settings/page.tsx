'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/contexts/I18nContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { Input, Button, BottomNavigation } from '@/components/ui'
import Toast, { ToastType } from '@/components/ui/Toast'
import { 
  initializePushNotifications, 
  registerServiceWorker, 
  getPushSubscription,
  unsubscribeFromPush,
  removeSubscriptionFromServer,
  sendTestPush,
  getDeviceList,
  updateDeviceName,
  logoutDevice
} from '@/lib/push'
import { getDeviceInfo, getOrCreateDeviceId } from '@/lib/device'

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
  const { logout } = useAuth()
  const router = useRouter()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [isCheckingPush, setIsCheckingPush] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [devices, setDevices] = useState<any[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(false)
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)
  const [editingDeviceName, setEditingDeviceName] = useState('')

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type })
  }

  // 푸시 알림 상태 확인
  useEffect(() => {
    checkPushStatus()
    loadDevices()
  }, [])

  const loadDevices = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsLoadingDevices(true)
      const deviceList = await getDeviceList(token)
      console.log('📱 기기 목록 로드:', {
        count: deviceList.length,
        devices: deviceList.map(d => ({
          id: d.id,
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          deviceType: d.deviceType,
          userAgent: d.userAgent,
          isActive: d.isActive,
          lastLoginAt: d.lastLoginAt,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        }))
      })
      setDevices(deviceList)
    } catch (error) {
      console.error('기기 목록 로드 실패:', error)
    } finally {
      setIsLoadingDevices(false)
    }
  }

  const handleEditDeviceName = (device: any) => {
    setEditingDeviceId(device.deviceId)
    setEditingDeviceName(device.deviceName || '')
  }

  const handleSaveDeviceName = async (deviceId: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      showToast('로그인이 필요합니다', 'error')
      return
    }

    if (!editingDeviceName.trim()) {
      showToast('기기 이름을 입력해주세요', 'error')
      return
    }

    try {
      const success = await updateDeviceName(token, deviceId, editingDeviceName.trim())
      if (success) {
        // localStorage에도 저장 (다음 구독 시 사용)
        localStorage.setItem(`device_name_${deviceId}`, editingDeviceName.trim())
        
        showToast('기기 이름이 변경되었습니다', 'success')
        setEditingDeviceId(null)
        setEditingDeviceName('')
        await loadDevices()
      } else {
        showToast('기기 이름 변경에 실패했습니다', 'error')
      }
    } catch (error) {
      showToast('오류가 발생했습니다', 'error')
    }
  }

  const handleLogoutDevice = async (deviceId: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      showToast('로그인이 필요합니다', 'error')
      return
    }

    const currentDeviceId = getOrCreateDeviceId()
    if (deviceId === currentDeviceId) {
      showToast('현재 기기에서는 로그아웃할 수 없습니다', 'error')
      return
    }

    if (!confirm('이 기기에서 로그아웃하시겠습니까?')) {
      return
    }

    try {
      const success = await logoutDevice(token, deviceId)
      if (success) {
        showToast('기기에서 로그아웃되었습니다', 'success')
        await loadDevices()
      } else {
        showToast('기기 로그아웃에 실패했습니다', 'error')
      }
    } catch (error) {
      showToast('오류가 발생했습니다', 'error')
    }
  }

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

    // iOS 환경 체크
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios|fxios|edgios/i.test(navigator.userAgent)
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches

    console.log('📱 Device Info:', {
      isIOS,
      isSafari,
      isStandalone,
      userAgent: navigator.userAgent,
    })

    if (isIOS) {
      // iOS 버전 체크
      const match = navigator.userAgent.match(/OS (\d+)_(\d+)/)
      const iosVersion = match ? parseFloat(`${match[1]}.${match[2]}`) : 0
      
      console.log('🍎 iOS Version:', iosVersion)

      if (iosVersion < 16.4) {
        showToast(`iOS 16.4 이상이 필요합니다 (현재: iOS ${iosVersion})`, 'error')
        return
      }

      if (!isSafari) {
        showToast('iOS에서는 Safari 브라우저만 푸시 알림을 지원합니다', 'error')
        return
      }

      if (!isStandalone) {
        showToast('홈 화면에 앱을 추가한 후 실행해주세요\n\nSafari 공유 버튼(⬆️) → "홈 화면에 추가"', 'error')
        return
      }
    }

    try {
      if (enabled) {
        console.log('🔔 Enabling push notifications...')
        
        // 푸시 알림 활성화
        const result = await initializePushNotifications(token)
        
        console.log('📬 Push init result:', result)
        
        if (result.success) {
          setPushEnabled(true)
          showToast('푸시 알림이 활성화되었습니다', 'success')
        } else {
          if ('reason' in result && result.reason === 'permission_denied') {
            showToast('알림 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.', 'error')
          } else if ('reason' in result && result.reason === 'server_error') {
            // 서버 에러: [코드] 형식으로 포맷된 메시지 사용
            const errorMsg = result.error || '서버 오류가 발생했습니다.'
            
            console.error('❌ Push server error:', { 
              errorCode: result.errorCode, 
              error: result.error, 
              status: result.status,
              details: result.details 
            })
            
            // 이미 [코드] 형식이면 그대로 사용, 아니면 에러 코드 추가
            const finalErrorMsg = errorMsg.startsWith('[') 
              ? errorMsg 
              : result.errorCode 
                ? `[${result.errorCode}] ${errorMsg}`
                : errorMsg
            
            showToast(`푸시 알림 활성화 실패: ${finalErrorMsg}`, 'error')
          } else if ('reason' in result && result.reason === 'service_worker_failed') {
            showToast(`푸시 알림 활성화 실패: ${result.error || 'Service Worker 등록 실패'}`, 'error')
          } else if ('reason' in result && result.reason === 'subscription_failed') {
            showToast(`푸시 알림 활성화 실패: ${result.error || '푸시 구독 생성 실패'}`, 'error')
          } else if ('error' in result) {
            const errorMsg = (result.error instanceof Error ? result.error.message : String(result.error)) || '알 수 없는 오류'
            console.error('❌ Push error:', result.error)
            showToast(`푸시 알림 활성화 실패: ${errorMsg}`, 'error')
          } else {
            showToast('푸시 알림 활성화에 실패했습니다', 'error')
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
      console.error('❌ 푸시 토글 실패:', error)
      showToast(`오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error')
    }
  }

  const handleTestPush = () => {
    // 디버그 페이지로 리다이렉트
    window.location.href = '/test-push.html'
  }

  const handleLogout = async () => {
    await logout()
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
      id: 'devices',
      title: '기기 관리',
      icon: '📱',
      items: [] // 동적으로 렌더링
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
          <div key={item.id} className="flex items-center justify-between py-3.5 px-4">
            <span className="text-[15px] text-primary">{item.label}</span>
            <button
              onClick={() => handleSettingChange(section.id, item.id, !item.value)}
              className={`w-[52px] h-7 rounded-full transition-colors duration-200 ${
                item.value ? 'bg-[var(--icon-active)]' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`w-6 h-6 rounded-full shadow-sm transition-transform duration-200 ${
                item.value ? 'translate-x-[24px] bg-[var(--accent-contrast)]' : 'translate-x-0.5 bg-white'
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
            className="w-full flex items-center justify-between py-3.5 px-4 hover:bg-secondary transition-colors duration-200"
          >
            <span className="text-[15px] text-primary">{item.label}</span>
            <span className="text-secondary">›</span>
          </button>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-screen w-full bg-primary flex flex-col">
      {/* 헤더 — 토스식 큰 타이틀 */}
      <header className="px-5 pt-6 pb-2 flex items-center">
        <h1 className="text-[26px] font-extrabold text-primary">{t('settings.title')}</h1>
      </header>

      {/* 설정 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-3 px-4 py-2">
          {settingSections.map((section) => {
            // 기기 관리 섹션은 기기가 있을 때만 표시
            if (section.id === 'devices' && devices.length === 0 && !isLoadingDevices) {
              return null
            }
            
            return (
            <div key={section.id} className="card overflow-hidden">
              {/* 섹션 헤더 */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-10 h-10 rounded-[14px] bg-secondary flex items-center justify-center text-lg">{section.icon}</span>
                  <span className="text-[16px] font-semibold text-primary">{section.title}</span>
                </div>
                <span className={`text-secondary text-sm transition-transform duration-200 ${expandedSection === section.id ? 'rotate-180' : ''}`}>
                  ⌄
                </span>
              </button>

              {/* 섹션 내용 */}
              {expandedSection === section.id && (
                <div className="border-t border-divider">
                  {section.id === 'devices' ? (
                    // 기기 관리 섹션
                    <div className="py-2">
                      {isLoadingDevices ? (
                        <div className="flex items-center justify-center py-8">
                          <p className="text-secondary text-sm">기기 목록 불러오는 중...</p>
                        </div>
                      ) : devices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <p className="text-secondary text-sm">등록된 기기가 없습니다</p>
                        </div>
                      ) : (
                        <div className="space-y-2 px-4">
                          {devices.map((device) => {
                            const currentDeviceId = getOrCreateDeviceId()
                            const isCurrentDevice = device.deviceId === currentDeviceId
                            const deviceTypeIcons: Record<string, string> = {
                              ios: '🍎',
                              android: '🤖',
                              desktop: '💻',
                              tablet: '📱',
                            }
                            const deviceTypeLabels: Record<string, string> = {
                              ios: 'iOS',
                              android: 'Android',
                              desktop: '데스크톱',
                              tablet: '태블릿',
                            }

                            return (
                              <div
                                key={device.deviceId}
                                className="bg-secondary/30 rounded-lg p-4 border border-divider"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center space-x-3 flex-1">
                                    <span className="text-2xl">
                                      {deviceTypeIcons[device.deviceType] || '📱'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      {editingDeviceId === device.deviceId ? (
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="text"
                                            value={editingDeviceName}
                                            onChange={(e) => setEditingDeviceName(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                handleSaveDeviceName(device.deviceId)
                                              } else if (e.key === 'Escape') {
                                                setEditingDeviceId(null)
                                                setEditingDeviceName('')
                                              }
                                            }}
                                            className="flex-1 px-2 py-1 bg-primary border border-divider rounded text-sm text-primary"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleSaveDeviceName(device.deviceId)}
                                            className="px-3 py-1 bg-[var(--icon-active)] text-[var(--accent-contrast)] text-xs rounded hover:bg-[var(--icon-active)]"
                                          >
                                            저장
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingDeviceId(null)
                                              setEditingDeviceName('')
                                            }}
                                            className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                                          >
                                            취소
                                          </button>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-primary">
                                              {device.deviceName || `${deviceTypeLabels[device.deviceType] || '기기'}`}
                                            </span>
                                            {isCurrentDevice && (
                                              <span className="px-2 py-0.5 bg-[var(--icon-active)] text-[var(--accent-contrast)] text-xs rounded">
                                                현재 기기
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-secondary mt-1">
                                            {deviceTypeLabels[device.deviceType] || '알 수 없음'} · {new Date(device.updatedAt).toLocaleDateString('ko-KR')}
                                            {device.isActive === false && (
                                              <span className="ml-2 px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded">
                                                비활성
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {editingDeviceId !== device.deviceId && (
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleEditDeviceName(device)}
                                        className="px-2 py-1 text-xs text-secondary hover:text-primary"
                                      >
                                        ✏️
                                      </button>
                                      {!isCurrentDevice && (
                                        <button
                                          onClick={() => handleLogoutDevice(device.deviceId)}
                                          className="px-2 py-1 text-xs text-red-500 hover:text-red-600"
                                        >
                                          로그아웃
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    section.items.map((item) => renderSettingItem(section, item))
                  )}
                </div>
              )}
            </div>
            )
          })}
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
