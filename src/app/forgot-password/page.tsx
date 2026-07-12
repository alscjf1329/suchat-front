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
        {/* 카드 */}
        <div className="card p-7">
          {!sent ? (
            <>
              {/* 물방울 아이콘 */}
              <div className="w-14 h-14 bg-gradient-to-br from-[#38bdf8] to-[#0284c7] rounded-[22px] rounded-tl-md flex items-center justify-center mb-5 shadow-lg shadow-sky-500/30">
                <span className="text-2xl">🔑</span>
              </div>
              <h2 className="text-[24px] font-extrabold text-primary mb-1.5">비밀번호를 잊으셨나요?</h2>
              <p className="text-[15px] text-secondary mb-6">
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
                  <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-2xl text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full py-4 text-[16px]"
                  disabled={loading || !email}
                >
                  {loading ? '발송 중...' : '재설정 링크 발송'}
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
                <span className="text-3xl">📧</span>
              </div>
              <h2 className="text-[22px] font-extrabold text-primary mb-2">이메일을 확인하세요</h2>
              <p className="text-[15px] text-secondary mb-6">
                <strong className="text-primary">{email}</strong> 주소로<br />
                비밀번호 재설정 링크를 발송했습니다.
              </p>

              <div className="bg-secondary text-primary px-4 py-3.5 rounded-2xl text-sm mb-6 text-left">
                <p className="font-semibold mb-1">⏰ 링크는 1시간 동안 유효합니다.</p>
                <p className="text-xs text-secondary">이메일을 받지 못하셨나요? 스팸 폴더를 확인해보세요.</p>
              </div>

              <Button
                onClick={() => router.push('/login')}
                className="w-full py-4 text-[16px]"
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
            className="text-[var(--icon-active)] hover:underline font-medium"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  )
}

