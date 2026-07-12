'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField, Button, LanguageSwitcher, Toast, ToastType } from '@/components/ui'
import { useTranslation } from '@/contexts/I18nContext'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, SignInData } from '@/lib/api'
import { detectDeviceType, getDeviceInfo, detectDevicePlatform } from '@/lib/device'

interface ToastState {
  show: boolean
  message: string
  type: ToastType
}

export default function LoginPage() {
  // 개발 모드에서만 .env.local의 임시 계정 자동 입력 (프로덕션 빌드에선 항상 빈 값)
  const isDev = process.env.NODE_ENV === 'development'
  const [email, setEmail] = useState(isDev ? process.env.NEXT_PUBLIC_DEV_EMAIL ?? '' : '')
  const [password, setPassword] = useState(isDev ? process.env.NEXT_PUBLIC_DEV_PASSWORD ?? '' : '')
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' })
  const router = useRouter()
  const { t } = useTranslation()
  const { login } = useAuth()

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'info' })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const deviceType = detectDeviceType()
      const deviceInfo = getDeviceInfo()
      console.log('📱 디바이스 타입:', deviceType, deviceType === 'mobile' ? '(24시간)' : '(2시간)')
      console.log('📱 디바이스 정보:', deviceInfo)
      
      const signInData: SignInData = {
        email,
        password,
        deviceType,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        userAgent: deviceInfo.userAgent,
      }

      const response = await apiClient.signIn(signInData)
      
      if (response.success && response.data) {
        // AuthContext를 통해 로그인 처리
        const { accessToken, refreshToken, user } = response.data
        login(accessToken, refreshToken, user, deviceType)
        
        showToast('로그인에 성공했습니다! 🎉', 'success')
        
        // 토스트를 보여준 후 페이지 이동
        setTimeout(() => {
          router.push('/chat')
        }, 1500)
      } else {
        showToast('로그인에 실패했습니다: ' + response.message, 'error')
      }
    } catch (error) {
      console.error('로그인 에러:', error)
      showToast('로그인 중 오류가 발생했습니다.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      {/* 토스트 알림 */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* 언어 전환 버튼 */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="w-full max-w-md">
        <div className="card p-7">
          {/* 로고 — 물방울 */}
          <div className="mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#38bdf8] to-[#0284c7] rounded-[22px] rounded-tl-md flex items-center justify-center mb-5 shadow-lg shadow-sky-500/30">
              <span className="text-white font-extrabold text-xl">S</span>
            </div>
            <h1 className="text-[26px] font-extrabold text-primary mb-1.5">{t('login.title')}</h1>
            <p className="text-[15px] text-secondary">{t('login.subtitle')}</p>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* 이메일 입력 */}
            <FormField
              label={t('login.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              icon="✉"
              required
            />

            {/* 비밀번호 입력 */}
            <FormField
              label={t('login.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              icon="🔑"
              required
            />

            {/* 로그인 버튼 */}
            <Button
              type="submit"
              loading={isLoading}
              className="w-full px-6 py-4 text-[16px]"
            >
              {isLoading ? t('login.loginLoading') : t('login.loginButton')}
            </Button>
          </form>

          {/* 추가 옵션 */}
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm px-2 py-1"
              onClick={() => router.push('/forgot-password')}
            >
              {t('login.forgotPassword')}
            </Button>
          </div>

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center">
            <span className="text-sm text-secondary">
              {t('login.noAccount')}{' '}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm font-medium px-2 py-1"
              onClick={() => router.push('/signup')}
            >
              {t('login.signUp')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
