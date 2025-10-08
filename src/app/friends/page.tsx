'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/contexts/I18nContext'
import { Input, Button, BottomNavigation } from '@/components/ui'
import { apiClient, getCurrentUser, User } from '@/lib/api'

export default function FriendsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getAllUsers()
      // 현재 사용자 제외
      const filteredUsers = response.data?.filter(user => user.id !== currentUser?.id) || []
      setUsers(filteredUsers)
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredFriends = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddFriend = () => {
    console.log('친구 추가 (추후 구현)')
  }

  const handleSendMessage = (userId: string) => {
    router.push(`/chat/${userId}`)
  }

  const renderUserItem = (user: User) => (
    <div key={user.id} className="flex items-center space-x-3 py-3 px-4 mx-1 rounded-xl hover:bg-secondary cursor-pointer transition-all duration-200 bg-primary border border-divider">
      {/* 아바타 */}
      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-br from-[#0064FF] to-[#0052CC] rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium text-sm">
            {user.name.charAt(0)}
          </span>
        </div>
        {/* 온라인 상태 표시 */}
        {user.isActive && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-primary rounded-full"></div>
        )}
      </div>
      
      {/* 친구 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-primary truncate">
            {user.name}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSendMessage(user.id)}
            className="p-1 text-xs flex-shrink-0"
          >
            💬
          </Button>
        </div>
        <div className="text-xs text-secondary truncate">
          {user.email}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen w-full bg-primary flex flex-col">
      {/* 헤더 */}
      <header className="bg-primary border-b border-divider px-2 h-16 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="w-8"></div>
          <h1 className="text-lg font-semibold text-primary">{t('friends.title')}</h1>
          <Button variant="ghost" onClick={handleAddFriend} className="p-2">
            <span className="text-secondary text-lg">+</span>
          </Button>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="bg-primary border-b border-divider">
        <div className="flex">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'friends'
                ? 'text-[#0064FF] border-b-2 border-[#0064FF]'
                : 'text-secondary'
            }`}
          >
            {t('friends.title')} ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'requests'
                ? 'text-[#0064FF] border-b-2 border-[#0064FF]'
                : 'text-secondary'
            }`}
          >
            {t('friends.friendRequest')} (0)
          </button>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="px-2 py-3 bg-primary">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('friends.searchPlaceholder')}
          icon="⌕"
        />
      </div>

      {/* 친구 목록 또는 요청 목록 */}
      <div className="flex-1 py-2 overflow-y-auto scrollbar-hide">
        {activeTab === 'friends' ? (
          isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-secondary">사용자 목록 불러오는 중...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFriends.length > 0 ? (
                filteredFriends.map(renderUserItem)
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-primary mb-2">
                    {searchQuery ? '검색 결과가 없습니다' : '사용자가 없습니다'}
                  </h3>
                  <p className="text-secondary text-sm">
                    {searchQuery ? '다른 키워드로 검색해보세요' : '다른 사용자가 가입하면 여기에 표시됩니다'}
                  </p>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📨</div>
            <h3 className="text-lg font-medium text-primary mb-2">
              친구 요청 기능 (추후 구현)
            </h3>
            <p className="text-secondary text-sm">
              친구 요청 기능은 추후 업데이트될 예정입니다
            </p>
          </div>
        )}
      </div>

      {/* 하단 네비게이션 바 */}
      <BottomNavigation />
    </div>
  )
}
