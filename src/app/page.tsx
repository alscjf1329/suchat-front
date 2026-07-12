'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      // 로그인 상태에 따라 리다이렉트
      if (isAuthenticated) {
        router.replace('/chat')
      } else {
        router.replace('/login')
      }
    }
  }, [isLoading, isAuthenticated, router])

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="text-center">
        {/* 물방울 로고 */}
        <div className="w-20 h-20 bg-gradient-to-br from-[#38bdf8] to-[#0284c7] rounded-[32px] rounded-tl-lg flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-500/30">
          <span className="text-white font-extrabold text-3xl">S</span>
        </div>
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-[var(--icon-active)]/20 border-t-[var(--icon-active)] mx-auto mb-4"></div>
        <p className="text-[15px] text-secondary font-medium">SuChat으로 이동 중...</p>
      </div>
    </div>
  )
}
