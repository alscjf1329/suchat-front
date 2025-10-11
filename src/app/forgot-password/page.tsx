'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setSent(true)
      } else {
        setError(data.message || '이메일 발송에 실패했습니다.')
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
          <p className="text-secondary">비밀번호 재설정</p>
        </div>

        {/* 카드 */}
        <div className="bg-primary border border-divider rounded-2xl p-8 shadow-lg">
          {!sent ? (
            <>
              <h2 className="text-xl font-bold text-primary mb-2">비밀번호를 잊으셨나요?</h2>
              <p className="text-secondary text-sm mb-6">
                가입하신 이메일 주소를 입력하시면, 비밀번호 재설정 링크를 보내드립니다.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="이메일 주소"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
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
                  disabled={loading || !email}
                >
                  {loading ? '발송 중...' : '재설정 링크 발송'}
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
              <div className="mb-4 text-5xl">📧</div>
              <h2 className="text-xl font-bold text-primary mb-2">이메일을 확인하세요!</h2>
              <p className="text-secondary text-sm mb-6">
                <strong className="text-primary">{email}</strong> 주소로<br />
                비밀번호 재설정 링크를 발송했습니다.
              </p>

              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm mb-6">
                <p className="font-semibold mb-1">⏰ 링크는 1시간 동안 유효합니다.</p>
                <p className="text-xs">이메일을 받지 못하셨나요? 스팸 폴더를 확인해보세요.</p>
              </div>

              <Button
                onClick={() => router.push('/login')}
                className="w-full"
              >
                로그인 페이지로 이동
              </Button>
            </div>
          )}
        </div>

        {/* 하단 링크 */}
        <div className="mt-6 text-center text-sm text-secondary">
          계정이 없으신가요?{' '}
          <button
            onClick={() => router.push('/signup')}
            className="text-[#0064FF] hover:underline font-medium"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  )
}

