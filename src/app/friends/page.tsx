'use client'

import { useState } from 'react'
import { useTranslation } from '@/contexts/I18nContext'
import { Input, Button, BottomNavigation } from '@/components/ui'

interface Friend {
  id: number
  name: string
  status: 'online' | 'offline'
  lastSeen?: string
  avatar?: string
  isBlocked?: boolean
}

interface FriendRequest {
  id: number
  name: string
  avatar?: string
  sentAt: string
}

export default function FriendsPage() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')

  // 샘플 데이터
  const friends: Friend[] = [
    { id: 1, name: '김철수', status: 'online' },
    { id: 2, name: '이영희', status: 'offline', lastSeen: '2시간 전' },
    { id: 3, name: '박민수', status: 'online' },
    { id: 4, name: '정수진', status: 'offline', lastSeen: '1일 전' },
    { id: 5, name: '최동현', status: 'online' },
    { id: 6, name: '한지영', status: 'offline', lastSeen: '30분 전' },
  ]

  const friendRequests: FriendRequest[] = [
    { id: 7, name: '송민호', sentAt: '1시간 전' },
    { id: 8, name: '윤서연', sentAt: '3시간 전' },
  ]

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddFriend = () => {
    console.log('친구 추가')
  }

  const handleAcceptRequest = (requestId: number) => {
    console.log('친구 요청 수락:', requestId)
  }

  const handleDeclineRequest = (requestId: number) => {
    console.log('친구 요청 거절:', requestId)
  }

  const handleRemoveFriend = (friendId: number) => {
    console.log('친구 삭제:', friendId)
  }

  const handleBlockFriend = (friendId: number) => {
    console.log('친구 차단:', friendId)
  }

  const handleSendMessage = (friendId: number) => {
    console.log('메시지 보내기:', friendId)
  }

  const renderFriendItem = (friend: Friend) => (
    <div key={friend.id} className="flex items-center space-x-3 py-3 px-4 mx-1 rounded-xl hover:bg-secondary cursor-pointer transition-all duration-200 bg-primary border border-divider">
      {/* 아바타 */}
      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-br from-[#0064FF] to-[#0052CC] rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium text-sm">
            {friend.name.charAt(0)}
          </span>
        </div>
        {/* 온라인 상태 표시 */}
        {friend.status === 'online' && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-primary rounded-full"></div>
        )}
      </div>
      
      {/* 친구 정보 */}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-primary">
            {friend.name}
          </h3>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSendMessage(friend.id)}
              className="p-1 text-xs"
            >
              💬
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveFriend(friend.id)}
              className="p-1 text-xs text-red-500"
            >
              🗑
            </Button>
          </div>
        </div>
        <div className="text-xs text-secondary">
          {friend.status === 'online' ? t('friends.online') : 
           friend.lastSeen ? `${t('friends.lastSeen')}: ${friend.lastSeen}` : t('friends.offline')}
        </div>
      </div>
    </div>
  )

  const renderFriendRequest = (request: FriendRequest) => (
    <div key={request.id} className="flex items-center space-x-3 py-3 px-4 mx-1 rounded-xl bg-primary border border-divider">
      {/* 아바타 */}
      <div className="w-12 h-12 bg-gradient-to-br from-[#0064FF] to-[#0052CC] rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="text-white font-medium text-sm">
          {request.name.charAt(0)}
        </span>
      </div>
      
      {/* 요청 정보 */}
      <div className="flex-1">
        <h3 className="text-sm font-medium text-primary">
          {request.name}
        </h3>
        <div className="text-xs text-secondary">
          {request.sentAt}
        </div>
      </div>
      
      {/* 액션 버튼들 */}
      <div className="flex space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAcceptRequest(request.id)}
          className="px-3 py-1 text-xs bg-green-500 text-white hover:bg-green-600"
        >
          {t('friends.accept')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeclineRequest(request.id)}
          className="px-3 py-1 text-xs bg-red-500 text-white hover:bg-red-600"
        >
          {t('friends.decline')}
        </Button>
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
            {t('friends.title')} ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'requests'
                ? 'text-[#0064FF] border-b-2 border-[#0064FF]'
                : 'text-secondary'
            }`}
          >
            {t('friends.friendRequest')} ({friendRequests.length})
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
          <div className="space-y-2">
            {filteredFriends.length > 0 ? (
              filteredFriends.map(renderFriendItem)
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-primary mb-2">
                  {t('friends.noFriends')}
                </h3>
                <p className="text-secondary text-sm mb-4">
                  {t('friends.addFirstFriend')}
                </p>
                <Button onClick={handleAddFriend} className="bg-[#0064FF] text-white">
                  {t('friends.addFriend')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {friendRequests.length > 0 ? (
              friendRequests.map(renderFriendRequest)
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📨</div>
                <h3 className="text-lg font-medium text-primary mb-2">
                  친구 요청이 없습니다
                </h3>
                <p className="text-secondary text-sm">
                  새로운 친구 요청이 오면 여기에 표시됩니다
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 바 */}
      <BottomNavigation />
    </div>
  )
}
