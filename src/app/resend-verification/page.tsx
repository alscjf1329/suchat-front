'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField, Button, LanguageSwitcher } from '@/components/ui'
import { useTranslation } from '@/contexts/I18nContext'

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()
      
      if (result.success) {
        setIsSuccess(true)
        setMessage(result.message)
      } else {
        setMessage(result.message || '인증 이메일 재발송에 실패했습니다.')
      }
    } catch (error) {
      console.error('재발송 에러:', error)
      setMessage('인증 이메일 재발송 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoToLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
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
            <h1 className="text-2xl font-bold text-primary mb-2">인증 이메일 재발송</h1>
            <p className="text-secondary">이메일 주소를 입력하면 인증 이메일을 다시 보내드립니다.</p>
          </div>

          {!isSuccess ? (
            <form onSubmit={handleResendVerification} className="space-y-6">
              <FormField
                label="이메일 주소"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                icon="✉"
                required
              />

              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.includes('실패') || message.includes('오류') 
                    ? 'bg-red-50 text-red-600' 
                    : 'bg-blue-50 text-blue-600'
                }`}>
                  {message}
                </div>
              )}

              <Button
                type="submit"
                loading={isLoading}
                className="w-full bg-[#0064FF] text-white"
              >
                {isLoading ? '발송 중...' : '인증 이메일 재발송'}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleGoToLogin}
                  className="text-sm"
                >
                  로그인 페이지로 돌아가기
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-green-600 text-2xl">✓</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary mb-2">발송 완료!</h2>
                <p className="text-secondary mb-6">{message}</p>
              </div>
              <Button
                onClick={handleGoToLogin}
                className="w-full bg-[#0064FF] text-white"
              >
                로그인하기
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
