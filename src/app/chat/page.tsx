'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Button, BottomNavigation, Toast, ToastType } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, User } from '@/lib/api'
import socketClient, { ChatRoom } from '@/lib/socket'

interface ToastState {
  show: boolean
  message: string
  type: ToastType
}

export default function ChatListPage() {
  const router = useRouter()
  const { user: currentUser, isLoading: authLoading, logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [friendSearchQuery, setFriendSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [friends, setFriends] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' })

  // 친구 검색 필터링
  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(friendSearchQuery.toLowerCase())
  )

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

    // Socket 연결
    const socket = socketClient.connect()

    // 채팅방 목록 로드
    loadChatRooms()

    // 페이지 포커스 시 채팅방 목록 새로고침 (읽음 처리 반영)
    const handleFocus = () => {
      console.log('🔄 페이지 포커스 - 채팅방 목록 새로고침')
      loadChatRooms()
    }

    // 푸시 알림 클릭 처리 함수 (공통)
    const handleNotificationClick = (data: any) => {
      console.log('🔔 [ChatList] 푸시 알림 클릭 처리 시작')
      
      const clickedRoomId = data.roomId
      const urlToOpen = data.urlToOpen
      
      console.log('📍 클릭한 채팅방:', clickedRoomId)
      console.log('📍 이동할 URL:', urlToOpen)
      
      // 해당 채팅방으로 이동
      if (urlToOpen) {
        console.log('🔄 채팅방으로 이동:', urlToOpen)
        router.push(urlToOpen)
      }
    }

    // Service Worker 메시지 리스너 (푸시 알림 클릭 감지)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        console.log('🔔 [postMessage] 푸시 알림 클릭 감지')
        handleNotificationClick(event.data)
      }
    }

    // BroadcastChannel 리스너 (백그라운드 → 포그라운드 전환 시)
    const handleBroadcastMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        console.log('🔔 [BroadcastChannel] 푸시 알림 클릭 감지')
        handleNotificationClick(event.data)
      }
    }

    window.addEventListener('focus', handleFocus)
    
    // Service Worker 메시지 리스너 등록
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    }
    
    // BroadcastChannel (백그라운드 → 포그라운드 전환 시 알림 클릭 처리)
    let broadcastChannel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('notification-click-channel')
        broadcastChannel.addEventListener('message', handleBroadcastMessage)
        console.log('✅ [ChatList] BroadcastChannel 등록 완료')
      } catch (e) {
        console.log('⚠️ [ChatList] BroadcastChannel 사용 불가')
      }
    }

    return () => {
      window.removeEventListener('focus', handleFocus)
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
      
      // BroadcastChannel 정리
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcastMessage)
        broadcastChannel.close()
        console.log('✅ [ChatList] BroadcastChannel 해제')
      }
      
      socketClient.disconnect()
    }
  }, [authLoading, currentUser, router])

  const loadFriends = async () => {
    if (!currentUser) return

    try {
      setIsLoadingFriends(true)
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
      
      setFriends(friendsList)
    } catch (error) {
      console.error('친구 목록 로드 실패:', error)
      showToast('친구 목록을 불러오는데 실패했습니다.', 'error')
    } finally {
      setIsLoadingFriends(false)
    }
  }

  const loadChatRooms = async () => {
    if (!currentUser) return

    try {
      setIsLoading(true)
      const rooms = await socketClient.getUserRooms(currentUser.id)
      
      // 서버에서 unreadCount 포함해서 옴
      setChatRooms(rooms)
    } catch (error) {
      console.error('채팅방 목록 로드 실패:', error)
      showToast('채팅방 목록을 불러오는데 실패했습니다.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true)
    // 모달이 열릴 때 친구 목록 로드
    if (friends.length === 0) {
      loadFriends()
    }
  }

  const handleCreateChat = async () => {
    if (!currentUser || selectedFriends.length === 0) return

    try {
      // 선택된 친구들의 이름으로 채팅방 이름 생성
      const friendNames = friends
        .filter(f => selectedFriends.includes(f.id))
        .map(f => f.name)
        .join(', ')

      const roomName = `${currentUser.name}, ${friendNames}`
      
      const room = await socketClient.createRoom(
        roomName,
        `${selectedFriends.length + 1}명의 채팅방`,
        currentUser.id,
        selectedFriends  // 선택된 친구들의 ID 배열 전달
      )

      showToast('채팅방이 생성되었습니다! 🎉', 'success')
      setIsCreateModalOpen(false)
      setSelectedFriends([])
      
      // 채팅방 목록 새로고침
      await loadChatRooms()
      
      // 새 채팅방으로 이동
      router.push(`/chat/${room.id}`)
    } catch (error) {
      console.error('채팅방 생성 실패:', error)
      showToast('채팅방 생성에 실패했습니다.', 'error')
    }
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  const filteredRooms = chatRooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

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

      {/* 채팅 생성 모달 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsCreateModalOpen(false)}>
          <div className="bg-primary rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="p-4 border-b border-divider flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">새 채팅</h2>
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="p-2">
                <span className="text-secondary text-xl">×</span>
              </Button>
            </div>

            {/* 친구 검색 */}
            <div className="p-4 border-b border-divider">
              <Input
                type="text"
                value={friendSearchQuery}
                onChange={(e) => setFriendSearchQuery(e.target.value)}
                placeholder="친구 이름 또는 이메일 검색"
                icon="🔍"
              />
            </div>

            {/* 친구 목록 */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingFriends ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-secondary text-sm">친구 목록 불러오는 중...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-secondary mb-3">
                    {friendSearchQuery ? `검색 결과 ${filteredFriends.length}명` : '대화할 친구를 선택하세요'}
                  </p>
                  
                  {filteredFriends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-secondary text-sm">
                        {friendSearchQuery ? '검색 결과가 없습니다' : '사용자가 없습니다'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => toggleFriendSelection(friend.id)}
                    className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedFriends.includes(friend.id)
                        ? 'bg-[#0064FF]/10 border-2 border-[#0064FF]'
                        : 'bg-secondary hover:bg-divider border-2 border-transparent'
                    }`}
                  >
                    {/* 체크박스 */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedFriends.includes(friend.id)
                        ? 'bg-[#0064FF] border-[#0064FF]'
                        : 'border-divider'
                    }`}>
                      {selectedFriends.includes(friend.id) && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>

                    {/* 아바타 */}
                    <div className="w-10 h-10 bg-gradient-to-br from-[#0064FF] to-[#0052CC] rounded-xl flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {friend.name.charAt(0)}
                      </span>
                    </div>

                    {/* 친구 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-primary truncate">{friend.name}</h3>
                      <p className="text-xs text-secondary truncate">{friend.email}</p>
                    </div>

                    {/* 상태 뱃지 */}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${
                        friend.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-secondary">
                        {friend.isActive ? '온라인' : '오프라인'}
                      </span>
                    </div>
                  </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-divider">
              <Button
                onClick={handleCreateChat}
                disabled={selectedFriends.length === 0}
                className={`w-full py-3 ${
                  selectedFriends.length > 0
                    ? 'bg-[#0064FF] text-white'
                    : 'bg-secondary text-secondary cursor-not-allowed'
                }`}
              >
                {selectedFriends.length > 0 
                  ? `${selectedFriends.length}명과 대화 시작` 
                  : '친구를 선택하세요'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-primary border-b border-divider px-2 h-16 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="w-8"></div>
          <h1 className="text-lg font-semibold text-primary">SuChat</h1>
          <Button variant="ghost" onClick={handleOpenCreateModal} className="p-2">
            <span className="text-[#0064FF] text-2xl font-light">+</span>
          </Button>
        </div>
      </header>

      {/* 검색 바 */}
      <div className="px-2 py-3 bg-primary">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="채팅방 검색"
          icon="⌕"
        />
      </div>

      {/* 채팅 목록 */}
      <div className="flex-1 py-2 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-secondary">채팅방 불러오는 중...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-primary font-medium mb-2">채팅방이 없습니다</p>
            <p className="text-secondary text-sm text-center">
              + 버튼을 눌러 새로운 채팅을 시작하세요
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRooms.map((room) => (
              <div 
                key={room.id} 
                onClick={() => router.push(`/chat/${room.id}`)}
                className="flex items-center space-x-2 py-3 px-1 mx-1 rounded-xl hover:bg-secondary cursor-pointer transition-all duration-200 bg-primary border border-divider"
              >
                {/* 아바타 */}
                <div className="w-12 h-12 bg-gradient-to-br from-[#0064FF] to-[#0052CC] rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium text-sm">
                    {room.name.charAt(0)}
                  </span>
                </div>
                
                {/* 채팅 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    <h3 className="text-sm font-medium text-primary flex-1 truncate">
                      {room.name}
                    </h3>
                    <span className="text-xs text-secondary ml-2 flex-shrink-0">
                      {formatTime(room.lastMessageAt || room.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm text-secondary flex-1 truncate">
                      {room.description || '메시지 없음'}
                    </p>
                    {(room.unreadCount ?? 0) > 0 && (
                      <div className="relative ml-2 flex-shrink-0">
                        <div className="bg-gradient-to-br from-[#FF3B30] to-[#FF2D55] text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-2 flex items-center justify-center shadow-lg">
                          {(room.unreadCount ?? 0) > 99 ? '99+' : room.unreadCount}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FF3B30] to-[#FF2D55] rounded-full animate-ping opacity-75"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 바 */}
      <BottomNavigation />
    </div>
  )
}
