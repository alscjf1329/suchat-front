'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, LanguageSwitcher } from '@/components/ui'
import { useTranslation } from '@/contexts/I18nContext'

export default function EmailVerificationGuidePage() {
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error' | 'expired'>('pending')
  const [verificationMessage, setVerificationMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  const email = searchParams.get('email')
  const name = searchParams.get('name')
  const token = searchParams.get('token')

  useEffect(() => {
    // 토큰이 있으면 이메일 인증 처리
    if (token) {
      handleEmailVerification(token)
      return
    }

    // 토큰이 없으면 기존 로직 (이메일 인증 안내)
    if (!email) {
      router.push('/signup')
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [email, token, router])

  const handleEmailVerification = async (verificationToken: string) => {
    setIsVerifying(true)
    setVerificationStatus('pending')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const result = await response.json()

      if (result.success) {
        setVerificationStatus('success')
        setVerificationMessage('이메일 인증이 완료되었습니다!')
        
        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setVerificationStatus('error')
        setVerificationMessage(result.message || '이메일 인증에 실패했습니다.')
      }
    } catch (error) {
      console.error('이메일 인증 에러:', error)
      setVerificationStatus('error')
      setVerificationMessage('이메일 인증 중 오류가 발생했습니다.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendEmail = async () => {
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
        alert('인증 이메일이 재발송되었습니다.')
        setCountdown(60)
        setCanResend(false)
      } else {
        alert('이메일 재발송에 실패했습니다: ' + result.message)
      }
    } catch (error) {
      console.error('재발송 에러:', error)
      alert('이메일 재발송 중 오류가 발생했습니다.')
    }
  }

  const handleGoToLogin = () => {
    router.push('/login')
  }

  const handleChangeEmail = () => {
    router.push('/signup')
  }

  // 토큰 인증 중일 때의 UI
  if (token) {
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
              
              {verificationStatus === 'pending' && (
                <>
                  <h1 className="text-2xl font-bold text-primary mb-2">이메일 인증 중...</h1>
                  <p className="text-secondary">잠시만 기다려주세요.</p>
                  {isVerifying && (
                    <div className="mt-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0064FF] mx-auto"></div>
                    </div>
                  )}
                </>
              )}
              
              {verificationStatus === 'success' && (
                <>
                  <h1 className="text-2xl font-bold text-green-600 mb-2">✅ 인증 완료!</h1>
                  <p className="text-secondary">{verificationMessage}</p>
                  <p className="text-sm text-secondary mt-2">3초 후 로그인 페이지로 이동합니다...</p>
                </>
              )}
              
              {verificationStatus === 'error' && (
                <>
                  <h1 className="text-2xl font-bold text-red-600 mb-2">❌ 인증 실패</h1>
                  <p className="text-secondary">{verificationMessage}</p>
                  <div className="mt-6 space-y-3">
                    <Button
                      onClick={() => router.push('/signup')}
                      className="w-full bg-[#0064FF] text-white"
                    >
                      다시 회원가입하기
                    </Button>
                    <Button
                      onClick={() => router.push('/login')}
                      variant="ghost"
                      className="w-full"
                    >
                      로그인 페이지로
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 기존 이메일 인증 안내 UI
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
            <h1 className="text-2xl font-bold text-primary mb-2">이메일 인증 필요</h1>
            <p className="text-secondary">회원가입을 완료하려면 이메일 인증이 필요합니다.</p>
          </div>

          {/* 안내 메시지 */}
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-blue-600 text-xl">📧</span>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">인증 이메일을 확인하세요</h3>
                  <p className="text-blue-700 text-sm">
                    <strong>{name}</strong>님, <strong>{email}</strong>로 인증 이메일을 발송했습니다.
                    <br />
                    이메일의 링크를 클릭하여 인증을 완료해주세요.
                  </p>
                </div>
              </div>
            </div>

            {/* 재발송 버튼 */}
            <div className="text-center">
              {canResend ? (
                <Button
                  onClick={handleResendEmail}
                  className="w-full bg-[#0064FF] text-white"
                >
                  인증 이메일 재발송
                </Button>
              ) : (
                <div className="text-sm text-secondary">
                  {countdown}초 후 재발송 가능
                </div>
              )}
            </div>

            {/* 추가 옵션 */}
            <div className="space-y-3">
              <Button
                onClick={handleChangeEmail}
                variant="ghost"
                className="w-full"
              >
                이메일 주소 변경
              </Button>
              
              <Button
                onClick={handleGoToLogin}
                variant="ghost"
                className="w-full"
              >
                로그인 페이지로
              </Button>
            </div>

            {/* 도움말 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">이메일을 받지 못하셨나요?</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 스팸 폴더를 확인해보세요</li>
                <li>• 이메일 주소가 올바른지 확인해보세요</li>
                <li>• 몇 분 후에 다시 시도해보세요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}