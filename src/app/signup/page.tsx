'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField, Button, LanguageSwitcher } from '@/components/ui'
import Toast, { ToastType } from '@/components/ui/Toast'
import { useTranslation } from '@/contexts/I18nContext'
import { apiClient, SignUpData } from '@/lib/api'

export default function SignUpPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthday: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const router = useRouter()
  const { t } = useTranslation()

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type })
  }

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 입력 시 해당 필드 에러 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
    
    // 이메일 필드에 대한 실시간 유효성 검사
    if (field === 'email' && value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        setErrors(prev => ({
          ...prev,
          email: '올바른 이메일 형식이 아닙니다.'
        }))
      } else {
        // 추가 검증
        const emailParts = value.split('@')
        const localPart = emailParts[0]
        const domainPart = emailParts[1]
        
        if (localPart.length > 64) {
          setErrors(prev => ({
            ...prev,
            email: '이메일 주소가 너무 깁니다.'
          }))
        } else if (localPart.startsWith('.') || localPart.endsWith('.')) {
          setErrors(prev => ({
            ...prev,
            email: '이메일 주소는 점(.)으로 시작하거나 끝날 수 없습니다.'
          }))
        } else if (localPart.includes('..')) {
          setErrors(prev => ({
            ...prev,
            email: '이메일 주소에 연속된 점(..)이 포함될 수 없습니다.'
          }))
        } else if (domainPart && domainPart.length > 253) {
          setErrors(prev => ({
            ...prev,
            email: '도메인 이름이 너무 깁니다.'
          }))
        } else if (domainPart && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domainPart)) {
          setErrors(prev => ({
            ...prev,
            email: '올바른 도메인 형식이 아닙니다.'
          }))
        } else if (domainPart && domainPart.includes('..')) {
          setErrors(prev => ({
            ...prev,
            email: '도메인에 연속된 점(..)이 포함될 수 없습니다.'
          }))
        } else {
          // 유효한 이메일인 경우 에러 제거
          setErrors(prev => ({
            ...prev,
            email: ''
          }))
        }
      }
    }
  }

  const validateStep = (step: number) => {
    const newErrors: {[key: string]: string} = {}

    if (step === 1) {
      // 1단계: 기본 정보
      if (!formData.name.trim()) {
        newErrors.name = t('errors.required')
      } else if (formData.name.trim().length < 2) {
        newErrors.name = '이름은 최소 2자 이상이어야 합니다.'
      }

      // 강화된 이메일 유효성 검사
      if (!formData.email.trim()) {
        newErrors.email = t('errors.required')
      } else {
        // 기본 이메일 형식 검사
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
          newErrors.email = '올바른 이메일 형식이 아닙니다.'
        } else {
          // 더 엄격한 이메일 검사
          const emailParts = formData.email.split('@')
          const localPart = emailParts[0]
          const domainPart = emailParts[1]
          
          // 로컬 부분 검사 (이메일 @ 앞부분)
          if (localPart.length > 64) {
            newErrors.email = '이메일 주소가 너무 깁니다.'
          } else if (localPart.startsWith('.') || localPart.endsWith('.')) {
            newErrors.email = '이메일 주소는 점(.)으로 시작하거나 끝날 수 없습니다.'
          } else if (localPart.includes('..')) {
            newErrors.email = '이메일 주소에 연속된 점(..)이 포함될 수 없습니다.'
          }
          
          // 도메인 부분 검사
          if (!newErrors.email && domainPart) {
            if (domainPart.length > 253) {
              newErrors.email = '도메인 이름이 너무 깁니다.'
            } else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domainPart)) {
              newErrors.email = '올바른 도메인 형식이 아닙니다.'
            } else if (domainPart.includes('..')) {
              newErrors.email = '도메인에 연속된 점(..)이 포함될 수 없습니다.'
            }
          }
        }
      }
    } else if (step === 2) {
      // 2단계: 비밀번호
      if (!formData.password) {
        newErrors.password = t('errors.required')
      } else if (formData.password.length < 6) {
        newErrors.password = t('errors.passwordTooShort')
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = t('errors.required')
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
      }
    } else if (step === 3) {
      // 3단계: 추가 정보 (선택사항)
      if (formData.phone && !/^[0-9-+\s()]+$/.test(formData.phone)) {
        newErrors.phone = '올바른 전화번호 형식이 아닙니다.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 이메일 중복 확인 함수
  const checkEmailDuplicate = async (email: string): Promise<boolean> => {
    try {
      setIsCheckingEmail(true)
      const response = await apiClient.checkEmailExists(email)
      return response.data?.exists || false
    } catch (error) {
      console.error('이메일 중복 확인 에러:', error)
      return false
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      // 1단계에서는 이메일 중복 확인도 함께 수행
      if (validateStep(currentStep)) {
        // 이메일 중복 확인
        const isEmailDuplicate = await checkEmailDuplicate(formData.email)
        if (isEmailDuplicate) {
          setErrors(prev => ({
            ...prev,
            email: '이미 사용 중인 이메일입니다.'
          }))
          return
        }
        setCurrentStep(prev => prev + 1)
      }
    } else {
      if (validateStep(currentStep)) {
        setCurrentStep(prev => prev + 1)
      }
    }
  }

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSignUp = async () => {
    if (!validateStep(3)) {
      return
    }

    setIsLoading(true)
    
    try {
      const signUpData: SignUpData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phone: formData.phone || undefined,
        birthday: formData.birthday || undefined,
      }

      // 회원가입 요청 (email_verifications에 저장 + 이메일 발송)
      const response = await apiClient.signUp(signUpData)
      
      if (response.success) {
        if ((response as any).verified) {
          // 개발 모드: 서버가 이메일 인증을 생략하고 바로 가입 완료
          showToast('회원가입 완료! 바로 로그인하세요 🎉', 'success')
          setTimeout(() => router.push('/login'), 1200)
        } else {
          // 이메일 인증 안내 페이지로 이동
          router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&name=${encodeURIComponent(formData.name)}`)
        }
      } else {
        showToast(response.message || '회원가입 요청에 실패했습니다.', 'error')
      }
    } catch (error: any) {
      console.error('회원가입 에러:', error)
      showToast(error.message || '회원가입 중 오류가 발생했습니다.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.push('/login')
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return '기본 정보'
      case 2:
        return '비밀번호 설정'
      case 3:
        return '추가 정보'
      default:
        return ''
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return '이름과 이메일을 입력해주세요'
      case 2:
        return '안전한 비밀번호를 설정해주세요'
      case 3:
        return '선택사항입니다'
      default:
        return ''
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <FormField
              label={t('signup.name')}
              type="text"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder={t('signup.namePlaceholder')}
              icon="👤"
              required
              error={errors.name}
            />

            <FormField
              label={t('signup.email')}
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder={t('signup.emailPlaceholder')}
              icon="✉"
              required
              error={errors.email}
            />
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <FormField
              label={t('signup.password')}
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder={t('signup.passwordPlaceholder')}
              icon="🔑"
              required
              error={errors.password}
            />

            <FormField
              label={t('signup.confirmPassword')}
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              placeholder={t('signup.confirmPasswordPlaceholder')}
              icon="🔒"
              required
              error={errors.confirmPassword}
            />
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <FormField
              label={t('signup.phone')}
              type="tel"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              placeholder={t('signup.phonePlaceholder')}
              icon="📱"
              error={errors.phone}
            />

            <FormField
              label={t('signup.birthday')}
              type="date"
              value={formData.birthday || ''}
              onChange={handleInputChange('birthday')}
              icon="🎂"
            />

            {/* 약관 동의 */}
            <div className="text-center pt-4">
              <p className="text-xs text-secondary">
                {t('signup.termsText')}{' '}
                <Button variant="ghost" size="sm" className="text-xs px-1 py-0">
                  {t('signup.termsLink')}
                </Button>
                {' '}{t('signup.and')}{' '}
                <Button variant="ghost" size="sm" className="text-xs px-1 py-0">
                  {t('signup.privacyLink')}
                </Button>
                {' '}{t('signup.agreeText')}
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      {/* 언어 전환 버튼 */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="w-full max-w-md">
        <div className="card p-7">
          {/* 상단 헤더 — 토스식 진행 바 + 큰 타이틀 */}
          <div className="mb-8">
            <div className="flex space-x-1.5 mb-6">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    step <= currentStep ? 'bg-[var(--icon-active)]' : 'bg-secondary'
                  }`}
                />
              ))}
            </div>
            <h1 className="text-[24px] font-extrabold text-primary mb-1.5">{getStepTitle()}</h1>
            <p className="text-[15px] text-secondary">{getStepDescription()}</p>
          </div>

          {/* 단계별 콘텐츠 */}
          {renderStepContent()}

          {/* 버튼 영역 */}
          <div className="mt-8 space-y-3">
            {currentStep === 1 ? (
              <div className="flex space-x-3">
                <Button
                  variant="ghost"
                  onClick={handleBackToLogin}
                  className="flex-1"
                >
                  {t('signup.loginLink')}
                </Button>
                <Button
                  onClick={handleNext}
                  loading={isCheckingEmail}
                  className="flex-1 py-3.5"
                >
                  {isCheckingEmail ? '확인 중...' : '다음'}
                </Button>
              </div>
            ) : currentStep === 2 ? (
              <div className="flex space-x-3">
                <Button
                  variant="ghost"
                  onClick={handlePrev}
                  className="flex-1"
                >
                  이전
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 py-3.5"
                >
                  다음
                </Button>
              </div>
            ) : (
              <div className="flex space-x-3">
                <Button
                  variant="ghost"
                  onClick={handlePrev}
                  className="flex-1"
                >
                  이전
                </Button>
                <Button
                  onClick={handleSignUp}
                  loading={isLoading}
                  className="flex-1 py-3.5"
                >
                  {isLoading ? t('signup.signupLoading') : t('signup.signupButton')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

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
