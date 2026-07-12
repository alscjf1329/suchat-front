'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input } from '@/components/ui'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      setError('유효하지 않은 재설정 링크입니다.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 비밀번호 검증
    if (newPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(data.message || '비밀번호 재설정에 실패했습니다.')
      }
    } catch (err) {
      setError('서버와 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 카드 */}
        <div className="card p-7">
          {!success ? (
            <>
              {/* 물방울 아이콘 */}
              <div className="w-14 h-14 bg-gradient-to-br from-[#38bdf8] to-[#0284c7] rounded-[22px] rounded-tl-md flex items-center justify-center mb-5 shadow-lg shadow-sky-500/30">
                <span className="text-2xl">🔐</span>
              </div>
              <h2 className="text-[24px] font-extrabold text-primary mb-1.5">새 비밀번호 입력</h2>
              <p className="text-[15px] text-secondary mb-6">
                새로운 비밀번호를 입력해주세요. 안전한 비밀번호로 설정하는 것을 권장합니다.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    새 비밀번호
                  </label>
                  <Input
                    type="password"
                    placeholder="새 비밀번호 (최소 6자)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading || !token}
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    비밀번호 확인
                  </label>
                  <Input
                    type="password"
                    placeholder="비밀번호 다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading || !token}
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-2xl text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full py-4 text-[16px]"
                  disabled={loading || !token || !newPassword || !confirmPassword}
                >
                  {loading ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push('/login')}
                  className="text-[var(--icon-active)] text-sm hover:underline"
                >
                  ← 로그인으로 돌아가기
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#38bdf8] to-[#0284c7] rounded-[26px] rounded-tl-md flex items-center justify-center mx-auto mb-5 shadow-lg shadow-sky-500/30">
                <span className="text-3xl text-white font-bold">✓</span>
              </div>
              <h2 className="text-[22px] font-extrabold text-primary mb-2">비밀번호 변경 완료</h2>
              <p className="text-[15px] text-secondary mb-6">
                비밀번호가 성공적으로 변경되었습니다.<br />
                새 비밀번호로 로그인해주세요.
              </p>

              <div className="bg-secondary text-secondary px-4 py-3 rounded-2xl text-xs mb-6">
                잠시 후 로그인 페이지로 이동합니다...
              </div>

              <Button
                onClick={() => router.push('/login')}
                className="w-full py-4 text-[16px]"
              >
                지금 로그인하기
              </Button>
            </div>
          )}
        </div>

        {/* 보안 안내 */}
        <div className="mt-6 text-center text-xs text-secondary">
          <p>🔒 비밀번호는 암호화되어 안전하게 저장됩니다.</p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--icon-active)] mx-auto mb-4"></div>
          <p className="text-secondary">로딩 중...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

