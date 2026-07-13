'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/contexts/I18nContext'
import { useAuth } from '@/contexts/AuthContext'
import { Input, Button, BottomNavigation, Toast, ToastType } from '@/components/ui'
import { apiClient, User } from '@/lib/api'
import { cacheGet, cacheSet } from '@/lib/cache'

export default function FriendsPage() {
  const { t } = useTranslation()
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addSearchQuery, setAddSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [friendRequests, setFriendRequests] = useState<any[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: '',
    type: 'info',
  })

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'info' })
  }

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) return
    
    if (!currentUser) {
      router.push('/login')
      return
    }

    // 친구 목록만 로드 (전체 유저는 검색 시에만 로드)
    loadFriends()
    loadFriendRequests()
  }, [authLoading, currentUser])

  const loadFriends = async () => {
    // 캐시 먼저 즉시 표시 (체감 속도), 네트워크로 갱신
    const cached = cacheGet<User[]>(`friends:${currentUser?.id}`)
    if (cached) setUsers(cached)

    try {
      if (!cached) setIsLoading(true)
      // 실제 친구 관계(accepted)만 조회
      const response = await apiClient.getFriends()
      // friends 테이블에서 가져온 데이터를 User 형식으로 변환
      const friendsList = response.data?.map((friendship: any) => {
        // 현재 사용자가 requester인 경우 addressee를, addressee인 경우 requester를 친구로 표시
        const friend = friendship.requesterId === currentUser?.id
          ? friendship.addressee
          : friendship.requester
        return friend
      }).filter((friend: any) => friend) || []

      setUsers(friendsList)
      cacheSet(`friends:${currentUser?.id}`, friendsList)
    } catch (error) {
      console.error('친구 목록 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadFriendRequests = async () => {
    try {
      setIsLoadingRequests(true)
      const response = await apiClient.getPendingRequests()
      setFriendRequests(response.data || [])
    } catch (error) {
      console.error('친구 요청 로드 실패:', error)
    } finally {
      setIsLoadingRequests(false)
    }
  }

  const handleSearchUsers = async () => {
    if (!addSearchQuery.trim()) {
      return
    }

    try {
      setIsLoading(true)
      setHasSearched(true)
      console.log('🔍 검색 요청:', addSearchQuery)
      
      // 백엔드에서 검색 수행 (최대 50개 결과)
      const response = await apiClient.searchUsers(addSearchQuery, 50, 0)
      console.log('✅ 검색 응답:', response)
      
      const filteredUsers = response.data?.users.filter(user => user.id !== currentUser?.id) || []
      console.log('📋 필터링된 결과:', filteredUsers.length, '명')
      
      setSearchResults(filteredUsers)
    } catch (error) {
      console.error('❌ 사용자 검색 실패:', error)
      showToast('검색 실패: ' + (error as any).message, 'error')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredFriends = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddFriend = () => {
    setIsAddModalOpen(true)
    setAddSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
  }

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false)
    setAddSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchUsers()
    }
  }

  const handleSendFriendRequest = async (userId: string) => {
    try {
      await apiClient.sendFriendRequest(userId)
      handleCloseAddModal()
      showToast('친구 요청을 보냈습니다! ✉️', 'success')
    } catch (error) {
      console.error('친구 요청 실패:', error)
      showToast('친구 요청에 실패했습니다.', 'error')
    }
  }

  const handleSelectUser = (userId: string) => {
    // 채팅방으로 이동
    handleCloseAddModal()
    router.push(`/chat/${userId}`)
  }

  const handleAcceptRequest = async (friendId: string) => {
    try {
      await apiClient.acceptFriendRequest(friendId)
      await loadFriendRequests()
      await loadFriends()
      showToast('친구 요청을 수락했습니다! ✅', 'success')
    } catch (error) {
      console.error('친구 요청 수락 실패:', error)
      showToast('친구 요청 수락에 실패했습니다.', 'error')
    }
  }

  const handleRejectRequest = async (friendId: string) => {
    try {
      await apiClient.rejectFriendRequest(friendId)
      await loadFriendRequests()
      showToast('친구 요청을 거절했습니다.', 'info')
    } catch (error) {
      console.error('친구 요청 거절 실패:', error)
      showToast('친구 요청 거절에 실패했습니다.', 'error')
    }
  }

  const handleSendMessage = async (friend: User) => {
    console.log('💬 DM 시작:', friend.name, friend.id)
    
    if (!currentUser) {
      showToast('로그인이 필요합니다.', 'error')
      return
    }

    try {
      // Socket으로 DM 조회 또는 생성
      const { socketClient } = await import('@/lib/socket')
      const room = await socketClient.getOrCreateDm(
        currentUser.id,
        friend.id,
        currentUser.name,
        friend.name
      )
      
      console.log('✅ DM 준비 완료:', room.id)
      router.push(`/chat/${room.id}`)
    } catch (error) {
      console.error('❌ DM 준비 실패:', error)
      showToast('채팅방을 열 수 없습니다.', 'error')
    }
  }

  // 검색어 강조 함수
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 text-primary px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    )
  }

  const renderUserItem = (user: User) => (
    <div key={user.id} className="list-row">
      {/* 아바타 — 물방울 */}
      <div className="relative">
        <div className="w-[52px] h-[52px] bg-gradient-to-br from-[#38bdf8] to-[#0284c7] rounded-[20px] flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-500/20">
          <span className="text-white font-bold text-lg">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        {/* 온라인 상태 표시 */}
        {user.isActive && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-[#081521] rounded-full"></div>
        )}
      </div>

      {/* 친구 정보 */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[16px] font-semibold text-primary truncate mb-0.5">
          {highlightText(user.name, searchQuery)}
        </h3>
        <div className="text-[13px] text-secondary truncate">
          {highlightText(user.email, searchQuery)}
        </div>
      </div>

      {/* 대화 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); handleSendMessage(user) }}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="메시지 보내기"
      >
        💬
      </button>
    </div>
  )

  return (
    <div className="h-screen w-full bg-primary flex flex-col">
      {/* 토스트 알림 */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* 헤더 — 토스식 큰 타이틀 */}
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold text-primary">{t('friends.title')}</h1>
        <Button variant="ghost" onClick={handleAddFriend} className="p-2 -mr-2 rounded-full">
          <span className="text-[var(--icon-active)] text-2xl font-light leading-none">＋</span>
        </Button>
      </header>

      {/* 탭 — 세그먼트 필 */}
      <div className="px-4 pb-2">
        <div className="segmented">
          <button
            onClick={() => setActiveTab('friends')}
            className={activeTab === 'friends' ? 'seg-active' : ''}
          >
            {t('friends.title')} {users.length}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={activeTab === 'requests' ? 'seg-active' : ''}
          >
            {t('friends.friendRequest')} {friendRequests.length}
          </button>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름 또는 이메일로 검색..."
            icon="🔍"
            className="pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-secondary mt-2">
            검색 결과: {filteredFriends.length}명
          </p>
        )}
      </div>

      {/* 친구 목록 또는 요청 목록 */}
      <div className="flex-1 px-2 py-2 overflow-y-auto scrollbar-hide">
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
          isLoadingRequests ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-secondary">친구 요청 불러오는 중...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friendRequests.length > 0 ? (
                friendRequests.map((request) => (
                  <div key={request.id} className="list-row cursor-default">
                    {/* 아바타 — 물방울 */}
                    <div className="w-[52px] h-[52px] bg-gradient-to-br from-[#38bdf8] to-[#0284c7] rounded-[20px] flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-500/20">
                      <span className="text-white font-bold text-lg">
                        {request.requester?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>

                    {/* 요청자 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-semibold text-primary truncate mb-0.5">
                        {request.requester?.name || '알 수 없음'}
                      </h3>
                      <div className="text-[13px] text-secondary truncate">
                        {request.requester?.email || ''}
                      </div>
                    </div>

                    {/* 수락/거절 버튼 — 토스식 */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="px-4 py-2 bg-[var(--icon-active)] text-[var(--accent-contrast)] text-[13px] font-semibold rounded-xl hover:opacity-90 transition-opacity"
                      >
                        수락
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="px-4 py-2 bg-secondary text-secondary text-[13px] font-semibold rounded-xl hover:opacity-80 transition-opacity"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📨</div>
                  <h3 className="text-lg font-medium text-primary mb-2">
                    받은 친구 요청이 없습니다
                  </h3>
                  <p className="text-secondary text-sm">
                    새로운 친구 요청이 오면 여기에 표시됩니다
                  </p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* 하단 네비게이션 바 */}
      <BottomNavigation />

      {/* 친구 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-divider">
              <h2 className="text-lg font-semibold text-primary">친구 추가</h2>
              <button
                onClick={handleCloseAddModal}
                className="text-secondary hover:text-primary transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* 검색창 */}
            <div className="p-4 border-b border-divider">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="이름 또는 이메일로 검색..."
                    icon="🔍"
                    className="pr-8"
                  />
                  {addSearchQuery && (
                    <button
                      onClick={() => {
                        setAddSearchQuery('')
                        setSearchResults([])
                        setHasSearched(false)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleSearchUsers}
                  disabled={!addSearchQuery.trim() || isLoading}
                  className="px-4 py-2 bg-[var(--icon-active)] text-[var(--accent-contrast)] rounded-lg hover:bg-[var(--icon-active)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  검색
                </Button>
              </div>
              {hasSearched && (
                <p className="text-xs text-secondary mt-2">
                  검색 결과: {searchResults.length}명
                </p>
              )}
            </div>

            {/* 검색 결과 */}
            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-secondary">검색 중...</p>
                </div>
              ) : hasSearched ? (
                searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 py-3 px-4 rounded-xl hover:bg-secondary transition-all duration-200 border border-divider"
                      >
                        {/* 아바타 */}
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#38bdf8] to-[#0284c7] rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-medium text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {user.isActive && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-primary rounded-full"></div>
                          )}
                        </div>
                        
                        {/* 유저 정보 */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-primary truncate">
                            {highlightText(user.name, addSearchQuery)}
                          </h3>
                          <div className="text-xs text-secondary truncate">
                            {highlightText(user.email, addSearchQuery)}
                          </div>
                        </div>

                        {/* 액션 버튼들 */}
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleSendFriendRequest(user.id)}
                            className="px-3 py-1.5 bg-[var(--icon-active)] text-[var(--accent-contrast)] text-xs rounded-lg hover:bg-[var(--icon-active)] transition-colors"
                          >
                            친구 추가
                          </button>
                          <button
                            onClick={() => handleSelectUser(user.id)}
                            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                          >
                            <div className="text-lg">💬</div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-primary mb-2">
                      검색 결과가 없습니다
                    </h3>
                    <p className="text-secondary text-sm">
                      다른 키워드로 검색해보세요
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">👥</div>
                  <h3 className="text-lg font-medium text-primary mb-2">
                    이름 또는 이메일로 검색하세요
                  </h3>
                  <p className="text-secondary text-sm">
                    친구를 찾아 메시지를 시작하세요
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
