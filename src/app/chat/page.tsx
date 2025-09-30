'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Button, Sidebar, BottomNavigation } from '@/components/ui'

export default function ChatListPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = () => {
    router.push('/login')
  }

  const chatRooms = [
    { id: 1, name: '김철수', lastMessage: '안녕하세요!', time: '10:30', unread: 2 },
    { id: 2, name: '이영희', lastMessage: '회의 준비는 어떻게 되었나요?', time: '09:45', unread: 0 },
    { id: 3, name: '박민수', lastMessage: '감사합니다!', time: '09:15', unread: 1 },
    { id: 4, name: '정수진', lastMessage: '내일 뵐게요', time: '08:30', unread: 0 },
    { id: 5, name: '최동현', lastMessage: '좋은 하루 되세요', time: '08:00', unread: 3 },
    { id: 6, name: '한지영', lastMessage: '네, 알겠습니다', time: '07:45', unread: 0 },
  ]

  const filteredRooms = chatRooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-primary">
      {/* 헤더 */}
      <header className="bg-primary border-b border-divider px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="w-8"></div> {/* 왼쪽 공간 */}
          <h1 className="text-lg font-semibold text-primary">SuChat</h1>
          <Button variant="ghost" onClick={handleLogout} className="p-2">
            <span className="text-secondary text-lg">↗</span>
          </Button>
        </div>
      </header>

      {/* 검색 바 */}
      <div className="px-4 py-4">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="채팅방 검색"
          icon="⌕"
        />
      </div>

      {/* 채팅 목록 */}
      <div className="flex-1 px-4 pb-24">
        <div className="space-y-2">
          {filteredRooms.map((room) => (
            <div key={room.id} className="flex items-center space-x-3 py-3 px-4 rounded-xl hover:bg-secondary cursor-pointer transition-all duration-200 shadow-sm bg-primary border border-divider">
              {/* 아바타 */}
              <div className="w-12 h-12 bg-gradient-to-br from-[#0064FF] to-[#0052CC] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white font-medium text-sm">
                  {room.name.charAt(0)}
                </span>
              </div>
              
              {/* 채팅 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium text-primary truncate">
                    {room.name}
                  </h3>
                  <span className="text-xs text-secondary">
                    {room.time}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary truncate">
                    {room.lastMessage}
                  </p>
                  {room.unread > 0 && (
                    <div className="bg-[#0064FF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2 flex-shrink-0 shadow-md">
                      {room.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 사이드바 */}
      {/* <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      /> */}

      {/* 하단 네비게이션 바 */}
      <BottomNavigation />
    </div>
  )
}
