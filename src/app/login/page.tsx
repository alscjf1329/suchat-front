'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField, Button, LanguageSwitcher, Toast, ToastType } from '@/components/ui'
import { useTranslation } from '@/contexts/I18nContext'
import { apiClient, SignInData } from '@/lib/api'
import { detectDeviceType } from '@/lib/device'

interface ToastState {
  show: boolean
  message: string
  type: ToastType
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' })
  const router = useRouter()
  const { t } = useTranslation()

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
      console.log('📱 디바이스 타입:', deviceType, deviceType === 'mobile' ? '(24시간)' : '(2시간)')
      
      const signInData: SignInData = {
        email,
        password,
        deviceType,
      }

      const response = await apiClient.signIn(signInData)
      
      if (response.success && response.data) {
        // Access Token + Refresh Token + 사용자 정보 저장
        const { accessToken, refreshToken, user } = response.data
        
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('user', JSON.stringify(user))
        localStorage.setItem('deviceType', deviceType)
        
        console.log(`✅ 로그인 성공 (${deviceType}) - 토큰 저장 완료`)
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
        <div className="bg-primary rounded-2xl shadow-lg p-8 border border-divider">
          {/* 로고 */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0064FF] to-[#0052CC] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-[#0064FF] font-bold text-lg">S</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">{t('login.title')}</h1>
            <p className="text-secondary">{t('login.subtitle')}</p>
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
              className="w-full px-6 py-3"
            >
              {isLoading ? t('login.loginLoading') : t('login.loginButton')}
            </Button>
          </form>

          {/* 추가 옵션 */}
          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" className="text-sm px-2 py-1">
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
