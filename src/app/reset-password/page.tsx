'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input } from '@/components/ui'

export default function ResetPasswordPage() {
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
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">🔐 SuChat</h1>
          <p className="text-secondary">새 비밀번호 설정</p>
        </div>

        {/* 카드 */}
        <div className="bg-primary border border-divider rounded-2xl p-8 shadow-lg">
          {!success ? (
            <>
              <h2 className="text-xl font-bold text-primary mb-2">새 비밀번호 입력</h2>
              <p className="text-secondary text-sm mb-6">
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
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !token || !newPassword || !confirmPassword}
                >
                  {loading ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push('/login')}
                  className="text-[#0064FF] text-sm hover:underline"
                >
                  ← 로그인으로 돌아가기
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="mb-4 text-5xl">✅</div>
              <h2 className="text-xl font-bold text-primary mb-2">비밀번호 변경 완료!</h2>
              <p className="text-secondary text-sm mb-6">
                비밀번호가 성공적으로 변경되었습니다.<br />
                새 비밀번호로 로그인해주세요.
              </p>

              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm mb-6">
                <p className="text-xs">잠시 후 로그인 페이지로 이동합니다...</p>
              </div>

              <Button
                onClick={() => router.push('/login')}
                className="w-full"
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

