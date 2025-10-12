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
        <div className="w-16 h-16 bg-gradient-to-br from-[#0064FF] to-[#0052CC] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-[#0064FF] font-bold text-lg">S</span>
          </div>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0064FF] mx-auto mb-4"></div>
        <p className="text-primary font-medium">SuChat으로 이동 중...</p>
      </div>
    </div>
  )
}
