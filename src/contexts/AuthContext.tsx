'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { apiClient, User } from '@/lib/api'
import { initializePushNotifications } from '@/lib/push'
import { cacheClear } from '@/lib/cache'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (accessToken: string, refreshToken: string, user: User, deviceType: string) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 인증이 필요 없는 공개 경로
const PUBLIC_PATHS = ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password', '/resend-verification']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // 현재 경로가 공개 경로인지 확인
  const isPublicPath = PUBLIC_PATHS.includes(pathname)

  // 토큰으로 사용자 정보 가져오기
  const loadUserFromToken = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (!accessToken || !refreshToken) {
        console.log('🔒 토큰 없음 - 로그인 필요')
        return null
      }

      console.log('🔑 토큰 발견 - 사용자 정보 로드 시도')
      
      // 백엔드에 현재 사용자 정보 요청
      const response = await apiClient.getProfile()
      
      if (response.success && response.data) {
        console.log('✅ 자동 로그인 성공:', response.data.email)
        setUser(response.data)
        return response.data
      } else {
        console.log('❌ 프로필 로드 실패')
        // 토큰이 만료되었을 수 있음 - 로컬 스토리지 정리
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        localStorage.removeItem('deviceType')
        return null
      }
    } catch (error) {
      console.error('❌ 자동 로그인 에러:', error)
      // 토큰이 무효한 경우 로컬 스토리지 정리
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('deviceType')
      return null
    }
  }, [])

  // 초기 인증 확인 (앱 시작 시 한 번만)
  useEffect(() => {
    if (isInitialized) return
    
    console.log('🔍 [AuthContext] 초기 인증 확인 시작')
    
    const initAuth = async () => {
      setIsLoading(true)
      
      const user = await loadUserFromToken()
      
      console.log('🔍 [AuthContext] 초기 인증 결과:', user ? user.email : 'null')
      
      setIsLoading(false)
      setIsInitialized(true)
    }

    initAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 경로 변경 시 인증 확인 및 리다이렉션
  useEffect(() => {
    if (!isInitialized) {
      console.log('🔍 [AuthContext] 초기화 대기 중...')
      return
    }
    
    console.log('🔍 [AuthContext] 경로 변경 감지 - pathname:', pathname, 'user:', user?.email || 'null')
    
    if (user) {
      // 로그인 상태 - 공개 경로에 있으면 채팅 페이지로 이동
      if (isPublicPath && pathname !== '/') {
        console.log('✅ 로그인 상태에서 공개 페이지 접근 - 채팅 페이지로 이동')
        router.replace('/chat')
      }
    } else {
      // 비로그인 상태 - 보호된 경로에 있으면 로그인 페이지로 이동
      if (!isPublicPath && pathname !== '/') {
        console.log('🔒 비로그인 상태에서 보호 페이지 접근 - 로그인 페이지로 이동')
        router.replace('/login')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user, isInitialized])

  // 로그인
  const login = useCallback((accessToken: string, refreshToken: string, userData: User, deviceType: string) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('deviceType', deviceType)
    setUser(userData)
    console.log(`✅ 로그인 완료 (${deviceType})`)
    
    // 푸시 알림 자동 초기화 (백그라운드에서 실행)
    initializePushNotifications(accessToken)
      .then((result) => {
        if (result.success) {
          console.log('✅ 푸시 알림 자동 활성화 완료')
        } else {
          console.log('⚠️  푸시 알림 활성화 실패 (사용자가 수동으로 설정에서 활성화 가능)')
        }
      })
      .catch((error) => {
        console.error('❌ 푸시 알림 초기화 에러:', error)
      })
  }, [])

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('로그아웃 에러:', error)
    }
    
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('deviceType')
    cacheClear() // 캐시된 대화 내용/목록 삭제 (다른 사용자에게 노출 방지)
    setUser(null)
    router.replace('/login')
    console.log('👋 로그아웃 완료')
  }, [router])

  // 사용자 정보 새로고침
  const refreshUser = useCallback(async () => {
    await loadUserFromToken()
  }, [loadUserFromToken])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

